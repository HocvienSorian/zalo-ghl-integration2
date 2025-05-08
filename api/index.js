import express from "express";
import bodyParser from "body-parser";
import dotenv from "dotenv";
import { sendZaloMessage, parseZaloMessage } from "../zalo.js";
import { sendToGHL } from "../ghl.js";

dotenv.config();

const app = express();
app.use(bodyParser.json());

// ZALO → GHL
app.post("/webhook/zalo", async (req, res) => {
  const { sender, message } = parseZaloMessage(req.body);
  if (sender && message) {
    await sendToGHL(sender, message); // Gửi qua GHL
  }
  res.status(200).send("Zalo message received");
});

// GHL → ZALO
app.post("/webhook/ghl", async (req, res) => {
  const { contact, message } = req.body;
  const zaloId = contact?.customField?.zalo_uid;

  if (zaloId && message) {
    await sendZaloMessage(zaloId, message);
  }

  res.status(200).send("GHL message received");
});

// ❌ KHÔNG DÙNG app.listen()

// ✅ EXPORT APP CHO VERCEL
export default app;
