import type { Pool, PoolClient } from "pg";

import type { CondominiumId } from "../core/condominium-scope.js";
import type {
  CondominiumProfile,
  CondominiumProfilePhoto,
  CondominiumProfileRepository
} from "./condominium-profile.js";

type PoolLike = Pick<Pool, "connect">;
type ProfileRow = Readonly<{
  condominium_id: string;
  display_name: string;
  cnpj: string | null;
  address: CondominiumProfile["address"];
  administration_company: string | null;
  unit_count: number | null;
  contact: CondominiumProfile["contact"];
  profile_description: string | null;
}>;
type PhotoRow = Readonly<{
  id: string;
  media_type: CondominiumProfilePhoto["mediaType"];
  size_bytes: number;
  is_cover: boolean;
  created_at: Date;
  content?: Buffer;
}>;

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu;

async function rollback(client: PoolClient): Promise<void> {
  try {
    await client.query("ROLLBACK");
  } catch {
    // Preserve the original database error.
  }
}

async function setRuntimeContext(
  client: PoolClient,
  input: Readonly<{ condominiumId: CondominiumId; userId: string }>
): Promise<void> {
  await client.query("SET LOCAL ROLE app_runtime");
  let databaseUserId = input.userId;
  if (!uuidPattern.test(databaseUserId)) {
    const result = await client.query<{ user_id: string | null }>(
      "SELECT app.resolve_user_id($1) AS user_id",
      [input.userId]
    );
    databaseUserId = result.rows[0]?.user_id ?? "";
  }
  if (!uuidPattern.test(databaseUserId)) {
    throw new Error("A identidade do perfil não está cadastrada como usuário ativo.");
  }
  await client.query("SELECT set_config('app.user_id', $1, true)", [databaseUserId]);
  await client.query("SELECT set_config('app.condominium_id', $1, true)", [input.condominiumId]);
}

function mapProfile(row: ProfileRow): CondominiumProfile {
  const address = row.address ?? {};
  const contact = row.contact ?? {};
  return Object.freeze({
    condominiumId: row.condominium_id,
    name: row.display_name,
    cnpj: row.cnpj,
    address: Object.freeze({
      postalCode: address.postalCode ?? "",
      street: address.street ?? "",
      number: address.number ?? "",
      complement: address.complement ?? "",
      neighborhood: address.neighborhood ?? "",
      city: address.city ?? "",
      state: address.state ?? ""
    }),
    administrationCompany: row.administration_company ?? "",
    unitCount: row.unit_count,
    contact: Object.freeze({
      managerName: contact.managerName ?? "",
      email: contact.email ?? "",
      phone: contact.phone ?? ""
    }),
    description: row.profile_description ?? ""
  });
}

function mapPhoto(row: PhotoRow): CondominiumProfilePhoto {
  return Object.freeze({
    photoId: row.id,
    mediaType: row.media_type,
    sizeBytes: Number(row.size_bytes),
    isCover: row.is_cover,
    createdAt: new Date(row.created_at).toISOString()
  });
}

async function readProfile(
  client: PoolClient,
  condominiumId: CondominiumId
): Promise<CondominiumProfile | undefined> {
  const result = await client.query<ProfileRow>(
    `
      SELECT id AS condominium_id, display_name, cnpj, address, administration_company,
             unit_count, contact, profile_description
      FROM app.condominiums
      WHERE id = $1::uuid
      LIMIT 1
    `,
    [condominiumId]
  );
  const row = result.rows[0];
  return row === undefined ? undefined : mapProfile(row);
}

async function readPhotos(
  client: PoolClient,
  condominiumId: CondominiumId
): Promise<readonly CondominiumProfilePhoto[]> {
  const result = await client.query<PhotoRow>(
    `
      SELECT id, media_type, octet_length(content) AS size_bytes, is_cover, created_at
      FROM app.condominium_profile_photos
      WHERE condominium_id = $1::uuid
      ORDER BY is_cover DESC, created_at, id
    `,
    [condominiumId]
  );
  return Object.freeze(result.rows.map(mapPhoto));
}

