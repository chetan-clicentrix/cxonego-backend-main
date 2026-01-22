import "reflect-metadata";
import { DataSource } from "typeorm";
import * as dotenv from "dotenv";
import { ISTDateSubscriber } from "./ist-date-subscriber";

dotenv.config();

const isProd = process.env.NODE_ENV === "production";

// SAFER: Default to false, only true if explicitly set
const shouldSynchronize = process.env.TYPEORM_SYNCHRONIZE === "true";

const entitiesPath = isProd
  ? ["build/src/entity/*.js"]
  : ["src/entity/*.ts", "src/entity/*.js"];

const migrationsPath = isProd
  ? ["build/src/migration/*.js"]
  : ["src/migration/*.ts", "src/migration/*.js"];

export const AppDataSource = new DataSource({
  type: "mysql",
  host: process.env.DATABASE_HOST,
  port: Number.parseInt(process.env.DATABASE_PORT ?? "3306"),
  username: process.env.DATABASE_USER_NAME,
  password: process.env.DATABASE_PASSWORD,
  database: process.env.DATABASE_NAME,
  synchronize: shouldSynchronize,
  logging: ["error"],
  entities: entitiesPath,
  migrations: migrationsPath,
  migrationsTableName: "migrations_history", // Track migration history
  extra: {
    timezone: "Z",
    connectTimeout: Number.parseInt(process.env.DATABASE_CONNECT_TIMEOUT ?? "5000"),
  },
  subscribers: [ISTDateSubscriber]
});