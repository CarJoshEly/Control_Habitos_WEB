import { initializeApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'

const firebaseConfig = {
  apiKey: "AIzaSyBNNXF6vsR7T4DJQf_3QnbY7FKoBggKgUo",
  authDomain: "control-habitos1.firebaseapp.com",
  projectId: "control-habitos1",
  storageBucket: "control-habitos1.firebasestorage.app",
  messagingSenderId: "283327600463",
  appId: "1:283327600463:web:439b2ff126c09a5b0a573a"
}

const app = initializeApp(firebaseConfig)
export const auth = getAuth(app)
export const db = getFirestore(app)