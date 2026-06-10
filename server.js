require("dotenv").config();
const path = require("path");

const express = require("express");
const axios = require("axios");
const fs = require("fs");
const { createClient } = require("@supabase/supabase-js");
const WebSocket = require("ws");

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    realtime: {
      transport: WebSocket,
    },
  }
);
const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3000;
const VERIFY_TOKEN = process.env.VERIFY_TOKEN;
const WHATSAPP_TOKEN = process.env.WHATSAPP_TOKEN;
const PHONE_NUMBER_ID = process.env.PHONE_NUMBER_ID;
const ORDERS_FILE = path.join(__dirname, "orders.json");

const BRAND_NAME = "ThreadVibe Hoodies";
const sessions = {};

const hoodieCategories = {
  "1": "Anime prints",
  "2": "Quotes",
  "3": "Minimal designs",
  "4": "Streetwear graphics",
  "5": "College hoodies",
  "6": "Brand/logo hoodies",
};

const colors = {
  "1": "Black",
  "2": "White",
  "3": "Grey",
  "4": "Navy Blue",
  "5": "Maroon",
  "6": "Beige",
  "7": "Custom color",
};

const printPlacements = {
  "1": "Front",
  "2": "Back",
  "3": "Sleeve",
  "4": "Front + Back",
};

const printStyles = {
  "1": "Text print",
  "2": "Logo print",
  "3": "Image print",
  "4": "Embroidery-style print",
  "5": "Oversized graphic print",
};

const paymentMethods = {
  "1": "UPI",
  "2": "Cash on Delivery",
  "3": "Card",
  "4": "Net Banking",
};

// ---------------- WEBHOOK VERIFICATION ----------------

app.get("/webhook", (req, res) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  if (mode === "subscribe" && token === process.env.VERIFY_TOKEN) {
    console.log("Webhook verified");
    return res.status(200).send(challenge);
  }

  return res.sendStatus(403);
});

// ---------------- WEBHOOK RECEIVER ----------------

app.post("/webhook", async (req, res) => {
  try {
    const entry = req.body.entry?.[0];
    const changes = entry?.changes?.[0];
    const value = changes?.value;
    const message = value?.messages?.[0];

    if (!message) {
      return res.sendStatus(200);
    }

    const from = message.from;
    const messageText = getMessageText(message);

    console.log(`Incoming message from ${from}:`, messageText);

    await handleMessage(from, messageText, message);

    return res.sendStatus(200);
  } catch (error) {
    console.error("Webhook error:", error.response?.data || error.message);
    return res.sendStatus(500);
  }
});

function getMessageText(message) {
  if (message.type === "text") {
    return message.text.body.trim();
  }

  if (message.type === "image") {
    return "IMAGE_UPLOADED";
  }

  if (message.type === "document") {
    return "DOCUMENT_UPLOADED";
  }

  return "UNSUPPORTED_MESSAGE";
}

// ---------------- MAIN BOT LOGIC ----------------

async function handleMessage(phone, text, rawMessage) {
  const lowerText = text.toLowerCase();

  if (!sessions[phone]) {
    sessions[phone] = createNewSession(phone);
    await sendMessage(phone, welcomeMessage());
    return;
  }

  if (["hi", "hello", "hey", "start", "menu"].includes(lowerText)) {
    sessions[phone] = createNewSession(phone);
    await sendMessage(phone, welcomeMessage());
    return;
  }

  if (isFAQ(lowerText)) {
    await sendMessage(phone, getFAQResponse(lowerText));
    return;
  }

  const session = sessions[phone];

  switch (session.step) {
    case "MAIN_MENU":
      await handleMainMenu(phone, text);
      break;

    case "PREPRINT_CATEGORY":
      await handlePreprintCategory(phone, text);
      break;

    case "CUSTOM_UPLOAD":
      await handleCustomUpload(phone, text, rawMessage);
      break;

    case "PRINT_PLACEMENT":
      await handlePrintPlacement(phone, text);
      break;

    case "PRINT_STYLE":
      await handlePrintStyle(phone, text);
      break;

    case "SIZE":
      await handleSize(phone, text);
      break;

    case "COLOR":
      await handleColor(phone, text);
      break;

    case "CUSTOM_COLOR":
      await handleCustomColor(phone, text);
      break;

    case "QUANTITY":
      await handleQuantity(phone, text);
      break;

    case "CUSTOMER_NAME":
      await handleCustomerName(phone, text);
      break;

    case "ADDRESS":
      await handleAddress(phone, text);
      break;

    case "PAYMENT_METHOD":
      await handlePaymentMethod(phone, text);
      break;

    case "CONFIRM_ORDER":
      await handleOrderConfirmation(phone, text);
      break;

    case "BULK_ORDER":
      await handleBulkOrder(phone, text);
      break;

    case "TRACK_ORDER":
      await handleTrackOrder(phone, text);
      break;

    default:
      await sendMessage(phone, fallbackMessage());
      break;
  }
}

