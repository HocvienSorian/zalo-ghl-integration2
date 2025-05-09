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

// 1. Create or Get Contact
export const createOrGetContact = async ({ phone, name, locationId }) => {
  try {
    const [firstName, ...rest] = name.split(' ');
    const lastName = rest.join(' ') || '-';

    const options = {
      method: 'POST',
      url: `${GHL_API_BASE}/contacts/`,
      headers: { ...HEADERS, Version: VERSION_CONTACT },
      data: {
        firstName,
        lastName,
        name,
        phone,
        locationId,
        source: 'zalo-oa',
        tags: ['zalo'],
      }
    };

    const { data } = await axios.request(options);
    const contactId = data?.contact?.id;

    if (!contactId || typeof contactId !== 'string') {
      throw new Error(`❌ contactId không hợp lệ: ${contactId}`);
    }

    console.log('✅ Created/Found Contact:', contactId);
    return contactId;
  } catch (error) {
    const meta = error.response?.data?.meta;
    if (
      error.response?.status === 400 &&
      error.response?.data?.message?.includes('duplicated contacts') &&
      meta?.contactId
    ) {
      console.warn('⚠️ Contact đã tồn tại. Dùng lại contactId:', meta.contactId);
      return meta.contactId;
    }

    console.error('❌ Failed to create contact:', error.response?.data || error);
    throw error;
  }
};

// 2. Get or Create Conversation
export const getOrCreateConversation = async (locationId, contactId) => {
  try {
    // Tạo mới conversation
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
      // Nếu conversation đã tồn tại, tìm lại conversation
      console.warn('⚠️ Conversation đã tồn tại. Đang tìm lại...');
      return await findConversationByContact(locationId, contactId);
    }

    console.error('❌ Failed to create conversation:', error.response?.data || error);
    throw error;
  }
};

// 2.1 Tìm conversation đã tồn tại
export const findConversationByContact = async (locationId, contactId) => {
  try {
    const response = await axios.get(
      `${GHL_API_BASE}/conversations/search`,
      {
        headers: { ...HEADERS, Version: VERSION_CONVERSATION },
        params: {
          locationId,
          contactId
        }
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

// 3. Add Inbound Message
export const addInboundMessage = async ({
  conversationId,
  message,
  date = new Date().toISOString()
}) => {
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

// 4. Tổng hợp xử lý tin nhắn từ Zalo
export const handleGHLMessage = async ({ zaloId, firstName, lastName, message }) => {
  const phone = `+84${zaloId.slice(-9)}`;
  const name = `${firstName} ${lastName}`.trim();
  const locationId = process.env.GHL_LOCATION_ID;

  try {
    const contactId = await createOrGetContact({ phone, name, locationId });
    const conversationId = await getOrCreateConversation(locationId, contactId);
    await addInboundMessage({ conversationId, message });
  } catch (error) {
    console.error('❌ handleGHLMessage failed:', error.response?.data || error);
  }
};

// 5. Gửi từ app chính
export const sendToGHL = async (sender, message) => {
  const { id: zaloId, firstName, lastName } = sender;
  await handleGHLMessage({ zaloId, firstName, lastName, message });
};
