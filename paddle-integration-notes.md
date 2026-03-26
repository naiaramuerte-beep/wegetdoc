# Paddle Integration Notes

## Key Concepts

### 1. Paddle.js (Frontend)
- Script: `<script src="https://cdn.paddle.com/paddle/v2/paddle.js"></script>`
- Initialize: `Paddle.Initialize({ token: "CLIENT_SIDE_TOKEN" })`
- Sandbox: `Paddle.Environment.set("sandbox")`
- Open checkout: `Paddle.Checkout.open({ items: [{ priceId, quantity }], customer: { email }, settings: { successUrl }, customData: {} })`
- Event callback: `Paddle.Initialize({ token, eventCallback: (event) => { if (event.name === 'checkout.completed') { ... } } })`

### 2. Node.js SDK (Backend)
- Install: `pnpm add @paddle/paddle-node-sdk`
- Initialize: `const paddle = new Paddle('API_KEY', { environment: Environment.sandbox })`
- Properties use camelCase (not snake_case like API docs)

### 3. Webhook Verification
- Route: `/api/paddle/webhook` with `express.raw({ type: 'application/json' })`
- Verify: Extract `Paddle-Signature` header, parse ts= and h1=, build signed payload `${ts}:${rawBody}`, HMAC-SHA256 with secret key, compare
- SDK method: `paddle.webhooks.unmarshal(rawBody, secretKey, signature)`

### 4. Trials
- Set trial_period on the Price in Paddle dashboard (e.g., 7 days)
- Subscription starts with status `trialing`
- After trial ends, Paddle automatically bills the full amount
- Events: `subscription.created` (status=trialing), `subscription.activated` (status=active after trial)

### 5. Key Webhook Events
- `subscription.created` — new subscription (may be trialing)
- `subscription.activated` — trial ended, now active and paying
- `subscription.updated` — status change (e.g., canceled, past_due)
- `subscription.canceled` — subscription canceled
- `transaction.completed` — payment completed
- `transaction.payment_failed` — payment failed

### 6. Required Secrets
- PADDLE_API_KEY — Server-side API key
- VITE_PADDLE_CLIENT_TOKEN — Client-side token for Paddle.js
- PADDLE_WEBHOOK_SECRET — Secret key for webhook verification
- Price IDs created in Paddle dashboard

### 7. Checkout Flow
1. Frontend calls tRPC to get checkout config (or opens directly with Paddle.js)
2. Paddle.Checkout.open() with priceId, customer email, customData (userId)
3. User pays in Paddle overlay
4. Paddle sends webhook to /api/paddle/webhook
5. Backend verifies signature, processes event, updates DB
6. Frontend gets callback via eventCallback

### 8. Test Card
- Card: 4242 4242 4242 4242
- Expiry: Any future date
- CVV: Any 3 digits
