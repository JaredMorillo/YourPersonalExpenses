# Configuracion de sincronizacion

1. Crea un proyecto en [Supabase](https://supabase.com/).
2. Entra a **SQL Editor**, pega el contenido de `supabase-schema.sql` y ejecutalo.
3. En **Project Settings > API**, copia **Project URL** y ** anon public key**.
4. Pega esos valores en `scripts/supabase-config.js`.
5. En **Authentication > URL Configuration**, agrega la URL donde publicaras la aplicacion.
6. Publica la carpeta completa en un hosting estatico, por ejemplo GitHub Pages o Netlify.

La aplicacion permite iniciar sesion con el correo electronico o el nombre de usuario registrado. Para habilitar el acceso por nombre de usuario, ejecuta tambien en el SQL Editor la funcion `get_email_by_username` incluida al final de `supabase-schema.sql`. Supabase conserva la sesion en el navegador y los datos financieros quedan asociados al usuario, por lo que aparecen al iniciar sesion desde otro dispositivo.

Durante las pruebas puedes desactivar **Confirm email** en **Authentication > Providers > Email**. En produccion es mejor mantener la confirmacion activada.