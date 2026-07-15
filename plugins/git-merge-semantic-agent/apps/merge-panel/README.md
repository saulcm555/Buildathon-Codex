# Semantic Merge panel

Panel React para revisar conflictos sin aplicar cambios automáticamente.

## Desarrollo

1. Configura la URL y la publishable key de Supabase en el archivo `.env`.
2. Ejecuta `npm install` y `npm run dev` desde esta carpeta.

Sin variables de Supabase, la interfaz usa datos demostrativos para presentar el flujo. La conexión se centraliza en `src/services/supabase.ts` y se activa de forma opcional mediante las dos variables `VITE_SUPABASE_*`. La integración MCP también tiene un adaptador temporal en `src/services/mcpClient.ts`: Integrante 2 debe conectar `analyze`, `regenerate` y `apply` a las herramientas reales.

El panel solo registra hashes y decisiones en Supabase; nunca debe enviar código, claves API ni una service-role key a la base de datos.
