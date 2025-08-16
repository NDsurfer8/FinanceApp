# Firebase Setup Guide

## Step 1: Create a Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click "Create a project" or "Add project"
3. Enter your project name (e.g., "money-pilot")
4. Follow the setup wizard

## Step 2: Enable Authentication

1. In your Firebase project, go to "Authentication" in the left sidebar
2. Click "Get started"
3. Go to the "Sign-in method" tab
4. Enable "Email/Password" authentication
5. Click "Save"

## Step 3: Enable Realtime Database

1. In your Firebase project, go to "Realtime Database" in the left sidebar
2. Click "Create database"
3. Choose a location (pick the closest to your users)
4. Start in test mode (you can secure it later)

## Step 4: Get Your Configuration

1. In your Firebase project, click the gear icon (⚙️) next to "Project Overview"
2. Select "Project settings"
3. Scroll down to "Your apps" section
4. Click the web icon (</>)
5. Register your app with a nickname (e.g., "money-pilot-web")
6. Copy the configuration object

## Step 5: Update Your App Configuration

1. Open `src/config/firebase.ts`
2. Replace the placeholder values with your actual Firebase configuration:

```typescript
export const firebaseConfig = {
  apiKey: "your-actual-api-key",
  authDomain: "your-project-id.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project-id.appspot.com",
  messagingSenderId: "your-sender-id",
  appId: "your-app-id",
  databaseURL: "https://your-project-id-default-rtdb.firebaseio.com",
};
```

## Step 6: Test Your Setup

1. Restart your Expo development server
2. Try to sign up with a new account
3. Check the Firebase Console to see if the user was created
4. Try logging in with the created account

## Security Rules (Optional)

For production, you should set up proper security rules in your Realtime Database:

```json
{
  "rules": {
    "users": {
      "$uid": {
        ".read": "$uid === auth.uid",
        ".write": "$uid === auth.uid"
      }
    }
  }
}
```

## Troubleshooting

- If you get "Firebase: Need to provide options" error, make sure your `firebaseConfig` object is properly filled out
- If authentication doesn't work, check that Email/Password is enabled in Firebase Console
- If database access fails, make sure your Realtime Database is created and rules allow read/write
