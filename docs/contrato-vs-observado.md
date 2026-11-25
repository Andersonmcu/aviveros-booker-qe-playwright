# Contrato vs. comportamiento observado

**Fuentes del contrato**
1. Documentación oficial: colección Postman
   [*Restful-Booker-Platform*](https://www.postman.com/automation-in-testing/restful-booker-collections/documentation/ci13ds3/restful-booker-platform),
   carpetas Auth y Booking (leída el 2026-11-24).
2. Cuando la documentación no especifica algo (códigos de error, reglas de validación), se usa el código oficial de
   [mwinteringham/restful-booker-platform](https://github.com/mwinteringham/restful-booker-platform)
   (rutas proxy de Next.js en `assets/src/app/api/**/route.ts`) o la semántica HTTP estándar. La columna *Fuente* lo indica.

Entorno observado: `https://automationintesting.online`, 2026-11-24.

**Lo que dice la documentación y condiciona el diseño**
- *"The application is seeded with data … and resets itself every 10 minutes back to that default state."*
  Por eso cada prueba crea sus propios datos y no depende de reservas preexistentes. También explica los `bookingid` bajos (4, 5) tras un reinicio.
- *"Tokens are reset on the deployed instance every 10 minutes"*. Por eso el token se obtiene por worker al iniciar la corrida (la suite dura menos de 1 minuto), no se guarda entre corridas.
- Leer, actualizar y borrar reservas requiere autorización con la cabecera `Cookie: token=<valor>`; crear no.
- En `POST /booking/`, `email` y `phone` son **opcionales**.

| # | Endpoint / caso | Contrato / expectativa | Fuente | Observado | Impacto en las pruebas |
|---|---|---|---|---|---|
| 1 | `POST /api/auth/login` | 200 + token | Postman | 200 + `{ token }` | `AuthClient.login`, token por worker |
| 2 | Autorización | `Cookie: token=<valor>` para leer, actualizar y borrar reservas | Postman | Igual | `BookingClient.authHeaders` |
| 3 | `POST /api/booking` válido | Crea la reserva | Postman | 201. La respuesta **no incluye `email` ni `phone`** | Email y teléfono no se pueden verificar por API (limitación) |
| 4 | `POST /api/booking` sin `email` ni `phone` | Opcionales: se crea | Postman | 201 | Coincide |
| 5 | `POST /api/booking` sin `firstname` | 400 con error de validación | Código / HTTP | 400 `Firstname should not be blank` | Caso negativo automatizado |
| 6 | `POST /api/booking` `lastname` de 2 letras | 400 | Código / HTTP | 400 `size must be between 3 and 30` | Caso negativo automatizado |
| 7 | `POST /api/booking` email inválido | 400 | Código / HTTP | 400 `must be a well-formed email address` | Caso negativo automatizado |
| 8 | `POST /api/booking` teléfono < 11 | 400 | Código / HTTP | 400 `size must be between 11 and 21` | Caso negativo automatizado |
| 9 | `POST /api/booking` fechas solapadas | 409 Conflict | HTTP | 409 `{"error":"Failed to create booking"}` | Fechas libres vía `/summary` |
| 10 | `POST /api/booking` checkout < checkin | 400 (validación) | HTTP | **409**: mismo código y mensaje que un conflicto | **BUG-03**, prueba de contrato `test.fail` |
| 11 | `POST /api/booking` sin `bookingdates` | 400 (dato obligatorio) | HTTP | **500** `{"errors":["Failed to create booking"]}` | **BUG-02**, prueba de contrato `test.fail` |
| 12 | `POST /api/booking` con fechas libres | Un único resultado coherente | HTTP | Intermitente: **409 aunque la reserva quedó guardada** | **BUG-04** |
| 13 | `GET /api/booking/?roomid=` | Reservas de la habitación (con token) | Postman | 200 con token, 401 sin token | Medio usado para "consultar" una reserva |
| 14 | `GET /api/booking/` sin `roomid` | *"remove the query string to return all bookings"* | Postman | **400** `{"error":"Room ID is required"}` | **BUG-05**, prueba de contrato `test.fail` |
| 15 | `GET /api/booking/{id}` | Detalle de la reserva (con token) | Postman | **500** `Internal Server Error` (con o sin token, id existente o no) | **BUG-01**, prueba de contrato `test.fail` |
| 16 | `DELETE /api/booking/{id}` | Borra la reserva | Postman | **500** | BUG-01: no se puede limpiar; queda anotado en el reporte |
| 17 | `GET /api/room/{id}` | Detalle de la habitación | Postman | **500** | BUG-01: la página `/reservation/{id}` de la UI no carga |
| 18 | `GET /api/booking/summary?roomid=` | Resumen de reservas de la habitación | Postman | 200 con token, 401 sin token. Usa `bookingDates` (camelCase) en lugar de `bookingdates` | Inconsistencia de nombres |
| 19 | UI `/reservation/{id}` | "Reserve Now" → datos del huésped → "Reserve Now" → "Booking Confirmed" con `checkin - checkout` | Código del frontend | No carga por BUG-01. Con esa respuesta reemplazada en un diagnóstico, el flujo funciona; intermitente por BUG-04 | `tests/ui/reservation.spec.ts` |