export function createPostgresCondominiumProfileRepository(
  pool: PoolLike
): CondominiumProfileRepository {
  return {
    async getProfile({ userId, condominiumId }) {
      const client = await pool.connect();
      try {
        await client.query("BEGIN");
        await setRuntimeContext(client, { userId, condominiumId });
        const profile = await readProfile(client, condominiumId);
        await client.query("COMMIT");
        return profile;
      } catch (error: unknown) {
        await rollback(client);
        throw error;
      } finally {
        client.release();
      }
    },

    async updateProfile({ userId, condominiumId, profile }) {
      const client = await pool.connect();
      try {
        await client.query("BEGIN");
        await setRuntimeContext(client, { userId, condominiumId });
        await client.query(
          "SELECT app.update_condominium_profile($1, $2::uuid, $3, $4::jsonb, $5, $6, $7::jsonb, $8)",
          [
            userId,
            condominiumId,
            profile.name,
            JSON.stringify(profile.address),
            profile.administrationCompany || null,
            profile.unitCount,
            JSON.stringify(profile.contact),
            profile.description || null
          ]
        );
        const updated = await readProfile(client, condominiumId);
        await client.query("COMMIT");
        return updated;
      } catch (error: unknown) {
        await rollback(client);
        throw error;
      } finally {
        client.release();
      }
    },

    async listPhotos({ userId, condominiumId }) {
      const client = await pool.connect();
      try {
        await client.query("BEGIN");
        await setRuntimeContext(client, { userId, condominiumId });
        const result = await readPhotos(client, condominiumId);
        await client.query("COMMIT");
        return result;
      } catch (error: unknown) {
        await rollback(client);
        throw error;
      } finally {
        client.release();
      }
    },

    async addPhoto({ userId, condominiumId, photoId, mediaType, content }) {
      const client = await pool.connect();
      try {
        await client.query("BEGIN");
        await setRuntimeContext(client, { userId, condominiumId });
        await client.query(
          "SELECT app.add_condominium_profile_photo($1, $2::uuid, $3::uuid, $4, $5)",
          [userId, condominiumId, photoId, mediaType, content]
        );
        const result = await client.query<PhotoRow>(
          `
            SELECT id, media_type, octet_length(content) AS size_bytes, is_cover, created_at
            FROM app.condominium_profile_photos
            WHERE condominium_id = $1::uuid AND id = $2::uuid
          `,
          [condominiumId, photoId]
        );
        const row = result.rows[0];
        if (row === undefined) throw new Error("A foto salva não ficou disponível no perfil.");
        await client.query("COMMIT");
        return mapPhoto(row);
      } catch (error: unknown) {
        await rollback(client);
        throw error;
      } finally {
        client.release();
      }
    },

    async readPhoto({ userId, condominiumId, photoId }) {
      const client = await pool.connect();
      try {
        await client.query("BEGIN");
        await setRuntimeContext(client, { userId, condominiumId });
        const result = await client.query<PhotoRow>(
          `
            SELECT id, media_type, octet_length(content) AS size_bytes, is_cover, created_at, content
            FROM app.condominium_profile_photos
            WHERE condominium_id = $1::uuid AND id = $2::uuid
            LIMIT 1
          `,
          [condominiumId, photoId]
        );
        const row = result.rows[0];
        await client.query("COMMIT");
        return row === undefined || row.content === undefined
          ? undefined
          : Object.freeze({ ...mapPhoto(row), content: Buffer.from(row.content) });
      } catch (error: unknown) {
        await rollback(client);
        throw error;
      } finally {
        client.release();
      }
    },

    async setCover({ userId, condominiumId, photoId }) {
      const client = await pool.connect();
      try {
        await client.query("BEGIN");
        await setRuntimeContext(client, { userId, condominiumId });
        await client.query(
          "SELECT app.set_condominium_profile_photo_cover($1, $2::uuid, $3::uuid)",
          [userId, condominiumId, photoId]
        );
        await client.query("COMMIT");
      } catch (error: unknown) {
        await rollback(client);
        throw error;
      } finally {
        client.release();
      }
    },

    async deletePhoto({ userId, condominiumId, photoId }) {
      const client = await pool.connect();
      try {
        await client.query("BEGIN");
        await setRuntimeContext(client, { userId, condominiumId });
        await client.query("SELECT app.delete_condominium_profile_photo($1, $2::uuid, $3::uuid)", [
          userId,
          condominiumId,
          photoId
        ]);
        await client.query("COMMIT");
      } catch (error: unknown) {
        await rollback(client);
        throw error;
      } finally {
        client.release();
      }
    }
  };
}
