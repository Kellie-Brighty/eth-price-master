const admin = require("firebase-admin");

// Initialize Firebase Admin SDK
// Note: You need to download serviceAccountKey.json from Firebase Console
// and place it in your project root directory

let db;

try {
  // Try to load service account key
  const serviceAccount = require("./serviceAccountKey.json");
  
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
  
  db = admin.firestore();
  console.log("✅ Firebase initialized successfully");
} catch (error) {
  console.log("⚠️ Firebase not configured. Please add serviceAccountKey.json");
  console.log("📝 To set up Firebase:");
  console.log("1. Go to Firebase Console → Project Settings → Service Accounts");
  console.log("2. Generate new private key");
  console.log("3. Save as 'serviceAccountKey.json' in project root");
  console.log("4. Restart the bot");
  
  // Create a mock db object for development
  db = {
    collection: () => ({
      doc: () => ({
        set: () => Promise.resolve(),
        get: () => Promise.resolve({ exists: false }),
        update: () => Promise.resolve(),
        collection: () => ({
          doc: () => ({
            set: () => Promise.resolve(),
            get: () => Promise.resolve({ exists: false })
          }),
          get: () => Promise.resolve({ forEach: () => {} })
        })
      }),
      where: () => ({
        get: () => Promise.resolve({ forEach: () => {} })
      })
    })
  };
}

module.exports = db;
