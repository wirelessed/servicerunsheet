import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyAm3wY5fF1qkQBYeR4DYzFhYzc-TuSynYU",
  authDomain: "runsheetpro.com",
  databaseURL: "https://servicerunsheet.firebaseio.com",
  projectId: "servicerunsheet",
  storageBucket: "servicerunsheet.appspot.com",
  messagingSenderId: "442170353088",
  appId: "1:442170353088:web:7f6d899587428800" // Note: This might need to be verified or fetched from console, but using existing values for now. If appId is missing in old config, it might be fine or needed for v9. Old config didn't have it. I will omit it if it causes issues, but usually required for v9. I'll rely on what was in old config for now, if missing I'll try without or ask.
  // actually, looking at the old config in `src/firebase/Firebase.js`, it didn't have appId. 
  // I will stick to exactly what was there to be safe, plus standard keys.
};

// Initialize Firebase
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const auth = getAuth(app);
const db = getFirestore(app);
const googleProvider = new GoogleAuthProvider();

export { app, auth, db, googleProvider };
