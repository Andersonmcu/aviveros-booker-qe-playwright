# Skills adicionales propuestas

Implementada: [`playwright-test-implementer`](../.claude/skills/playwright-test-implementer/SKILL.md). Estas tres la complementan.

## 1. `failure-triage`: clasificar fallos de una corrida — **Prioridad 1 (la construiría primero)**
- **Propósito:** leer `reports/results.json`, los traces y los screenshots de una corrida fallida, y clasificar cada fallo:
  *defecto de prueba* (locator, datos, timing), *defecto de producto* o *entorno/datos de la demo*. Propone la acción
  (corregir la prueba / abrir un bug con plantilla / re-ejecutar) sin debilitar aserciones.
- **Usuario:** QE y desarrolladores que reciben un pipeline en rojo; también agentes que ejecutan la suite.
- **Entradas:** carpeta `evidence/<timestamp>/` (summary, results.json, traces), `docs/bugs.md` para no duplicar bugs.
- **Salidas:** tabla por prueba fallida con categoría, evidencia (paso, request/response, screenshot) y acción; borrador de bug en el formato de `docs/bugs.md`.
- **Verificación:** se prueba con corridas fallidas conocidas (BUG-01 en UI, un locator roto a propósito, `BASE_URL` inválida) y se compara la clasificación con la esperada.
- **Por qué primero:** es donde más tiempo se pierde hoy (en este proyecto, distinguir BUG-01, BUG-04 y la intermitencia de la demo llevó la mayor parte del análisis), y su resultado sirve para todo el equipo, no solo para quien escribe pruebas.

## 2. `api-contract-diff`: contrato vs. comportamiento observado — **Prioridad 2**
- **Propósito:** dada la documentación de un endpoint (colección Postman/OpenAPI), ejecutar sondas seguras (casos válidos, campos ausentes, tipos inválidos, sin auth) y actualizar `docs/contrato-vs-observado.md` con las diferencias.
- **Usuario:** QE al iniciar la automatización de un servicio nuevo; desarrolladores backend antes de un release.
- **Entradas:** endpoint(s), documentación de referencia, credenciales de prueba por `.env`.
- **Salidas:** filas nuevas en la tabla contrato/observado, candidatos a bug, y casos negativos sugeridos para `booking-negative.spec.ts`.
- **Verificación:** las sondas son reproducibles (mismos códigos en dos corridas) y cada diferencia tiene request/response guardados.

## 3. `test-data-steward`: datos sintéticos y limpieza en entornos compartidos — **Prioridad 3**
- **Propósito:** generar factories de datos válidos según las reglas observadas (longitudes, formatos, fechas libres), detectar datos huérfanos creados por las pruebas y limpiarlos cuando el entorno lo permita.
- **Usuario:** cualquier persona o agente que agregue pruebas contra entornos compartidos.
- **Entradas:** tipos de `src/api/types.ts`, reglas de validación de `docs/contrato-vs-observado.md`, prefijo de datos de prueba.
- **Salidas:** factory nueva o actualizada en `src/data/`, reporte de registros huérfanos (p. ej. apellidos `Qa*`).
- **Verificación:** la factory produce 100 registros válidos consecutivos aceptados por el backend; el reporte de huérfanos coincide con lo creado por la suite.

## Cómo mediría su utilidad
- **Tiempo de triage** de un pipeline en rojo (antes/después de `failure-triage`).
- **% de fallos bien clasificados** en la primera pasada (revisado por una persona).
- **Re-trabajo humano** sobre las salidas del agente: número de correcciones por uso, como las registradas en el README.
- **Adopción:** invocaciones por semana y cuántas personas distintas la usan.

## Qué resolvería con un script o una fixture en lugar de una skill
- Elegir fechas libres, crear huéspedes únicos y limpiar al final → **fixtures** (`bookingDraft`, `trackBooking`): son deterministas y no necesitan criterio.
- Guardar código de salida y evidencias → **script** (`scripts/run-with-evidence.mjs`).
- Exportar la transcripción de un agente a Markdown → **script**.
- Regla práctica: si el paso no requiere juicio (clasificar, decidir, redactar), va en código; la skill orquesta y decide.
