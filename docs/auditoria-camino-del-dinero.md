# Auditoría del camino del dinero — EditorPDF / Sipay

**Fecha:** 2026-08-07 · **Alcance:** solo lectura, sin cambios en código ni en datos.
**Motivo:** revisión de configuración solicitada por Comercia.
**Datos:** producción vía `railway run` (404 usuarios con alta cobrada, 520 cobros
con evento de éxito). Horas en UTC y Madrid.

## Veredicto por zona

| Zona | Veredicto | Titular |
|---|---|---|
| 1 — Alta 0,50 € | 🔴 **PROBLEMA** | Sin idempotencia: **19 usuarios (4,7 %) cobrados dos o tres veces**. Y el importe lo fija el cliente |
| 2 — Apple Pay | 🟢 **BIEN** | Config correcta, cero ramas por marca en el código. Un matiz que hay que declarar |
| 3 — Renovaciones | 🟢 **BIEN** | Deploy verde, 0 dobles cobros, calendario correcto. Smoke del 121 aún sin caso |
| 4 — Contabilidad | 🟡 **DUDA** | Ledger fiel (0 duplicados, 0 pérdidas) pero sin unique index y con una ventana sin transacción |
| 5 — Panel admin | 🟢 **BIEN** | 57/57 procedimientos exigen sesión admin. Un proxy abierto de segundo orden |
| 6 — Varios | 🟢 **BIEN** | CSP resuelta |

---

## ZONA 1 — Alta de 0,50 € 🔴 PROBLEMA

### 1.1 No existe idempotencia en el alta — CRÍTICO

**Ningún** camino de cobro comprueba si el usuario ya pagó antes de cobrarle.
Los tres procedimientos (`sipayApplePayCharge`, `sipayGpayCharge`,
`sipayCheckoutInit` en `server/routers.ts:437/568/699`) generan un `order` nuevo
con `Date.now()` y cobran directamente.

**Impacto medido en producción:**

| | |
|---|---|
| Usuarios con alta cobrada | 404 |
| **Usuarios cobrados 2+ veces en < 1 hora** | **19 (4,7 %)** |
| De ellos, cobrados 3 veces | 2 (`u=65320`, `u=68439`) |
| Cargos de más | **21 × 0,50 € = 10,50 €** |
| Reembolsados | **0** |

Separación entre el primer y el segundo cobro: de **54 segundos** a 43 minutos.

Por método: 9 casos Google Pay, 6 FastPay, 2 Apple Pay, 2 cruzados
(wallet → otro método). Afecta a los tres caminos por igual.

**Caso `u=94494`** (el que quedó pendiente): dos cargos Google Pay de 0,50 € a
las 16:54:15 y 16:55:45 Madrid del 5-ago, **90 segundos de separación**, misma
tarjeta `4149 49** ****9648`, mismo dispositivo. En `webhook_events` se ven dos
ciclos completos e independientes (`gpay_init_started` → `gpay_intro_charge`).
No fue un reintento interno: **el usuario pasó dos veces por la hoja de Google
Pay** y el servidor cobró las dos. Quedó **una sola suscripción** porque
`upsertSubscription` machaca la fila — el segundo cobro solo le extendió el
trial en silencio. Los 0,50 € de más siguen sin devolver.

**Causa técnica.** Ni el cliente ni el servidor bloquean el segundo intento:

- Cliente: `setSubmitting(true)` se llama al pulsar, pero **no hay un
  `if (submitting) return`** al entrar en los manejadores de Google Pay
  (`PaywallModal.tsx:1339`) ni de Apple Pay (`:1040`). El botón de Google lo
  pinta la librería de Google y su `onClick` no consulta nuestro estado de React.
- Servidor: cero comprobaciones. No se mira si existe ya una suscripción
  `trialing`/`active`, ni si hay un cargo reciente del mismo usuario.

La única idempotencia que sí existe es la de FastPay
(`finalizeFastpayPayment` comprueba `findIntroChargeForRequest` antes de
escribir, `server/_core/sipay.ts:275`), pero es **por `request_id`**: protege de
que el callback se ejecute dos veces, no de que el usuario inicie un checkout
nuevo. Por eso también hay dobles cobros en FastPay.

