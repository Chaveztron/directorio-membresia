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

## Agregar fotografías a los contactos

1. Guarda cada fotografía dentro de `public/contactos/`. Usa el `id` del contacto como nombre del archivo, por ejemplo `cristhian-emanuel-rodriguez-trujillo.png`.
2. Agrega el campo opcional `imagen` al contacto correspondiente en `contacts.private.json`. Usa una ruta relativa, sin diagonal inicial:

```json
{
  "id": "cristhian-emanuel-rodriguez-trujillo",
  "nombre": "Cristhian Emanuel Rodríguez Trujillo",
  "imagen": "contactos/cristhian-emanuel-rodriguez-trujillo.png"
}
```

3. Ejecuta nuevamente `npm run encrypt:contacts -- contacts.private.json`.

Si el campo `imagen` no existe, está vacío o el archivo no carga, la tarjeta muestra automáticamente las iniciales. Las fotografías se publican sin cifrar para que puedan mostrarse antes de desbloquear el directorio.

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

## Oraciones por contacto con Firebase

GitHub Pages sigue alojando la interfaz, mientras Firebase Authentication y Cloud Firestore almacenan y protegen las oraciones. Solo la cuenta administrativa puede consultar, agregar, editar o eliminar registros.

### 1. Crear Firebase y la cuenta administrativa

1. Crea un proyecto en [Firebase Console](https://console.firebase.google.com/).
2. Abre **Firestore Database**, crea la base de datos y elige **modo producción**.
3. Abre **Authentication → Sign-in method** y habilita **Correo electrónico/contraseña**.
4. En **Authentication → Users**, crea una sola cuenta administrativa y copia su **UID**.
5. En `firestore.rules`, sustituye `REEMPLAZA_CON_UID_ADMIN` por ese UID.
6. Copia el contenido completo de `firestore.rules` en **Firestore Database → Rules** y pulsa **Publish**.

No uses la contraseña del directorio para esta cuenta. La contraseña administrativa debe ser diferente y solamente la debe conocer el administrador.

### 2. Configurar el proyecto local

Copia `.env.example` como `.env.local` y completa:

```env
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_PROJECT_ID=...
VITE_FIREBASE_ADMIN_EMAIL=...
```

La clave web de Firebase identifica la aplicación, pero las reglas de Firestore son las que autorizan o rechazan cada operación. Nunca agregues la contraseña administrativa a un archivo ni al repositorio.

### 3. Configurar GitHub Pages

En el repositorio abre **Settings → Secrets and variables → Actions → Variables** y crea estas tres variables:

- `VITE_FIREBASE_API_KEY`
- `VITE_FIREBASE_PROJECT_ID`
- `VITE_FIREBASE_ADMIN_EMAIL`

Después haz `git push`. El flujo de GitHub Actions incluirá la configuración al compilar la página. La contraseña administrativa nunca se guarda en GitHub ni se integra en el sitio.

### Funcionamiento

- Los botones de oraciones solo aparecen cuando la información del directorio está desbloqueada.
- **Agregar oración** solicita la contraseña administrativa si todavía no hay una sesión activa.
- Después de ingresar, cada tarjeta con registros muestra **Ver oraciones (n)**.
- El formulario permite agregar varios renglones, consultar, editar y marcar registros para eliminación antes de pulsar **Guardar cambios**.
- Al ocultar nuevamente la información del directorio también se cierra la sesión administrativa.