function createNewSession(phone) {
  return {
    phone,
    step: "MAIN_MENU",
    order: {
      customerName: "",
      phoneNumber: phone,
      orderType: "",
      designCategory: "",
      customDesignUploaded: "No",
      size: "",
      color: "",
      printPlacement: "N/A",
      printStyle: "N/A",
      quantity: 0,
      address: "",
      paymentMethod: "",
      estimatedPrice: 0,
      deliveryTime: "",
      orderStatus: "Pending",
    },
  };
}

function welcomeMessage() {
  return `Hi! Welcome to ${BRAND_NAME} 👕\n\nWe sell premium hoodies with pre-printed and customized designs.\n\nWhat would you like to explore?\n\n1. Pre-printed hoodies\n2. Customized hoodie\n3. Bulk order\n4. Track my order\n5. Talk to support`;
}

async function handleMainMenu(phone, text) {
  const session = sessions[phone];

  if (text === "1") {
    session.order.orderType = "Pre-printed hoodie";
    session.step = "PREPRINT_CATEGORY";
    await sendMessage(
      phone,
      `Great! Please choose a design category:\n\n1. Anime prints\n2. Quotes\n3. Minimal designs\n4. Streetwear graphics\n5. College hoodies\n6. Brand/logo hoodies`
    );
    return;
  }

  if (text === "2") {
    session.order.orderType = "Customized hoodie";
    session.step = "CUSTOM_UPLOAD";
    await sendMessage(
      phone,
      `Awesome! Please upload your design, logo, text, or reference image.\n\nYou can also type the text you want printed on the hoodie.`
    );
    return;
  }

  if (text === "3") {
    session.step = "BULK_ORDER";
    await sendMessage(
      phone,
      `Sure! We accept bulk orders for colleges, teams, events, and brands.\n\nPlease share:\n1. Quantity\n2. Hoodie color\n3. Design idea\n4. Required delivery date`
    );
    return;
  }

  if (text === "4") {
    session.step = "TRACK_ORDER";
    await sendMessage(phone, "Please enter your order ID or registered phone number.");
    return;
  }

  if (text === "5") {
    await sendMessage(phone, supportMessage());
    return;
  }

  await sendMessage(phone, "Please choose a valid option: 1, 2, 3, 4, or 5.");
}

async function handlePreprintCategory(phone, text) {
  const session = sessions[phone];

  if (!hoodieCategories[text]) {
    await sendMessage(phone, "Please select a valid category from 1 to 6.");
    return;
  }

  session.order.designCategory = hoodieCategories[text];
  session.step = "SIZE";

  await sendMessage(phone, "Please select your hoodie size:\n\nXS / S / M / L / XL / XXL");
}

async function handleCustomUpload(phone, text, rawMessage) {
  const session = sessions[phone];

  if (text === "IMAGE_UPLOADED" || text === "DOCUMENT_UPLOADED") {
    session.order.customDesignUploaded = "Yes";
    session.order.designCategory = "Custom uploaded design";
  } else {
    session.order.customDesignUploaded = `Text/reference: ${text}`;
    session.order.designCategory = "Custom text/reference design";
  }

  session.step = "PRINT_PLACEMENT";

  await sendMessage(
    phone,
    `Nice! Where do you want the print?\n\n1. Front\n2. Back\n3. Sleeve\n4. Front + Back`
  );
}

async function handlePrintPlacement(phone, text) {
  const session = sessions[phone];

  if (!printPlacements[text]) {
    await sendMessage(phone, "Please choose a valid print placement: 1, 2, 3, or 4.");
    return;
  }

  session.order.printPlacement = printPlacements[text];
  session.step = "PRINT_STYLE";

  await sendMessage(
    phone,
    `What print style do you want?\n\n1. Text print\n2. Logo print\n3. Image print\n4. Embroidery-style print\n5. Oversized graphic print`
  );
}

async function handlePrintStyle(phone, text) {
  const session = sessions[phone];

  if (!printStyles[text]) {
    await sendMessage(phone, "Please choose a valid print style from 1 to 5.");
    return;
  }

  session.order.printStyle = printStyles[text];
  session.step = "SIZE";

  await sendMessage(phone, "Please select your hoodie size:\n\nXS / S / M / L / XL / XXL");
}

