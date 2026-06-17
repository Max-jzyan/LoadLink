// Import the functions you need from the SDKs you need
import { initializeApp } from 'firebase/app'
import { getAnalytics } from 'firebase/analytics'
import { getAuth } from 'firebase/auth'
const FIREBASE_API_KEY = import.meta.env.VITE_FIREBASE_API_KEY

// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: FIREBASE_API_KEY,
  authDomain: 'cpsc-455-loadlink-dff4e.firebaseapp.com',
  projectId: 'cpsc-455-loadlink-dff4e',
  storageBucket: 'cpsc-455-loadlink-dff4e.firebasestorage.app',
  messagingSenderId: '1097540232679',
  appId: '1:1097540232679:web:85e2c46bc9261829034942',
  measurementId: 'G-3QWQ5PDHWM',
}

// Initialize Firebase
export const app = initializeApp(firebaseConfig)
export const analytics = getAnalytics(app)
export const auth = getAuth(app)
