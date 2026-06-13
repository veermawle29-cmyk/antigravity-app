// firebase-config.js
// ⚠️ IMPORTANT: REPLACE THESE MOCK VALUES WITH YOUR ACTUAL FIREBASE CONFIG KEYS
// You can get these by creating a free project at https://console.firebase.google.com/
// Go to Project Settings -> General -> Web App -> Add Firebase to your web app

const firebaseConfig = {
  apiKey: "AIzaSyDpzMW_XXIkGROJd67MVfwZtY9pr3LD0xs",
  authDomain: "yaarbuzz-f59d7.firebaseapp.com",
  projectId: "yaarbuzz-f59d7",
  storageBucket: "yaarbuzz-f59d7.firebasestorage.app",
  messagingSenderId: "5742828706",
  appId: "1:5742828706:web:5dd00d21babd61431d8bfb",
  measurementId: "G-QQ6Z1Y7M5F"
};

// Initialize Firebase (namespaced SDK v8)
const app = firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();
const storage = firebase.storage();

// Set auth persistence IMMEDIATELY after init, before any listeners attach.
// This ensures sessions survive app restart, device restart, and backgrounding.
auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL)
  .catch((err) => console.warn("Failed to set Auth persistence:", err));
