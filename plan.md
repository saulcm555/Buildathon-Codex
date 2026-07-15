# Plan de desarrollo — Git-Merge Semantic Agent

## 1. Propósito del proyecto

Git-Merge Semantic Agent es un plugin local para Codex que ayuda a resolver conflictos de Git con análisis semántico. El sistema obtiene las versiones `base`, `ours` y `theirs` de un archivo en conflicto, analiza sus cambios mediante AST, consulta una API externa de IA y presenta una propuesta de fusión en un panel visual.

La persona revisa el conflicto, los commits locales relacionados, los cambios detectados y el código propuesto. Puede aceptar, rechazar, editar o pedir una nueva propuesta. El MVP nunca hace `commit` ni `push` automáticamente.

## 2. Arquitectura y tecnologías

- **Plugin de Codex:** manifiesto, skill, App y configuración MCP.
- **TypeScript / Node.js:** lógica de negocio, Git, AST, MCP y acceso a APIs externas.
- **React:** panel visual de revisión del conflicto.
- **MCP local:** puente entre Codex, la App y la lógica del plugin.
- **Git CLI:** lectura de las tres etapas del conflicto y de commits locales.
- **@babel/parser:** parsing de JavaScript y TypeScript para identificar cambios estructurales.
- **Zod:** validación de la respuesta JSON generada por IA.
- **DeepSeek API u OpenAI API:** generación de propuestas de código fusionado.

La arquitectura sigue Clean Architecture: `domain/` contiene tipos y contratos sin dependencias externas; `application/` coordina casos de uso; `infrastructure/` implementa Git, Babel, archivos y proveedores LLM; `mcp/` expone las operaciones al panel y a Codex.

## 3. Flujo general

1. El usuario abre el panel para un archivo que Git marca como conflicto.
2. El servidor MCP lee las versiones `base`, `ours` y `theirs`, además de metadatos de commits locales.
3. El analizador Babel compara los AST y resume cambios relevantes: funciones, parámetros, validaciones y retornos.
4. El caso de uso construye un prompt reducido y llama a DeepSeek u OpenAI mediante un adaptador intercambiable.
5. La IA responde JSON con `mergedCode`, explicación, confianza y advertencias.
6. El backend valida JSON, sintaxis Babel y hash del archivo analizado.
7. El panel muestra el conflicto, el diff y la propuesta.
8. El usuario decide aceptar, rechazar, editar o solicitar una alternativa.
9. Solo al aceptar, el sistema escribe el código validado si el archivo no cambió durante la revisión.

## 4. Contratos compartidos

Los tres integrantes deben respetar estas estructuras antes de integrar módulos:

```ts
type CommitInfo = {
  hash: string;
  author: string;
  date: string;
  message: string;
};

type AstChange = {
  branch: 'ours' | 'theirs';
  kind: 'function' | 'parameter' | 'variable' | 'rename' | 'validation' | 'return';
  summary: string;
  location?: string;
};

type MergeConflict = {
  repositoryPath: string;
  filePath: string;
  language: 'javascript' | 'typescript' | 'jsx' | 'tsx';
  base: string;
  ours: string;
  theirs: string;
  commits: {
    base: CommitInfo;
    ours: CommitInfo;
    theirs: CommitInfo;
  };
  originalHash: string;
};

type ConflictAnalysis = {
  conflict: MergeConflict;
  astChanges: AstChange[];
};

type MergeProposal = {
  mergedCode: string;
  explanation: string;
  confidence: 'high' | 'medium' | 'low';
  warnings: string[];
};
```

Herramientas MCP previstas:

- `analyze_merge_conflict({ filePath })` devuelve `ConflictAnalysis`.
- `generate_merge_proposal({ analysis, feedback? })` devuelve `MergeProposal`.
- `apply_merge_proposal({ filePath, mergedCode, expectedFileHash })` valida y escribe el resultado.

## 5. Trabajo general del equipo

