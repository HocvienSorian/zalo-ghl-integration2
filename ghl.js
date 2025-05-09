// 🔁 FILE: ghl.js
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

export const createOrGetContact = async ({ phone, name, locationId, zaloId }) => {
  try {
    // 1. Tìm contact theo custom field zalo_id
    const searchRes = await axios.get(`${GHL_API_BASE}/contacts/`, {
      headers: { ...HEADERS, Version: VERSION_CONTACT },
      params: { locationId, query: zaloId }
    });

    const existing = searchRes.data.contacts.find(c =>
      c.customField?.some(field => field.customFieldKey === 'zalo_id' && field.value === zaloId)
    );

    if (existing) {
      console.log('✅ Found existing contact by zalo_id:', existing.id);
      return existing.id;
    }

    // 2. Nếu không tìm thấy → tạo contact mới
    const [firstName, ...rest] = name.split(' ');
    const lastName = rest.join(' ') || '-';

    const createRes = await axios.post(
      `${GHL_API_BASE}/contacts/`,
      {
        firstName,
        lastName,
        name,
        phone,
        locationId,
        source: 'zalo-oa',
        tags: ['zalo']
      },
      { headers: { ...HEADERS, Version: VERSION_CONTACT } }
    );

    const contactId = createRes?.data?.contact?.id;
    if (!contactId || typeof contactId !== 'string') {
      throw new Error(`❌ contactId không hợp lệ: ${contactId}`);
    }

    console.log('✅ Created Contact:', contactId);

    // 3. Gắn zalo_id vào customField
    await axios.put(
      `${GHL_API_BASE}/contacts/${contactId}`,
      {
        customFields: [
          {
            key: 'zalo_id',
            value: zaloId
          }
        ]
      },
      { headers: { ...HEADERS, Version: VERSION_CONTACT } }
    );

    console.log('✅ Set zalo_id on new contact:', zaloId);
    return contactId;
  } catch (error) {
    console.error('❌ Failed to create or find contact:', error.response?.data || error);
    throw error;
  }
};

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
    if (error.response?.status === 400 && message.includes('already exists')) {
      console.warn('⚠️ Conversation đã tồn tại. Đang tìm lại...');
      return await findConversationByContact(locationId, contactId);
    }

    console.error('❌ Failed to create conversation:', error.response?.data || error);
    throw error;
  }
};

export const findConversationByContact = async (locationId, contactId) => {
  try {
    const response = await axios.get(`${GHL_API_BASE}/conversations/search`, {
      headers: { ...HEADERS, Version: VERSION_CONVERSATION },
      params: { locationId, contactId }
    });

    const conversation = response.data?.conversations?.[0];
    if (!conversation?.id) throw new Error('❌ Không tìm thấy conversation hiện có');

    console.log('✅ Found existing conversation:', conversation.id);
    return conversation.id;
  } catch (error) {
    console.error('❌ Failed to find existing conversation:', error.response?.data || error);
    throw error;
  }
};

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

export const sendToGHL = async (sender, message) => {
  const { id: zaloId, firstName, lastName } = sender;
  await handleGHLMessage({ zaloId, firstName, lastName, message });
};
