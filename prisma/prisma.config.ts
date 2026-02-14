import { config } from "dotenv";
import path from "node:path";
import { defineConfig } from "prisma/config";

config({ path: path.join(__dirname, "..", ".env") });

export default defineConfig({
  schema: path.join(__dirname, "schema.prisma"),
  datasource: {
    url: process.env.DATABASE_URL,
  },
});
