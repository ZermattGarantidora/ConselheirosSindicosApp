import { randomUUID } from "node:crypto";
import { ConversationStoreError } from "../answers/conversation-store.js";

import type { Pool, PoolClient } from "pg";

import type { UserId } from "./authorized-condominium-context.js";

type PoolLike = Pick<Pool, "connect">;

export type CondominiumAddress = Readonly<{
  postalCode?: string;
  street?: string;
  number?: string;
  complement?: string;
  neighborhood?: string;
  city?: string;
  state?: string;
}>;

export type CondominiumContact = Readonly<{
  managerName?: string;
  email?: string;
  phone?: string;
}>;

export type CreateCondominiumInput = Readonly<{
  name: string;
  cnpj?: string;
  administrationCompany?: string;
  unitCount?: number | null;
  address?: CondominiumAddress;
  contact?: CondominiumContact;
}>;

export type AuthorizedCondominium = Readonly<{
  condominiumId: string;
  name: string;
  detail: string;
  roleKey: "manager" | "advisor";
}>;

export class CondominiumAlreadyExistsError extends Error {
  public constructor() {
    super("Já existe um condomínio cadastrado com este CNPJ.");
    this.name = "CondominiumAlreadyExistsError";
  }
}

export interface CondominiumDirectory {
  listAuthorized(userId: UserId): Promise<readonly AuthorizedCondominium[]>;
  findAuthorizedByCnpj(userId: UserId, cnpj: string): Promise<AuthorizedCondominium | undefined>;
  createForUser(
    userId: UserId,
    input: CreateCondominiumInput,
    operation?: Readonly<{ requestKey: string; inputHash: string }>
  ): Promise<AuthorizedCondominium>;
  leaveForUser(userId: UserId, condominiumId: string): Promise<void>;
  deleteForUser(userId: UserId, condominiumId: string): Promise<void>;
}

type DirectoryRow = Readonly<{
  condominium_id: string;
  display_name: string;
  role_key: "manager" | "advisor";
  cnpj: string | null;
  address: CondominiumAddress;
  administration_company: string | null;
  unit_count: number | null;
  contact: CondominiumContact;
}>;

function detailForRow(row: DirectoryRow): string {
  const city = row.address?.city?.trim();
  const state = row.address?.state?.trim().toUpperCase();
  const location = city && state ? `${city}/${state}` : city || state;
  return location === undefined || location.length === 0
    ? "Condomínio autorizado"
    : `${location} · Condomínio autorizado`;
}

function toAuthorizedCondominium(row: DirectoryRow): AuthorizedCondominium {
  return Object.freeze({
    condominiumId: row.condominium_id,
    name: row.display_name,
    detail: detailForRow(row),
    roleKey: row.role_key
  });
}

async function rollback(client: PoolClient): Promise<void> {
  try {
    await client.query("ROLLBACK");
  } catch {
    // Preserve the original database error. The connection is released below.
  }
}

