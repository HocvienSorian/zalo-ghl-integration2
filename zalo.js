// 🔁 FILE: zalo.js
import express from 'express';
import axios from 'axios';
import dotenv from 'dotenv';
import qs from 'qs';
import { handleGHLMessage } from './ghl.js';

dotenv.config();
const router = express.Router();

export async function handleZaloWebhook(req, res) {
  const body = req.body;

  try {
    console.log('📥 Webhook từ Zalo nhận được:', body);

    if (body.event_name === 'user_send_text') {
      const userId = body.sender.id;
      const message = body.message.text;

      console.log('👤 User ID:', userId);
      console.log('💬 Message:', message);

      const userDetailRes = await axios.get(
        'https://openapi.zalo.me/v3.0/oa/user/detail',
        {
          headers: {
            access_token: process.env.ZALO_OA_ACCESS_TOKEN
          },
          params: {
            data: JSON.stringify({ user_id: userId })
          },
          paramsSerializer: params => qs.stringify(params, { encode: false })
        }
      );

      console.log('📦 Chi tiết người dùng từ Zalo:', JSON.stringify(userDetailRes.data, null, 2));

      const userData = userDetailRes.data?.data || {};
      const displayName = userData.display_name || 'Zalo User';
      const sharedName = userData.shared_info?.name || '';
      const fullName = sharedName || displayName;

      const firstName = fullName;
      const lastName = '';

      await handleGHLMessage({
        zaloId: userId,
        firstName,
        lastName,
        message
      });

      return res.sendStatus(200);
    }

    return res.sendStatus(200);
  } catch (err) {
    console.error('❌ Zalo webhook error:', err.response?.data || err.message);
    return res.sendStatus(500);
  }
}

router.post("/", handleZaloWebhook);

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
