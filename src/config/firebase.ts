import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "",
    authDomain: "aztec-warehouse.firebaseapp.com",
    projectId: "aztec-warehouse",
    storageBucket: "aztec-warehouse.firebasestorage.app",
    messagingSenderId: "587188643888",
    appId: "1:587188643888:web:2f5d9bb858e6e4bb3565f5",
    measurementId: "G-59VTWPJ775"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app); 