import { initializeApp, getApps } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyBWskJSxcWy5FTeQ06bRFUPz4qBVzm5HBs",
  authDomain: "gen-lang-client-0743844047.firebaseapp.com",
  projectId: "gen-lang-client-0743844047",
  storageBucket: "gen-lang-client-0743844047.firebasestorage.app",
  messagingSenderId: "740717965312",
  appId: "1:740717965312:web:78522addef3d5fca3168e5",
};

const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
export const db = getFirestore(app, "ai-studio-6114b5e5-7577-4a82-ae61-2a196cc040a3");
export const auth = getAuth(app);
