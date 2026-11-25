# Bugs encontrados

Entorno: `https://automationintesting.online` (demo pública compartida), 2026-11-24.

## BUG-01: todas las rutas `/api/<recurso>/{id}` responden 500 (severidad alta)
**Pasos**
1. `POST /api/auth/login` con `admin` / `password` → token.
2. `POST /api/booking` con datos válidos → 201, `bookingid = N`.
3. `GET /api/booking/N` con cookie `token=<token>`.
4. `GET /api/room/1`, `DELETE /api/booking/N`.

**Esperado:** 200 con la reserva o la habitación; 2xx al borrar.
**Observado:** `500 Internal Server Error` (texto plano, no el JSON que devuelve el handler) en todos los casos,
con o sin token, con id existente o inexistente. Las rutas sin segmento dinámico (`/api/room`, `/api/booking?roomid=`)
funcionan, lo que apunta a las rutas dinámicas `[id]` del frontend Next.js, no a los servicios backend.
**Impacto:** la página de UI `/reservation/{roomid}` no carga los datos de la habitación (depende de `GET /api/room/{id}`),
así que **no se puede completar una reserva por UI**. Tampoco se pueden borrar reservas de prueba.
**Evidencia:** prueba `consulta por id según contrato (BUG-01 conocido)` (`test.fail`) y `tests/ui/reservation.spec.ts`
(habitaciones 1 y 2): falla en `ReservationPage.open` porque el heading "Book This Room" nunca aparece; el trace muestra
`GET /api/room/{1,2}` → 500 y la página queda en blanco. Corrida: `evidence/2026-11-24T23-14-52-923Z` (trace, screenshot, video).

## BUG-02: `POST /api/booking` sin `bookingdates` responde 500 (severidad media)
**Pasos:** `POST /api/booking` con `roomid`, `firstname`, `lastname`, `depositpaid`, `email` y `phone` válidos, **sin** `bookingdates`.
**Esperado:** 400 con un mensaje de validación. **Observado:** `500 {"errors":["Failed to create booking"]}`.
Un dato obligatorio ausente provoca un error de servidor en vez de una validación.
**Evidencia:** prueba `sin bookingdates responde 400 (BUG-02 conocido)` en `tests/api/booking-contract.spec.ts`
(`test.fail`; el error con el 500 recibido queda en el reporte de la corrida oficial).
**Observación:** esta llamada tarda ~30 s en responder desde la suite. Es coherente con el `fetchWithRetry` del proxy,
que reintenta los 5xx con espera creciente, y refuerza la hipótesis de BUG-04: los POST se reintentan.

## BUG-03: checkout anterior al checkin responde 409 en vez de 400 (severidad baja)
**Pasos:** `POST /api/booking` válido pero con `checkout` anterior a `checkin` (fechas libres invertidas).
**Esperado:** 400 "fechas inválidas". **Observado:** `409 {"error":"Failed to create booking"}`, el mismo código y
mensaje que un conflicto de disponibilidad. El cliente no puede distinguir los dos errores.
**Evidencia:** prueba `checkout anterior al checkin responde 400 (BUG-03 conocido)` en `tests/api/booking-contract.spec.ts`.

## BUG-05: `GET /api/booking/` sin `roomid` responde 400 (severidad baja)
**Contrato (Postman, GetBookings):** *"remove the query string to return all bookings within the API"*.
**Pasos:** login → `GET /api/booking` con `Cookie: token=<token>` y sin query string.
**Esperado:** 200 con todas las reservas. **Observado:** `400 {"error":"Room ID is required"}`.
El proxy de Next.js (`app/api/booking/route.ts`) exige `roomid` aunque el contrato lo declara opcional.
**Evidencia:** prueba `GET /booking/ sin roomid devuelve todas las reservas (BUG-05 conocido)` en `tests/api/booking-contract.spec.ts`.

## BUG-04: la reserva por UI puede responder 409 aunque se guardó, y la página se cae (severidad media, intermitente)
Encontrado en un diagnóstico temporal que reemplazó solo `GET /api/room/{id}` (para esquivar BUG-01) y dejó el
`POST /api/booking` contra el backend real. Ocurrió 2 de 4 intentos, en paralelo y justo después de un reinicio de la demo.

**Pasos**
1. Abrir `/reservation/1?checkin=2031-10-19&checkout=2031-10-21` (fechas libres según `/api/booking/summary`).
2. "Reserve Now" → llenar Firstname, Lastname, Email, Phone válidos → "Reserve Now".

**Esperado:** 201 y la tarjeta "Booking Confirmed".
**Observado:**
- La UI envió un único `POST /api/booking` con cuerpo válido. Recibió **409** `{"error":"Failed to create booking"}` después de 1,2 s y 2,2 s.
- La reserva **sí quedó guardada**: `GET /api/booking?roomid=1` la devuelve (`bookingid` 5, mismo apellido y fechas; en la habitación 2, `bookingid` 4).
- La página se cae con "This page couldn't load": `BookingForm` hace `setBookingErrors(errorData.errors)`, pero esta
  respuesta trae `error` (singular), así que `bookingErrors.length` falla con `undefined`.

**Causa probable (hipótesis, por el código oficial):** el proxy de Next.js (`app/api/booking/route.ts`) usa `fetchWithRetry`
(reintenta 408/429/5xx con espera desde 1 s) también para el POST, que no es idempotente. Si el primer intento guarda la
reserva y responde con error reintentable, el reintento choca con esa misma reserva (409). La duración (≥1 s) es coherente con esa espera.

**Impacto:** el huésped ve un error, o la página caída, después de una reserva que sí se creó. Si lo reintenta, puede duplicarla o recibir otro 409.
Hay dos defectos: (a) el POST se reintenta sin ser idempotente y (b) la UI no maneja el cuerpo `{error}`.
**Evidencia:** cuerpos, códigos y duraciones tomados del trace de ese diagnóstico. El trace no se conservó porque la siguiente
corrida limpió `reports/test-results`. La segunda ejecución del mismo diagnóstico pasó (201 y "Booking Confirmed").

**Confirmado también por API (revisión humana, corrida oficial `evidence/2026-11-25T00-35-36-068Z`):**
las 2 pruebas de `booking-create.spec.ts` recibieron **409** al `POST /api/booking` con fechas libres
(~2,3 s de duración, coherente con un reintento), y sin embargo las reservas **quedaron guardadas**:

| Prueba | Apellido | Habitación | Fechas | Respuesta al POST | ¿Guardada? |
|---|---|---|---|---|---|
| Single, 2 noches | `QaFnoeap` | 1 | 2027-12-22 → 2027-12-24 | 409 | Sí, `bookingid` 5 |
| Suite, 4 noches | `QaJzvcpt` | 3 | 2030-05-02 → 2030-05-06 | 409 | Sí, `bookingid` 4 |

Verificado con `GET /api/booking?roomid=` después de la corrida. Los `bookingid` bajos indican que la demo se había
reiniciado poco antes, lo mismo que se vio en el diagnóstico del agente. Antes ya había pasado 1 vez en 5 corridas.
Trace con request/response: `test-results/booking-create-*-api/trace.zip` dentro de esa carpeta de evidencia.
Por eso `retries` sigue en 0: un reintento verde escondería justamente este defecto.
