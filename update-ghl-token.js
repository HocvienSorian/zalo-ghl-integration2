import axios from 'axios';
import fs from 'fs';
import dotenv from 'dotenv';

dotenv.config();

const updateGhlTokens = async () => {
  try {
    const encodedParams = new URLSearchParams();
    encodedParams.set('client_id', process.env.GHL_CLIENT_ID);
    encodedParams.set('client_secret', process.env.GHL_CLIENT_SECRET);
    encodedParams.set('grant_type', 'refresh_token');
    encodedParams.set('refresh_token', process.env.GHL_REFRESH_TOKEN);

    const options = {
      method: 'POST',
      url: 'https://services.leadconnectorhq.com/oauth/token',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Accept: 'application/json',
      },
      data: encodedParams,
    };

    const { data } = await axios.request(options);

    // Cập nhật token trong file .env
    let envFile = fs.readFileSync('.env', 'utf-8');

    envFile = envFile
      .replace(/GHL_ACCESS_TOKEN=.*/g, `GHL_ACCESS_TOKEN=${data.access_token}`)
      .replace(/GHL_REFRESH_TOKEN=.*/g, `GHL_REFRESH_TOKEN=${data.refresh_token}`);

    fs.writeFileSync('.env', envFile, 'utf-8');

    console.log('✅ Access token & refresh token updated successfully!');
  } catch (error) {
    console.error('❌ Error updating tokens:', error.response?.data || error.message);
  }
};

updateGhlTokens();
