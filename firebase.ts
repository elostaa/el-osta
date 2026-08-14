
import { initializeApp } from "firebase/app";
import { getAnalytics, isSupported } from "firebase/analytics";
import { initializeFirestore } from "firebase/firestore";
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

// Initialize Firestore with auto-detect long polling to avoid connection drops in iframe/proxies
export const db = initializeFirestore(app, {
  experimentalAutoDetectLongPolling: true,
});

export const rtdb = getDatabase(app);

// Safely initialize analytics only if supported
export let analytics: any = null;
if (typeof window !== "undefined") {
  isSupported().then((supported) => {
    if (supported) {
      analytics = getAnalytics(app);
    }
  }).catch(() => {});
}

