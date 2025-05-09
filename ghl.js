import axios from 'axios';
import dotenv from 'dotenv';
dotenv.config();

const GHL_API_BASE = 'https://services.leadconnectorhq.com';
const HEADERS = {
  Authorization: `Bearer ${process.env.GHL_PRIVATE_INTEGRATION}`,
  'Content-Type': 'application/json',
  Accept: 'application/json'
};

const VERSION_CONTACT = '2021-07-28';
const VERSION_CONVERSATION = '2021-04-15';

// 🔍 Tìm contact theo zalo_id bằng cách duyệt tất cả contact
export const findContactByZaloId = async (locationId, zaloId) => {
  try {
    let page = 1;
    let hasMore = true;

    while (hasMore) {
      const res = await axios.get(`${GHL_API_BASE}/contacts/`, {
        headers: { ...HEADERS, Version: VERSION_CONTACT },
        params: {
          locationId,
          page,
          limit: 100
        }
      });

      const contacts = res.data?.contacts || [];

      for (const contact of contacts) {
        const fields = contact.customFields || [];
        const match = fields.find(
          (field) => field.key === 'zalo_id' && field.value === zaloId
        );
        if (match) {
          console.log('✅ Found contact by zalo_id:', contact.id);
          return contact.id;
        }
      }

      hasMore = res.data.meta?.hasMore;
      page++;
    }

    return null;
  } catch (err) {
    console.warn('⚠️ Không thể tìm contact bằng zalo_id:', err.response?.data || err.message);
    return null;
  }
};

// 🔁 Tạo mới hoặc dùng lại contact nếu có zalo_id
export const createOrGetContact = async ({ phone, name, locationId, zaloId }) => {
  const [firstName, ...rest] = name.split(' ');
  const lastName = rest.join(' ') || '-';

  try {
    // 🔍 Bước 1: Ưu tiên tìm theo zalo_id
    const existingContactId = await findContactByZaloId(locationId, zaloId);
    if (existingContactId) {
      console.log('✅ Dùng lại contact theo zalo_id:', existingContactId);
      return existingContactId;
    }

    // 🆕 Bước 2: Không có thì tạo mới contact với phone mặc định
    const createRes = await axios.post(
      `${GHL_API_BASE}/contacts/`,
      {
        firstName,
        lastName,
        name,
        phone,
        locationId,
        source: 'zalo-oa',
        tags: ['zalo'],
        customFields: [{ key: 'zalo_id', value: zaloId }]
      },
      { headers: { ...HEADERS, Version: VERSION_CONTACT } }
    );

    const contactId = createRes?.data?.contact?.id;
    console.log('✅ Tạo contact mới:', contactId);
    return contactId;

  } catch (error) {
    const meta = error.response?.data?.meta;
    const message = error.response?.data?.message;

    // Nếu lỗi do trùng phone → dùng lại contactId và gán zalo_id
    if (
      error.response?.status === 400 &&
      message?.includes('duplicated contacts') &&
      meta?.contactId
    ) {
      const contactId = meta.contactId;
      console.warn('⚠️ Contact trùng phone. Dùng lại:', contactId);

      try {
        await axios.put(
          `${GHL_API_BASE}/contacts/${contactId}`,
          {
            customFields: [{ key: 'zalo_id', value: zaloId }]
          },
          { headers: { ...HEADERS, Version: VERSION_CONTACT } }
        );
        console.log('✅ Gán zalo_id vào contact cũ');
      } catch (updateErr) {
        console.warn('⚠️ Không thể cập nhật zalo_id:', updateErr.response?.data || updateErr.message);
      }

      return contactId;
    }

    console.error('❌ Failed to create or update contact:', error.response?.data || error);
    throw error;
  }
};

// 💬 Lấy hoặc tạo conversation
export const getOrCreateConversation = async (locationId, contactId) => {
  try {
    const response = await axios.post(
      `${GHL_API_BASE}/conversations/`,
      { locationId, contactId },
      { headers: { ...HEADERS, Version: VERSION_CONVERSATION } }
    );

    const conversationId = response?.data?.conversation?.id;
    console.log('✅ Created Conversation:', conversationId);
    return conversationId;
  } catch (error) {
    const message = error.response?.data?.message || '';
    if (
      error.response?.status === 400 &&
      message.includes('already exists')
    ) {
      console.warn('⚠️ Conversation đã tồn tại. Đang tìm lại...');
      return await findConversationByContact(locationId, contactId);
    }

    console.error('❌ Failed to create conversation:', error.response?.data || error);
    throw error;
  }
};

// 🔎 Tìm conversation đã có
export const findConversationByContact = async (locationId, contactId) => {
  try {
    const response = await axios.get(
      `${GHL_API_BASE}/conversations/search`,
      {
        headers: { ...HEADERS, Version: VERSION_CONVERSATION },
        params: { locationId, contactId }
      }
    );

    const conversation = response.data?.conversations?.[0];
    if (!conversation?.id) throw new Error('❌ Không tìm thấy conversation hiện có');

    console.log('✅ Found existing conversation:', conversation.id);
    return conversation.id;
  } catch (error) {
    console.error('❌ Failed to find existing conversation:', error.response?.data || error);
    throw error;
  }
};

// ➕ Gửi tin nhắn inbound
export const addInboundMessage = async ({ conversationId, message, date = new Date().toISOString() }) => {
  try {
    const response = await axios.post(
      `${GHL_API_BASE}/conversations/messages/inbound`,
      {
        type: 'SMS',
        message,
        conversationId,
        direction: 'inbound',
        date
      },
      { headers: { ...HEADERS, Version: VERSION_CONVERSATION } }
    );

    console.log('✅ Inbound message sent:', response.data);
    return response.data;
  } catch (error) {
    console.error('❌ Failed to send inbound message:', error.response?.data || error);
    throw error;
  }
};

// 🧠 Xử lý logic chính từ Zalo gửi vào
export const handleGHLMessage = async ({ zaloId, firstName, lastName, message }) => {
  // Sử dụng phone mặc định nếu cần tạo mới contact
  const phone = `+84${zaloId.slice(-9)}`;
  const name = `${firstName} ${lastName}`.trim();
  const locationId = process.env.GHL_LOCATION_ID;

  try {
    const contactId = await createOrGetContact({ phone, name, locationId, zaloId });
    const conversationId = await getOrCreateConversation(locationId, contactId);
    await addInboundMessage({ conversationId, message });
  } catch (error) {
    console.error('❌ handleGHLMessage failed:', error.response?.data || error);
  }
};

// API đơn giản cho webhook
export const sendToGHL = async (sender, message) => {
  const { id: zaloId, firstName, lastName } = sender;
  await handleGHLMessage({ zaloId, firstName, lastName, message });
};
