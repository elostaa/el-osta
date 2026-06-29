
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getFirestore } from "firebase/firestore";
import { getDatabase } from "firebase/database";

// إعدادات Firebase الخاصة بالمشروع
const firebaseConfig = {
  apiKey: "AIzaSyCDiQqA4Wj0HemH8h2n8JU1T4o6H5mUvIQ",
  authDomain: "el-ostaa-22740.firebaseapp.com",
  projectId: "el-ostaa-22740",
  storageBucket: "el-ostaa-22740.firebasestorage.app",
  messagingSenderId: "209878429607",
  appId: "1:209878429607:web:94cf8d8fb0a604476dd082",
  measurementId: "G-WP7L9ZXH44"
};

// تهيئة Firebase
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const rtdb = getDatabase(app);
export const analytics = getAnalytics(app);
