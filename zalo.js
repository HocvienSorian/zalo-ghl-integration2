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

      const user = userInfoRes.data.data;
      const fullName = user.name || user.display_name || 'Zalo User';
      const firstName = fullName;
      const lastName = ''; // Zalo không phân tách họ tên

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

export default router;
