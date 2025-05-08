// index.js
import express from "express";
import bodyParser from "body-parser";
import dotenv from "dotenv";
import zaloRouter, { replyZaloText } from "./zalo.js";
import { sendZaloMessage } from "./zalo.js";
import { sendToGHL } from "./ghl.js";

dotenv.config();

const app = express();
app.use(bodyParser.json());

// 👉 Mount zaloRouter để xử lý /zalo (Zalo webhook nội bộ trong zalo.js)
app.use(zaloRouter);

// GHL → ZALO (GHL gọi webhook gửi tin nhắn về Zalo)
app.post("/webhook/ghl", async (req, res) => {
  const { contact, message } = req.body;
  const zaloId = contact?.customField?.zalo_uid;

  if (zaloId && message) {
    await sendZaloMessage(zaloId, message); // hoặc replyZaloText({ userId: zaloId, message })
  }

  res.status(200).send("GHL message received");
});

// ❌ KHÔNG dùng app.listen() để chạy local
// ✅ EXPORT CHO VERCEL XỬ LÝ
export default app;
