// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyARWVfjlfpRleEBjsIKedUAxf9gkdW-6YY",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "agendamentos-clientes-7d7bd.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "agendamentos-clientes-7d7bd",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "agendamentos-clientes-7d7bd.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "121175364166",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:121175364166:web:8d41e2112a675a6e8eb047"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firestore Database
export const db = getFirestore(app);

export default app;

