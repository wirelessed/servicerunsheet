import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyAm3wY5fF1qkQBYeR4DYzFhYzc-TuSynYU",
  authDomain: "runsheetpro.com",
  databaseURL: "https://servicerunsheet.firebaseio.com",
  projectId: "servicerunsheet",
  storageBucket: "servicerunsheet.appspot.com",
  messagingSenderId: "442170353088",
  appId: "1:442170353088:web:7f6d899587428800"
};

// Initialize Firebase
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const auth = getAuth(app);

// Use persistent IndexedDB cache for instant loads and offline support.
// persistentMultipleTabManager allows multiple tabs to share the cache.
const db = initializeFirestore(app, {
  localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() })
});

const googleProvider = new GoogleAuthProvider();

export { app, auth, db, googleProvider };
