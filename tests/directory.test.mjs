import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

test("renders the searchable locked directory", async () => {
  const html = await readFile(new URL("../dist/client/index.html", import.meta.url), "utf8");

  assert.match(html, /<title>Directorio de miembros<\/title>/);
  assert.match(html, /Buscar contacto por nombre/);
  assert.match(html, /Ver información sensible/);
  assert.match(html, /<h2[^>]*>\s*Cristhian\s*<\/h2>/);
  assert.doesNotMatch(
    html,
    /<h2[^>]*>\s*Cristhian Emanuel Rodríguez Trujillo\s*<\/h2>/,
  );
  assert.doesNotMatch(
    html,
    /src="contactos\/cristhian-emanuel-rodriguez-trujillo\.png"/,
  );
  assert.doesNotMatch(html, /Donato Guerra 111/);
  assert.doesNotMatch(html, /664 224 9920/);
});

test("keeps contact photos hidden until the directory is unlocked", async () => {
  const source = await readFile(
    new URL("../app/page.tsx", import.meta.url),
    "utf8",
  );

  assert.match(source, /image=\{details \? contact\.imagen : null\}/);
});

test("publishes first names and encrypts full names on regeneration", async () => {
  const generator = await readFile(
    new URL("../scripts/encrypt-contacts.mjs", import.meta.url),
    "utf8",
  );
  const page = await readFile(
    new URL("../app/page.tsx", import.meta.url),
    "utf8",
  );

  assert.match(generator, /nombre: firstName\(nombre\)/);
  assert.match(generator, /nombreCompleto: contact\.nombre\.trim\(\)/);
  assert.match(page, /details\?\.nombreCompleto/);
  assert.match(page, /firstName\(contact\.nombre\)/);
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
  assert.doesNotMatch(source, /Donato Guerra 111/);
  assert.doesNotMatch(source, /664 224 9920/);
});

test("allows prayer consultation without granting public write access", async () => {
  const rules = await readFile(
    new URL("../firestore.rules", import.meta.url),
    "utf8",
  );
  const dialog = await readFile(
    new URL("../components/prayer-manager-dialog.tsx", import.meta.url),
    "utf8",
  );

  assert.match(rules, /allow read:\s*if true;/);
  assert.match(rules, /allow create:\s*if isPrayerAdmin\(\)/);
  assert.match(rules, /allow update:\s*if isPrayerAdmin\(\)/);
  assert.match(rules, /allow delete:\s*if isPrayerAdmin\(\)/);
  assert.match(dialog, /Modo de consulta · solo lectura/);
  assert.match(dialog, /Administrar oraciones/);
});
