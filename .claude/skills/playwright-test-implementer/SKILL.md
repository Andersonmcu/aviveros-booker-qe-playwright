---
name: playwright-test-implementer
description: Implementa pruebas Playwright + TypeScript (API, UI o integradas UI+API) en este repositorio siguiendo sus convenciones de POM, clientes de API y fixtures. Úsala cuando se pida automatizar un escenario nuevo o variar uno existente contra Restful Booker Platform.
---

# Skill: implementar pruebas Playwright en este repositorio

## Propósito
Convertir un escenario de negocio (p. ej. "reservar una habitación por UI y verificarla por API") en una
prueba Playwright **ejecutable, aislada y con aserciones de negocio**, reutilizando la arquitectura existente
en lugar de inventar una nueva. El resultado debe poder ejecutarlo otro desarrollador o agente sin contexto adicional.

## Entradas
| Entrada | Obligatoria | Ejemplo |
|---|---|---|
| Escenario y resultado esperado de negocio | Sí | "Reserva por UI, ver confirmación, consultar por API el mismo registro" |
| Tipo: `api`, `ui` o `ui+api` | Sí | `ui+api` |
| Datos / variantes a parametrizar | No | "habitaciones 1 y 2" |
| Tags de gate (`@smoke`, `@regression`) | No (por defecto `@regression`) | `@smoke` |
| Entorno (`BASE_URL`) | No (default demo pública) | `https://automationintesting.online` |

## Antes de escribir código (obligatorio)
1. Lee `README.md`, `docs/contrato-vs-observado.md`, `playwright.config.ts`, `src/fixtures/index.ts`
   y los clientes en `src/api/`. **Reutiliza** lo que exista.
2. Define la expectativa **desde el contrato** (documentación de la API / comportamiento del producto) antes de ejecutar.
3. Explora la UI real para obtener locators: `npx playwright codegen <url>` o un `ariaSnapshot()` temporal.
   No adivines selectores. Borra cualquier script de exploración al terminar.

## Pasos
1. **Datos**: usa la fixture `bookingDraft({ roomid, nights, depositpaid, guest })`. Genera huésped sintético con
   apellido único y fechas libres consultadas al backend. Nunca datos fijos compartidos ni fechas "hoy/mañana".
2. **API**: si falta un endpoint, agrégalo como método en el cliente correspondiente de `src/api/`
   (método *raw* que devuelve `APIResponse` + helper de conveniencia si se reutiliza). Las pruebas no llaman
   `request.get/post` directamente.
3. **UI (POM)**: una clase por página en `src/pages/<Nombre>Page.ts`:
   - Constructor recibe `Page`; locators como `readonly` definidos en el constructor.
   - Métodos expresan intención de negocio (`fillGuest(guest)`, `submit()`), no clicks sueltos.
   - Los métodos de acción **no** contienen aserciones de negocio; exponen locators o leen datos para que la
     prueba afirme. Excepción permitida: esperar a que la página esté lista (`await expect(heading).toBeVisible()`).
   - Expón la page object como fixture en `src/fixtures/index.ts` (p. ej. `reservationPage`).
4. **Prueba**: en `tests/<api|ui>/<feature>.spec.ts`, usando `import { test, expect } from '../../src/fixtures'`.
   - Agrupa con `test.step` cada fase (preparar, actuar en UI, verificar UI, verificar API).
   - Etiqueta con `{ tag: [...] }`.
   - Registra ids creados con `trackBooking(id)` para limpieza best-effort.
5. **Parametrización**: `for (const data of dataSets) test(...)` con un título distinto por set.

## Convenciones obligatorias
- **Locators estables**, en este orden: `getByRole` > `getByLabel` > `getByPlaceholder` > `getByText` > `getByTestId`.
  Prohibido: XPath, selectores CSS por posición/clase de estilo (`.col-md-6 > div:nth-child(2)`).
- **Esperas**: solo aserciones web-first (`await expect(locator).toBeVisible()`, `toHaveText`, `toHaveURL`,
  `expect.poll` para consultas API eventualmente consistentes). **Prohibido** `waitForTimeout`, `sleep`, `setTimeout`.
- **Aislamiento**: ninguna prueba depende de otra ni del orden; nada de estado global mutable; `fullyParallel` activo.
- **Backend real**: no usar `page.route` para simular respuestas del backend en los escenarios de negocio.
- **Aserciones de negocio**: identidad (`bookingid`), habitación, fechas y datos del huésped; no solo "status 200".

## Verificación (ejecutar siempre, en este orden)
```powershell
npx tsc --noEmit
npx playwright test <archivo> --workers=2
npx playwright test --workers=2
```
Para evidencia con código de salida: `npm run test:evidence -- <args>` (deja `evidence/<timestamp>/summary.json`).

## Criterios de éxito
- `tsc` sin errores y la prueba nueva ejecutada (no omitida) con 2 workers.
- La prueba pasa **o** falla por un defecto real del producto, demostrado con evidencia (trace/screenshot) y
  documentado en `docs/bugs.md` con pasos, esperado, observado y evidencia.
- Las pruebas existentes siguen igual de verdes que antes.
- README/docs actualizados si se añadió un comando, fixture o hallazgo.

## Ante errores o información insuficiente
- **Falta información de negocio** (qué validar, qué datos): detente y pregunta; no inventes reglas.
- **Selector no encontrado**: vuelve a explorar la página real; no aumentes timeouts como "arreglo".
- **La prueba falla**: lee el trace (`npx playwright show-trace <zip>`) y clasifica:
  1. *Defecto de la prueba* (locator, datos, timing) → corrígelo.
  2. *Defecto del producto o del entorno* → **no** debilites la aserción, no la borres, no uses `test.skip` para
     esconderlo. Mantén la expectativa del contrato; si se acuerda marcarla, usa `test.fail(true, 'BUG-XX: ...')`
     enlazando el bug documentado.
  3. *Entorno caído / datos de la demo reiniciados* → reporta el estado con evidencia y re-ejecuta una vez.
- **Nunca** declares éxito sin haber ejecutado la prueba: una prueba no ejecutada no cuenta como aprobada.
- Resume al final: archivos tocados, comando ejecutado, resultado (pasa/falla y por qué) y pendientes.
