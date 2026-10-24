import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

// NOTE: Firebase の Web 設定は秘匿情報ではなく、実質的な防御は firestore.rules 側で行う。
// （他のミニアプリと同様に、この値はコミットして良い）
const firebaseConfig = {
  apiKey: 'AIzaSyBSbXX3Ov9_ZHtUaGvL___aTcUfUa3z8F8',
  authDomain: 'ai-yudane-bin.firebaseapp.com',
  projectId: 'ai-yudane-bin',
  storageBucket: 'ai-yudane-bin.firebasestorage.app',
  messagingSenderId: '1023984670256',
  appId: '1:1023984670256:web:2faf40e693910eb3e8fff5',
};

export const app = initializeApp(firebaseConfig);

export const db = getFirestore(app);
export const auth = getAuth(app);
