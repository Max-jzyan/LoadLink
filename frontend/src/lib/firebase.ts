// Code from the firebase console

// Import the functions you need from the SDKs you need
import { initializeApp } from 'firebase/app'
import { GoogleAuthProvider, browserLocalPersistence, getAuth, setPersistence } from 'firebase/auth'
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: 'AIzaSyAPMAo8ZQMVdAaZM-_PgD4gMwYnT_BsDxc',
  authDomain: 'loadlink-51ebb.firebaseapp.com',
  projectId: 'loadlink-51ebb',
  storageBucket: 'loadlink-51ebb.firebasestorage.app',
  messagingSenderId: '390855851345',
  appId: '1:390855851345:web:d9415d485aeafb8cbfe770',
  measurementId: 'G-1B0WLZ4KWW',
}

// Initialize Firebase
const app = initializeApp(firebaseConfig)

export const auth = getAuth(app)
setPersistence(auth, browserLocalPersistence)
export const googleProvider = new GoogleAuthProvider()
