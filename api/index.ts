import dotenv from 'dotenv';
dotenv.config(); // Load environment variables from .env

import express, { Request, Response } from 'express';
import axios from 'axios'; // Import axios

const app = express();
const port = process.env.PORT || 3000;

// HubSpot OAuth Configuration
const HUBSPOT_CLIENT_ID = process.env.HUBSPOT_CLIENT_ID;
const HUBSPOT_CLIENT_SECRET = process.env.HUBSPOT_CLIENT_SECRET;
const HUBSPOT_REDIRECT_URI = process.env.HUBSPOT_REDIRECT_URI;
const HUBSPOT_SCOPES = 'crm.objects.contacts.read crm.objects.contacts.write crm.objects.deals.read crm.objects.deals.write oauth';

app.get('/', (req: Request, res: Response) => {
  console.log(`Request received for / from IP: ${req.ip}, User-Agent: ${req.headers['user-agent']}`);
  res.json({
    "results": [
      {
        "objectId": 123, // Beispiel-ID, HubSpot überschreibt dies normalerweise mit dem Kontextobjekt
        "title": "Beispielkarte mit Button",
        "properties": [
          {
            "label": "Beschreibung",
            "dataType": "STRING",
            "value": "Dies ist eine Custom Card mit einem einfachen Button."
          }
        ],
        "actions": [
          {
            "type": "ACTION_HOOK",
            "httpMethod": "POST",
            "uri": "https://example.com/api/button-action", // Dies muss später deine eigene Hook-URL sein
            "label": "Klick mich!",
            "associatedObjectProperties": ["firstname", "lastname"] // HubSpot versucht, diese Properties zu laden
          }
        ]
      }
    ]
  });
});

// Endpoint to initiate HubSpot OAuth flow
app.get('/start-hubspot-oauth', (req: Request, res: Response) => {
  if (!HUBSPOT_CLIENT_ID || !HUBSPOT_REDIRECT_URI) {
    console.error('HubSpot OAuth configuration variables (CLIENT_ID or REDIRECT_URI) are missing.');
    return res.status(500).send('Server OAuth configuration error.');
  }
  const authUrl = 
    `https://app.hubspot.com/oauth/authorize` +
    `?client_id=${encodeURIComponent(HUBSPOT_CLIENT_ID)}` +
    `&redirect_uri=${encodeURIComponent(HUBSPOT_REDIRECT_URI)}` +
    `&scope=${encodeURIComponent(HUBSPOT_SCOPES)}`;
    // Removed &response_type=code as it's often implied or handled by default for authorize URL construction for user consent.
    // HubSpot documentation will clarify if it's strictly needed here. It is needed for machine-to-machine without user typically.

  res.redirect(authUrl);
});

// OAuth callback endpoint to exchange authorization code for tokens
app.get('/oauth-callback', async (req: Request, res: Response) => {
  console.log('[DEBUG] Vercel Environment Variables Check:');
  console.log('[DEBUG] HUBSPOT_CLIENT_ID:', process.env.HUBSPOT_CLIENT_ID ? 'SET' : 'NOT SET/EMPTY');
  console.log('[DEBUG] HUBSPOT_CLIENT_SECRET:', process.env.HUBSPOT_CLIENT_SECRET ? 'SET (partially hidden)' : 'NOT SET/EMPTY'); // Log only presence for secret
  console.log('[DEBUG] HUBSPOT_REDIRECT_URI:', process.env.HUBSPOT_REDIRECT_URI);
  // For more detailed debugging, you could log the actual value of non-sensitive vars, but be careful with secrets.
  // console.log('[DEBUG] Actual HUBSPOT_CLIENT_ID:', process.env.HUBSPOT_CLIENT_ID);
  // console.log('[DEBUG] Actual HUBSPOT_REDIRECT_URI:', process.env.HUBSPOT_REDIRECT_URI);

  const authorizationCode = req.query.code as string;

  if (!authorizationCode) {
    console.error('Authorization code not received from HubSpot.');
    return res.status(400).send('Authorization code missing in callback.');
  }

  if (!HUBSPOT_CLIENT_ID || !HUBSPOT_CLIENT_SECRET || !HUBSPOT_REDIRECT_URI) {
    console.error('HubSpot OAuth configuration environment variables are missing for token exchange.');
    return res.status(500).send('Server configuration error for OAuth token exchange.');
  }

  try {
    const params = new URLSearchParams();
    params.append('grant_type', 'authorization_code');
    params.append('client_id', HUBSPOT_CLIENT_ID);
    params.append('client_secret', HUBSPOT_CLIENT_SECRET);
    params.append('redirect_uri', HUBSPOT_REDIRECT_URI);
    params.append('code', authorizationCode);

    const tokenResponse = await axios.post(
      'https://api.hubapi.com/oauth/v1/token',
      params,
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded;charset=utf-8',
        },
      }
    );

    const { access_token, refresh_token, expires_in } = tokenResponse.data;

    // TODO: Securely store tokens (e.g., in a database associated with the user/account)
    // For this example, we just log them and send a success message.
    console.log('Access Token:', access_token);
    console.log('Refresh Token:', refresh_token); // Important: Store this securely to get new access tokens
    console.log('Expires In (seconds):', expires_in);

    // Redirect to a success page or send a confirmation
    // Potentially, you could store the access_token in a session or secure cookie here if needed by the frontend immediately,
    // but for a custom card, the backend will use this token for API calls.
    res.send('OAuth process completed successfully! Tokens received (see server console). You can close this window.');

  } catch (error: any) {
    console.error('Error exchanging authorization code for token:', error.response?.data || error.message);
    let errorMessage = 'Failed to exchange authorization code for token.';
    if (error.response?.data?.message) {
      errorMessage += ` HubSpot Error: ${error.response.data.message}`;
    }
    res.status(500).send(errorMessage);
  }
});

// Start the server only if not on Vercel
if (process.env.NODE_ENV !== 'production' || !process.env.VERCEL) {
  app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
    console.log(`To start HubSpot OAuth, navigate to: http://localhost:${port}/start-hubspot-oauth`);
  });
}

export default app; 