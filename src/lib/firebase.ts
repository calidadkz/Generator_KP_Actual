import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: 'AIzaSyBaBRu2gm_UM49VDVQ0Q2EYN9k-2N4uXUo',
  authDomain: 'gen-lang-client-0038297950.firebaseapp.com',
  projectId: 'gen-lang-client-0038297950',
  storageBucket: 'gen-lang-client-0038297950.firebasestorage.app',
  messagingSenderId: '225103227035',
  appId: '1:225103227035:web:0020220f53c8ca15ac3e3e',
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firestore with databasekp database
const db = getFirestore(app, 'databasekp');

export { app, db };
