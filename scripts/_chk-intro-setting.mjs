import { openDb } from "./_db.mjs";
const db = await openDb();
const [r] = await db.query(
  `SELECT \`key\`, value FROM site_settings WHERE \`key\` IN ('intro_price_eur','subscription_price_eur','trial_days')`);
console.log(r);
await db.end();
