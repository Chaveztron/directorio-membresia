import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

test("renders only the member count while the directory is locked", async () => {
  const html = await readFile(new URL("../dist/client/index.html", import.meta.url), "utf8");

  assert.match(html, /<title>Directorio de miembros<\/title>/);
  assert.match(html, /Directorio protegido/);
  assert.match(html, /32 miembros/);
  assert.match(html, /placeholder="Contraseña"/);
  assert.doesNotMatch(html, /Buscar contacto por nombre/);
  assert.doesNotMatch(html, /Lista de contactos/);
  assert.doesNotMatch(
    html,
    /<h2[^>]*>\s*Cristhian\s*<\/h2>/,
  );
  assert.doesNotMatch(
    html,
    /src="contactos\/cristhian-emanuel-rodriguez-trujillo\.png"/,
  );
  assert.doesNotMatch(html, /Donato Guerra 111/);
  assert.doesNotMatch(html, /664 224 9920/);
  assert.doesNotMatch(html, /Buzón de sugerencias/);
});

test("publishes a mobile public form for general prayer requests", async () => {
  const html = await readFile(
    new URL("../dist/client/nueva-peticion/index.html", import.meta.url),
    "utf8",
  );
  const page = await readFile(
    new URL("../app/nueva-peticion/page.tsx", import.meta.url),
    "utf8",
  );
  const storage = await readFile(
    new URL("../lib/general-prayers.ts", import.meta.url),
    "utf8",
  );
  const rules = await readFile(
    new URL("../firestore.rules", import.meta.url),
    "utf8",
  );
  const generalPrayerRules = rules.match(
    /match \/generalPrayers\/\{generalPrayerId\} \{[\s\S]*?\n    \}/,
  )?.[0] ?? "";

  assert.match(html, /<title>Nueva petición de oración<\/title>/);
  assert.match(html, /Oraciones en general/);
  assert.match(html, /Nombre de la persona o tema/);
  assert.match(html, /Oración/);
  assert.match(html, /Iglesia en general/);
  assert.match(html, /Enviar petición/);
  assert.doesNotMatch(html, /type="password"/);
  assert.match(page, /min-h-\[100dvh\]/);
  assert.match(page, /¿Deseas agregar otra petición\?/);
  assert.match(storage, /setToServerValue: "REQUEST_TIME"/);
  assert.match(storage, /generalPrayers/);
  assert.match(generalPrayerRules, /allow create:\s*if hasValidGeneralPrayerFields\(\)/);
  assert.match(generalPrayerRules, /allow read:\s*if true/);
  assert.match(rules, /request\.resource\.data\.createdAt == request\.time/);
});

test("reveals the complete directory only after unlocking", async () => {
  const source = await readFile(
    new URL("../app/page.tsx", import.meta.url),
    "utf8",
  );

  assert.match(source, /if \(!isUnlocked\)/);
  assert.match(source, /aria-label="Lista de contactos"/);
  assert.match(source, /setSensitiveDirectory\(decrypted\)/);
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

test("includes a read-only tab with every prayer grouped by member", async () => {
  const source = await readFile(
    new URL("../app/page.tsx", import.meta.url),
    "utf8",
  );

  assert.match(source, /Todas las oraciones/);
  assert.match(source, /activeView === "prayers"/);
  assert.match(source, /Consulta las peticiones agrupadas por miembro/);
  assert.match(source, /prayer\.contactId === contact\.id/);
  assert.match(source, /role="tabpanel"/);
  assert.match(source, /listGeneralPrayers/);
});

test("shows public requests in a separate general-prayers tab", async () => {
  const source = await readFile(
    new URL("../app/page.tsx", import.meta.url),
    "utf8",
  );

  assert.match(source, /type DirectoryView = "directory" \| "prayers" \| "general-prayers"/);
  assert.match(source, /id="general-prayers-tab"/);
  assert.match(source, /aria-controls="general-prayers-panel"/);
  assert.match(source, /activeView === "general-prayers"/);
  assert.match(source, /Peticiones generales/);
  assert.match(source, /Consulta las peticiones recibidas desde el enlace público/);
  assert.match(source, /showingGeneral &&/);
  assert.match(source, /!showingGeneral &&/);
});

test("accepts suggestions publicly but protects the administrative inbox", async () => {
  const page = await readFile(
    new URL("../app/page.tsx", import.meta.url),
    "utf8",
  );
  const dialog = await readFile(
    new URL("../components/suggestion-mailbox-dialog.tsx", import.meta.url),
    "utf8",
  );
  const storage = await readFile(
    new URL("../lib/suggestions.ts", import.meta.url),
    "utf8",
  );
  const rules = await readFile(
    new URL("../firestore.rules", import.meta.url),
    "utf8",
  );
  const suggestionRules = rules.match(
    /match \/suggestions\/\{suggestionId\} \{[\s\S]*?\n    \}/,
  )?.[0] ?? "";

  assert.match(page, /Buzón de sugerencias/);
  assert.match(dialog, /¿En qué podemos mejorar\?/);
  assert.match(dialog, /Queremos escuchar tu opinión/);
  assert.match(dialog, /signInPrayerAdmin/);
  assert.match(dialog, /listSuggestions/);
  assert.match(storage, /export async function createSuggestion/);
  assert.match(suggestionRules, /allow create:\s*if hasValidSuggestionFields\(\)/);
  assert.match(suggestionRules, /allow read:\s*if isPrayerAdmin\(\)/);
  assert.match(suggestionRules, /allow update, delete:\s*if false/);
});

test("stores prayer status, its automatic date, and renders status colors", async () => {
  const storage = await readFile(
    new URL("../lib/prayers.ts", import.meta.url),
    "utf8",
  );
  const dialog = await readFile(
    new URL("../components/prayer-manager-dialog.tsx", import.meta.url),
    "utf8",
  );
  const page = await readFile(
    new URL("../app/page.tsx", import.meta.url),
    "utf8",
  );
  const rules = await readFile(
    new URL("../firestore.rules", import.meta.url),
    "utf8",
  );

  assert.match(storage, /type PrayerStatus = "fulfilled" \| "not_fulfilled"/);
  assert.match(storage, /statusChangedAt/);
  assert.match(dialog, /✅/);
  assert.match(dialog, /❌/);
  assert.match(dialog, /Limpiar estado/);
  assert.match(dialog, /status \? new Date\(\)\.toISOString\(\) : null/);
  assert.match(page, /prayer\.status === "fulfilled"/);
  assert.match(rules, /"statusChangedAt"/);
  assert.match(rules, /"not_fulfilled"/);
});
