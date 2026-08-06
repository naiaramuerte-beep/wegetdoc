# Consulta a Sipay — semántica del código de denegación 121

> **Estado: BLOQUE PREPARADO, NO ENVIADO.** Pegar en el próximo correo a Sipay
> junto al resto de temas abiertos (Apple Pay VISA, 172/174). No mandar suelto.
>
> Contexto interno (no incluir en el correo): sacamos 121 de `HARD_CODES` en la
> rama `fix/code-121-soft-monthstart` y lo tratamos como "límite excedido" con
> reintento al día 1 del mes siguiente. Es una **hipótesis**; esta consulta es lo
> que la confirma o la tumba. Ver [[code-121-classification]] en memoria.

---

## BLOQUE PARA PEGAR

**Asunto sugerido:** Significado exacto del código de denegación 121 en respuestas MIT

Hola,

Necesitamos confirmar el significado exacto del **código de denegación 121** que
nos llega en `payload.code` de las respuestas de `/mdwr/v1/all-in-one` en cobros
recurrentes MIT (`sca_exemptions: "MIT"`, `reason: "R"`).

En todos los casos la respuesta que recibimos es genérica y no permite
distinguirlo de cualquier otra denegación:

```json
{ "type": "error", "code": "-1",
  "detail": "authorization_error",
  "description": "An error occurred in the authorization",
  "payload": { "code": "121", ... } }
```

**Las preguntas concretas:**

1. ¿Qué significa exactamente el código **121** en vuestra tabla / la de Redsys?
   Hemos encontrado fuentes públicas contradictorias: unas lo dan como "límite
   excedido" y otras como "código de seguridad CVV2/CVC2 incorrecto" (esto último
   nos cuadra poco, porque entendemos que el de CVV es el 129).
2. ¿Es una condición **transitoria** (recuperable reintentando más adelante) o
   **permanente** (la tarjeta no va a autorizar nunca más por esa vía)?
3. Si es transitoria: ¿hay algún patrón temporal recomendado? En concreto, ¿tiene
   sentido reintentar **a principios del mes siguiente**, por si se trata de un
   límite de ciclo mensual?
4. ¿Existe alguna tabla de códigos de denegación que podamos consultar de forma
   estable? Nos ayudaría a clasificar bien los reintentos y a no cancelar
   suscripciones de clientes cuya tarjeta sigue operativa.

**Por qué preguntamos.** Hasta ahora tratábamos el 121 como denegación definitiva
y cancelábamos la suscripción al primer intento. Al revisarlo hemos visto que en
los 12 casos que tenemos **la tarjeta estaba operativa**: todas habían autorizado
un cobro nuestro pocos días antes (mediana 2,7 días) y **ninguna estaba caducada**
(las fechas de caducidad van de 05/31 a 11/28). Es decir, el 121 no puede
corresponder a "tarjeta caducada", y estábamos dando de baja a clientes con
tarjeta buena.

**Los 12 casos** (todos MIT recurrentes de 29,95 €, moneda EUR):

| # | Fecha (UTC) | Fecha (Madrid) | transaction_id | order | Tarjeta | Marca | Tipo | Caduca |
|---|---|---|---|---|---|---|---|---|
| 1 | 2026-07-03 03:00:23 | 2026-07-03 05:00:23 | `000315758546029091509` | `mit-53700-1783047618742` | 5222 05** **** 8893 | MASTERCARD | debit | 0632 |
| 2 | 2026-07-04 03:04:48 | 2026-07-04 05:04:48 | `000315758546029192164` | `mit-53700-1783134284895` | 5222 05** **** 8893 | MASTERCARD | debit | 0632 |
| 3 | 2026-07-05 03:01:55 | 2026-07-05 05:01:55 | `000315758546029263278` | `mit-53700-1783220511817` | 5222 05** **** 8893 | MASTERCARD | debit | 0632 |
| 4 | 2026-07-07 03:02:51 | 2026-07-07 05:02:51 | `000315758546029453671` | `mit-55300-1783393367125` | 5458 40** **** 8579 | MASTERCARD | debit | 0828 |
| 5 | 2026-07-09 03:00:06 | 2026-07-09 05:00:06 | `000315758546029674625` | `mit-53700-1783566003612` | 5222 05** **** 8893 | MASTERCARD | debit | 0632 |
| 6 | 2026-07-11 03:04:59 | 2026-07-11 05:04:59 | `000315758546029880759` | `mit-55300-1783739094934` | 5458 40** **** 8579 | MASTERCARD | debit | 0828 |
| 7 | 2026-07-16 03:02:18 | 2026-07-16 05:02:18 | `000315758546030307652` | `mit-63630-1784170935026` | 4790 72** **** 9750 | VISA | credit | 0631 |
| 8 | 2026-07-18 07:05:13 | 2026-07-18 09:05:13 | `000315758546030488969` | `mit-66616-1784358310428` | 4149 62** **** 7237 | VISA | credit | 1127 |
| 9 | 2026-07-20 07:05:29 | 2026-07-20 09:05:29 | `000315758546030611360` | `mit-70584-1784531126782` | 5332 73** **** 8986 | MASTERCARD | mixed | 0828 |
| 10 | 2026-07-24 07:01:03 | 2026-07-24 09:01:03 | `000315758546030975976` | `mit-58954-1784876460759` | 5168 74** **** 8019 | MASTERCARD | mixed | 0930 |
| 11 | 2026-07-25 07:03:50 | 2026-07-25 09:03:50 | `000315758546031061488` | `mit-75397-1784963027626` | 4149 62** **** 6758 | VISA | credit | 1128 |
| 12 | 2026-08-06 12:15:49 | 2026-08-06 14:15:49 | `000315758546032304106` | `mit-87801-1786018545507` | 4483 82** **** 7548 | VISA | debit | 0531 |

Dos detalles que quizá os orienten:

- Afecta **tanto a VISA como a Mastercard**, y a débito, crédito y "mixed", sin
  concentración por BIN — no parece un problema de un emisor concreto.
- La tarjeta `5222 05** **** 8893` devolvió 121 **cuatro días seguidos** (casos
  1, 2, 3 y 5) sin llegar a autorizar nunca. Si fuese un límite de ciclo, encaja
  con que reintentar al día siguiente no sirva de nada.

Gracias,

---

## Cómo regenerar la tabla

`railway run node scripts/sipay-121-casos.mjs`

Lee `payload.code` de `webhook_events` (**no** `errorDetail`: antes del 18-jul se
guardaba sin el prefijo del código y el recuento se queda corto — 5 en vez de 12).
