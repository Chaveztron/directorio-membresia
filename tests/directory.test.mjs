import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

test("renders the searchable locked directory", async () => {
  const html = await readFile(new URL("../dist/client/index.html", import.meta.url), "utf8");

  assert.match(html, /<title>Directorio de miembros<\/title>/);
  assert.match(html, /Buscar contacto por nombre/);
  assert.match(html, /Ver información sensible/);
  assert.match(html, /Ana Martínez López/);
  assert.doesNotMatch(html, /Av\. de los Olivos/);
  assert.doesNotMatch(html, /664 555 0142/);
});

test("includes DaisyUI component styles", async () => {
  const assetsDirectory = new URL("../dist/client/assets/", import.meta.url);
  const files = await readdir(assetsDirectory);
  const cssFile = files.find((file) => file.endsWith(".css"));
  assert.ok(cssFile, "Expected a generated CSS asset");

  const css = await readFile(path.join(assetsDirectory.pathname, cssFile), "utf8");
  assert.match(css, /\.btn/);
  assert.match(css, /\.card/);
  assert.match(css, /\.badge/);
});

test("stores sensitive contact data as ciphertext", async () => {
  const source = await readFile(new URL("../app/directory-data.ts", import.meta.url), "utf8");

  assert.match(source, /ciphertext/);
  assert.doesNotMatch(source, /Av\. de los Olivos/);
  assert.doesNotMatch(source, /664 555 0142/);
});
