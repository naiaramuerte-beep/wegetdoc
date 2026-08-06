# Plan de re-autorización de suscripciones (PLAN B — sin ejecutar)

> Estado: **preparado, NO ejecutado.** No montar código ni enviar nada hasta el
> lunes 2026-08-04, tras confirmar el resultado del ajuste de Sipay.

## Contexto

Las renovaciones recurrentes (MIT-R) fallan ~82% (30 días), casi todas con código
Redsys **190**, categoría "soft". **No es falta de fondos** (116 = 0). Sipay
confirmó por escrito que **gestionan el `cof_id` internamente** y que **no
añadamos campos**, y **despliegan su propio ajuste el lunes 2026-08-04**.

> Nota de análisis: el `cof_id` viene NULL en las respuestas MIT tanto en las que
> cobran como en las que fallan → el NULL **no distingue** éxito de fallo; lo más
> probable es que Sipay simplemente no lo devuelva en respuestas MIT. No es
> evidencia de que el mandato no se vincule. (La rama `fix/recurring-cof-mandate`,
> que citaría `cof_txnid`, queda **parada** — un campo no reconocido podría hacer
> que su API rechace la petición entera y tumbaríamos las renovaciones que hoy sí
> entran.)

## Cuándo usar este plan

**Solo si**, tras el fix de Sipay del lunes, las subs **existentes** siguen sin
renovar. Como sus cobros iniciales SÍ generaron un `cof_id` (guardado en el lado
de Sipay), **su ajuste podría recuperarlas retroactivamente sin re-auth** — plan A.
Además, **el próximo reintento de las 45 `past_due` es el lunes 04/08 a las 09:00**,
así que el ciclo normal de dunning las volverá a intentar justo tras su fix.

Este documento es el **plan B**: re-autorizar manualmente las que no recupere.

## Precio y cargo (IMPORTANTE)

- Precio de la suscripción: **29,95 €/mes** (vive en `site_settings.subscription_price_eur`).
- La re-autorización debe hacerse con un **cargo de 0,50 €**, **NUNCA** con la
  mensualidad completa. Pedir 29,95 € para "confirmar la tarjeta" generaría quejas
  y disputas. El 0,50 € basta para abrir un mandato autenticado nuevo.

## Segmentos (por prioridad)

1. **`past_due` ya fallando: 45 subs** → lista en `docs/reauth-pastdue.csv`
   (todas con email + token; casi todas 190/soft; próximo reintento lun 04/08 09:00).
2. **Activas/trial con renovación inminente** (`currentPeriodEnd` en < 7 días) que
   fallen tras el lunes.
3. Resto de la base activa (~128 con token) solo si su renovación falla post-fix.

## Mecanismo (re-autorización = nueva CIT autenticada que abre mandato limpio)

1. Email: **"Confirma tu método de pago para no perder tu suscripción"** — tono
   positivo, sin "tu tarjeta falló".
2. Link **firmado HMAC** por sub (reusar el patrón de los emails de recovery,
   `server/_core/index.ts` ~L1216: `crypto.createHmac('sha256', ENV.cronSecret)`).
3. Link → **auto-login** → checkout de re-auth con **3DS**, **cargo de 0,50 €**.
4. Al aprobar: guardar **token + `cof_id` nuevos**, marcar la sub como reautorizada,
   y el ciclo de renovación continúa con la credencial fresca.
5. Reutiliza infra existente: `PaywallModal`/checkout, Resend, link firmado.

## Salvaguardas

- **No enviar hasta confirmar** que el fix del lunes no cubre las existentes
  (si las recupera, molestar a clientes = disputas por nada).
- Cargo **0,50 €**, jamás 29,95 €.
- **Un solo email** por sub, tono positivo, con opción de cancelar/gestionar.
- Recuperación esperable realista: **20-40%** (requiere que el cliente abra el
  email y complete 3DS).
- Idempotencia: no re-enviar a una sub ya reautorizada o ya recuperada por el fix.

## Segmento 4 — CANCELADAS por código mal clasificado (ola de re-auth)

Subs que ya matamos por un código que creemos mal clasificado. **63 en total, las
63 con al menos un cobro OK histórico** → tarjeta demostrablemente viva.

**Valor recuperable (a 29,95 €/mes):**

| | €/mes | Supuesto |
|---|---|---|
| **Realista** | **~604 €/mes** | 63 × 29,95 € × **32 %** de renovación efectiva |
| Techo teórico | 1.886,85 €/mes | 63 × 29,95 €, recuperación del **100 %** — no va a pasar |

⚠️ **Usar SIEMPRE la cifra realista (~604 €/mes) en correos, informes y
decisiones.** El techo teórico solo vale como cota superior. Aparte, la tasa de
recuperación del propio email de re-auth (abrir + completar 3DS) se estimó en
20-40 %, así que el 32 % ya es un supuesto optimista compuesto.

| Código | Subs | Motivo de la sospecha |
|---|---|---|
| 174 | 29 | `blocked_provider` — pico ×4 justo con el cambio de Sipay del 19/07/2026 |
| 172 | 26 | ídem |
| 121 | 8 | "límite excedido": 8/8 tarjetas vivas (mediana 2,7 días antes), **0/12 caducadas** |

Lista: `docs/reauth-canceladas.csv`, generada por `scripts/lista-recuperacion.mjs`
(re-ejecutable; sustituye al antiguo `canceled-172-174-list.mjs`, que solo cubría
172/174 y no usaba conexión UTC).

Los 8 del 121 entran en **la misma ola** que los 55 del 172/174 — mismo mecanismo
(re-auth CIT de 0,50 € con 3DS), mismo email, mismas salvaguardas. Se añaden aquí
tras sacar el 121 de `HARD_CODES` (rama `fix/code-121-soft-monthstart`): de ahora
en adelante el 121 no cancela, pero estas 8 ya estaban muertas y solo se
recuperan re-autorizando.

## Datos ya preparados (solo lectura)

- `docs/reauth-pastdue.csv` — las 45 subs `past_due` (sub_id, user_id, email,
  método, reintentos, código, categoría, vencimiento, próximo reintento, token).
  Generado por `scripts/lista-pastdue.mjs` (re-ejecutable el lunes para refrescar).
- `docs/reauth-canceladas.csv` — las 63 subs ya canceladas por 172/174/121
  (segmento 4). Generado por `scripts/lista-recuperacion.mjs`.

## Pendiente de decisión (post-lunes)

- ¿Recuperó el fix de Sipay a las existentes? → si sí, este plan no se usa.
- Si no: confirmar con Sipay que un cargo CIT 0,50 € con 3DS abre mandato válido
  para MIT-R, y **entonces** montar el flujo (email + ruta de re-auth) en rama.
