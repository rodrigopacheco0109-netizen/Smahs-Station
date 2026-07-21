import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import * as schema from "./schema";

/**
 * Em modo protótipo (sem DATABASE_URL configurada), `db` fica nulo e as
 * páginas usam os dados de exemplo em `src/lib/mock-data.ts`.
 * Assim que você conectar um Postgres/Supabase real, defina DATABASE_URL
 * no .env e as mesmas telas passam a ler do banco de verdade — é só trocar
 * a fonte de dados nas funções em `src/server/actions`.
 */
const connectionString = process.env.DATABASE_URL;

export const db = connectionString
  ? drizzle(postgres(connectionString, { max: 1 }), { schema })
  : null;

export const isPrototypeMode = !connectionString;
