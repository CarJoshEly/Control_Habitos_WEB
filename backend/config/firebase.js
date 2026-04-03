import admin from 'firebase-admin';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const serviceAccount = require('./serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  storageBucket: 'control-habitos1.firebasestorage.app'
});

const db = admin.firestore();
const auth = admin.auth();
//const bucket = admin.storage().bucket(); se migro a cloudinary
//export { db, auth, bucket };

export { db, auth };