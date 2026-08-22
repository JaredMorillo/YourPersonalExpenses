# Gastos y Ahorros Personales

Aplicacion web estatica para controlar gastos, ahorros, ingresos mensuales y metas de ahorro. Los datos se almacenan en Supabase y quedan asociados a la cuenta autenticada.

## Funciones

- Registro e inicio de sesion con correo o nombre de usuario.
- Cierre de sesion desde la pagina de perfil.
- Registro de gastos y ahorros.
- Clasificacion por nombre, categoria, origen y fecha.
- Calculo de ingresos, gastos, ahorros y saldo disponible.
- Seguimiento visual de la meta de ahorro.
- Historial mensual por usuario.
- Sincronizacion de datos entre dispositivos.
- Icono para favoritos y accesos en iOS.

## Tecnologias

- HTML5
- CSS3
- JavaScript vanilla
- Supabase Auth
- Supabase Database

## Estructura

```text
.
├── index.html                  # Panel principal
├── savings.html                # Metas y movimientos de ahorro
├── accounts/
│   ├── account.html            # Inicio de sesion
│   ├── register.html           # Registro de cuentas
│   └── session.html            # Perfil e historial mensual
├── images/
│   ├── favicon.ico
│   └── apple-touch-icon.png
├── scripts/
│   ├── script.js               # Logica principal
│   └── supabase-config.js      # Configuracion de Supabase
├── styles/                     # Hojas de estilo
├── supabase-schema.sql         # Tablas, politicas y funciones SQL
└── SUPABASE_SETUP.md           # Notas de configuracion
```

## Configuracion de Supabase

1. Crea un proyecto en [Supabase](https://supabase.com/).
2. Abre **SQL Editor** y ejecuta el contenido de `supabase-schema.sql`.
3. Copia la URL del proyecto y la clave anon publica desde **Project Settings > API**.
4. Sustituye los valores de `scripts/supabase-config.js`:

   ```js
   window.SUPABASE_URL = 'https://TU-PROYECTO.supabase.co';
   window.SUPABASE_ANON_KEY = 'TU_CLAVE_ANON_PUBLICA';
   ```

5. En **Authentication > URL Configuration**, agrega la URL donde se publicara la aplicacion.
6. Verifica que el proveedor **Email** este habilitado.
7. Para permitir inicio de sesion con nombre de usuario, ejecuta tambien la funcion `get_email_by_username` incluida al final de `supabase-schema.sql`.

Durante las pruebas puedes desactivar **Confirm email** en **Authentication > Providers > Email**. En produccion se recomienda mantener la confirmacion de correo activada.

## Ejecucion local

No requiere un proceso de compilacion ni dependencias de Node.js. Sirve la carpeta raiz con cualquier servidor estatico. Por ejemplo, usando Python:

```powershell
python -m http.server 8000
```

Abre [http://localhost:8000](http://localhost:8000) en el navegador.

Tambien puedes utilizar la extension Live Server de VS Code.

## Publicacion

Publica toda la carpeta en un hosting estatico como GitHub Pages, Netlify o Vercel. Configura en Supabase la URL final de la aplicacion dentro de **Authentication > URL Configuration**.

## Seguridad

- No incluyas la `service_role` key en el frontend.
- Usa unicamente la clave anon publica en `scripts/supabase-config.js`.
- Las tablas utilizan Row Level Security para separar los datos de cada usuario.
- No publiques credenciales reales dentro del repositorio si el proyecto es privado o compartido.
