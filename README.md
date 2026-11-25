# aviveros-booker-qe-playwright

Pruebas automatizadas **API y UI** con **Playwright Test + TypeScript** para la reserva de habitaciones de
[Restful Booker Platform](https://automationintesting.online/). Es la solución a la prueba técnica de Quality Engineer
de Andersson Viveros.

> **Estado actual (corrida oficial): 11 de 13 pruebas pasan; 2 fallan.** Las 2 en rojo son las de UI y fallan por un
> **defecto real del producto** (BUG-01: la página de reserva queda en blanco), no de las pruebas. Las 11 incluyen 4
> pruebas de contrato que documentan bugs conocidos con `test.fail`. Además, las pruebas de creación por API fallan de
> forma intermitente por BUG-04 (409 a una reserva que sí se guardó). Detalle en [docs/bugs.md](docs/bugs.md).
> No se debilitó ninguna aserción ni se usó `skip`.

---

## 1. Instalación

Requisitos: **Node.js ≥ 20** y Git. No requiere permisos de administrador: el desarrollo se hizo con Node portable (ZIP).

```powershell
git clone https://github.com/Andersonmcu/aviveros-booker-qe-playwright.git
cd aviveros-booker-qe-playwright
npm ci                                # instala versiones exactas del package-lock.json
npx playwright install chromium       # navegador de las pruebas UI (en la carpeta del usuario)
```

Si la red corporativa bloquea la descarga del navegador, se puede usar el Chrome instalado con
`$env:BROWSER_CHANNEL='chrome'` (PowerShell) o `BROWSER_CHANNEL=chrome` en `.env`.

> **Windows/PowerShell:** si aparece *"la ejecución de scripts está deshabilitada"* al correr `npm`, ejecuta
> `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned`. Si Node se descomprimió de un ZIP descargado, ejecuta también
> `Get-ChildItem <carpeta-node> -Recurse | Unblock-File`.

## 2. Entorno

Todo se configura por variables de entorno. Hay valores por defecto para la demo pública, así que funciona sin `.env`.
Para cambiarlos, copia `.env.example` a `.env`.

| Variable | Default | Uso |
|---|---|---|
| `BASE_URL` | `https://automationintesting.online` | Entorno objetivo (UI y API) |
| `ADMIN_USER` / `ADMIN_PASSWORD` | `admin` / `password` | Credenciales **públicas** de la demo ([repositorio oficial](https://github.com/mwinteringham/restful-booker-platform)) |
| `WORKERS` | `2` | Procesos en paralelo |
| `RETRIES` | `0` | Reintentos (0 a propósito: ver BUG-04) |
| `BROWSER_CHANNEL` | (vacío) | `chrome` para usar el Chrome instalado |

**Rutas y autenticación confirmadas en la demo:** `POST /api/auth/login` → `{ token }`; los endpoints protegidos lo
esperan como cookie `token=<valor>`. Según la documentación de Postman, la demo **se reinicia cada 10 minutos** (datos y tokens),
así que cada prueba crea sus propios datos y el token se obtiene al inicio de cada corrida.
Expectativas definidas desde la colección Postman: [docs/contrato-vs-observado.md](docs/contrato-vs-observado.md).

## 3. Comandos

| Comando | Qué hace |
|---|---|
| `npm test` | Suite completa (API + UI) con 2 workers |
| `npm run test:api` / `npm run test:ui` | Solo un proyecto |
| `npm run test:smoke` | Gate de smoke (`@smoke`) |
| `npm run test:regression` | Gate de regresión (`@regression`) |
| `npm run test:evidence -- [args]` | Ejecuta y guarda **código de salida + reportes** en `evidence/<timestamp>/` |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run report` | Abre el último reporte HTML |
| `npx playwright show-trace <trace.zip>` | Abre un trace de un fallo |

**Para agentes y CI:** usar `npm run test:evidence`. El proceso termina con el **mismo código de salida** que Playwright
(0 = verde, ≠0 = fallo) y deja `summary.json` con `passed/failed/skipped`. Una prueba omitida o no ejecutada **no cuenta como aprobada**.

## 4. Cobertura

| Escenario | Archivo | Qué se valida | Resultado |
|---|---|---|---|
| **1. API exitosa** (2 conjuntos de datos) | `tests/api/booking-create.spec.ts` | 201; `bookingid`; habitación, fechas, nombre, apellido y depósito; el mismo registro en el listado (`toEqual`); fechas ocupadas en `/summary` | 🔴 intermitente por BUG-04 (409 con la reserva guardada). Falló en 2 de ~9 corridas, incluida la oficial |
| Contrato `GET /booking/{id}` | ídem | Expectativa del contrato (200) marcada con `test.fail` por BUG-01 | ✅ (fallo esperado) |
| Contrato Postman y validaciones (4) | `tests/api/booking-contract.spec.ts` | `email`/`phone` opcionales (201); sin `bookingdates` → 400 (BUG-02); fechas invertidas → 400 (BUG-03); listado sin `roomid` → 200 (BUG-05) | ✅ 1 verde + 3 fallos esperados |
| **2. API negativa** (4 casos) | `tests/api/booking-negative.spec.ts` | 400 + mensaje (sin firstname, lastname de 2 letras, email inválido, teléfono corto) y que **no se creó** la reserva | ✅ |
| **3. UI + API** (habitaciones 1 y 2) | `tests/ui/reservation.spec.ts` | Reserva por UI → "Booking Confirmed" con el rango de fechas → mismo registro por API (habitación, fechas, nombre, apellido) | 🔴 BUG-01: la página no carga |

- **Datos:** huésped sintético con apellido único (`QaXxxxxx`) y fechas **libres** consultadas en `/api/booking/summary`.
- **Paralelismo:** `fullyParallel` con 2 workers; ninguna prueba depende de otra.
- **Evidencia ante fallos:** trace, screenshot y video (`retain-on-failure`), además de JSON y JUnit.
- **Ejecución oficial:** [`evidence/2026-11-25T01-06-31-207Z`](evidence/2026-11-25T01-06-31-207Z) (`exitCode=1`: 11 pasan, 2 fallan por BUG-01).
  Corridas anteriores, conservadas como evidencia:
  - [`2026-11-25T00-35-36-068Z`](evidence/2026-11-25T00-35-36-068Z): **evidencia de BUG-04** (las 2 creaciones por API reciben 409 y las reservas quedan guardadas; trace incluido).
  - [`2026-11-24T23-14-52-923Z`](evidence/2026-11-24T23-14-52-923Z): la corrida del agente (API 7/7, UI 0/2 por BUG-01).
  - [`2026-11-24T13-44-14-512Z`](evidence/2026-11-24T13-44-14-512Z): primera corrida, API 6/6 en verde.

## 5. Arquitectura

```
src/
  config/env.ts            entorno (variables con defaults)
  api/                     clientes de API separados por servicio
    AuthClient.ts          login → token
    BookingClient.ts       métodos raw (devuelven la respuesta) + de conveniencia (devuelven datos tipados)
    types.ts               contrato tipado
  data/                    datos sintéticos: guestFactory (apellido único), dates (rango libre)
  pages/ReservationPage.ts POM de /reservation/{roomid}: locators por rol, sin aserciones de negocio
  fixtures/index.ts        adminToken (por worker), bookingApi, bookingDraft, reservationPage, trackBooking (teardown)
tests/api, tests/ui        especificaciones
scripts/                   run-with-evidence.mjs (harness), export-transcript.mjs (evidencia de IA)
.claude/skills/            skill playwright-test-implementer
docs/                      contrato vs observado, bugs, casos adicionales, skills propuestas, evidencia de IA
```

**Decisiones clave**
- **Fixtures en lugar de `beforeEach`:** se componen, se reutilizan entre archivos y su *teardown* corre aunque la prueba falle. El token es por worker: un login por proceso.
- **Clientes con métodos raw:** la prueba decide qué esperar, así que el mismo método sirve para casos positivos y negativos.
- **"Consultar" una reserva** se hace con `GET /api/booking?roomid=` filtrando por id o apellido, porque `GET /{id}` responde 500 (BUG-01).
- **`retries: 0`:** un reintento verde escondería BUG-04.
- **`test.fail` en lugar de `skip`** para bugs conocidos acordados: conserva la expectativa del contrato y avisa cuando el bug se corrija. Las pruebas UI se dejaron **en rojo** a propósito: el gate debe reflejar el estado real del producto.

## 6. Bugs, riesgos y limitaciones

**Bugs** (pasos, esperado, observado y evidencia en [docs/bugs.md](docs/bugs.md)):
- **BUG-01 (alta):** todas las rutas `/api/<recurso>/{id}` responden 500. La reserva por UI no carga y no se puede borrar.
- **BUG-02 (media):** `POST /api/booking` sin `bookingdates` responde 500 en vez de 400.
- **BUG-03 (baja):** checkout < checkin responde 409 (conflicto) en vez de 400.
- **BUG-04 (media, intermitente):** el POST de reserva responde 409 aunque la reserva **se guardó**, probablemente por un reintento del proxy. En la UI, además, la página se cae. **Confirmado por API** (`evidence/2026-11-25T00-35-36-068Z`).
- **BUG-05 (baja):** `GET /api/booking/` sin `roomid` responde 400, aunque la documentación de Postman dice que devuelve todas las reservas.

**Limitaciones**
- La API no devuelve `email` ni `phone`, así que no se verifican por API.
- No se pueden limpiar los datos de prueba (`DELETE` → 500). Queda anotado en el reporte de cada prueba.
- En el caso negativo de *lastname* de 2 letras, la comprobación de "no creada" busca el apellido original, por lo que es más débil (documentado en el código).
- El escenario UI no pudo verse en verde contra la demo. El agente validó los locators y el flujo completo con un **diagnóstico temporal** que simulaba solo el endpoint roto (ver sección 8).
- La demo es compartida: los reinicios y otros usuarios pueden afectar los resultados. Se mitiga con datos únicos y fechas aleatorias libres.

**Casos adicionales priorizados** (con el riesgo que cubre cada uno): [docs/casos-adicionales.md](docs/casos-adicionales.md).

## 7. Cómo lo usaría otro desarrollador y conexión con gates

1. Clona el repositorio, ejecuta `npm ci` y `npx playwright install chromium`, y luego `npm test`.
2. Para un escenario nuevo, invoca la skill en Claude Code: `/playwright-test-implementer <escenario, tipo, datos, tags>`.
   La skill lo guía a reutilizar los clientes y fixtures, ejecutar y documentar.
3. **Gates:**
   - **Smoke** (`npm run test:evidence -- --grep @smoke`) en cada despliegue o PR: flujo principal y bloqueante.
   - **Regresión** (`--grep @regression`) nocturna o antes de un release.
   - El pipeline usa el **código de salida** como gate y publica `junit.xml` y el reporte HTML como artefactos.
   - Los `@known-bug` corren en regresión: si un bug se corrige, la prueba se pone roja y obliga a actualizar el estado.

Ejemplo mínimo en GitHub Actions:
```yaml
- run: npm ci && npx playwright install --with-deps chromium
- run: npm run test:evidence -- --grep @smoke   # falla el job si exitCode != 0
- uses: actions/upload-artifact@v4
  if: always()
  with: { name: evidence, path: evidence/ }
```

## 8. Uso de IA

**Skill:** [`.claude/skills/playwright-test-implementer/SKILL.md`](.claude/skills/playwright-test-implementer/SKILL.md),
con propósito, entradas, pasos, convenciones de POM y fixtures, comandos de verificación, criterios de éxito y cómo actuar ante errores o información insuficiente.

**Commits que lo evidencian**
1. `c5921ff`: skill commiteada **antes** de usarla.
2. Commit final: resultado del agente y correcciones humanas (ver `git log`).

**Invocación:** Claude Code (Claude Opus 5.5) en una sesión limpia, sin el contexto previo, con:
```
/playwright-test-implementer Escenario ui+api: completar una reserva por UI en /reservation/{roomid} con fechas libres,
verificar el mensaje de confirmación y consultar por API el mismo registro (habitación, fechas, nombre y apellido).
Parametriza habitaciones 1 y 2. Tags @ui @smoke @regression. No hagas commit.
```
Transcripción completa: [docs/evidencia-ia/transcripcion-agente.md](docs/evidencia-ia/transcripcion-agente.md)
(exportada del registro local de Claude Code con `scripts/export-transcript.mjs`).

**Cambios del agente:** `src/pages/ReservationPage.ts` (nuevo), la fixture `reservationPage`, `tests/ui/reservation.spec.ts` (nuevo),
evidencia de BUG-01 en la UI y el hallazgo de **BUG-04** en `docs/bugs.md` y `docs/contrato-vs-observado.md`.

**Ejecución del agente:** `tsc` sin errores; 7/7 API en verde; UI 0/2 por BUG-01. Evidencia en `evidence/2026-11-24T23-14-52-923Z`.
Preguntó si marcar las pruebas UI con `test.fail`; **decisión humana: dejarlas en rojo**, porque el gate debe mostrar el defecto.

**Revisión humana y correcciones justificadas**

| # | Observación | Corrección | Justificación |
|---|---|---|---|
| 1 | El comentario de la prueba UI decía "Escenario 2" | Cambiado a "Escenario 3" | Coincidir con el enunciado; evitar confusión a quien tome el proyecto |
| 2 | Para diagnosticar, el agente usó `page.route` (simulación), algo que la skill prohíbe en escenarios de negocio | Se aceptó porque fue temporal, se borró y la prueba entregada usa el backend real. **Se precisó la skill**: la simulación solo se permite como diagnóstico temporal, declarado y con evidencia | La regla original era ambigua para diagnóstico; aislar el defecto aportó valor (permitió encontrar BUG-04) |
| 3 | BUG-04 quedó como hipótesis: el trace se perdió | Se confirmó por API en la corrida oficial: 2 reservas con 409 que sí quedaron guardadas, con trace conservado | Un bug sin evidencia no es accionable |
| 4 | Intermitencia previa en las pruebas API sin explicar | Relacionada con BUG-04 y documentada; `retries` se mantiene en 0 | No ocultar el fallo con reintentos |
| 5 | Calidad del POM, locators, esperas y aserciones | Sin cambios: locators por rol sacados del código oficial, sin esperas fijas, `expect.poll` para la consulta API, aserciones completas | Cumple las convenciones de la skill |
| 6 | En la revisión final de requerimientos se vio que el contrato se había armado con el código y sondas, sin la colección Postman, y que BUG-02 y BUG-03 no tenían evidencia | Se leyó la colección Postman y se reescribió `docs/contrato-vs-observado.md` indicando la fuente de cada expectativa. Se agregaron 4 pruebas de contrato (`booking-contract.spec.ts`), que además encontraron **BUG-05** | El enunciado pide definir las expectativas desde la documentación y adjuntar evidencia de cada bug |

**Skills adicionales propuestas:** [docs/skills-propuestas.md](docs/skills-propuestas.md) (`failure-triage` primero, `api-contract-diff`, `test-data-steward`).

## 9. Tiempo invertido y pendientes

**Tiempo invertido:** ~6 h de trabajo efectivo. Entorno sin permisos de administrador: ~0,5 h. Exploración de la API y
contrato: ~1 h. Estructura, clientes, fixtures y pruebas API: ~1,5 h. Skill y uso del agente con revisión: ~1,5 h.
Documentación y evidencia: ~1,5 h.

**Pendientes**
- Ver el escenario UI en verde cuando se corrija BUG-01 (no requiere cambios en la prueba).
- Automatizar los 3 casos priorizados, empezando por la doble reserva concurrente.
- Limpieza de datos cuando `DELETE` funcione, o un endpoint de reset para la suite.
- Pipeline de CI real (el ejemplo de la sección 7 no está desplegado; no se pidió Azure ni despliegue).
