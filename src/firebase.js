import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore"; // <-- This is the missing piece!

const firebaseConfig = {
    apiKey: "AIzaSyDTFFkxO08KChxLAhZiYT6xJeIbX4H0Vfs",
    authDomain: "merchslides.firebaseapp.com",
    projectId: "merchslides",
    storageBucket: "merchslides.firebasestorage.app",
    messagingSenderId: "677535900747",
    appId: "1:677535900747:web:c5752c1dbbe45233c1d9ce",
    measurementId: "G-RC2KH6ZRHK"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firestore and EXPORT it so the carousel can read the data
export const db = getFirestore(app);