# Directorio de miembros

Página estática de contactos construida con Next.js, Tailwind CSS y DaisyUI. Incluye búsqueda por nombre y cifra los datos sensibles con AES-256-GCM antes de publicarlos.

## Probar el ejemplo

```bash
npm ci
npm run dev
```

La contraseña de los datos de demostración es `directorio-demo`. Todos los nombres y datos incluidos son ficticios.

## Cargar contactos reales y cambiar la contraseña

1. Copia `contacts.example.json` como `contacts.private.json`.
2. Sustituye los datos de ejemplo por los contactos reales. Conserva todos los campos y usa un `id` único para cada persona.
3. Genera el archivo cifrado con una contraseña de al menos 12 caracteres:

PowerShell:

```powershell
$env:CONTACTS_PASSWORD="TU-CONTRASEÑA-LARGA"
npm run encrypt:contacts -- contacts.private.json
Remove-Item Env:CONTACTS_PASSWORD
```

Bash:

```bash
CONTACTS_PASSWORD='TU-CONTRASEÑA-LARGA' npm run encrypt:contacts -- contacts.private.json
```

4. Publica el proyecto. `contacts.private.json` está excluido de Git y no debe subirse.

El nombre se conserva sin cifrar para que el buscador funcione antes de desbloquear el directorio. Los demás campos se publican únicamente dentro del bloque cifrado.

## Publicar en GitHub Pages

1. Crea un repositorio en GitHub y sube este proyecto a la rama `main`.
2. En **Settings → Pages → Build and deployment**, elige **GitHub Actions**.
3. El flujo incluido en `.github/workflows/deploy-pages.yml` compilará y publicará el sitio automáticamente.

El flujo también corrige las rutas de recursos para que funcionen dentro de la carpeta del repositorio de GitHub Pages.

## Insertar en un iframe

```html
<iframe
  src="https://TU-USUARIO.github.io/TU-REPOSITORIO/"
  title="Directorio de miembros"
  width="100%"
  height="900"
  loading="lazy"
  style="border:0; border-radius:16px"
></iframe>
```

La contraseña protege el contenido frente a accesos casuales porque los datos sensibles no se publican como texto legible. Para requisitos de seguridad estrictos, control de usuarios o auditoría, se necesita autenticación en servidor; GitHub Pages es un alojamiento completamente estático.
