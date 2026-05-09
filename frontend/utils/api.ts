import axios from "axios";

// This will allow you to set the backend URL in Vercel/Netlify/Render environment variables
// Use VITE_API_URL=https://your-backend-url.render.com
const API_BASE_URL = import.meta.env.VITE_API_URL || "";

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

export default api;
