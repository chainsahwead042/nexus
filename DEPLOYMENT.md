# Nexus AI: Deployment & Structure Guide

## 1. Project Folders
The project is organized for professional full-stack deployment:
- **/frontend**: React + Vite source code. Built files go to `dist/`. Suitable for hosting on **Vercel** or **Netlify**.
- **/backend**: Core logic, AI services, and Firebase integration.
- **/server**: Express server source. Suitable for hosting on **Render**, **Railway**, or **Heroku**.

## 2. Connecting Frontend & Backend
If you host the Frontend and Backend on separate platforms (e.g., Vercel + Render):

1. **Backend URL**: In your **Vercel** settings, add an environment variable:
   `VITE_API_URL=https://your-backend-name.onrender.com`
2. **CORS**: The backend is pre-configured with CORS support to accept requests from your frontend domain.

## 3. Local Development
1. **Install Node.js**: Download from nodejs.org.
2. **Setup Credentials**: Create a `.env` file and add `GEMINI_API_KEY`.
3. **Install & Run**:
   ```bash
   npm install
   npm run dev
   ```
   The app will be available at `http://localhost:3000`.

## 4. Platform Connections

### WhatsApp & Instagram (Meta)
1.  Go to [developers.facebook.com](https://developers.facebook.com).
2.  Create a **Business App**.
3.  Set up **WhatsApp** or **Instagram Graph API**.
4.  Generate a **Permanent Access Token** (System User).
5.  In the Nexus AI **Core** tab, enter your Token and ID.
6.  Configure your **Webhook URL** in the Meta Dashboard to point to:
    `https://your-server.com/api/webhooks/nexus-bridge`

### Telegram
1.  Message `@BotFather` on Telegram.
2.  Create a new bot via `/newbot`.
3.  Copy the **API Token**.
4.  Paste it into the Nexus AI **Core** tab.

### Email
1.  Enable **IMAP** in your email settings (e.g., Gmail Settings > Forwarding and POP/IMAP).
2.  Generate an **App Password** (Google Account > Security > 2-Step Verification > App passwords).
3.  Enter your email and the 16-character app password in the Nexus AI **Core** tab.

## 4. Multi-Platform Support
Since this is a Web App (PWA-ready), you can:
- **Windows/Mac**: Run in any browser.
- **iOS/Android**: "Add to Home Screen" from your mobile browser for a native app feel.