**Por qué importa para el banco.** Un 4,7 % de altas con cargo duplicado es
exactamente el patrón que genera disputas por "transacción duplicada". Y no hay
ningún reembolso automático: los 21 cargos siguen vivos.

### 1.2 El importe del cobro lo decide el cliente — GRAVE

Los tres procedimientos aceptan:

```ts
amountCents: z.number().int().positive()
```

Sin máximo, sin comprobación contra un precio de servidor. El valor `50` está
**hardcodeado en el cliente** (`PaywallModal.tsx:514, 673, 687`) y viaja tal cual
hasta Sipay. `INTRO_PRICE_EUR = 0.50` (`server/db.ts:849`) solo se usa para
calcular ingresos; **no valida nada**.

Cualquiera con las herramientas del navegador puede alterar la llamada y
contratar el trial por 0,01 €. Es un fallo de diseño clásico: el precio nunca
debe venir del cliente. No he encontrado indicios de que se haya explotado (todos
los cargos de alta en producción son de 50 céntimos exactos), pero la puerta está
abierta.

### 1.3 Fallback wallet → tarjeta: bien resuelto (con un borde)

La lógica distingue correctamente tres desenlaces y es la correcta de cara al
cliente:

- Cancelación del comprador → abre el formulario de tarjeta **en silencio**.
- Fallo de validación / sin tarjeta compatible → silencio también.
- Denegación real → formulario **con banner ámbar**.

**El borde peligroso:** en Google Pay y Apple Pay, entre el cobro exitoso en
Sipay y el `recordCharge` hay cuatro `await` sin `try/catch`
(`upsertSubscription`, `markDocumentsPaid`, `setUserCountryIfEmpty`). Si
cualquiera falla, la mutación lanza, **el cliente lo interpreta como denegación**
y le ofrece pagar con tarjeta — habiéndole cobrado ya. Es un camino a doble
cobro + cargo sin registrar a la vez. No ha ocurrido (ver Zona 4), pero está
abierto.

---

## ZONA 2 — Apple Pay 🟢 BIEN

| Elemento | Valor actual | Dónde |
|---|---|---|
| `supportedNetworks` | `["masterCard", "maestro"]` | `client/src/lib/applePayNetworks.ts` |
| `merchantCapabilities` | `["supports3DS"]` | `PaywallModal.tsx:1057` |
| `countryCode` / `currencyCode` | `ES` / `EUR` | `PaywallModal.tsx:1051` |
| Validación de dominio | `POST /api/sipay/applepay/validate-merchant` → Sipay `/apay/api/v1/session` | `_core/index.ts:1461` |
| Fichero de asociación | servido en `/.well-known/apple-developer-merchantid-domain-association[.txt]` | `_core/index.ts:58-59` |

**Recorrido del token, sin tocar nada por el camino:** Apple entrega
`event.payment.token` en la hoja nativa → el cliente lo reenvía **íntegro**
(`paymentData`, `paymentMethod`, `transactionIdentifier`) a
`subscription.sipayApplePayCharge` → el servidor lo pasa tal cual a
`chargeApplePay` → `POST /mdwr/v1/authorization` con
`catcher: { type: "apay", token_apay }`. El criptograma y el ECI viajan **dentro**
de `paymentData` cifrado; no hay ningún campo ECI suelto que podamos estar
omitiendo, ni desempaquetamos ni reconstruimos el token.

**Confirmado: no existe ninguna rama por marca de tarjeta en el código de cobro.**
Barrido completo de `card_brand` / `cardBrand` / `cardNetwork` / `visa` /
`mastercard` / `amex` en `server/` y `client/src`: **todas las apariciones son de
registro o de presentación** — se guardan en `webhook_events` para diagnóstico, se
devuelven al cliente, o son los logotipos SVG del modal. **Ni un solo `if` sobre
la marca en el camino de autorización.** Google Pay, de hecho, va con las cinco
redes abiertas (`AMEX, DISCOVER, JCB, MASTERCARD, VISA`, `PaywallModal.tsx:1304`).

**Matiz que hay que declarar, no ocultar:** sí restringimos Apple Pay a
Mastercard/Maestro. Es una decisión nuestra del 5-ago, tomada tras 89 intentos
Visa consecutivos denegados (0 %) frente a un 88 % de aprobación en Mastercard, y
después de que la reactivación del terminal 1 diera 6/6 fallos más. Es una
restricción **de qué ofrece Apple en la hoja**, no un trato distinto una vez la
transacción llega a nosotros.

