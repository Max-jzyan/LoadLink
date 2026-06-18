// Code from the firebase console

// Import the functions you need from the SDKs you need
import { initializeApp } from 'firebase/app'
import {
  GoogleAuthProvider,
  browserSessionPersistence,
  getAuth,
  setPersistence,
} from 'firebase/auth'
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: 'AIzaSyCP0rbu38-ehXL025ggif22XLc2CAGxfdo',
  authDomain: 'loadlink-2e79d.firebaseapp.com',
  projectId: 'loadlink-2e79d',
  storageBucket: 'loadlink-2e79d.firebasestorage.app',
  messagingSenderId: '780814432943',
  appId: '1:780814432943:web:a8d5d474ebb337e8d1325a',
  measurementId: 'G-26HEGVQVVC',
}

// Initialize Firebase
const app = initializeApp(firebaseConfig)

export const auth = getAuth(app)
setPersistence(auth, browserSessionPersistence)
export const googleProvider = new GoogleAuthProvider()
