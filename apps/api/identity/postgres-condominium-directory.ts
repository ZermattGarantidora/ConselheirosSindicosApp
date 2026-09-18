import { randomUUID } from "node:crypto";

import type { Pool, PoolClient } from "pg";

import type { UserId } from "./authorized-condominium-context.js";

type PoolLike = Pick<Pool, "connect">;

export type CondominiumAddress = Readonly<{
  postalCode?: string;
  street?: string;
  number?: string;
  complement?: string;
  neighborhood?: string;
  city: string;
  state: string;
}>;

export type CondominiumContact = Readonly<{
  managerName?: string;
  email?: string;
  phone?: string;
}>;

export type CreateCondominiumInput = Readonly<{
  name: string;
  cnpj: string;
  administrationCompany?: string;
  unitCount?: number | null;
  address: CondominiumAddress;
  contact: CondominiumContact;
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
  createForUser(userId: UserId, input: CreateCondominiumInput): Promise<AuthorizedCondominium>;
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

    async createForUser(userId, input) {
      const client = await pool.connect();
      try {
        await client.query("BEGIN");
        await client.query("SET LOCAL ROLE app_runtime");
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
            input.cnpj,
            JSON.stringify(input.address),
            input.administrationCompany ?? null,
            input.unitCount ?? null,
            JSON.stringify(input.contact)
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
