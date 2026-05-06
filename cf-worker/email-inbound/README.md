# EditorPDF — Email Inbound Worker

Cloudflare Email Worker that turns incoming mail to `support@editorpdf.net`
into rows in the `contact_messages` table so admin replies that customers
respond to land in the panel instead of being lost in gmail.

## What it does

1. Receives an email via Cloudflare Email Routing (rule: `support@editorpdf.net` → this worker).
2. Parses the MIME body with `postal-mime`.
3. Strips the quoted-reply tail so the admin sees only the new content.
4. POSTs the parsed `{fromName, fromEmail, subject, body}` to
   `BACKEND_URL/api/inbound-email` with a shared secret in the header.
5. Forwards the raw email to `FORWARD_TO` (gmail) as a backup.

If both backend POST and gmail forward fail, the worker rejects the
message so Cloudflare can surface a bounce and we don't lose data
silently.

## Initial deploy (one-time)

```bash
cd cf-worker/email-inbound
npm install

# 1. Login to Cloudflare (opens browser).
npx wrangler login

# 2. Set secrets (paste each value when prompted).
#    INBOUND_EMAIL_SECRET must match Railway env var of same name.
#    Generate with: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
npx wrangler secret put INBOUND_EMAIL_SECRET
# value: <the same hex string set in Railway>

npx wrangler secret put BACKEND_URL
# value: https://editorpdf.net

npx wrangler secret put FORWARD_TO
# value: supporteditorpdf@gmail.com

# 3. Deploy.
npx wrangler deploy
# Output ends with: "Published editorpdf-email-inbound (...)"
```

## Wire it into Cloudflare Email Routing

After deploy:

1. Go to https://dash.cloudflare.com → editorpdf.net → **Email** → **Email Routing** → **Routes**
2. Find the rule for `support@editorpdf.net`.
3. Edit it and change the **Action** from `Send to an email` to `Send to a Worker`.
4. Pick `editorpdf-email-inbound` from the dropdown.
5. Save.

The previous gmail destination still receives mail because the worker
forwards to `FORWARD_TO`. Effectively the worker has replaced the
forwarding rule but kept the same outcome plus the panel ingestion.

## Test it

Send a test email from any other account to `support@editorpdf.net`.
Within ~30 seconds:

- A new row should appear in the admin Mensajes panel with badge
  `email_reply` and the body of the email.
- The same email should arrive at `supporteditorpdf@gmail.com` (backup).

To debug live:
```bash
cd cf-worker/email-inbound
npx wrangler tail
```

## Updating the worker later

Edit `src/index.ts`, then:

```bash
npx wrangler deploy
```

No need to re-set secrets unless you rotate them.
