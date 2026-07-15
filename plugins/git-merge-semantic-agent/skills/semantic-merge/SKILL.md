---
name: semantic-merge
description: Analiza conflictos Git de JavaScript y TypeScript, presenta una propuesta semántica y solo aplica cambios con aprobación humana explícita.
---

# Semantic Merge

Usa las herramientas `semantic_merge` para revisar conflictos antes de modificarlos.

1. Analiza el archivo y presenta `base`, `ours`, `theirs`, cambios AST, advertencias y el hash de revisión.
2. Genera una propuesta únicamente cuando el usuario la solicite o confirme el análisis.
3. Resume qué se conservó de cada rama y señala cualquier incertidumbre.
4. Nunca apliques una propuesta sin confirmación explícita del usuario.
5. Antes de aplicar, valida que el archivo no haya cambiado y que la propuesta no contenga marcadores de conflicto.

Si hay un panel disponible, invita al usuario a revisarlo para comparar las tres versiones y decidir entre aceptar, editar, rechazar o regenerar.
