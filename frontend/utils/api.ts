import axios from "axios";
import { auth } from "../../backend/lib/firebase";

const api = axios.create({
  baseURL: (import.meta as any).env?.VITE_API_URL || "/api",
  headers: { "Content-Type": "application/json" },
});

api.interceptors.request.use((config) => {
  const user = auth.currentUser;
  if (user) {
    config.headers["x-user-id"] = user.uid;
  }
  return config;
});

export default api;