1. Crear el manifiesto del plugin y mantener los contratos compartidos como fuente única de integración.
2. Implementar lectura de conflictos y análisis AST antes de conectar una IA.
3. Integrar el proveedor LLM detrás de la interfaz `LlmProvider`, sin acoplar el resto del sistema a DeepSeek u OpenAI.
4. Exponer los casos de uso mediante MCP.
5. Construir el panel React contra las respuestas MCP, no contra Git ni APIs directamente.
6. Integrar las acciones humanas y validar el flujo completo con un conflicto real de prueba.
7. Verificar que no haya aplicación de archivos, commit ni push sin aprobación explícita.

## 6. Integrante 1 — Dominio, Git y análisis AST

### Objetivo

Convertir un conflicto de Git en datos estructurados, confiables y pequeños que los demás módulos puedan consumir. Este trabajo es determinista: no llama a la IA ni conoce la interfaz React.

### Responsabilidades

1. Definir `CommitInfo`, `AstChange`, `ConflictAnalysis` y `MergeConflict` en `src/domain/`.
2. Definir el contrato de repositorio para obtener las tres etapas de Git.
3. Implementar `GitConflictRepository` para leer:
   - Base: `git show :1:<ruta>`.
   - Nuestra rama: `git show :2:<ruta>`.
   - Su rama: `git show :3:<ruta>`.
   - Metadatos de commits locales: hash corto, autor, fecha y mensaje.
4. Implementar `BabelAstAnalyzer` con `@babel/parser`.
5. Comparar las versiones para resumir cambios de alto valor para el MVP:
   - Funciones añadidas o modificadas.
   - Parámetros o variables renombradas.
   - Validaciones `if` añadidas.
   - Retornos modificados.
6. Implementar `AnalyzeConflict`, que reúne Git, AST y el hash del archivo actual en un `ConflictAnalysis`.
7. Crear fixtures con el caso de demo: renombrado de variable en `ours` y validación adicional en `theirs`.

### Por qué es importante

La IA recibe contexto reducido y exacto en vez de archivos completos innecesarios. Esto disminuye latencia, costo y probabilidad de que la propuesta elimine cambios válidos.

### Entregables

- `AnalyzeConflict.ts` funcional.
- `GitConflictRepository.ts` funcional.
- `BabelAstAnalyzer.ts` funcional.
- Tipos compartidos estables.
- Pruebas unitarias de Git simulado y análisis AST.

### Fuera de alcance

- No crear prompts.
- No llamar DeepSeek ni OpenAI.
- No modificar archivos.
- No construir componentes React.

## 7. Integrante 2 — IA externa, validación y MCP

### Objetivo

Transformar el análisis estructurado en una propuesta segura de merge y publicarlo mediante herramientas MCP.

### Responsabilidades

1. Definir `LlmProvider` en `src/domain/LlmProvider.ts`.
2. Crear `DeepSeekProvider` y `OpenAiProvider` con la misma interfaz.
3. Crear `LlmProviderFactory` para seleccionar el adaptador según `LLM_PROVIDER`.
4. Construir un prompt que incluya solo:
   - Las tres versiones del código.
   - El resumen AST.
   - La instrucción de preservar intención de ambas ramas.
   - El formato JSON obligatorio de `MergeProposal`.
5. Validar la respuesta con Zod; rechazar JSON incompleto, código vacío o campos fuera del contrato.
6. Volver a parsear `mergedCode` con Babel antes de devolverlo al panel.
7. Implementar `GenerateMergeProposal` y soportar `feedback` para pedir una alternativa después de un rechazo.
8. Implementar `ApplyApprovedMerge` y `FileMergeWriter`:
   - Comparar `expectedFileHash` con el archivo actual.
   - Validar sintaxis antes de escribir.
   - Escribir solo tras la confirmación que envía el panel.
9. Exponer las tres herramientas MCP acordadas desde `src/mcp/server.ts`.

### Por qué es importante

El proveedor de IA puede cambiar sin reescribir Git, AST ni el panel. Las validaciones evitan que una respuesta incorrecta o truncada se convierta directamente en una modificación del repositorio.

