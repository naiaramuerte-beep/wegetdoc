# Diagnóstico: Google Ads no registra conversiones

## Problema
Dos usuarios han pagado exitosamente pero Google Ads muestra "Configuración errónea" y 0 conversiones.

## Análisis del código actual

### 1. Consent Mode v2 — POSIBLE CAUSA PRINCIPAL
En `index.html`, el consent mode se configura con:
- `ad_storage: 'denied'` por defecto
- `ad_user_data: 'denied'` por defecto
- Solo se actualiza a 'granted' si `localStorage.getItem('pdfup_cookie_consent') === 'all'`

**PROBLEMA**: Si los usuarios hacen clic en "Essential only" o ignoran el banner de cookies, 
`ad_storage` permanece `denied` y Google Ads NO puede registrar conversiones.

Incluso con Consent Mode "Advanced", Google necesita un volumen mínimo de datos para modelar conversiones.
Con solo 2 pagos y posiblemente `ad_storage: denied`, es muy probable que no se registre nada.

### 2. Flujo de pago inline (PaywallModal)
El evento de conversión se dispara DESPUÉS del pago exitoso en el PaywallModal:
```js
window.gtag("event", "conversion", {
  send_to: "AW-18038723667/IUjxCNKbjI8cENLLwJLD",
  value: 1.0,
  currency: "EUR",
  transaction_id: "",
});
```

**PROBLEMAS DETECTADOS**:
- `transaction_id: ""` — vacío, debería tener un ID único
- Si el usuario NO aceptó cookies, el evento se envía pero Google lo ignora por `ad_storage: denied`

### 3. "Configuración errónea" en Google Ads
Esto generalmente significa que:
- La acción de conversión no ha recibido datos válidos
- O hay un problema con el consent mode
- O el conversion label/ID no coincide

## Soluciones propuestas
1. Asegurar que el evento de conversión se dispare SIEMPRE (incluso con ad_storage denied, 
   Google puede modelar conversiones en modo Advanced)
2. Añadir un transaction_id único (subscription ID o payment intent ID)
3. Verificar que el Conversion ID y Label son correctos en Google Ads
4. Considerar Enhanced Conversions para mejorar el tracking
