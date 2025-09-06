# VectorFi - App Store Reviewer Instructions

## 📱 App Overview

VectorFi is a comprehensive personal finance management app that helps users track income, expenses, assets, debts, and financial goals with AI-powered insights and a personal financial assistant.

## 🔐 Test Account Credentials

- **Email**: `user@test.com`
- **Password**: `password`
- **Note**: This is a test account with sample data for demonstration purposes

## 🧪 Testing Instructions

### 1. Initial Setup & Authentication

1. **Launch the app**
2. **Login Screen**: Enter the test credentials above
3. **Dashboard**: You'll land on the main dashboard showing financial metrics
4. **Initial State**: All values will show $0 as this is a fresh test account

### 2. Core Budget Management Testing

#### 📊 Budget Screen

1. **Navigate**: Tap the "Budget" tab in bottom navigation
2. **Add Income**:
   - Tap the large green "Add Income" button below the Total line
   - Fill out the form with any amount (e.g., $5000)
   - Add a description (e.g., "Salary")
   - Select a category (e.g., "Salary")
   - Save the transaction
3. **Add Expenses**:
   - Tap the "Add Expense" button
   - Fill out the form with any amount (e.g., $100)
   - Add a description (e.g., "Groceries")
   - Select a category (e.g., "Food & Dining")
   - Save the transaction
4. **Verify**: Check that totals update correctly at the bottom of the screen

#### 💰 Assets & Debts Screen

1. **Navigate**: Tap the "Debt/Asset" tab
2. **Add Assets**:
   - Tap "Add Asset"
   - Enter amount (e.g., $10000 for "Savings Account")
   - Add description and category
   - Save
3. **Add Debts**:
   - Tap "Add Debt"
   - Enter amount (e.g., $5000 for "Car Loan")
   - Add description and category
   - Save
4. **Verify Net Worth**: Check that net worth calculation appears at bottom

#### 🎯 Goals Screen

1. **Navigate**: Tap the "Goals" tab
2. **Create Goal**:
   - Tap "Add Goal"
   - Enter goal name (e.g., "Emergency Fund")
   - Set target amount (e.g., $10000)
   - Set target date (use date picker)
   - Save goal
3. **Verify**: Goal should appear in the goals list

### 3. AI Assistant Testing

#### 🤖 Chat Interface

1. **Access**: Tap the floating green chat icon (bottom-right corner) on any screen
2. **Test Questions**:
   - "How can I save more money?"
   - "What's my current spending pattern?"
   - "Help me create a budget"
3. **Verify**: AI should provide relevant, helpful responses

### 4. Settings & Account Management

#### ⚙️ Settings Screen

1. **Navigate**: Tap the "Settings" tab
2. **Test Features**:
   - **Connect to Bank**: Tap to see premium paywall
   - **Help & Support**: Access support options
   - **Privacy & Security**: Review privacy settings
   - **Logout**: Test logout functionality (bottom of screen)

#### 🔒 Account Deletion

1. **Navigate**: Settings → Privacy & Security
2. **Scroll to bottom**: Find "Delete Account" button
3. **Verify**: Confirmation dialog should appear

### 5. Premium Features Testing

#### 🏦 Bank Integration (Premium)

1. **Access**: Settings → "Connect to Bank" button
2. **Paywall**: Should display premium subscription options
3. **Note**: Full Plaid integration requires premium subscription

#### 💡 Friendly Mode

1. **Navigate**: Settings → Help & Support
2. **Toggle**: Enable "Friendly Mode"
3. **Verify**: App should use simpler, non-financial jargon language

### 6. Navigation & UI Testing

#### 📱 Tab Navigation

- **Test all 5 tabs**: Dashboard, Budget, Debt/Asset, Goals, Settings
- **Verify smooth transitions** between screens
- **Check bottom navigation** functionality

#### 🎨 UI Elements

- **Date Pickers**: Test in transaction forms and goal creation
- **Form Validation**: Try submitting empty forms
- **Responsive Design**: Test on different screen orientations

### 7. Data Persistence Testing

#### 💾 Save & Load

1. **Add transactions** in Budget screen
2. **Close and reopen** the app
3. **Verify**: Data should persist and be visible

#### 🔄 Refresh Functionality

1. **Pull to refresh** on main screens
2. **Verify**: Data updates correctly

### 8. Error Handling Testing

#### 🌐 Network Issues

1. **Disconnect internet** temporarily
2. **Try to add transactions**
3. **Verify**: App should handle gracefully with appropriate error messages

#### 📝 Form Validation

1. **Submit empty forms**
2. **Enter invalid data** (negative amounts, invalid dates)
3. **Verify**: Appropriate validation messages appear

## 🚨 Known Limitations (Test Environment)

### ⚠️ Test Account Restrictions

- **Sample Data**: Test account contains sample financial data
- **No Real Money**: All transactions are simulated
- **Limited History**: Recent transactions only

### 🔧 Development Features

- **Debug Logs**: Some console logs may appear in development builds
- **Test Environment**: Uses sandbox payment processing

## ✅ Expected Behaviors

### 🎯 Core Functionality

- ✅ **Authentication**: Login should work with test credentials
- ✅ **Data Entry**: Adding income/expenses should work smoothly
- ✅ **Calculations**: Totals should update correctly
- ✅ **Navigation**: All tabs should be accessible
- ✅ **AI Chat**: Assistant should respond to questions

### 🎨 User Experience

- ✅ **Smooth Animations**: Transitions should be fluid
- ✅ **Responsive UI**: Should work in portrait and landscape
- ✅ **Accessibility**: Text should be readable and buttons tappable
- ✅ **Error Handling**: Graceful handling of edge cases

### 🔒 Privacy & Security

- ✅ **Data Protection**: Sensitive information should be encrypted
- ✅ **Account Management**: Logout and delete account should work
- ✅ **Privacy Policy**: Should be accessible and comprehensive

## 📋 Testing Checklist

- [ ] **Authentication**: Login with test credentials
- [ ] **Dashboard**: View initial $0 state
- [ ] **Budget Management**: Add income and expenses
- [ ] **Assets & Debts**: Add sample assets and debts
- [ ] **Goal Setting**: Create a financial goal
- [ ] **AI Assistant**: Test chat functionality
- [ ] **Settings**: Navigate all settings options
- [ ] **Premium Features**: View paywall and friendly mode
- [ ] **Navigation**: Test all tabs and transitions
- [ ] **Data Persistence**: Verify data saves correctly
- [ ] **Error Handling**: Test with invalid inputs
- [ ] **Account Management**: Test logout and delete options

## 📞 Support Information

If you encounter any issues during testing:

- **App Version**: Latest development build
- **Test Environment**: Sandbox mode with sample data
- **Platform**: iOS (iPhone/iPad)

## 🎯 Key Testing Focus Areas

1. **Core Functionality**: Ensure basic finance tracking works
2. **User Experience**: Verify smooth, intuitive interface
3. **Data Security**: Confirm proper handling of financial information
4. **AI Features**: Test intelligent assistant capabilities
5. **Premium Integration**: Verify subscription and bank connection flows

---

**Thank you for reviewing VectorFi!** 🚀

This comprehensive personal finance app aims to make financial management accessible and intelligent for users of all experience levels.
