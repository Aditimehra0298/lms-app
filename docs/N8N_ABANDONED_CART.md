# n8n — abandoned cart email

When a signed-in learner has items in the cart but does not complete checkout, the LMS sends a **GET** request to your n8n workflow (query parameters) so you can email them a recovery link. This applies to **both** individual and organisation accounts (`accountType` is included in the query string).

---

## 1. LMS configuration (`.env.local`)

```env
N8N_ABANDONED_CART_WEBHOOK_URL=https://damnart-ai-guladab.n8n-wsk.com/webhook/abandoned-cart

# Same Basic Auth as welcome / certificate webhooks
N8N_WEBHOOK_USER=your_username
N8N_WEBHOOK_PASSWORD=your_password

# Optional: minutes after last cart change before email (default 30)
NEXT_PUBLIC_ABANDONED_CART_DELAY_MINUTES=30
```

Restart the dev server after changes.

---

## 2. When the webhook fires

| Trigger | When |
|--------|------|
| **Timer** | 30 minutes after the last cart change (add/remove item) |
| **Leave** | User hides the tab or leaves the site with items still in cart |

Not sent when:
- Cart is empty
- User is not signed in (no email)
- User completes checkout (cart cleared)
- Same cart was already reported in the last **24 hours**

---

## 3. Test manually

```bash
# Individual (GET)
node scripts/test-n8n-abandoned-cart.mjs

# Organisation (GET, accountType=organisation)
node scripts/test-n8n-abandoned-cart.mjs --org
```

Or call the LMS API (while logged in):

```bash
POST /api/cart/abandoned
Content-Type: application/json

{
  "email": "learner@example.com",
  "learnerName": "Aditi",
  "trigger": "manual",
  "items": [
    { "slug": "food-safety", "title": "Food Safety", "price": "$299", "qty": 1 }
  ]
}
```

---

## 4. Query parameters (n8n receives via GET)

The LMS calls your webhook with **GET**. Complex fields (`items`, `cartSummary`, `brand`, `links`, `emailContent`) are JSON-encoded strings in the query string. In n8n, parse with `JSON.parse()` where needed.

Example decoded payload:

```json
{
  "event": "abandoned_cart",
  "source": "lms",
  "accountType": "individual",
  "email": "learner@example.com",
  "learnerName": "Aditi",
  "trigger": "timer",
  "abandonedAt": "2026-06-03T12:00:00.000Z",
  "items": [
    {
      "slug": "food-safety-diploma",
      "title": "Food Safety Diploma",
      "price": "$299",
      "qty": 1,
      "image": "/course-food-safety.png",
      "deliveryKind": "managed"
    }
  ],
  "cartSummary": {
    "itemCount": 1,
    "subtotal": "299.00",
    "discount": "0.00",
    "total": "299.00",
    "currency": "USD"
  },
  "brand": {
    "appName": "SF Trainings",
    "shortBrand": "SFT",
    "appUrl": "https://your-lms.com",
    "logoUrl": "https://your-lms.com/SF-WHITE-LOGO.png"
  },
  "links": {
    "cart": "https://your-lms.com/cart",
    "checkout": "https://your-lms.com/checkout",
    "courses": "https://your-lms.com/courses"
  },
  "emailContent": {
    "subject": "Complete your SF Trainings order — items still in your cart",
    "previewText": "Aditi, you left 1 course(s) in your cart."
  }
}
```

### n8n Gmail node (example)

- **To:** `{{ $json.email }}`
- **Subject:** `{{ $json.emailContent.subject }}`
- **Body:** Build HTML with `{{ $json.learnerName }}`, loop `{{ $json.items }}`, button → `{{ $json.links.checkout }}`

---

## 5. Troubleshooting

| Issue | Fix |
|-------|-----|
| 401 / 403 | Match `N8N_WEBHOOK_USER` / `N8N_WEBHOOK_PASSWORD` to n8n Webhook Basic Auth |
| No execution | Workflow must be **Active**; use production `/webhook/abandoned-cart` not `/webhook-test/` |
| No email | Learner must be **signed in**; cart must have at least one item |
