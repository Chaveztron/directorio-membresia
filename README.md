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

Antes de desbloquear, el directorio publica y muestra únicamente el primer nombre. El nombre completo se guarda dentro del bloque cifrado junto con los demás datos sensibles. Mientras el directorio está bloqueado, el buscador consulta solo el primer nombre; después de ingresar la contraseña también permite buscar por el nombre completo.

Después de instalar una actualización que cambie la estructura de los datos cifrados, vuelve a ejecutar `npm run encrypt:contacts -- contacts.private.json` antes de publicar. Esto es necesario para trasladar los nombres completos al bloque cifrado.

> **Nota de privacidad:** si los valores de `id` o los nombres de las fotografías contienen apellidos —por ejemplo, `cristhian-emanuel-rodriguez-trujillo`— esos textos continúan formando parte de las rutas públicas. Cambiarlos por identificadores neutros requiere migrar también las fotografías y las oraciones asociadas; no se realiza automáticamente para evitar perder sus relaciones actuales.

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

Mientras el directorio está bloqueado, las tarjetas muestran únicamente las iniciales. Las fotografías aparecen después de ingresar correctamente la contraseña. Si el campo `imagen` no existe, está vacío o el archivo no carga, la tarjeta también muestra las iniciales.

> **Importante:** este comportamiento oculta las fotografías en la interfaz, pero no cifra los archivos. Todo archivo guardado en `public/contactos/` se publica en GitHub Pages y podría abrirse directamente si alguien conoce su dirección. Para proteger también los archivos originales sería necesario cifrarlos o servirlos desde un almacenamiento privado con autorización.

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

GitHub Pages sigue alojando la interfaz, mientras Firebase Authentication y Cloud Firestore almacenan las oraciones. Al desbloquear el directorio, cualquier visitante puede consultarlas en modo de solo lectura. Solo la cuenta administrativa puede agregar, editar o eliminar registros.

### 1. Crear Firebase y la cuenta administrativa

1. Crea un proyecto en [Firebase Console](https://console.firebase.google.com/).
2. Abre **Firestore Database**, crea la base de datos y elige **modo producción**.
3. Abre **Authentication → Sign-in method** y habilita **Correo electrónico/contraseña**.
4. En **Authentication → Users**, crea una sola cuenta administrativa y copia su **UID**.
5. En `firestore.rules`, verifica que `isPrayerAdmin()` contenga el UID de esa cuenta.
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
- Cada tarjeta con registros muestra **Ver oraciones (n)** sin solicitar la contraseña administrativa.
- La ventana de consulta no permite modificar ni eliminar las peticiones.
- **Agregar oración** y **Administrar oraciones** solicitan la contraseña administrativa si todavía no hay una sesión activa.
- El formulario permite agregar varios renglones, consultar, editar y marcar registros para eliminación antes de pulsar **Guardar cambios**.
- Al ocultar nuevamente la información del directorio también se cierra la sesión administrativa.

> Importante: las reglas permiten leer la colección `prayers` sin autenticación para ofrecer esta consulta. La interfaz solo muestra el botón después de desbloquear el directorio, pero los textos deben considerarse información públicamente legible desde la API de Firestore. No almacenes peticiones confidenciales con esta modalidad.
