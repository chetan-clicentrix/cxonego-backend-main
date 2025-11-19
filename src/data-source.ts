import "reflect-metadata";
import { DataSource } from "typeorm";
import * as dotenv from "dotenv";
import { ISTDateSubscriber } from "./ist-date-subscriber";

dotenv.config();

// Determine if we're in production
const isProd = process.env.NODE_ENV === "production";

// Allow TypeORM synchronize to be controlled via env; default off outside prod
const shouldSynchronize =
  process.env.TYPEORM_SYNCHRONIZE === "true" || (isProd && process.env.TYPEORM_SYNCHRONIZE !== "false");

// Set the entity path based on environment
const entitiesPath = isProd 
  ? ["build/src/entity/*.js"]  // Production path (compiled JS files)
  : ["src/entity/*.ts", "src/entity/*.js"];  // Development path (TS source files)

// Set migrations path (only in development)
const migrationsPath = isProd 
  ? [] // No migrations in production
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
  // logging:true,
  entities: entitiesPath,
  migrations: migrationsPath,
  extra: {
    timezone: "Z",
    // Add connection parameters using proper MySQL2 option names
    connectTimeout: Number.parseInt(process.env.DATABASE_CONNECT_TIMEOUT ?? "5000"),
  },
  subscribers: [ISTDateSubscriber]
});
