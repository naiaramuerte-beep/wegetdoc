# Baseline — cobros espaciados (cron cada 15 min)

Antes de pasar del lote diario (07:00 UTC / 09:00 Madrid) a cobrar cada sub a su
hora con el cron cada 15 min. Guardado para medir dentro de ~2 semanas si espaciar
mejora la aceptación, **sin confusores** (mismo importe, solo primer intento).

## Baseline (pre-deploy)

- **Corte:** 2026-08-04 17:16:34 UTC (19:16 Madrid).
- **Métrica clave — renovación MIT a PRIMER intento, importe 29,95€, últimas 2 semanas:**
  - **n = 119 · OK = 42 · aprobación = 35,3 %**
- Contexto (misma ventana):
  - 29,95€, todos los intentos: n=286 · OK=43 · 15,0 % (el resto son reintentos sobre tarjetas ya muertas).
  - Primer intento, todo importe: n=119 · OK=42 · 35,3 % (todo el tráfico reciente ya es 29,95€).

Fuente: `scripts/baseline-renov-29-95.mjs` (conexión UTC vía `scripts/_db.mjs`).
"Primer intento" = cargo MIT sin otro cargo MIT del mismo usuario en los 25 días previos.

## Deploy

- **Commit del código:** `8d0b660` (backend; anclaje a la hora de la sub, conexión UTC, lock 45min). Desplegado 2026-08-04. Rollback: `ed6b5e4`.
- **Cambio de frecuencia del cron en Railway:** `0 7 * * *` → `*/15 * * * *`.
- **Fecha y hora EXACTAS del cambio:** **2026-08-04 19:47 Madrid = 17:47 UTC**.
- Contexto: se cambió justo tras la corrida diaria de las 09:00 Madrid (que ya había vaciado la cola del día). Primer vencimiento posterior: sub#388, 21:12 Madrid del 2026-08-04.

## Medición (a hacer ~2 semanas después, ≥ 2026-08-18)

Repetir `scripts/baseline-renov-29-95.mjs` (mismo filtro: 29,95€ + primer intento,
últimas 2 semanas) y comparar la aprobación contra el 35,3 % de baseline.
Confusor a vigilar: que el importe siga siendo 29,95€ y que no cambie el trial.