export function createPostgresCondominiumDirectory(pool: PoolLike): CondominiumDirectory {
  return {
    async listAuthorized(userId) {
      const client = await pool.connect();
      try {
        await client.query("BEGIN");
        await client.query("SET LOCAL ROLE app_runtime");
        const result = await client.query<DirectoryRow>(
          "SELECT * FROM app.list_authorized_condominiums($1)",
          [userId]
        );
        await client.query("COMMIT");
        return Object.freeze(result.rows.map(toAuthorizedCondominium));
      } catch (error: unknown) {
        await rollback(client);
        throw error;
      } finally {
        client.release();
      }
    },

    async findAuthorizedByCnpj(userId, cnpj) {
      const client = await pool.connect();
      try {
        await client.query("BEGIN");
        await client.query("SET LOCAL ROLE app_runtime");
        const result = await client.query<DirectoryRow>(
          `
            SELECT *
            FROM app.list_authorized_condominiums($1)
            WHERE cnpj = $2
            LIMIT 1
          `,
          [userId, cnpj]
        );
        await client.query("COMMIT");
        const row = result.rows[0];
        return row === undefined ? undefined : toAuthorizedCondominium(row);
      } catch (error: unknown) {
        await rollback(client);
        throw error;
      } finally {
        client.release();
      }
    },

    async createForUser(userId, input, operation) {
      const client = await pool.connect();
      try {
        await client.query("BEGIN");
        await client.query("SET LOCAL ROLE app_runtime");
        let databaseUserId: string | undefined;
        if (operation) {
          if (
            !operation.requestKey ||
            operation.requestKey.length > 200 ||
            !/^[a-f0-9]{64}$/.test(operation.inputHash)
          )
            throw new ConversationStoreError(400);
          databaseUserId = (
            await client.query<{ user_id: string }>("SELECT app.resolve_user_id($1) AS user_id", [
              userId
            ])
          ).rows[0]?.user_id;
          if (!databaseUserId) throw new ConversationStoreError(401);
          await client.query("SELECT set_config('app.user_id',$1,true)", [databaseUserId]);
          await client.query("SELECT pg_advisory_xact_lock(hashtextextended($1,0))", [
            JSON.stringify([databaseUserId, operation.requestKey])
          ]);
          const receipt = (
            await client.query<{ input_hash: string; condominium_id: string }>(
              "SELECT input_hash,condominium_id FROM app.condominium_creation_receipts WHERE owner_user_id=app.current_user_id() AND request_key=$1",
              [operation.requestKey]
            )
          ).rows[0];
          if (receipt) {
            if (receipt.input_hash !== operation.inputHash)
              throw new ConversationStoreError(409, "A chave já foi usada para outro cadastro.");
            const saved = (
              await client.query<DirectoryRow>(
                "SELECT * FROM app.list_authorized_condominiums($1) WHERE condominium_id=$2",
                [userId, receipt.condominium_id]
              )
            ).rows[0];
            if (!saved) throw new ConversationStoreError(403);
            await client.query("COMMIT");
            return toAuthorizedCondominium(saved);
          }
        }
        const result = await client.query<DirectoryRow>(
          `
            SELECT *
            FROM app.create_condominium_for_user($1, $2, $3, $4, $5, $6::jsonb, $7, $8, $9::jsonb)
          `,
          [
            userId,
            randomUUID(),
            randomUUID(),
            input.name,
            input.cnpj ?? "",
            JSON.stringify(input.address ?? {}),
            input.administrationCompany ?? null,
            input.unitCount ?? null,
            JSON.stringify(input.contact ?? {})
          ]
        );
        if (operation && result.rows[0])
          await client.query(
            "INSERT INTO app.condominium_creation_receipts(owner_user_id,request_key,input_hash,condominium_id) VALUES ($1,$2,$3,$4)",
            [
              databaseUserId,
              operation.requestKey,
              operation.inputHash,
              result.rows[0].condominium_id
            ]
          );
        await client.query("COMMIT");

        const row = result.rows[0];
        if (row === undefined) throw new Error("O banco não retornou o condomínio criado.");
        return toAuthorizedCondominium(row);
      } catch (error: unknown) {
        await rollback(client);
        if ((error as { code?: unknown }).code === "23505") {
          throw new CondominiumAlreadyExistsError();
        }
        throw error;
      } finally {
        client.release();
      }
    },

    async leaveForUser(userId, condominiumId) {
      const client = await pool.connect();
      try {
        await client.query("BEGIN");
        await client.query("SET LOCAL ROLE app_runtime");
        await client.query("SELECT app.leave_condominium_for_user($1, $2::uuid)", [
          userId,
          condominiumId
        ]);
        await client.query("COMMIT");
      } catch (error: unknown) {
        await rollback(client);
        throw error;
      } finally {
        client.release();
      }
    },

    async deleteForUser(userId, condominiumId) {
      const client = await pool.connect();
      try {
        await client.query("BEGIN");
        await client.query("SET LOCAL ROLE app_runtime");
        await client.query("SELECT app.delete_condominium_for_user($1, $2::uuid)", [
          userId,
          condominiumId
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
