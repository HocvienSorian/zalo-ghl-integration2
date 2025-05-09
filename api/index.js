// /api/index.js
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

// Route phụ vẫn hỗ trợ /webhook/zalo (dùng chung logic với /zalo/)
app.post("/webhook/zalo", async (req, res) => {
  console.log("📥 [Webhook] Zalo gửi đến /webhook/zalo:", req.body);
  await handleZaloWebhook(req, res); // gọi handler từ zalo.js
});

// GHL → ZALO
app.post("/webhook/ghl", async (req, res) => {
  const { contact, message } = req.body;
  const zaloId = contact?.customField?.zalo_id;

  console.log("📤 [Webhook] GHL gửi về:", { zaloId, message });

  if (zaloId && message) {
    await sendZaloMessage(zaloId, message);
  }

  res.status(200).send("GHL message received");
});

export default app;
