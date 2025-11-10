// SmartExpiryTracker/firebaseConfig.js
import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyCV3YZ1OJngwX3ik7crFlfz-pTV3m5vDng",
  authDomain: "smartexpirytracker-69003.firebaseapp.com",
  projectId: "smartexpirytracker-69003",
  storageBucket: "smartexpirytracker-69003.firebasestorage.app",
  messagingSenderId: "852285834921",
  appId: "1:852285834921:web:4b019ad0a179ab9e378bb8",
  measurementId: "G-TSJBYT6GEH"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
