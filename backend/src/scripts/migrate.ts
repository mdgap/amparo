import { readdir, readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { pool } from "../db.ts";

const dir = join(dirname(fileURLToPath(import.meta.url)), "../../db/migrations");

const arquivos = (await readdir(dir)).filter((f) => f.endsWith(".sql")).sort();
for (const arquivo of arquivos) {
  const sql = await readFile(join(dir, arquivo), "utf8");
  process.stdout.write(`→ ${arquivo} ... `);
  await pool.query(sql);
  console.log("ok");
}
await pool.end();
console.log(`\n${arquivos.length} migração(ões) aplicada(s).`);
