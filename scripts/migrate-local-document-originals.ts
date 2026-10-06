import { createHash } from "node:crypto";
import { readdir } from "node:fs/promises";
import { join, resolve } from "node:path";

import { Pool } from "pg";

import { createCondominiumId } from "../apps/api/core/condominium-scope.js";
import { createPostgresPrivateDocumentStorage } from "../apps/api/documents/postgres-private-document-storage.js";
import {
  createLocalPrivateDocumentStorage,
  createPrivateStorageKey
} from "../apps/api/documents/private-document-storage.js";
import { parseDatabaseUrl } from "./database-migrations.js";

type PendingOriginal = Readonly<{
  condominium_id: string;
  storage_object_id: string;
  content_sha256: string;
  created_by_user_id: string;
}>;
type KnownOriginal = PendingOriginal &
  Readonly<{
    stored_in_database: boolean;
  }>;

async function listPdfFiles(root: string): Promise<readonly string[]> {
  try {
    const entries = await readdir(root, { recursive: true, withFileTypes: true });
    return entries
      .filter((entry) => entry.isFile() && entry.name.toLocaleLowerCase("en-US").endsWith(".pdf"))
      .map((entry) => join(entry.parentPath, entry.name));
  } catch (error: unknown) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw error;
  }
}

const databaseUrl = parseDatabaseUrl(process.env.DATABASE_URL);
const storageRoot = resolve(
  process.env.DOCUMENT_STORAGE_ROOT?.trim() || ".local/synthetic-documents"
);
const pool = new Pool({ connectionString: databaseUrl.toString() });
const localStorage = createLocalPrivateDocumentStorage(storageRoot);
const databaseStorage = createPostgresPrivateDocumentStorage(pool);

try {
  const pending = await pool.query<PendingOriginal>(
    `
      SELECT
        objects.condominium_id,
        objects.id AS storage_object_id,
        objects.content_sha256,
        objects.created_by_user_id
      FROM app.storage_objects AS objects
      JOIN app.document_versions AS versions
        ON versions.condominium_id = objects.condominium_id
       AND versions.storage_object_id = objects.id
      LEFT JOIN app.document_original_contents AS contents
        ON contents.condominium_id = objects.condominium_id
       AND contents.storage_object_id = objects.id
      WHERE objects.object_kind = 'document_original'
        AND contents.storage_object_id IS NULL
      ORDER BY objects.created_at ASC
    `
  );
  const knownOriginals = await pool.query<KnownOriginal>(
    `
      SELECT
        objects.condominium_id,
        objects.id AS storage_object_id,
        objects.content_sha256,
        objects.created_by_user_id,
        contents.storage_object_id IS NOT NULL AS stored_in_database
      FROM app.storage_objects AS objects
      LEFT JOIN app.document_original_contents AS contents
        ON contents.condominium_id = objects.condominium_id
       AND contents.storage_object_id = objects.id
      WHERE objects.object_kind = 'document_original'
    `
  );

  let migrated = 0;
  const missingLocalOriginals: string[] = [];
  for (const original of pending.rows) {
    const condominiumId = createCondominiumId(original.condominium_id);
    let content: Buffer;
    try {
      content = await localStorage.readOriginal({
        condominiumId,
        objectId: original.storage_object_id
      });
    } catch (error: unknown) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") {
        missingLocalOriginals.push(original.storage_object_id);
        continue;
      }
      throw error;
    }
    const contentHash = createHash("sha256").update(content).digest("hex");
    if (contentHash !== original.content_sha256) {
      throw new Error(`O hash não confere para o objeto ${original.storage_object_id}.`);
    }

    await databaseStorage.storeOriginal({
      condominiumId,
      objectId: original.storage_object_id,
      content,
      uploadedByUserId: original.created_by_user_id
    });
    const persisted = await databaseStorage.readOriginal({
      condominiumId,
      objectId: original.storage_object_id,
      userId: original.created_by_user_id
    });
    if (!persisted.equals(content)) {
      throw new Error(`A verificação do banco falhou para o objeto ${original.storage_object_id}.`);
    }

    await localStorage.removeOriginal({
      condominiumId,
      objectId: original.storage_object_id,
      uploadedByUserId: original.created_by_user_id
    });
    migrated += 1;
  }

  let duplicateLocalCopiesRemoved = 0;
  const unmatchedLocalPdfs: string[] = [];
  const remainingLocalPdfs = await listPdfFiles(storageRoot);
  for (const localPdf of remainingLocalPdfs) {
    const original = knownOriginals.rows.find((candidate) => {
      const storageKey = createPrivateStorageKey(
        createCondominiumId(candidate.condominium_id),
        candidate.storage_object_id
      );
      const tenantSegment = storageKey.split("/")[1];
      return (
        tenantSegment !== undefined &&
        resolve(storageRoot, tenantSegment, `${candidate.storage_object_id}.pdf`) ===
          resolve(localPdf)
      );
    });
    if (original === undefined || !original.stored_in_database) {
      unmatchedLocalPdfs.push(localPdf);
      continue;
    }
    const condominiumId = createCondominiumId(original.condominium_id);
    const content = await localStorage.readOriginal({
      condominiumId,
      objectId: original.storage_object_id
    });
    if (createHash("sha256").update(content).digest("hex") !== original.content_sha256) {
      throw new Error(`O hash não confere para a cópia local ${original.storage_object_id}.`);
    }
    await localStorage.removeOriginal({
      condominiumId,
      objectId: original.storage_object_id,
      uploadedByUserId: original.created_by_user_id
    });
    duplicateLocalCopiesRemoved += 1;
  }
  if (unmatchedLocalPdfs.length > 0) {
    throw new Error(
      `Ainda há ${unmatchedLocalPdfs.length} PDF(s) locais sem vínculo seguro no banco. Eles foram preservados para reenvio manual.`
    );
  }

  const report = [
    migrated === 0
      ? "Nenhum PDF local pendente de migração."
      : `${migrated} PDF(s) migrados para o PostgreSQL e removidos do armazenamento local.`
  ];
  if (missingLocalOriginals.length > 0) {
    report.push(
      `${missingLocalOriginals.length} registro(s) antigo(s) não tinham cópia local e precisam de reenvio para voltar a exibir o original.`
    );
  }
  if (duplicateLocalCopiesRemoved > 0) {
    report.push(
      `${duplicateLocalCopiesRemoved} cópia(s) local(is) que já tinham conteúdo confirmado no banco também foram removidas.`
    );
  }
  console.log(report.join(" "));
} finally {
  await pool.end();
}
