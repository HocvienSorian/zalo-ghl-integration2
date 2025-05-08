import axios from "axios";

export async function sendZaloMessage(userId, message) {
  const accessToken = process.env.ZALO_OA_ACCESS_TOKEN;
  const url = "https://openapi.zalo.me/v3.0/oa/message/cs";

  const payload = {
    recipient: { user_id: userId },
    message: {
      text: message,
    },
  };

  const headers = {
    access_token: accessToken,
    "Content-Type": "application/json",
  };

  try {
    const res = await axios.post(url, payload, { headers });
    console.log("Zalo message sent:", res.data);
  } catch (error) {
    console.error("Error sending Zalo message:", error.response?.data || error.message);
  }
}

export function parseZaloMessage(body) {
  try {
    const event = body.event_name;
    const senderId = body.sender.id;
    const message = body.message.text;

    if (event === "user_send_text") {
      return { sender: senderId, message };
    }
  } catch (err) {
    console.error("Zalo parse error:", err);
  }
  return {};
}
