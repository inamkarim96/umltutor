const admin = require('firebase-admin');
const path = require('path');

// To get the service account: 
// 1. Firebase Console > Project Settings > Service Accounts
// 2. Click "Generate new private key"
// 3. Save the file as firebase-service-account.json in the backend root directory (umltutor-backend/)

const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH || path.join(__dirname, '../../firebase-service-account.json');

try {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccountPath)
  });
  console.log('Firebase Admin SDK initialized successfully');
} catch (error) {
  console.error('Firebase Admin SDK initialization failed:', error.message);
  console.log('Note: Ensure firebase-service-account.json exists or FIREBASE_SERVICE_ACCOUNT_PATH is set');
}

module.exports = admin;
