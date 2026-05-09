import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyBWskJSxcWy5FTeQ06bRFUPz4qBVzm5HBs",
  authDomain: "gen-lang-client-0743844047.firebaseapp.com",
  projectId: "gen-lang-client-0743844047",
  storageBucket: "gen-lang-client-0743844047.firebasestorage.app",
  messagingSenderId: "740717965312",
  appId: "1:740717965312:web:78522addef3d5fca3168e5",
  databaseId: "ai-studio-6114b5e5-7577-4a82-ae61-2a196cc040a3",
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app, "ai-studio-6114b5e5-7577-4a82-ae61-2a196cc040a3");
