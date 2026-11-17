import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFunctions, httpsCallable } from "firebase/functions";
import { getFirestore, initializeFirestore, persistentLocalCache, persistentMultipleTabManager } from "firebase/firestore";

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
const db = typeof window !== "undefined"
  ? initializeFirestore(app, {
      localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() })
    })
  : getFirestore(app);

const googleProvider = new GoogleAuthProvider();
const functions = getFunctions(app);

// Server-validated share-link access (see functions/index.js).
const getSharedRunsheet = (id, token) =>
  httpsCallable(functions, "getSharedRunsheet")({ id, token }).then((r) => r.data);
const getSharedGroup = (groupId, token) =>
  httpsCallable(functions, "getSharedGroup")({ groupId, token: token || null }).then((r) => r.data);

// Unguessable share token (base62, ~95 bits).
const generateShareToken = (length = 16) => {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => chars[b % chars.length]).join("");
};

export { app, auth, db, googleProvider, functions, getSharedRunsheet, getSharedGroup, generateShareToken };
