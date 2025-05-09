// /api/index.js
import express from "express";
import bodyParser from "body-parser";
import dotenv from "dotenv";
import zaloRouter, { sendZaloMessage, parseZaloMessage } from "../zalo.js";
import { sendToGHL } from "../ghl.js";

dotenv.config();

const app = express();
app.use(bodyParser.json());

// Gắn router Zalo → POST /zalo/
app.use("/zalo", zaloRouter);

// ZALO → GHL (Webhook Zalo v3.0 gửi về đây nếu bạn dùng /webhook/zalo riêng)
app.post("/webhook/zalo", async (req, res) => {
  console.log("📥 [Webhook] Zalo gửi đến:", req.body);
  const { sender, message } = parseZaloMessage(req.body);

  if (sender && message) {
    await sendToGHL(sender, message);
  }

  res.status(200).send("Zalo message received");
});

// GHL → ZALO (GHL gửi tin nhắn về cho user)
app.post("/webhook/ghl", async (req, res) => {
  const { contact, message } = req.body;
  const zaloId = contact?.customField?.zalo_uid;

  console.log("📤 [Webhook] GHL gửi về:", { zaloId, message });

  if (zaloId && message) {
    await sendZaloMessage(zaloId, message);
  }

  res.status(200).send("GHL message received");
});

// ✅ Export app cho Vercel
export default app;
