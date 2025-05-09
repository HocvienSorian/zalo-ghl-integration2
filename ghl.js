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

// 🔍 Tìm contact theo zalo_id bằng cách duyệt danh sách contact
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
        const match = contact.customField?.find(
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

// 🔁 Tạo hoặc cập nhật contact
export const createOrGetContact = async ({ phone, name, locationId, zaloId }) => {
  try {
    const existingContactId = await findContactByZaloId(locationId, zaloId);
    const [firstName, ...rest] = name.split(' ');
    const lastName = rest.join(' ') || '-';

    if (existingContactId) {
      await axios.put(
        `${GHL_API_BASE}/contacts/${existingContactId}`,
        {
          phone,
          name,
          firstName,
          lastName,
          customFields: [
            { key: 'zalo_id', value: zaloId }
          ]
        },
        { headers: { ...HEADERS, Version: VERSION_CONTACT } }
      );
      console.log('✅ Updated phone for existing contact:', existingContactId);
      return existingContactId;
    }

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
        customFields: [
          { key: 'zalo_id', value: zaloId }
        ]
      },
      { headers: { ...HEADERS, Version: VERSION_CONTACT } }
    );

    const contactId = createRes?.data?.contact?.id;
    if (!contactId || typeof contactId !== 'string') {
      throw new Error(`❌ contactId không hợp lệ: ${contactId}`);
    }

    console.log('✅ Created new contact:', contactId);
    return contactId;
  } catch (error) {
    console.error('❌ Failed to create or update contact:', error.response?.data || error);
    throw error;
  }
};

// 💬 Lấy hoặc tạo cuộc hội thoại
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

// 🔎 Tìm hội thoại nếu đã tồn tại
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

// ➕ Thêm tin nhắn inbound vào hội thoại
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

// 🔁 Tổng hợp toàn bộ xử lý
export const handleGHLMessage = async ({ zaloId, firstName, lastName, message }) => {
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

// API đơn giản hóa để gọi từ Zalo webhook
export const sendToGHL = async (sender, message) => {
  const { id: zaloId, firstName, lastName } = sender;
  await handleGHLMessage({ zaloId, firstName, lastName, message });
};
