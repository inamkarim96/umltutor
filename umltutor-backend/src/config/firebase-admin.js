const admin = require('firebase-admin');
const path = require('path');

let serviceAccount;

try {
  // Priority 1: Check for raw JSON string in environment variable (recommended for Vercel/Cloud)
  if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
    serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
  } 
  // Priority 2: Check for a file path in environment variable
  else if (process.env.FIREBASE_SERVICE_ACCOUNT_PATH) {
    serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT_PATH;
  } 
  // Priority 3: Default to a local file in the root
  else {
    serviceAccount = path.join(__dirname, '../../firebase-service-account.json');
  }

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
  console.log('Firebase Admin SDK initialized successfully');
} catch (error) {
  console.error('Firebase Admin SDK initialization failed:', error.message);
  console.log('Note: Ensure FIREBASE_SERVICE_ACCOUNT_JSON is a valid JSON string or firebase-service-account.json exists');
}

module.exports = admin;

