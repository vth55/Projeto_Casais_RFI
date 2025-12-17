import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: 'AIzaSyBB7JuzN61mBYj1TcjCayruMbuSwjzvlto',
  authDomain: 'casais-rfid.firebaseapp.com',
  projectId: 'casais-rfid',
  storageBucket: 'casais-rfid.firebasestorage.app',
  messagingSenderId: '1017522171946',
  appId: '1:1017522171946:web:0a574cca79c0d2106fd353',
};

let app, db, auth, storage;
try {
  app = initializeApp(firebaseConfig);
  db = getFirestore(app);
  auth = getAuth(app);
  storage = getStorage(app);
} catch (e) {
  console.error('Erro Firebase:', e);
}

export { db, auth, storage };
export const projectId = firebaseConfig.projectId;
