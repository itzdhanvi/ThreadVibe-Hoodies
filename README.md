# ThreadVibe Hoodies WhatsApp Chatbot

A WhatsApp Cloud API chatbot for a textile brand that sells:

1. Pre-printed hoodies
2. Customized hoodie printing

The bot behaves like a friendly sales and support assistant. It helps customers choose hoodie type, design, size, color, quantity, delivery details, payment method, and stores the final order in `orders.json`.

---

## Features

- Professional welcome message
- Pre-printed hoodie flow
- Customized hoodie flow
- Bulk order support
- Track order placeholder
- Human support handoff
- FAQ handling for:
  - Delivery time
  - Fabric quality
  - Washing instructions
  - Return policy
  - Bulk orders
  - Customization limitations
- Structured order storage
- WhatsApp Cloud API webhook integration

---

## Folder Structure

```txt
threadvibe-whatsapp-bot/
│
├── server.js
├── package.json
├── .env.example
├── orders.json
└── README.md
```

---

## Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Create `.env`

Copy `.env.example` and rename it to `.env`.

```bash
cp .env.example .env
```

Update values:

```env
PORT=3000
VERIFY_TOKEN=threadvibe_verify_token
WHATSAPP_TOKEN=YOUR_META_WHATSAPP_ACCESS_TOKEN
PHONE_NUMBER_ID=YOUR_WHATSAPP_PHONE_NUMBER_ID
```

### 3. Start server

```bash
npm start
```

Server will run on:

```txt
http://localhost:3000
```

---

## Webhook URLs

For Meta WhatsApp Cloud API webhook setup:

```txt
GET/POST https://your-domain.com/webhook
```

For local testing, use ngrok:

```bash
ngrok http 3000
```

Then use:

```txt
https://your-ngrok-url.ngrok-free.app/webhook
```

---

## Test Messages

Send:

```txt
Hi
```

The bot will reply with the main menu.

Use numbers like:

```txt
1
2
3
```

You can also ask FAQs like:

```txt
Delivery time?
Return policy?
Fabric quality?
Bulk order?
Washing instructions?
```

---

## Stored Order Format

Each confirmed order is stored in `orders.json` like this:

```json
{
  "customerName": "Customer Name",
  "phoneNumber": "Customer Phone",
  "orderType": "Pre-printed hoodie",
  "designCategory": "Anime prints",
  "customDesignUploaded": "No",
  "size": "L",
  "color": "Black",
  "printPlacement": "N/A",
  "printStyle": "N/A",
  "quantity": 2,
  "address": "Delivery Address",
  "paymentMethod": "UPI",
  "estimatedPrice": 1798,
  "deliveryTime": "5-7 working days",
  "orderStatus": "Confirmed",
  "createdAt": "2026-06-09T00:00:00.000Z"
}
```

---

## Notes

This project uses in-memory sessions. For production, replace this with a database such as MongoDB, PostgreSQL, Firebase, or Supabase.

`orders.json` is suitable for testing and mini-project/demo purposes.
