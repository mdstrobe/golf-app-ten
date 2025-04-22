// src/firebase.ts
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyDvJutwS-Ul2IbR5viiFKWNYUUHevp0Bds",
  authDomain: "golf-app-nine.firebaseapp.com",
  projectId: "golf-app-nine",
  storageBucket: "golf-app-nine.firebasestorage.app",
  messagingSenderId: "9921719166",
  appId: "1:9921719166:web:54889c89a85ed64750e12f",
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);