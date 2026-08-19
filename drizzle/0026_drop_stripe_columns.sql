-- Fuera las tres columnas de Stripe de `subscriptions`.
--
-- Se conservaban "como histórico de las subs creadas antes de la migración",
-- pero la auditoría del 2026-08-19 dice que ahí no hay ni un dato real: de 669
-- filas, la única con valores es la cuenta de cortesía del dueño (sub#42) y sus
-- identificadores son de mentira (`fake_cus_qa_2953`), creados por el endpoint de
-- QA. Ese endpoint ya marca sus pruebas con `sipayOrder = 'fake_qa_…'`, así que
-- nada del código escribe ni lee estas columnas.
--
-- Nota: `charges` y `webhook_events` guardan el histórico real de cobros, que no
-- se toca.
ALTER TABLE `subscriptions` DROP COLUMN `stripeCustomerId`;
--> statement-breakpoint
ALTER TABLE `subscriptions` DROP COLUMN `stripeSubscriptionId`;
--> statement-breakpoint
ALTER TABLE `subscriptions` DROP COLUMN `stripeSessionId`;
--> statement-breakpoint
-- El proveedor por defecto del registro de eventos ya no puede ser una pasarela
-- que no existe: los eventos que llegaran sin proveedor explícito quedaban
-- etiquetados como "stripe" en la pestaña de Webhooks del panel.
ALTER TABLE `webhook_events` ALTER COLUMN `provider` SET DEFAULT 'sipay';
