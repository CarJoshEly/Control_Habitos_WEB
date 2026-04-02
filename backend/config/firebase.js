import admin from 'firebase-admin';

const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  storageBucket: 'control-habitos1.firebasestorage.app'
});

const db = admin.firestore();
const auth = admin.auth();
const bucket = admin.storage().bucket();

export { db, auth, bucket };