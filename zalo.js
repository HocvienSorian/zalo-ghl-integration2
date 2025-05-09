// zalo.js
import express from 'express';
import axios from 'axios';
import dotenv from 'dotenv';
import { handleGHLMessage } from './ghl.js';

dotenv.config();

const router = express.Router();

// Zalo webhook handler (POST /zalo/)
router.post('/', async (req, res) => {
  const body = req.body;

  try {
    console.log('📥 Webhook từ Zalo nhận được:', body);

    if (body.event_name === 'user_send_text') {
      const userId = body.sender.id;
      const message = body.message.text;

      console.log('👤 User ID:', userId);
      console.log('💬 Message:', message);

      // Gọi API lấy thông tin người dùng từ Zalo (API v3.0)
      const userInfoRes = await axios({
        method: 'post',
        url: 'https://openapi.zalo.me/v3.0/oa/userfield/get',
        headers: {
          access_token: process.env.ZALO_OA_ACCESS_TOKEN,
          'Content-Type': 'application/json'
        },
        data: {
          user_id: userId,
          field_type: 'system'
        }
      });

      const userData = userInfoRes.data.data;
      const fullName = userData?.display_name || 'Zalo User';

      const firstName = fullName;
      const lastName = ''; // Zalo không có họ riêng

      await handleGHLMessage({
        zaloId: userId,
        firstName,
        lastName,
        message
      });

      return res.sendStatus(200);
    }

    return res.sendStatus(200); // Bỏ qua các sự kiện khác
  } catch (err) {
    console.error('❌ Zalo webhook error:', err.response?.data || err.message);
    return res.sendStatus(500);
  }
});

export async function replyZaloText({ userId, message }) {
  try {
    await axios.post(
      'https://openapi.zalo.me/v3.0/oa/message/cs',
      {
        recipient: { user_id: userId },
        message: { text: message }
      },
      {
        headers: {
          'Content-Type': 'application/json',
          access_token: process.env.ZALO_OA_ACCESS_TOKEN
        }
      }
    );

    console.log('✅ Gửi tin nhắn Zalo thành công:', userId);
  } catch (err) {
    console.error('❌ Gửi tin nhắn Zalo thất bại:', err.response?.data || err.message);
  }
}

export function sendZaloMessage(userId, message) {
  return replyZaloText({ userId, message });
}

export function parseZaloMessage(body) {
  const sender = {
    id: body.sender?.id,
    firstName: body.sender?.name || 'Zalo User',
    lastName: ''
  };
  const message = body.message?.text;
  return { sender, message };
}

export default router;
