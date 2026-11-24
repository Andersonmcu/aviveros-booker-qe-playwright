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
**Evidencia:** prueba `consulta por id según contrato (BUG-01 conocido)` (`test.fail`) y la prueba UI integrada (trace y screenshot en el reporte).

## BUG-02: `POST /api/booking` sin `bookingdates` responde 500 (severidad media)
**Esperado:** 400 con un mensaje de validación. **Observado:** `500 {"errors":["Failed to create booking"]}`.
Un dato obligatorio ausente provoca un error de servidor en vez de una validación.

## BUG-03: checkout anterior al checkin responde 409 en vez de 400 (severidad baja)
**Esperado:** 400 "fechas inválidas". **Observado:** `409 {"error":"Failed to create booking"}`, el mismo código y
mensaje que un conflicto de disponibilidad. El cliente no puede distinguir los dos errores.
