import { readFile, readdir } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const ignoredDirectories = new Set([".git", "coverage", "node_modules"]);
const ignoredFiles = new Set(["scan-secrets.mjs"]);
const patterns = [
  { name: "GitHub token", expression: /gh[pousr]_[A-Za-z0-9]{20,}/ },
  { name: "OpenAI key", expression: /sk-(?:proj-)?[A-Za-z0-9_-]{20,}/ },
  { name: "AWS access key", expression: /AKIA[0-9A-Z]{16}/ },
  { name: "private key", expression: /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/ }
];

async function filesIn(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    if (entry.isDirectory()) {
      if (!ignoredDirectories.has(entry.name)) {
        files.push(...(await filesIn(path.join(directory, entry.name))));
      }
    } else if (entry.isFile() && !ignoredFiles.has(entry.name)) {
      files.push(path.join(directory, entry.name));
    }
  }

  return files;
}

const findings = [];
for (const file of await filesIn(root)) {
  const content = await readFile(file, "utf8");
  const relativePath = path.relative(root, file);

  for (const pattern of patterns) {
    if (pattern.expression.test(content)) {
      findings.push(`${relativePath}: padrão de ${pattern.name}`);
    }
  }
}

if (findings.length > 0) {
  console.error("Possível segredo encontrado (o valor não será exibido):");
  for (const finding of findings) console.error(`- ${finding}`);
  process.exitCode = 1;
} else {
  console.log("Scanner de segredos: nenhum padrão conhecido encontrado.");
}
