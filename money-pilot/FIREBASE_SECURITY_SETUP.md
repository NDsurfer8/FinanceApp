# Firebase Security Rules Setup Guide

## Overview

This guide will help you apply the comprehensive security rules for the Money Pilot app. The rules ensure that users can only access their own data and that all data is properly validated.

## New Features Covered

- ✅ **Financial Goals**: Create, read, update, delete goals with progress tracking
- ✅ **Emergency Fund**: Track emergency fund balance and settings
- ✅ **Budget Settings**: Save and manage budget percentages
- ✅ **Enhanced Transactions**: Full CRUD with validation
- ✅ **Assets & Debts**: Complete asset and debt management
- ✅ **User Profiles**: Secure profile management

## Database Structure

```
users/
├── {userId}/
│   ├── profile/
│   │   ├── uid
│   │   ├── email
│   │   ├── displayName
│   │   ├── createdAt
│   │   └── updatedAt
│   ├── transactions/
│   │   └── {transactionId}/
│   │       ├── id
│   │       ├── description
│   │       ├── amount
│   │       ├── type (income/expense)
│   │       ├── category
│   │       ├── date
│   │       ├── userId
│   │       └── createdAt
│   ├── assets/
│   │   └── {assetId}/
│   │       ├── id
│   │       ├── name
│   │       ├── balance
│   │       ├── type
│   │       └── userId
│   ├── debts/
│   │   └── {debtId}/
│   │       ├── id
│   │       ├── name
│   │       ├── balance
│   │       ├── rate
│   │       ├── payment
│   │       └── userId
│   ├── goals/
│   │   └── {goalId}/
│   │       ├── id
│   │       ├── name
│   │       ├── targetAmount
│   │       ├── currentAmount
│   │       ├── monthlyContribution
│   │       ├── targetDate
│   │       ├── category
│   │       ├── priority
│   │       ├── userId
│   │       ├── createdAt
│   │       └── updatedAt
│   ├── emergencyFund/
│   │   └── {emergencyFundId}/
│   │       ├── id
│   │       ├── currentBalance
│   │       ├── targetMonths
│   │       ├── monthlyContribution
│   │       ├── userId
│   │       └── updatedAt
│   └── budgetSettings/
│       └── {budgetSettingsId}/
│           ├── id
│           ├── savingsPercentage
│           ├── debtPayoffPercentage
│           ├── userId
│           └── updatedAt
```

## Security Features

### 🔐 **Authentication Required**

- All data access requires Firebase Authentication
- Users can only access their own data (`$uid === auth.uid`)

### ✅ **Data Validation**

- **Email**: Must be valid email format
- **Names**: 1-100 characters
- **Amounts**: Must be positive numbers
- **Percentages**: 0-100 range
- **Dates**: Must be valid YYYY-MM-DD format
- **Priorities**: Only 'high', 'medium', 'low' allowed
- **Types**: Only 'income' or 'expense' for transactions

### 🛡️ **Security Rules**

- **User Isolation**: Each user can only access their own data
- **Data Integrity**: All required fields must be present
- **Type Safety**: Proper data types enforced
- **Range Validation**: Values within acceptable ranges

## Setup Instructions

### Step 1: Access Firebase Console

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your Money Pilot project
3. Navigate to **Realtime Database** in the left sidebar

### Step 2: Apply Security Rules

1. Click on the **Rules** tab
2. Replace the existing rules with the content from `firebase-database-rules.json`
3. Click **Publish** to apply the rules

**Note**: The rules file has been corrected to remove JSON comments and fix structural issues. The rules are now properly formatted for Firebase.

### Step 3: Test the Rules

1. Try creating a new user account
2. Add some test data (transactions, goals, etc.)
3. Verify that data is properly saved and retrieved
4. Test that users cannot access other users' data

## CRUD Operations Supported

### 📊 **Financial Goals**

- `saveGoal()` - Create new goal
- `getUserGoals()` - Get all user goals
- `updateGoal()` - Update goal progress
- `removeGoal()` - Delete goal

### 🛡️ **Emergency Fund**

- `saveEmergencyFund()` - Create emergency fund entry
- `getUserEmergencyFund()` - Get current emergency fund
- `updateEmergencyFund()` - Update emergency fund

### ⚙️ **Budget Settings**

- `saveBudgetSettings()` - Create budget settings
- `getUserBudgetSettings()` - Get current settings
- `updateBudgetSettings()` - Update settings

### 💰 **Transactions**

- `saveTransaction()` - Create transaction
- `getUserTransactions()` - Get all transactions
- `removeTransaction()` - Delete transaction

### 🏦 **Assets & Debts**

- `saveAsset()` / `saveDebt()` - Create asset/debt
- `getUserAssets()` / `getUserDebts()` - Get all assets/debts
- `removeAsset()` / `removeDebt()` - Delete asset/debt

## Validation Examples

### ✅ **Valid Goal Data**

```json
{
  "id": "goal123",
  "name": "Emergency Fund",
  "targetAmount": 10000,
  "currentAmount": 5000,
  "monthlyContribution": 500,
  "targetDate": "2024-12-31",
  "category": "emergency",
  "priority": "high",
  "userId": "user123",
  "createdAt": 1703123456789,
  "updatedAt": 1703123456789
}
```

### ❌ **Invalid Data (Will Be Rejected)**

```json
{
  "name": "", // Empty name
  "targetAmount": -1000, // Negative amount
  "priority": "urgent", // Invalid priority
  "userId": "otherUser" // Wrong user ID
}
```

## Troubleshooting

### Common Issues

1. **"Permission denied" errors**

   - Ensure user is authenticated
   - Check that `userId` matches `auth.uid`

2. **"Validation failed" errors**

   - Verify all required fields are present
   - Check data types and value ranges
   - Ensure dates are in YYYY-MM-DD format

3. **"Data not found" errors**
   - Check that data exists in the correct path
   - Verify user has read permissions

### Testing Commands

```javascript
// Test goal creation
const goal = {
  name: "Test Goal",
  targetAmount: 5000,
  currentAmount: 0,
  monthlyContribution: 500,
  targetDate: "2024-12-31",
  category: "savings",
  priority: "medium",
  userId: auth.currentUser.uid,
};
await saveGoal(goal);
```

## Security Best Practices

1. **Never store sensitive data** (passwords, SSN, etc.)
2. **Use Firebase Auth** for user authentication
3. **Validate all inputs** on both client and server
4. **Regular security audits** of your rules
5. **Monitor database usage** for unusual patterns

## Support

If you encounter issues with the security rules:

1. Check the Firebase Console logs
2. Verify your Firebase project configuration
3. Test with a simple rule first
4. Contact Firebase support if needed

---

**Note**: These rules provide a solid foundation for a personal finance app. Consider additional security measures based on your specific requirements and compliance needs.