### Resumen de 5 líneas para el correo

> Enviamos el token de Apple Pay íntegro y sin modificar: lo que Apple entrega en la hoja de pago viaja tal cual a `/mdwr/v1/authorization` en `catcher.type="apay"` / `token_apay`, con el criptograma y el ECI dentro del `paymentData` cifrado. Solicitamos `merchantCapabilities: ["supports3DS"]` y la validación de dominio se hace contra vuestro endpoint `/apay/api/v1/session`.
> Hemos revisado todo nuestro código y **no existe ninguna condición ni bifurcación por marca de tarjeta en el camino de autorización**: la marca solo se guarda para diagnóstico. En Google Pay aceptamos las cinco redes sin distinción.
> La única diferencia por marca está en `supportedNetworks` de la hoja de Apple Pay, hoy limitada a Mastercard/Maestro. La pusimos nosotros el 5 de agosto tras registrar 89 intentos de Apple Pay con Visa denegados de forma consecutiva (0 % de aprobación, códigos Redsys 190/180) frente a un 88 % de aprobación en Mastercard por ese mismo camino.
> Reactivamos Visa el 4 de agosto tras la intervención en el terminal 1 y los 6 intentos reales posteriores volvieron a fallar (190), por lo que revertimos.
> Podemos reactivar Visa en Apple Pay en cuanto nos confirméis que el procesamiento del token Apple Pay de Visa está resuelto; tenemos el detalle por transacción a vuestra disposición.

---

## ZONA 3 — Renovaciones de 29,95 € 🟢 BIEN

### Deploy y smoke del 121

- **Deploy verde.** Servicio `wegetdoc` en `RUNNING` con el commit `c25ba65`.
  Los servicios `cron-sipay-renew` y `cron-sipay-finalize` figuran como `CREATED`
  porque son contenedores que arrancan y mueren en cada pasada — es su estado
  normal entre ejecuciones. Código en vivo desde el **2026-08-06 21:36:17 UTC /
  23:36:17 Madrid**. Rollback disponible: `407313f`.
- **Smoke del 121: todavía sin caso.** 0 denegaciones 121 desde el deploy. Con la
  frecuencia histórica (12 casos en 34 días ≈ 0,35/día) lo esperable es que el
  primero llegue sobre el 9-ago. Las 8 suscripciones con 121 anteriores siguen
  canceladas, como corresponde. Verificador listo: `scripts/smoke-121.mjs`.

### Construcción del MIT

`createMITRecurring` encadena los **dos pasos** obligatorios: `/mdwr/v1/all-in-one`
con `sca_exemptions:"MIT", reason:"R"` (que solo devuelve `authentication_started`)
y después `/mdwr/v1/all-in-one/confirm`. Se exige un `transaction_id` real para dar
el cobro por bueno — no basta `code:"0"`. Se cobra contra el token de comercio
`usr-<userId>`, no contra el `cof_id`.

El importe **sí sale del servidor** (`site_settings.subscription_price_eur`), al
contrario que en el alta. Correcto.

### Calendario y clasificador

- Reintentos anclados a la **hora de cada suscripción**, evitando sáb/dom/lun
  (Madrid) → martes, ventana máxima de 30 días, mínimo 24 h entre intentos.
- Clasificación por código: HARD (cancela), `blocked_provider` (172/174: ni
  cancela ni reintenta, a la espera de Sipay), y soft con calendario propio.
- **121**, desde anoche: fuera de HARD, tratado como "límite excedido" con el
  reintento principal alineado al día 1 del mes siguiente.
- **0 dobles cobros** en renovaciones desde el cambio de cron, verificado.

### Duda menor

El `order` del MIT es `mit-<userId>-<Date.now()>` — **no determinista**. Si una
pasada del cron se colgase y otra reintentase la misma suscripción, Sipay vería
dos pedidos distintos y no podría deduplicar. Hoy la protección es el lock de 45
minutos más el cambio de estado, que en la práctica ha bastado (0 dobles cobros).
Sigue pendiente la respuesta de Sipay sobre cómo tratan un `order` repetido.

---

