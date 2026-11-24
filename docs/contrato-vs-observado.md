# Contrato vs. comportamiento observado

Fuente del contrato: colección Postman *Restful Booker Platform* y código de
[mwinteringham/restful-booker-platform](https://github.com/mwinteringham/restful-booker-platform)
(rutas proxy de Next.js en `assets/src/app/api/**/route.ts`).
Entorno observado: `https://automationintesting.online`, 2026-11-24.

| # | Endpoint | Contrato / expectativa | Observado | Impacto en las pruebas |
|---|---|---|---|---|
| 1 | `POST /api/auth/login` | 200 + `{ token }` | 200 + `{ token }`. El token se envía como cookie `token=<valor>` | `AuthClient.login`, token por worker |
| 2 | `POST /api/booking` | 201 + reserva creada | 201. La respuesta **no incluye `email` ni `phone`** | Email y teléfono no se pueden verificar por API (limitación) |
| 3 | `POST /api/booking` sin `firstname` | 400 con error de validación | 400 `{"errors":["Firstname should not be blank"]}` | Caso negativo automatizado |
| 4 | `POST /api/booking` email inválido | 400 | 400 `must be a well-formed email address` | Caso negativo automatizado |
| 5 | `POST /api/booking` teléfono < 11 | 400 | 400 `size must be between 11 and 21` | Caso negativo automatizado |
| 6 | `POST /api/booking` fechas solapadas | 409 Conflict | 409 `{"error":"Failed to create booking"}` | Fechas libres vía `/summary` |
| 7 | `POST /api/booking` checkout < checkin | 400 (validación de fechas) | **409** `Failed to create booking`: mismo código que un conflicto | Ver BUG-03 |
| 8 | `POST /api/booking` sin `bookingdates` | 400 | **500** `{"errors":["Failed to create booking"]}` | Ver BUG-02 |
| 9 | `GET /api/booking?roomid=` | 200 con token, 401 sin token | Igual | Único medio funcional para "consultar" una reserva |
| 10 | `GET /api/booking/{id}` | 200 con la reserva | **500** `Internal Server Error` (con o sin token, id existente o no) | BUG-01, prueba `test.fail` |
| 11 | `DELETE /api/booking/{id}` | 202/200 | **500** | BUG-01: no se puede limpiar; se anota en el reporte |
| 12 | `GET /api/room/{id}` | 200 con la habitación | **500** | BUG-01: la página `/reservation/{id}` de la UI no carga |
| 13 | `GET /api/booking/summary?roomid=` | Fechas ocupadas | 200 con token, 401 sin token. Usa `bookingDates` (camelCase) en lugar de `bookingdates` | Inconsistencia de nombres |
