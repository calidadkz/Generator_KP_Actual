import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: 'AIzaSyCXRSaBwRgptC8xjinju65pDtYV6q_riwo',
  authDomain: 'gen-lang-client-0496465292.firebaseapp.com',
  projectId: 'gen-lang-client-0496465292',
  storageBucket: 'gen-lang-client-0496465292.firebasestorage.app',
  messagingSenderId: '225103227035',
  appId: '1:225103227035:web:0020220f53c8ca15ac3e3e',
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firestore with databasekp0496465292 database
const db = getFirestore(app, 'databasekp0496465292');

export { app, db };
