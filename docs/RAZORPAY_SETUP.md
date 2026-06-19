# Razorpay payment gateway — setup guide

Checkout at **`/checkout`** uses **Razorpay** when API keys are configured. Without keys, the page stays in **demo mode** (enrollment completes without charging).

---

## Quick checklist

| Step | Action |
|------|--------|
| 1 | Create / sign in to [Razorpay Dashboard](https://dashboard.razorpay.com/) |
| 2 | Copy **Test** API keys (development) or **Live** keys (production after KYC) |
| 3 | Add keys to **`.env.local`** (same folder as `package.json`) |
| 4 | Restart the app: `npm run dev` (local) or `pm2 restart lms` (server) |
| 5 | Sign in → open a course landing → go to checkout → **Pay with Razorpay** |

---

## 1. Razorpay account & keys

### Test mode (localhost / staging)

1. Open [Dashboard → Settings → API Keys](https://dashboard.razorpay.com/app/keys).
2. Generate **Test** keys if you do not have them yet.
3. Copy:
   - **Key ID** — starts with `rzp_test_…`
   - **Key Secret** — shown once; store it safely.

Test mode accepts test cards and UPI; no real money is charged.

### Live mode (production)

1. Complete **KYC** and activate your Razorpay account ([activation guide](https://razorpay.com/docs/payments/account-setup/)).
2. Switch to **Live** mode in the dashboard.
3. Generate **Live** keys (`rzp_live_…`).
4. Use live keys **only** on HTTPS production (e.g. `https://lms.yourdomain.com`).

---

## 2. LMS environment variables

Copy `.env.example` → `.env.local` if you have not already:

```bash
npm run env:init
npm run env:edit
```

Add:

```env
# Razorpay — required for live checkout
RAZORPAY_KEY_ID=rzp_test_xxxxxxxx
RAZORPAY_KEY_SECRET=your_secret_key
```

| Variable | Required | Notes |
|----------|----------|--------|
| `RAZORPAY_KEY_ID` | Yes | Public key; safe to expose to the browser via API |
| `RAZORPAY_KEY_SECRET` | Yes | **Server only** — never commit or put in client code |
| `RAZORPAY_CURRENCY` | No | Optional fallback only — checkout **automatically uses the learner’s pricing region** (USD, GBP, AED, etc.) |

### International pricing (multi-currency)

Checkout does **not** force INR. When a learner signs in, their **pricing region** (country from profile, registration, or IP) sets:

- Prices shown on checkout (same as course catalog)
- **Currency charged in Razorpay** (e.g. USD for US, GBP for UK, INR for India)
- Admin **regional price rows** per country when configured in the course editor

Prices update automatically — learners do not pick a region manually in the UI.

**Security**

- Never commit `.env.local` or paste the **Key Secret** in chat, git, or frontend code.
- On GCP/VM deploy, set the same variables in `/var/www/lms/.env.local` (see **`docs/GCP_CLOUDFLARE_DEPLOYMENT.md`**).

---

## 3. Restart the application

Environment variables load at startup.

**Local:**

```bash
npm run dev
```

**Production (PM2 example):**

```bash
cd /var/www/lms
npm run build
pm2 restart lms
```

---

## 4. Test the checkout flow

The LMS requires **login** and (for buy-now) viewing the **course landing** before checkout.

1. Open [http://localhost:3000/account](http://localhost:3000/account) and sign in.
2. Open a course (e.g. `/courses/advanced-cyber-security-professional`) — scroll the landing page so the session gate passes.
3. Click **Buy now** or add to cart → open **`/checkout`**.
4. Confirm the payment box shows **“Pay securely with Razorpay”** (not “Demo checkout mode”).
5. Click **Pay … with Razorpay** — the Razorpay popup should open.
6. Complete payment → you should see **Payment Successful** and courses in **My Learning**.

### Razorpay test credentials

Use [Razorpay test cards](https://razorpay.com/docs/payments/payments/test-card-details/) in **Test** mode:

| Method | Test value |
|--------|------------|
| Card | `4111 1111 1111 1111` |
| Expiry | Any future date |
| CVV | Any 3 digits |
| UPI | Any valid-format UPI ID (e.g. `success@razorpay`) |

---

## 5. How it works in this LMS

```
Learner clicks Pay
    → POST /api/payments/razorpay/create-order  (server creates Razorpay order)
    → Razorpay checkout modal (browser)
    → Payment success callback
    → POST /api/payments/razorpay/verify         (HMAC signature check)
    → Enrollment saved (localStorage + MySQL via /api/purchases)
    → Redirect to My Learning / live course hub
```

**Relevant code**

| File | Purpose |
|------|---------|
| `app/checkout/page.tsx` | Checkout UI and Pay button |
| `app/api/payments/razorpay/create-order/route.ts` | Create order |
| `app/api/payments/razorpay/verify/route.ts` | Verify payment signature |
| `app/api/payments/razorpay/config/route.ts` | Whether Razorpay is configured |
| `lib/server/razorpay-service.ts` | Order + signature logic |
| `lib/razorpay-client.ts` | Loads Razorpay checkout script |

**Pricing on checkout**

- Uses the learner’s **regional prices** (admin regional rows or INR base + FX)
- Subtotal from cart line items in that currency  
- **10% discount** when 2+ items  
- **18% GST** on (subtotal − discount)  
- Total sent to Razorpay matches the order summary on the page  

---

## 6. Production deployment

On your server (GCP VM, etc.):

```env
NEXT_PUBLIC_APP_URL=https://lms.yourdomain.com

RAZORPAY_KEY_ID=rzp_live_xxxxxxxx
RAZORPAY_KEY_SECRET=your_live_secret
RAZORPAY_CURRENCY=INR
```

After updating `.env.local`:

```bash
npm run build
pm2 restart lms
```

Ensure the site is served over **HTTPS** (Cloudflare + Nginx — see **`docs/GCP_CLOUDFLARE_DEPLOYMENT.md`**).

---

## 7. Verify configuration

**Browser:** On checkout, the payment section should say **Pay securely with Razorpay**.

**API:**

```bash
curl -s http://localhost:3000/api/payments/razorpay/config
```

Expected when configured:

```json
{"ok":true,"configured":true,"keyId":"rzp_test_...","currency":"INR"}
```

When keys are missing:

```json
{"ok":true,"configured":false,"keyId":null,"currency":"INR"}
```

---

## 8. Troubleshooting

| Issue | Fix |
|--------|-----|
| Checkout shows **Demo checkout mode** | Add `RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET` to `.env.local` and **restart** the server. |
| “Razorpay is not configured on the server” | Same as above; both variables must be set. |
| “Could not create Razorpay order” | Wrong secret, expired keys, or Razorpay account issue. Regenerate keys in dashboard. |
| “Payment signature verification failed” | Key secret mismatch (test vs live), or tampered callback. Use matching test/live pair. |
| Pay button does nothing / script error | Allow `checkout.razorpay.com` in browser; disable ad blockers for checkout. |
| Redirected to login before checkout | Sign in at `/account` first; checkout requires `sft_logged_in`. |
| Sent back to course page from checkout | Open the **course landing** once before buy-now (session gate in `lib/course-landing.ts`). |
| Amount mismatch / minimum amount | Total must be at least **₹1** (100 paise). Check cart prices are numeric. |
| Live payments fail | Complete KYC; use **live** keys on HTTPS only. |

---

## 9. Demo mode (no Razorpay keys)

If `RAZORPAY_KEY_ID` / `RAZORPAY_KEY_SECRET` are not set:

- Checkout shows **Demo checkout mode**.
- **Complete demo purchase** enrolls the learner without opening Razorpay.
- Useful for demos and local development without a payment account.

---

## 10. Optional next steps

Not implemented yet — add if you need them:

- **Webhooks** — `payment.captured`, refunds (`/api/payments/razorpay/webhook`)
- **MySQL payment log** — store `order_id`, `payment_id`, amount per transaction
- **Invoices** — Razorpay invoices or PDF download on success screen

For payment-related support tickets, the chatbot category **PAY** is already defined in **`docs/OPENAI_ASSISTANT_SYSTEM_PROMPT.md`**.

---

## Related docs

- **`.env.example`** — all environment variables  
- **`docs/GCP_CLOUDFLARE_DEPLOYMENT.md`** — production server + HTTPS  
- **`docs/SERVER_DEPLOYMENT.md`** — generic server deploy  
- **`docs/DATA_STORAGE_AND_CONNECTIONS.md`** — where enrollments are stored after checkout  
