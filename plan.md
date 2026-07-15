# plan.md — Git-Merge Semantic Agent para Codex

## Descripción del proyecto

Git-Merge Semantic Agent es un plugin para Codex que ayuda a resolver conflictos de Git de forma semántica. En lugar de comparar únicamente líneas de texto, analiza las versiones `base`, `ours` y `theirs` mediante árboles de sintaxis abstracta (AST), identifica la intención de cada rama y usa una API externa de IA para proponer código fusionado.

El usuario revisa todo desde un panel visual: commits locales relacionados, código en conflicto, cambios detectados, propuesta de IA y diff. La persona conserva el control final: puede aceptar, rechazar, editar o pedir una nueva propuesta.

El sistema no realiza commit ni push automático.

## Tecnologías

- **TypeScript y Node.js:** lógica del plugin, MCP y casos de uso.
- **React:** panel visual del conflicto.
- **MCP local:** comunicación entre Codex, el panel y la lógica del proyecto.
- **Git CLI:** lectura de commits y versiones en conflicto.
- **@babel/parser:** análisis AST de archivos JavaScript y TypeScript.
- **Zod:** validación de respuestas JSON de la IA.
- **DeepSeek API / OpenAI API:** generación de propuestas de merge.
- **Vite:** compilación de la interfaz React.

Variables de entorno:

```env
LLM_PROVIDER=deepseek
DEEPSEEK_API_KEY=
OPENAI_API_KEY=
```

Las claves API se usan únicamente desde el servidor local MCP; nunca se exponen en la interfaz React.

## Estructura del proyecto

```text
.agents/
└── plugins/
    └── marketplace.json

plugins/
└── git-merge-semantic-agent/
    ├── .codex-plugin/
    │   └── plugin.json
    ├── .mcp.json
    ├── .app.json
    ├── skills/
    │   └── semantic-merge/
    │       └── SKILL.md
    ├── apps/
    │   └── merge-panel/
    │       ├── src/
    │       │   ├── App.tsx
    │       │   ├── components/
    │       │   │   ├── CommitSummary.tsx
    │       │   │   ├── ConflictViewer.tsx
    │       │   │   ├── AstChanges.tsx
    │       │   │   ├── MergeProposal.tsx
    │       │   │   └── MergeActions.tsx
    │       │   └── services/
    │       │       └── mcpClient.ts
    │       └── package.json
    ├── src/
    │   ├── domain/
    │   │   ├── MergeConflict.ts
    │   │   ├── CommitInfo.ts
    │   │   ├── ConflictAnalysis.ts
    │   │   ├── MergeProposal.ts
    │   │   └── LlmProvider.ts
    │   ├── application/
    │   │   ├── AnalyzeConflict.ts
    │   │   ├── GenerateMergeProposal.ts
    │   │   └── ApplyApprovedMerge.ts
    │   ├── infrastructure/
    │   │   ├── git/
    │   │   │   └── GitConflictRepository.ts
    │   │   ├── ast/
    │   │   │   └── BabelAstAnalyzer.ts
    │   │   ├── llm/
    │   │   │   ├── DeepSeekProvider.ts
    │   │   │   ├── OpenAiProvider.ts
    │   │   │   └── LlmProviderFactory.ts
    │   │   └── filesystem/
    │   │       └── FileMergeWriter.ts
    │   └── mcp/
    │       └── server.ts
    ├── tests/
    └── package.json

plan.md
```

## Arquitectura

El proyecto sigue Clean Architecture:

- **Dominio:** contiene entidades y contratos. No depende de Git, React, Codex ni APIs externas.
- **Aplicación:** coordina los casos de uso: analizar conflicto, generar propuesta y aplicar una solución aprobada.
- **Infraestructura:** implementa Git, Babel, archivos y proveedores de IA.
- **MCP:** publica herramientas para que Codex y el panel visual consulten o ejecuten acciones.
- **App React:** muestra información y permite que el humano tome decisiones.
- **Skill:** explica a Codex cómo activar el flujo y cómo presentar el resultado.

