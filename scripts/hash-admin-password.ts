import { createAdminPasswordHash } from "../src/lib/admin/auth";

const chunks: Buffer[] = [];
for await (const chunk of process.stdin) {
  chunks.push(Buffer.from(chunk));
  if (chunks.reduce((total, value) => total + value.length, 0) > 1024) {
    throw new Error("Password input is too long.");
  }
}

const password = Buffer.concat(chunks).toString("utf8").replace(/[\r\n]+$/, "");
if (!password) {
  throw new Error("Pipe the admin password to stdin.");
}

process.stdout.write(`${createAdminPasswordHash(password)}\n`);
