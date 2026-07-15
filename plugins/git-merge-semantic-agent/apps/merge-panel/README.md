# Semantic Merge panel

Panel React para revisar conflictos sin aplicar cambios automáticamente.

## Desarrollo

1. Copia `.env.example` a `.env` y configura la URL y la publishable key de Supabase.
2. Ejecuta `npm install` y `npm run dev` desde esta carpeta.

Sin variables de Supabase, la interfaz usa datos demostrativos para presentar el flujo. La integración MCP también tiene un adaptador temporal en `src/services/mcpClient.ts`: Integrante 2 debe conectar `analyze`, `regenerate` y `apply` a las herramientas reales.

El panel solo registra hashes y decisiones en Supabase; nunca debe enviar código, claves API ni una service-role key a la base de datos.
