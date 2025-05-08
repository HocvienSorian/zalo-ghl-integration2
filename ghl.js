import axios from "axios";

const BASE_URL = "https://services.leadconnectorhq.com";

export async function sendToGHL(zaloUserId, message) {
  const token = process.env.GHL_ACCESS_TOKEN;

  try {
    // Tạo contact nếu chưa có
    const contact = await createOrUpdateContact(zaloUserId, token);

    // Gửi note gắn vào contact
    await axios.post(
      `${BASE_URL}/contacts/${contact.id}/notes`,
      {
        body: `Zalo: ${message}`,
      },
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      }
    );

    console.log("Note added to GHL contact");
  } catch (err) {
    console.error("Error sending to GHL:", err.response?.data || err.message);
  }
}

async function createOrUpdateContact(zaloUserId, token) {
  const email = `zalo-${zaloUserId}@example.com`; // tạo email ảo từ Zalo ID

  const res = await axios.post(
    `${BASE_URL}/contacts/`,
    {
      email,
      customField: {
        zalo_uid: zaloUserId,
      },
    },
    {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    }
  );

  return res.data.contact;
}
