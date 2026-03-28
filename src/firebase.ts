import { initializeApp } from 'firebase/app'
import { getFirestore } from 'firebase/firestore'

const firebaseConfig = {
  apiKey: "AIzaSyCkQu7NImrA1UFA4kSWtOEy0w7AvuvNZ78",
  authDomain: "my-poetry-web.firebaseapp.com",
  projectId: "my-poetry-web",
  storageBucket: "my-poetry-web.firebasestorage.app",
  messagingSenderId: "1055987825600",
  appId: "1:1055987825600:web:0987637845bfb000e7a625",
}

const app = initializeApp(firebaseConfig)
export const db = getFirestore(app)
