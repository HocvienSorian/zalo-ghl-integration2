import axios from 'axios';
import fs from 'fs';

export default async function handler(req, res) {
  try {
    const encodedParams = new URLSearchParams();
    encodedParams.set('client_id', process.env.GHL_CLIENT_ID);
    encodedParams.set('client_secret', process.env.GHL_CLIENT_SECRET);
    encodedParams.set('grant_type', 'refresh_token');
    encodedParams.set('refresh_token', process.env.GHL_REFRESH_TOKEN);
    encodedParams.set('redirect_uri', process.env.GHL_REDIRECT_URI);
    encodedParams.set('user_type', 'Location');

    const response = await axios({
      method: 'POST',
      url: 'https://services.leadconnectorhq.com/oauth/token',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Accept: 'application/json',
      },
      data: encodedParams,
    });

    const newAccessToken = response.data.access_token;
    const newRefreshToken = response.data.refresh_token;

    // Ghi vào file .env.local (nếu đang chạy local dev)
    fs.writeFileSync(
      '.env.local',
      `PORT=3000
ZALO_OA_ACCESS_TOKEN=${process.env.ZALO_OA_ACCESS_TOKEN}
GHL_ACCESS_TOKEN=${newAccessToken}
GHL_REFRESH_TOKEN=${newRefreshToken}
GHL_CLIENT_ID=${process.env.GHL_CLIENT_ID}
GHL_CLIENT_SECRET=${process.env.GHL_CLIENT_SECRET}
GHL_REDIRECT_URI=${process.env.GHL_REDIRECT_URI}`
    );

    return res.status(200).json({
      message: 'Tokens updated successfully!',
      newAccessToken,
    });
  } catch (error) {
    console.error('Error refreshing token:', error.response?.data || error);
    return res.status(500).json({ message: 'Failed to refresh token' });
  }
}