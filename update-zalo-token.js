// update-zalo-token.js
import axios from 'axios';
import fs from 'fs';
import dotenv from 'dotenv';

dotenv.config();

const updateZaloTokens = async () => {
  try {
    const response = await axios.post(
      'https://oauth.zaloapp.com/v4/oa/access_token',
      new URLSearchParams({
        refresh_token: process.env.ZALO_REFRESH_TOKEN,
        app_id: process.env.ZALO_APP_ID,
        grant_type: 'refresh_token',
      }),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'app_secret': process.env.ZALO_APP_SECRET, // ✅ Đúng header
        },
      }
    );

    const { access_token, refresh_token } = response.data;

    let envFile = fs.readFileSync('.env', 'utf-8');

    envFile = envFile
      .replace(/ZALO_OA_ACCESS_TOKEN=.*/g, `ZALO_OA_ACCESS_TOKEN=${access_token}`) // ✅ đúng tên biến
      .replace(/ZALO_REFRESH_TOKEN=.*/g, `ZALO_REFRESH_TOKEN=${refresh_token}`);

    fs.writeFileSync('.env', envFile, 'utf-8');

    console.log('✅ Zalo access & refresh tokens updated!');
  } catch (error) {
    console.error('❌ Error updating Zalo tokens:', error.response?.data || error.message);
    process.exit(1);
  }
};

updateZaloTokens();