## ZONA 4 — Webhooks y contabilidad 🟡 DUDA

### Lo que está bien

| Comprobación | Resultado |
|---|---|
| Cobros con evento de éxito y **sin** fila en `charges` | **0 de 520** |
| `transaction_id` duplicado en `charges` | **0** |
| `order` duplicado en `charges` | **0** |
| Eventos `charge_write_failed` | **0** |

`recordCharge` está bien construido: **nunca lanza**. Si la escritura falla, deja
un evento `charge_write_failed` y lo manda a Sentry, pero no rompe el cobro.
`notifySale` (el aviso de Telegram) es fire-and-forget y tampoco puede tumbar
nada. Los dobles cobros de la Zona 1 aparecen como **dos filas**, que es lo
contablemente correcto: hubo dos cobros reales.

### Lo que no me convence

1. **No hay ningún índice único** en `charges` — ni sobre `sipayTransactionId` ni
   sobre `sipayOrder` (`drizzle/0020_charges_table.sql`: solo índices normales).
   La ausencia de duplicados hoy depende del código, no de la base de datos.
2. **Una fila sin referencia a Sipay.** El cargo `#683` (`u=87801`, 0,50 €,
   30-jul 14:13 Madrid) está registrado con `sipayTransactionId = NULL` y
   `sipayOrder = NULL`. El dinero está contabilizado, pero **esa fila no se puede
   conciliar** contra el extracto de Sipay. Es 1 de 520 (0,2 %) y el código
   actual sí rellena ambos campos, así que parece un residuo histórico.
3. **La ventana sin transacción de la Zona 1.3.** Hoy no ha producido ninguna
   pérdida, pero el camino existe: cobro bueno en Sipay y excepción antes de
   `recordCharge` deja dinero cobrado sin fila.

---

## ZONA 5 — Seguridad del panel 🟢 BIEN

**Respuesta definitiva a la pregunta pendiente desde el 5-ago: sí, todo el panel
exige sesión de administrador.**

- `admin.mobileSummary` usa `adminProcedure` (`server/routers.ts:958`).
- **Los 57 procedimientos** del router `admin` usan `adminProcedure`. Barrido
  automático buscando `publicProcedure` o `protectedProcedure` dentro del router:
  **cero coincidencias**.
- `adminProcedure` = `protectedProcedure` + comprobación de `role === "admin"`,
  con `FORBIDDEN` en caso contrario (`server/routers.ts:86-91`).

**Los 4 endpoints de cron** (`sipay-renew`, `sipay-finalize-pending`,
`recovery-emails`, `daily-summary`) exigen la cabecera `X-Cron-Secret` y
responden 401 sin ella. Correcto.

### Un endpoint que sí conviene mirar

`GET /api/documents/proxy` (`_core/index.ts:660`) **no pide autenticación**.
Tiene una lista blanca de dominios (`.r2.dev`, `.r2.cloudflarestorage.com`), lo
que acota el SSRF, pero deja dos flancos: cualquiera puede usarnos como proxy
para descargar objetos de **cualquier** bucket R2 público de internet (consumo de
ancho de banda a nuestra costa, ocultando su origen), y si algún objeto de
nuestro bucket tuviera una clave adivinable, se podría leer sin sesión. No es
crítico ni toca el camino del dinero, pero no debería estar abierto.

---

## ZONA 6 — Varios 🟢 BIEN

**CSP: el bloqueo de `region1.analytics.google.com` está resuelto.** La directiva
`connect-src` incluye `https://*.analytics.google.com`, que cubre todos los
subdominios regionales, además de `analytics.google.com`,
`*.google-analytics.com`, los dominios de Google Ads por país, Sipay
(`sandbox` y `live`), `pay.google.com`, las dos pasarelas de Apple Pay y Sentry.
No he encontrado nada que el checkout necesite y la CSP bloquee.

**Manejo de errores del checkout.** Bien diferenciado (cancelación vs denegación
vs fallo técnico), con eventos de analítica separados para no inflar la tasa de
fallo con abandonos. La pega es la de la Zona 1.3: un error **nuestro** posterior
al cobro se le presenta al usuario como denegación e invita a pagar otra vez.

