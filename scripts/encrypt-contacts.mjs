import { createCipheriv, pbkdf2Sync, randomBytes } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const inputPath = path.resolve(process.argv[2] ?? "contacts.private.json");
const outputPath = path.resolve("app/directory-data.ts");
const password = process.env.CONTACTS_PASSWORD;
const iterations = 250_000;

if (!password || password.length < 12) {
  throw new Error("Define CONTACTS_PASSWORD con una contraseña de al menos 12 caracteres.");
}

const contacts = JSON.parse(await readFile(inputPath, "utf8"));
if (!Array.isArray(contacts) || contacts.length === 0) {
  throw new Error("El archivo debe contener una lista de contactos.");
}

const requiredFields = [
  "id", "nombre", "fechaNacimiento", "direccion", "telefono",
  "estadoCivil", "fechaIngreso", "ministerios", "habilidades",
];

for (const contact of contacts) {
  for (const field of requiredFields) {
    if (!(field in contact)) {
      throw new Error(`Falta el campo ${field} en el contacto ${contact.id ?? "sin id"}.`);
    }
  }

  if (
    "imagen" in contact
    && contact.imagen !== null
    && typeof contact.imagen !== "string"
  ) {
    throw new Error(`El campo imagen debe ser texto o null en el contacto ${contact.id}.`);
  }
}

const publicContacts = contacts.map(({ id, nombre, imagen }) => ({
  id,
  nombre,
  imagen: typeof imagen === "string" && imagen.trim() ? imagen.trim() : null,
}));
const privateDirectory = Object.fromEntries(
  contacts.map((contact) => [
    contact.id,
    {
      fechaNacimiento: contact.fechaNacimiento,
      direccion: contact.direccion,
      telefono: contact.telefono,
      estadoCivil: contact.estadoCivil,
      fechaIngreso: contact.fechaIngreso,
      ministerios: contact.ministerios,
      habilidades: contact.habilidades,
    },
  ]),
);

const salt = randomBytes(16);
const iv = randomBytes(12);
const key = pbkdf2Sync(password, salt, iterations, 32, "sha256");
const cipher = createCipheriv("aes-256-gcm", key, iv);
const ciphertext = Buffer.concat([
  cipher.update(JSON.stringify(privateDirectory), "utf8"),
  cipher.final(),
  cipher.getAuthTag(),
]);

const source = `// Archivo generado. No lo edites manualmente.\n\nexport const PUBLIC_CONTACTS = ${JSON.stringify(publicContacts, null, 2)} as const;\n\nexport const ENCRYPTED_DIRECTORY = ${JSON.stringify({
  iterations,
  salt: salt.toString("base64"),
  iv: iv.toString("base64"),
  ciphertext: ciphertext.toString("base64"),
}, null, 2)} as const;\n`;

await writeFile(outputPath, source, "utf8");
console.log(`Directorio cifrado generado en ${outputPath}`);