### Entregables

- Proveedores DeepSeek y OpenAI configurables.
- Validación de respuestas JSON y sintaxis.
- Servidor MCP con análisis, generación y aplicación.
- Pruebas con respuestas válidas, JSON inválido, timeout y archivo modificado.

### Fuera de alcance

- No acceder a la clave API desde React.
- No hacer commit ni push.
- No diseñar la interfaz visual.

## 8. Integrante 3 — Plugin, skill y panel visual

### Objetivo

Ofrecer una experiencia clara para revisar un conflicto y tomar la decisión final de forma humana.

### Responsabilidades

1. Completar `.codex-plugin/plugin.json`, `.mcp.json` y `.app.json` cuando los contratos MCP estén definidos.
2. Escribir `SKILL.md` para que Codex active el panel y use las herramientas MCP; la skill no contiene claves ni lógica de proveedores.
3. Construir la App React con los componentes:
   - `CommitSummary`: commits base, ours y theirs.
   - `ConflictViewer`: tres columnas de código.
   - `AstChanges`: resumen de cambios detectados.
   - `MergeProposal`: código propuesto, diff, explicación, confianza y advertencias.
   - `MergeActions`: aceptar, rechazar, editar y nueva propuesta.
4. Crear `mcpClient.ts` para consumir solamente las herramientas MCP.
5. Implementar estados de interfaz: cargando, propuesta lista, error, edición, confirmación y aplicado.
6. Hacer que las acciones funcionen así:
   - **Aceptar:** abrir confirmación y llamar `apply_merge_proposal`.
   - **Rechazar:** descartar la propuesta en memoria sin tocar archivos.
   - **Editar:** habilitar edición de `mergedCode` y aplicar la versión editada tras validar.
   - **Nueva propuesta:** pedir otra generación con un comentario opcional de rechazo.
7. Instalar el plugin desde el marketplace local y verificarlo en un task nuevo de Codex.

### Por qué es importante

La propuesta de IA debe ser explicable y revisable. El panel demuestra que el sistema ayuda al desarrollador sin sustituir su decisión.

### Entregables

- Manifiestos válidos del plugin.
- Panel React funcional.
- Flujo de revisión humana completo.
- Prueba manual de instalación y demostración.

### Fuera de alcance

- No implementar lógica Git dentro de componentes.
- No almacenar claves API en el frontend.
- No ejecutar commit ni push automático.

## 9. Pruebas y criterios de aceptación

- El análisis obtiene correctamente `base`, `ours` y `theirs`.
- El caso de demo detecta un renombrado y una validación adicional.
- La API devuelve una propuesta que cumple el esquema `MergeProposal`.
- El código propuesto debe pasar parsing Babel antes de mostrarse como aplicable.
- El panel muestra commits, conflicto, cambios AST, diff y explicación.
- Rechazar no modifica archivos.
- Editar valida el código antes de aplicar.
- Aceptar requiere confirmación y bloquea la escritura si cambió el hash del archivo.
- No existe commit ni push automático.

## 10. Configuración manual de variables de entorno

Sí, debes crear manualmente un archivo `.env` en:

```text
plugins/git-merge-semantic-agent/.env
```

Este archivo ya está protegido por el `.gitignore` raíz y no debe subirse al repositorio.

Para DeepSeek, usa:

```env
LLM_PROVIDER=deepseek
LLM_MODEL=<modelo-deepseek-habilitado>
DEEPSEEK_API_KEY=<tu-clave-api>
LLM_TIMEOUT_MS=30000
```

Para OpenAI, usa:

```env
LLM_PROVIDER=openai
LLM_MODEL=<modelo-openai-habilitado>
OPENAI_API_KEY=<tu-clave-api>
LLM_TIMEOUT_MS=30000
```

Solo configura la clave del proveedor elegido. `LLM_MODEL` se dejará configurable para no acoplar el proyecto a un modelo específico. Más adelante se debe crear `.env.example` sin claves reales para compartir los nombres de variables con el equipo.