**Otros detalles.** El mensaje de error que devuelve el servidor cuando Sipay
rechaza incluye `JSON.stringify(data)` completo (`routers.ts:488, 618`), es decir,
la respuesta cruda del proveedor llega al navegador del usuario. No he visto
datos sensibles en esas respuestas (código, detalle, tarjeta enmascarada), pero
es más superficie de la necesaria.

---

## Resumen para decidir

**Lo que arreglaría primero, por orden:**

1. **Idempotencia del alta** (Zona 1.1). Es lo que el banco va a ver. Un candado
   en servidor: antes de cobrar, si el usuario ya tiene suscripción activa o un
   cargo de alta en los últimos N minutos, devolver el resultado anterior en vez
   de cobrar. Más un `if (submitting) return` en los dos manejadores de wallet.
2. **Validar el importe en servidor** (Zona 1.2). El precio del alta debe salir
   de `site_settings`, como ya hace la renovación, y no aceptarse del cliente.
3. **Decidir qué hacer con los 21 cargos duplicados.** Son 10,50 € y ninguno está
   devuelto. Reembolsarlos de oficio nos deja en mejor posición ante Comercia que
   esperar a que los reclamen.
4. **Cerrar la ventana sin transacción** (Zona 1.3 / 4.3) y **añadir el índice
   único** sobre `sipayTransactionId` (Zona 4.1).
5. Autenticar o retirar `/api/documents/proxy` (Zona 5).

**Nada de esto se ha tocado.** Auditoría de solo lectura.

### Scripts usados (todos read-only, horas en UTC y Madrid)

`audit-94494.mjs` · `audit-ledger.mjs` · `audit-huerfano.mjs` · `smoke-121.mjs` ·
`monitor-15min-switch.mjs` · `parte-noche.mjs` · `forense-121-full.mjs`

---

## Actualización 2026-08-08 — estado de las recomendaciones

**Puntos 1 y 2: HECHOS.** Rama `feature/alta-idempotencia-precio-servidor`
(commits `41a0346` + `17260ba`). Candado por usuario + sonda en BD con ventana
de 120 min + precio desde `site_settings.intro_price_eur` publicado también al
cliente para que la hoja de wallet no pueda mostrar un importe distinto del que
se cobra. 19 tests nuevos. Sin cambios de esquema.

**Punto 3: cifras corregidas.** No son 19 usuarios / 21 cargos sino **25
usuarios / 28 cargos de más**. Y de esos 28, **solo 24 son devolubles** (12,00 €):
los otros 4 están separados entre 2,9 y 28 días del anterior, o sea son
**recompras legítimas** de clientes cuya suscripción había caducado. Devolverles
el dinero sería quitarles el servicio que compraron. Script preparado:
`scripts/reembolsar-duplicados.mjs` (seco por defecto).

**Correcciones a hallazgos de la propia auditoría:**

- Se afirmó que los fallos de alta no dejaban rastro. **Es falso.** `charges`
  guarda solo éxitos por diseño, pero los tres caminos registran el fallo en
  `webhook_events` (`gpay_charge_failed` 167, `apay_charge_failed` 107,
  `fastpay_callback_ko` 10, `fastpay_init_failed` 5). El error fue analizar la
  conversión mirando únicamente `charges`, que por construcción da un 100 % de
  aprobación falso.
- `charges` **sí** tiene índices sobre `userId`, `createdAt`, `status` y
  `sipayTransactionId` (este último no único, que era el punto válido).

### Segunda ola — pendiente, NO mezclar con el candado

1. **El hueco del 3DS.** En 10 días, 80 checkouts de tarjeta llegaron al 3DS:
   53 OK, 10 KO y **17 sin desenlace alguno**. No es dinero perdido (no se
   cobró) sino venta perdida e invisible. Es el único punto ciego real del
   embudo de alta.
2. **El asterisco de `fastpay_confirm_failed`.** 150 eventos históricos, más que
   los propios éxitos. La hipótesis es que en su mayoría son el cron de
   huérfanas reintentando sobre los mismos casos, no fallos independientes.
   **Verificar antes de contarlo como pérdida** — si se cuenta en bruto, infla
   el fallo del embudo de tarjeta.
3. Ventana sin transacción (Zona 1.3 / 4.3) + índice único sobre
   `sipayTransactionId` (Zona 4.1).
4. Autenticar o retirar `/api/documents/proxy` (Zona 5).
