// ghl.js
import axios from 'axios';
import dotenv from 'dotenv';
dotenv.config();

const GHL_API_BASE = 'https://services.leadconnectorhq.com';
const HEADERS = {
  Authorization: `Bearer ${process.env.GHL_ACCESS_TOKEN}`,
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
    console.log('✅ Created/Found Contact:', data);
    return data.id; // contactId
  } catch (error) {
    console.error('❌ Failed to create contact:', error.response?.data || error);
    throw error;
  }
};

// 2. Create Conversation
export const createConversation = async (locationId, contactId) => {
  try {
    const options = {
      method: 'POST',
      url: `${GHL_API_BASE}/conversations/`,
      headers: { ...HEADERS, Version: VERSION_CONVERSATION },
      data: { locationId, contactId }
    };

    const { data } = await axios.request(options);
    console.log('✅ Created Conversation:', data);
    return data.id; // conversationId
  } catch (error) {
    console.error('❌ Failed to create conversation:', error.response?.data || error);
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
    const options = {
      method: 'POST',
      url: `${GHL_API_BASE}/conversations/messages/inbound`,
      headers: { ...HEADERS, Version: VERSION_CONVERSATION },
      data: {
        type: 'SMS',
        message,
        conversationId,
        direction: 'inbound',
        date
      }
    };

    const { data } = await axios.request(options);
    console.log('✅ Inbound message sent:', data);
    return data;
  } catch (error) {
    console.error('❌ Failed to send inbound message:', error.response?.data || error);
    throw error;
  }
};

// 4. Tổng hợp xử lý tin nhắn từ Zalo
export const handleGHLMessage = async ({ zaloId, firstName, lastName, message }) => {
  const phone = `+84${zaloId.slice(-9)}`; // giả lập số ĐT từ Zalo ID
  const name = `${firstName} ${lastName}`.trim();
  const locationId = process.env.GHL_LOCATION_ID;

  try {
    const contactId = await createOrGetContact({ phone, name, locationId });
    const conversationId = await createConversation(locationId, contactId);
    await addInboundMessage({ conversationId, message });
  } catch (error) {
    console.error('❌ handleGHLMessage failed:', error.response?.data || error);
  }
};
