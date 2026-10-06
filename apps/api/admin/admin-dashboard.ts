import type { Pool } from "pg";

export type AdminDashboardMetrics = Readonly<{
  activeAccounts: number;
  newAccountsLast7Days: number;
  activeUsersLast7Days: number;
}>;

export type AdminAccountDirectoryEntry = Readonly<{
  displayName: string;
  email: string;
}>;

export interface AdminDashboardService {
  readMetrics(since: Date): Promise<AdminDashboardMetrics>;
  readAccounts(limit: number): Promise<readonly AdminAccountDirectoryEntry[]>;
}

type PoolLike = Pick<Pool, "query">;

type AdminDashboardRow = Readonly<{
  active_accounts: number | string;
  new_accounts_last_7_days: number | string;
  active_users_last_7_days: number | string;
}>;

type AdminAccountRow = Readonly<{
  display_name: string;
  email: string;
}>;

function safeCount(value: number | string): number {
  const count = Number(value);
  if (!Number.isSafeInteger(count) || count < 0) {
    throw new Error("O banco retornou uma métrica administrativa inválida.");
  }
  return count;
}

export function createPostgresAdminDashboard(pool: PoolLike): AdminDashboardService {
  return {
    async readMetrics(since) {
      const result = await pool.query<AdminDashboardRow>(
        `
          SELECT active_accounts, new_accounts_last_7_days, active_users_last_7_days
          FROM app.read_admin_dashboard_metrics($1)
        `,
        [since]
      );
      const row = result.rows[0];
      if (row === undefined) {
        throw new Error("O banco não retornou as métricas administrativas.");
      }
      return Object.freeze({
        activeAccounts: safeCount(row.active_accounts),
        newAccountsLast7Days: safeCount(row.new_accounts_last_7_days),
        activeUsersLast7Days: safeCount(row.active_users_last_7_days)
      });
    },

    async readAccounts(limit) {
      const safeLimit = Math.min(Math.max(Math.trunc(limit), 1), 100);
      const result = await pool.query<AdminAccountRow>(
        `
          SELECT display_name, email
          FROM app.read_admin_account_directory($1)
        `,
        [safeLimit]
      );
      return Object.freeze(
        result.rows.map((row) =>
          Object.freeze({
            displayName: row.display_name,
            email: row.email
          })
        )
      );
    }
  };
}

export function parseAdminUserIds(value: string | undefined): readonly string[] {
  if (value === undefined) return Object.freeze([]);
  return Object.freeze(
    [...new Set(value.split(",").map((userId) => userId.trim().toLocaleLowerCase("en-US")))].filter(
      (userId) =>
        /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/u.test(userId)
    )
  );
}
