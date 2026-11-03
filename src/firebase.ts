import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

export const firebaseConfig = {
  apiKey: "AIzaSyAo0gz2fAdykNE9ZhVNJNLQn0GKm_W9ARk",
  authDomain: "master-airline-g2w8r.firebaseapp.com",
  projectId: "master-airline-g2w8r",
  storageBucket: "master-airline-g2w8r.firebasestorage.app",
  messagingSenderId: "769686036332",
  appId: "1:769686036332:web:31c98bb87f5eb6aafe5d49"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
