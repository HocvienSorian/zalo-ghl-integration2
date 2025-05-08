// zalo.js
import express from 'express';
import axios from 'axios';
import dotenv from 'dotenv';
import { handleGHLMessage } from './ghl.js';

dotenv.config();

const router = express.Router();

// Zalo webhook handler
router.post('/zalo', async (req, res) => {
  const body = req.body;

  try {
    if (body.event_name === 'user_send_text') {
      const userId = body.sender.id;
      const message = body.message.text;

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
console.error('🪵 Full error response:', JSON.stringify(err.response?.data || err.message, null, 2));
      const fields = userInfoRes.data.data?.fields || [];
const nameField = fields.find(f => f.key === 'ten_hien_thi');
const fullName = nameField?.value || 'Zalo User';

      const firstName = fullName;
      const lastName = ''; // Zalo không phân biệt họ tên

      // Gửi thông tin sang GHL
      await handleGHLMessage({
        zaloId: userId,
        firstName,
        lastName,
        message
      });

      return res.sendStatus(200);
    }

    // Bỏ qua các sự kiện khác
    return res.sendStatus(200);
  } catch (err) {
    console.error('❌ Zalo webhook error:', err.response?.data || err.message);
    return res.sendStatus(500);
  }
});

// Gửi tin nhắn từ GHL về Zalo
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

    console.log('✅ Sent reply to Zalo user:', userId);
  } catch (err) {
    console.error('❌ Zalo send message error:', err.response?.data || err.message);
  }
}

// Hàm xuất ra để GHL gửi tin về Zalo
export function sendZaloMessage(userId, message) {
  return replyZaloText({ userId, message });
}

// Hàm parse dữ liệu từ webhook của Zalo
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
