# Casos adicionales que priorizaría (no automatizados)

Ordenados por prioridad según **probabilidad × impacto** para un sistema de reservas.

| # | Caso | Riesgo que cubre | Por qué en este orden |
|---|---|---|---|
| 1 | **Doble reserva concurrente de las mismas fechas.** Dos `POST /api/booking` en paralelo para la misma habitación y rango → exactamente uno 201 y el otro 409; el listado contiene una sola reserva. | *Overbooking*: dos huéspedes con la misma habitación. Es el riesgo de negocio más caro (compensaciones, reputación). BUG-04 sugiere que el proxy reintenta los POST, lo que lo hace más probable. | Impacto directo en ingresos y clientes; ya hay señales de que el manejo de conflictos es frágil. |
| 2 | **Rangos de fechas límite.** Checkout = checkin (0 noches), checkout < checkin, fecha pasada, y una reserva que empieza el mismo día en que otra termina (back-to-back). Esperado: 400 en los inválidos, 201 en back-to-back. | Reservas imposibles o fechas válidas rechazadas. BUG-03 muestra que hoy "checkout < checkin" se responde como conflicto (409) y no como validación. | Errores de fechas son la fuente más común de defectos en reservas; el cálculo `[checkin, checkout)` es fácil de romper. |
| 3 | **Autorización de la consulta de reservas.** `GET /api/booking?roomid=` y `/summary` sin token, con token expirado y con token inválido → 401, sin datos de huéspedes en la respuesta. | Exposición de datos personales (nombres, fechas, y en el backend email/teléfono). | Impacto legal y de privacidad alto; es barato de automatizar con los clientes existentes. |

Otros candidatos considerados: precio total mostrado en la UI vs. noches × tarifa; accesibilidad del formulario de reserva;
mensajes de validación de la UI ante errores del backend (BUG-04 muestra que la página se cae con `{error}`).