async function handleSize(phone, text) {
  const session = sessions[phone];
  const selectedSize = text.toUpperCase();

  if (!["XS", "S", "M", "L", "XL", "XXL"].includes(selectedSize)) {
    await sendMessage(phone, "Please select a valid size: XS, S, M, L, XL, or XXL.");
    return;
  }

  session.order.size = selectedSize;
  session.step = "COLOR";

  await sendMessage(
    phone,
    `Which color would you prefer?\n\n1. Black\n2. White\n3. Grey\n4. Navy Blue\n5. Maroon\n6. Beige\n7. Custom color`
  );
}

async function handleColor(phone, text) {
  const session = sessions[phone];

  if (!colors[text]) {
    await sendMessage(phone, "Please choose a valid color option from 1 to 7.");
    return;
  }

  if (text === "7") {
    session.step = "CUSTOM_COLOR";
    await sendMessage(phone, "Please type your preferred custom color.");
    return;
  }

  session.order.color = colors[text];
  session.step = "QUANTITY";

  await sendMessage(phone, "How many hoodies do you want?");
}

async function handleCustomColor(phone, text) {
  const session = sessions[phone];

  session.order.color = `Custom color: ${text}`;
  session.step = "QUANTITY";

  await sendMessage(phone, "How many hoodies do you want?");
}

async function handleQuantity(phone, text) {
  const session = sessions[phone];
  const quantity = parseInt(text, 10);

  if (Number.isNaN(quantity) || quantity <= 0) {
    await sendMessage(phone, "Please enter a valid quantity. Example: 1, 2, 5, 10");
    return;
  }

  session.order.quantity = quantity;
  session.order.estimatedPrice = calculatePrice(session.order);
  session.order.deliveryTime =
    session.order.orderType === "Customized hoodie" ? "7-10 working days" : "5-7 working days";

  session.step = "CUSTOMER_NAME";

  await sendMessage(phone, "Please share your full name for the order.");
}

async function handleCustomerName(phone, text) {
  const session = sessions[phone];

  if (text.length < 2) {
    await sendMessage(phone, "Please enter a valid name.");
    return;
  }

  session.order.customerName = text;
  session.step = "ADDRESS";

  await sendMessage(phone, "Please share your complete delivery address.");
}

async function handleAddress(phone, text) {
  const session = sessions[phone];

  if (text.length < 10) {
    await sendMessage(phone, "Please enter a complete delivery address.");
    return;
  }

  session.order.address = text;
  session.step = "PAYMENT_METHOD";

  await sendMessage(
    phone,
    `Please select your preferred payment method:\n\n1. UPI\n2. Cash on Delivery\n3. Card\n4. Net Banking`
  );
}

async function handlePaymentMethod(phone, text) {
  const session = sessions[phone];

  if (!paymentMethods[text]) {
    await sendMessage(phone, "Please choose a valid payment option from 1 to 4.");
    return;
  }

  session.order.paymentMethod = paymentMethods[text];
  session.step = "CONFIRM_ORDER";

  await sendMessage(phone, generateOrderSummary(session.order));
}

async function handleOrderConfirmation(phone, text) {
  const session = sessions[phone];

  if (text === "1") {
    session.order.orderStatus = "Confirmed";
    session.order.createdAt = new Date().toISOString();
    await saveOrder(session.order);

    await sendMessage(
      phone,
      `Thank you! 🎉\n\nYour order has been confirmed with ${BRAND_NAME}.\n\nOur team will contact you soon for payment and final confirmation.\n\nType "menu" anytime to start again.`
    );

    delete sessions[phone];
    return;
  }

  if (text === "2") {
    sessions[phone] = createNewSession(phone);
    await sendMessage(phone, `No problem. Let's start again.\n\n${welcomeMessage()}`);
    return;
  }

  if (text === "3") {
    await sendMessage(phone, supportMessage());
    return;
  }

  await sendMessage(phone, "Please choose:\n\n1. Confirm order\n2. Make changes\n3. Talk to support");
}

async function handleBulkOrder(phone, text) {
  await sendMessage(
    phone,
    `Thanks for sharing the bulk order details.\n\nOur team will review your requirement and share a custom quote soon.\n\nFor faster support, please also share your name and preferred delivery date.`
  );
}

async function handleTrackOrder(phone, text) {
  await sendMessage(
    phone,
    `Thanks! Your tracking request has been received.\n\nA team member will check the order status and update you shortly.`
  );
}

// ---------------- PRICE LOGIC ----------------

function calculatePrice(order) {
  let basePrice = order.orderType === "Customized hoodie" ? 999 : 799;

  if (order.size === "XXL") {
    basePrice += 100;
  }

  if (order.orderType === "Customized hoodie") {
    if (order.printPlacement === "Front + Back") {
      basePrice += 200;
    }

    if (order.printStyle === "Embroidery-style print") {
      basePrice += 250;
    }

    if (order.printStyle === "Oversized graphic print") {
      basePrice += 150;
    }
  }

  let total = basePrice * order.quantity;

  if (order.quantity >= 10) {
    total = total * 0.9;
  } else if (order.quantity >= 5) {
    total = total * 0.95;
  }

  return Math.round(total);
}

