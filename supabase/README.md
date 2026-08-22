# Supabase local

Esta carpeta contiene la migracion inicial de la base de datos usada por la aplicacion.

## Aplicar en Supabase

1. Crea un proyecto en https://supabase.com/.
2. Abre **SQL Editor** y ejecuta `migrations/20260822000000_initial_schema.sql`.
3. Copia la URL del proyecto y la clave **anon public** en `../scripts/supabase-config.js`.
4. Habilita el proveedor **Email** en **Authentication > Providers**.

La creacion del proyecto remoto requiere iniciar sesion en una cuenta de Supabase. No guardes aqui la clave `service_role`.
