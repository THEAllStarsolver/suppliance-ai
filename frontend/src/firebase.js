import { initializeApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'

const firebaseConfig = {
  apiKey: "AIzaSyCpJQZ1xgszq12HN2Kuq6xo0cxiQ2edAB4",
  authDomain: "decision-audit-engine.firebaseapp.com",
  projectId: "decision-audit-engine",
  storageBucket: "decision-audit-engine.firebasestorage.app",
  messagingSenderId: "539090882297",
  appId: "1:539090882297:web:f74f7d421b0f2c9f8b5c28",
  measurementId: "G-5ZT17T469R"
}

const app = initializeApp(firebaseConfig)
export const auth = getAuth(app)