function generateOrderSummary(order) {
  return `Here is your order summary 👇\n\nProduct: ${order.orderType}\nDesign: ${order.designCategory}\nCustom Design Uploaded: ${order.customDesignUploaded}\nSize: ${order.size}\nColor: ${order.color}\nPrint Placement: ${order.printPlacement}\nPrint Style: ${order.printStyle}\nQuantity: ${order.quantity}\nEstimated Price: ₹${order.estimatedPrice}\nDelivery Time: ${order.deliveryTime}\nPayment Method: ${order.paymentMethod}\n\nName: ${order.customerName}\nPhone: ${order.phoneNumber}\nAddress: ${order.address}\n\nWould you like to confirm this order?\n\n1. Yes\n2. Make changes\n3. Talk to support`;
}

// ---------------- FAQ LOGIC ----------------

function isFAQ(text) {
  const faqKeywords = [
    "delivery",
    "deliver",
    "fabric",
    "material",
    "quality",
    "wash",
    "washing",
    "return",
    "refund",
    "bulk",
    "customization",
    "customise",
    "customize",
    "limitation",
  ];

  return faqKeywords.some((keyword) => text.includes(keyword));
}

function getFAQResponse(text) {
  if (text.includes("delivery") || text.includes("deliver")) {
    return "Standard delivery takes 5–7 working days. Customized orders may take 7–10 working days depending on the design.";
  }

  if (text.includes("fabric") || text.includes("material") || text.includes("quality")) {
    return "Our hoodies are made from soft cotton fleece / premium blended fabric, suitable for daily wear.";
  }

  if (text.includes("wash") || text.includes("washing")) {
    return "Wash inside out with cold water. Do not iron directly on the printed area.";
  }

  if (text.includes("return") || text.includes("refund")) {
    return "Pre-printed hoodies can be returned if there is a size or quality issue. Customized hoodies cannot be returned unless there is a printing or product defect.";
  }

  if (text.includes("bulk")) {
    return "Yes, we accept bulk orders for colleges, teams, events, and brands. Please share quantity and design details for a custom quote.";
  }

  if (text.includes("customization") || text.includes("customise") || text.includes("customize") || text.includes("limitation")) {
    return "We can print text, logos, images, and reference designs. Very low-quality images, copyrighted artwork, and offensive content may not be accepted.";
  }

  return fallbackMessage();
}

function fallbackMessage() {
  return "I’m sorry, I can help only with hoodie orders, pricing, customization, delivery, returns, and support. A human team member will assist you with this request.";
}

function supportMessage() {
  return "Sure! A human team member from ThreadVibe Hoodies will assist you shortly. Please share your question or requirement here.";
}

// ---------------- ORDER STORAGE ----------------

async function saveOrder(order) {
  const { data, error } = await supabase
    .from("hoodie_orders")
    .insert([
      {
        customer_name: order.customerName || "",
        phone_number: order.phoneNumber || "",
        order_type: order.orderType || "",
        design_category: order.designCategory || "",
        custom_design_uploaded: order.customDesignUploaded || "No",
        size: order.size || "",
        color: order.color || "",
        print_placement: order.printPlacement || "",
        print_style: order.printStyle || "",
        quantity: Number(order.quantity) || 1,
        address: order.address || "",
        payment_method: order.paymentMethod || "",
        estimated_price: Number(order.estimatedPrice) || 0,
        delivery_time: order.deliveryTime || "",
        order_status: order.orderStatus || "Confirmed",
      },
    ])
    .select();

  if (error) {
    console.error("Supabase insert error:", error.message);
    throw error;
  }

  console.log("Order saved to Supabase:", data);
  return data;
}
// ---------------- WHATSAPP SEND MESSAGE ----------------

async function sendMessage(to, body) {
  try {
    if (!WHATSAPP_TOKEN || !PHONE_NUMBER_ID) {
      console.log("Bot reply:", body);
      return;
    }

    await axios.post(
      `https://graph.facebook.com/v20.0/${PHONE_NUMBER_ID}/messages`,
      {
        messaging_product: "whatsapp",
        to,
        type: "text",
        text: {
          preview_url: false,
          body,
        },
      },
      {
        headers: {
          Authorization: `Bearer ${WHATSAPP_TOKEN}`,
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error) {
    console.error("Send message error:", error.response?.data || error.message);
  }
}

// ---------------- HEALTH CHECK ----------------

app.get("/", (req, res) => {
  res.send(`${BRAND_NAME} WhatsApp chatbot is running.`);
});

app.listen(PORT, () => {
  console.log(`${BRAND_NAME} bot running on port ${PORT}`);
});
