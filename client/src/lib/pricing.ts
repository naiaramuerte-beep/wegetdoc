// Single source of truth for the intro charge amount used by the
// tracking layer. The real-money paths (Sipay amountCents=50, FastPay
// data-amount="50", display "0,50 €" in PaywallModal) are NOT
// consolidated here yet — those touch the payment flow and live outside
// this commit's scope. If you change the price, also update those three
// hardcoded spots until they get refactored.
export const INTRO_CHARGE_EUR = 0.50;
export const INTRO_CHARGE_CURRENCY = "EUR";
