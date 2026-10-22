# Portal de capacitaciones

Sitio de eventos para GitHub Pages. La página es estática. Los eventos, las inscripciones y los usuarios se guardan en una hoja de cálculo de Google, a través de Apps Script.

Mientras `js/config.js` tenga la URL vacía, el sitio abre una **vista de prueba** en el navegador. Esos datos no van a Google. Sirve para recorrer el sistema antes de conectarlo:

- Administrador: `admin` / `admin123`
- Organizador del primer evento: `lima.cursos` / `evento123`

## Qué puede hacer cada quien

- Cualquier persona ve los eventos abiertos, entra a la ficha y se inscribe con nombres, apellidos, DNI, correo, categoría (profesional o estudiante) y WhatsApp.
- El administrador entra por **Entrar**, crea eventos, los activa o los pausa, y asigna un usuario a cada organización.
- Ese usuario solo ve las inscripciones de su evento, marca quién pagó y quién sigue pendiente, y puede descargar la lista en Excel.
- Pausar un evento lo saca de la programación y cierra el formulario. La organización igual puede revisar su lista.

El pago no se cobra en línea. La organización lo confirma a mano.

## 1. Preparar la hoja de Google

1. Entra a [Google Sheets](https://sheets.google.com) y crea una hoja en blanco. Ponle el nombre que quieras. No la compartas con el público.
2. Menú **Extensiones > Apps Script**.
3. Borra lo que aparezca y pega todo el archivo `apps-script/Codigo.gs`.
4. Arriba del archivo, cambia `CLAVE_INICIAL_ADMIN = "CAMBIAR"` por una clave tuya de al menos 8 caracteres.
5. En **Proyecto > Configuración del proyecto**, pon la zona horaria de tu país (por ejemplo `America/Lima`).
6. Elige la función `inicializar` y pulsa **Ejecutar**. La primera vez Google pide permiso para editar la hoja. Acéptalo.
7. Vuelve a la hoja. Deben aparecer las pestañas `LEEME`, `Usuarios`, `Eventos`, `Inscripciones` y `Sesiones`.

## 2. Publicar el puente

1. En Apps Script: **Implementar > Nueva implementación**.
2. Tipo: **Aplicación web**.
3. Ejecutar como: **Yo**.
4. Quién tiene acceso: **Cualquier persona**.
5. Implementar y copiar la URL. Tiene que terminar en `/exec`.

La URL de `/dev` no sirve para el sitio público. Si más adelante cambias el script, entra a **Implementar > Administrar implementaciones**, edita la misma implementación y elige **Nueva versión**. Así la URL no cambia.

## 3. Conectar el sitio

En `js/config.js`:

```javascript
window.APP_CONFIG = {
  SCRIPT_URL: "https://script.google.com/macros/s/XXXX/exec",
  NOMBRE_SITIO: "Portal de Capacitaciones",
  BAJADA: "Cursos, talleres y capacitaciones con inscripción en línea."
};
```

Abre el sitio, entra con el usuario `admin` y la clave que pusiste en el script, y cámbiala en **Contraseña**.

Al crear un evento, define el usuario y la clave de su organizador y entrégaselos tú. La clave no se vuelve a mostrar. Si la olvidan, ábrelo en **Editar** y escribe una nueva.

## 4. Publicarlo en GitHub Pages

1. Crea un repositorio en tu cuenta de GitHub y sube estos archivos (la raíz del repositorio, no una subcarpeta).
2. En el repositorio: **Settings > Pages**.
3. Origen: **Deploy from a branch**. Rama `main` y carpeta `/ (root)`.
4. La dirección queda en `https://tu-usuario.github.io/nombre-del-repo/`.

Si el repositorio se llama exactamente `tu-usuario.github.io`, el sitio queda en la raíz de tu usuario.

Cada vez que cambies el sitio, sube de nuevo los archivos. Si cambias estilos o scripts y el navegador muestra la versión vieja, sube el número `?v=1` de `index.html`.

## Si algo no carga

- Abre en el navegador la URL que termina en `/exec`. Tiene que verse un texto JSON, no una página de acceso de Google.
- Si Google pide iniciar sesión, la implementación no está en **Cualquier persona**.
- Si el sitio dice que no puede conectar, confirma que pegaste la URL `/exec` y que guardaste `js/config.js` en GitHub.

## Datos y límites

En la hoja quedan nombres, DNI, correos y teléfonos. Déjala privada. El sitio público solo habla con el script, y el script solo entrega la lista de inscritos a quien inició sesión.

Las claves se guardan cifradas. La sesión dura 12 horas. Tras varios intentos fallidos, ese usuario espera 15 minutos.

Sirve para la programación de una organización o de varias organizaciones chicas. No cobra con tarjeta ni envía correos automáticos: el contacto con el inscrito es por el WhatsApp que dejó.