Patrones aplicados:

- **Repository:** `GitConflictRepository` encapsula Git.
- **Strategy:** `LlmProvider` permite alternar DeepSeek y OpenAI.
- **Factory:** `LlmProviderFactory` selecciona el proveedor mediante `LLM_PROVIDER`.
- **Ports and Adapters:** las APIs, Git y React permanecen fuera del núcleo de negocio.

## Flujo de funcionamiento

1. El usuario abre el panel para un archivo en conflicto.
2. El servidor MCP obtiene los commits locales y las versiones `base`, `ours` y `theirs`.
3. Babel analiza los tres archivos y detecta cambios semánticos.
4. El caso de uso crea un prompt reducido con código relevante y cambios AST.
5. `LlmProviderFactory` selecciona DeepSeek u OpenAI.
6. La API devuelve JSON con código fusionado, explicación, confianza y advertencias.
7. El backend valida el JSON con Zod y verifica que el código sea parseable con Babel.
8. El panel muestra la propuesta y el usuario decide qué hacer.
9. Si acepta, el archivo se escribe solo si su hash no cambió desde el análisis.

## Interfaz visual

El panel debe incluir:

- Archivo afectado y estado del conflicto.
- Hash, autor, fecha y mensaje de los commits locales de base, ours y theirs.
- Tres paneles de código para comparar las versiones.
- Resumen de cambios AST detectados.
- Código fusionado propuesto por IA.
- Diff visual, explicación, nivel de confianza y advertencias.
- Acciones humanas:
  - **Aceptar y aplicar:** confirma y escribe la solución.
  - **Rechazar:** descarta la propuesta sin modificar archivos.
  - **Editar propuesta:** permite modificar el código antes de validar y aplicar.
  - **Nueva propuesta:** solicita otra solución a la API externa.

## División del trabajo

### Integrante 1 — Núcleo, Git y AST

Responsable de la lógica determinista.

- Crear entidades del dominio y contratos.
- Implementar lectura de conflictos Git con base, ours y theirs.
- Obtener información de commits locales.
- Implementar análisis AST con Babel.
- Generar el resumen semántico de cambios.
- Crear fixtures y pruebas de conflictos.

### Integrante 2 — IA externa y servidor MCP

Responsable de la generación de propuestas.

- Crear `LlmProvider`.
- Implementar `DeepSeekProvider` y `OpenAiProvider`.
- Construir prompts de merge con contexto AST.
- Exigir respuestas JSON estructuradas.
- Validar respuestas con Zod y Babel.
- Crear herramientas MCP para analizar, generar y aplicar propuestas.
- Proteger claves API mediante variables de entorno.

### Integrante 3 — Plugin y panel visual

Responsable de la experiencia de usuario.

- Configurar `plugin.json`, `.mcp.json` y `.app.json`.
- Crear la skill de Codex.
- Construir el panel React.
- Mostrar commits, conflicto, análisis AST y propuesta.
- Implementar aceptar, rechazar, editar y nueva propuesta.
- Integrar el cliente MCP.
- Instalar el plugin localmente y preparar la demostración.

## Pruebas requeridas

- Detectar correctamente base, ours y theirs.
- Mostrar commits locales relacionados.
- Identificar un renombrado de variable y una validación añadida.
- Validar que la IA devuelva JSON válido.
- Rechazar código fusionado con sintaxis inválida.
- No modificar archivos al rechazar.
- Bloquear la aplicación si el archivo cambió durante la revisión.
- Aplicar correctamente una propuesta aceptada.
- Verificar que editar una propuesta vuelve a ejecutar validación AST.

## Criterios de aceptación

- El panel muestra commits, conflicto y solución de IA.
- La propuesta conserva cambios válidos de ambas ramas.
- El usuario puede aceptar, rechazar, editar o regenerar.
- Las claves API no llegan al frontend.
- No se modifica ningún archivo sin confirmación humana.
- El plugin puede instalarse desde el marketplace local del repositorio.
