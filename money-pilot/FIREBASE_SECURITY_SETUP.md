# Firebase Security Rules Setup

## 🔒 Database Security Rules

The app now includes comprehensive security rules that ensure:

- Users can only access their own data
- All operations require authentication
- Data validation for all entries
- Protection against unauthorized access

## 📋 How to Apply the Rules

### Option 1: Firebase Console (Recommended)

1. **Go to Firebase Console**

   - Visit [https://console.firebase.google.com](https://console.firebase.google.com)
   - Select your project: `money-pilot-ee3e3`

2. **Navigate to Realtime Database**

   - Click on "Realtime Database" in the left sidebar
   - Click on the "Rules" tab

3. **Update Rules**
   - Replace the existing rules with the content from `firebase-database-rules.json`
   - Click "Publish" to apply the changes

### Option 2: Firebase CLI

1. **Install Firebase CLI** (if not already installed)

   ```bash
   npm install -g firebase-tools
   ```

2. **Login to Firebase**

   ```bash
   firebase login
   ```

3. **Initialize Firebase in your project**

   ```bash
   firebase init database
   ```

4. **Deploy the rules**
   ```bash
   firebase deploy --only database
   ```

## 🛡️ Security Features

### Authentication Required

- All database operations require user authentication
- Users can only access data associated with their UID

### Data Validation

- **Transactions**: Must have amount > 0, valid type (income/expense), and proper category
- **Assets**: Must have balance >= 0
- **Debts**: Must have balance >= 0, rate >= 0, payment >= 0

### User Isolation

- Each user's data is completely isolated
- No user can access another user's data
- All data is stored under `/users/{uid}/` structure

## 🔧 Database Structure

```
/users/
  {uid}/
    profile/
      - uid, email, displayName, createdAt, updatedAt
    transactions/
      {transactionId}/
        - amount, type, category, description, date, userId
    assets/
      {assetId}/
        - name, balance, userId
    debts/
      {debtId}/
        - name, balance, rate, payment, userId
```

## 🚨 Current Issue Fix

The permission error you're seeing is because the database currently has default rules that allow all read/write access. After applying these security rules:

1. **Users must be authenticated** to access any data
2. **Data will be properly validated** before saving
3. **Each user can only access their own data**

## ✅ Testing the Rules

After applying the rules:

1. **Test Authentication**: Make sure users can log in
2. **Test Data Creation**: Try adding a transaction, asset, or debt
3. **Test Data Reading**: Verify data loads correctly in the app
4. **Test Data Isolation**: Ensure users can't see each other's data

## 🔍 Troubleshooting

### If you still get permission errors:

1. **Check Authentication**: Ensure the user is properly logged in
2. **Check User ID**: Verify the `userId` field matches the authenticated user's UID
3. **Check Data Structure**: Ensure data follows the expected format
4. **Check Rules**: Verify the rules were published successfully

### Common Issues:

- **"Permission denied"**: User not authenticated or trying to access wrong data
- **"Validation failed"**: Data doesn't meet the required format
- **"User not found"**: Authentication token expired or invalid

## 📱 App Compatibility

The app is designed to work with these security rules. The data structure and validation ensure:

- ✅ Secure user authentication
- ✅ Proper data isolation
- ✅ Input validation
- ✅ Error handling
- ✅ Real-time updates

## 🚀 Next Steps

1. Apply the security rules in Firebase Console
2. Test the app functionality
3. Verify data is being saved and retrieved correctly
4. Check that users can only see their own data

The app should now work securely with proper user data isolation!
