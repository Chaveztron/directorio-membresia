import { readdir, readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";

const outputDirectory = path.resolve("dist/client");
const rawBasePath = process.argv[2] ?? process.env.PAGES_BASE_PATH ?? "";
const basePath = `/${rawBasePath.replace(/^\/+|\/+$/g, "")}`;
const textExtensions = new Set([".html", ".js", ".css", ".rsc", ".json"]);

if (basePath === "/") {
  throw new Error("Indica la ruta del repositorio, por ejemplo /directorio-membresia.");
}

async function filesInside(directory) {
  const entries = await readdir(directory);
  const files = [];
  for (const entry of entries) {
    const absolutePath = path.join(directory, entry);
    if ((await stat(absolutePath)).isDirectory()) {
      files.push(...(await filesInside(absolutePath)));
    } else {
      files.push(absolutePath);
    }
  }
  return files;
}

for (const file of await filesInside(outputDirectory)) {
  if (!textExtensions.has(path.extname(file))) continue;

  const original = await readFile(file, "utf8");
  const updated = original
    .replaceAll("/assets/", `${basePath}/assets/`)
    .replaceAll('href="/favicon.svg"', `href="${basePath}/favicon.svg"`)
    .replaceAll('href="/file.svg"', `href="${basePath}/file.svg"`)
    .replaceAll('href="/globe.svg"', `href="${basePath}/globe.svg"`)
    .replaceAll('href="/window.svg"', `href="${basePath}/window.svg"`);

  if (updated !== original) await writeFile(file, updated, "utf8");
}

await writeFile(path.join(outputDirectory, ".nojekyll"), "", "utf8");
console.log(`Archivos preparados para GitHub Pages en ${basePath}/`);
