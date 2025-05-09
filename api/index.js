import express from "express";
import bodyParser from "body-parser";
import dotenv from "dotenv";
import zaloRouter, { sendZaloMessage, handleZaloWebhook } from "../zalo.js";
import { sendToGHL } from "../ghl.js";

dotenv.config();

const app = express();
app.use(bodyParser.json());

// Route chính Zalo
app.use("/zalo", zaloRouter);

// Route phụ vẫn hỗ trợ /webhook/zalo
app.post("/webhook/zalo", async (req, res) => {
  console.log("📥 [Webhook] Zalo gửi đến /webhook/zalo:", req.body);
  await handleZaloWebhook(req, res);
});

// GHL → ZALO
app.post("/webhook/ghl", async (req, res) => {
  console.log("📤 Raw GHL payload:", JSON.stringify(req.body, null, 2));

  const { contact, message, customData } = req.body;

  const zaloId =
    contact?.customField?.zalo_id ||
    contact?.custom?.zalo_id ||
    customData?.["contact.customField.zalo_id"] ||
    null;

  const text = message?.body || customData?.message;

  console.log("📤 [Webhook] GHL gửi về:", { zaloId, message: text });

  if (!zaloId) {
    console.warn("⚠️ Không tìm thấy Zalo ID trong payload");
    return res.status(400).send("Zalo ID missing");
  }

  if (!text) {
    console.warn("⚠️ Không có message được gửi");
    return res.status(400).send("Message is missing");
  }

  try {
    await sendZaloMessage(zaloId, text);
    return res.status(200).send("Zalo message sent");
  } catch (err) {
    console.error("❌ Gửi tin nhắn Zalo thất bại:", err.response?.data || err.message);
    return res.status(500).send("Failed to send message to Zalo");
  }
});

export default app;
