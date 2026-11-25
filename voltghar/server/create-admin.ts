import { randomUUID } from "node:crypto";
import { z } from "zod";
import { one, run } from "./db.ts";
import { hashPassword } from "./domain.ts";
const config = z
  .object({
    ADMIN_EMAIL: z.email().transform((s) => s.toLowerCase()),
    ADMIN_PASSWORD: z.string().min(14).max(128),
    ADMIN_NAME: z.string().min(2).default("Network administrator"),
  })
  .parse(process.env);
if (one("SELECT id FROM users WHERE email=?", config.ADMIN_EMAIL))
  throw new Error(
    "An account with this email already exists; existing roles are never silently promoted.",
  );
run(
  "INSERT INTO users(id,name,email,password,role) VALUES(?,?,?,?,?)",
  randomUUID(),
  config.ADMIN_NAME,
  config.ADMIN_EMAIL,
  hashPassword(config.ADMIN_PASSWORD),
  "admin",
);
console.log("Administrator created. Password was not printed.");
