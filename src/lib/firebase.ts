import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';

const firebaseConfig = {
  apiKey: "AIzaSyAFDoOM0nSw5dP3rUI2B0DZciXz4x04_Vs",
  authDomain: "mediavault-2b811.firebaseapp.com",
  projectId: "mediavault-2b811",
  storageBucket: "mediavault-2b811.firebasestorage.app",
  messagingSenderId: "560114527898",
  appId: "1:560114527898:web:8bff19053d81a7cdac7923",
  measurementId: "G-KNBEZP60C5"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();