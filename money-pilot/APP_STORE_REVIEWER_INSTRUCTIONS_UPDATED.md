# VectorFi - Personal Finance App - Reviewer Instructions

## 📱 App Overview

VectorFi is a comprehensive personal finance management app featuring AI-powered financial assistance, shared finance groups, and advanced budgeting tools. The app combines traditional finance tracking with modern AI technology to provide personalized financial advice.

## 🔐 Test Account Credentials

**Primary Test Account:**

- **Email**: `user@test.com`
- **Password**: `password`

**Plaid Sandbox Credentials (for bank connection testing):**

- **Username**: `user_good`
- **Password**: `pass_good`
- **2FA Code** (if prompted): `1234`
- **Recommended Banks**: USAA, Chase, or any available bank in Plaid sandbox

## 🧪 Comprehensive Testing Flow

### 1. **Initial Setup & Authentication**

1. **Launch the app** - You'll see the splash screen
2. **Login Screen**: Enter test credentials (`user@test.com` / `password`)
3. **Dashboard**: You'll land on the main dashboard showing financial overview
4. **Initial State**: All values will show $0 as this is a fresh test account

### 2. **Core Budget Management Testing**

#### 📊 Budget Screen Navigation

1. **Navigate**: Tap the "Budget" tab in bottom navigation
2. **Budget Overview**: You'll see income, expenses, and net income sections
3. **Month Navigation**: Use chevrons (◀ ▶) around the date to navigate between months
4. **Quick Month Jump**: Tap the month name to quickly navigate to other months

#### 💰 Adding Income

1. **Method 1**: Tap the large green "Add Income" button below the Income section
2. **Method 2**: Tap on "Income" in the Budget Overview card
3. **Fill Form**:
   - Amount: `$5000`
   - Description: `Salary`
   - Category: Select `Salary` from dropdown
   - Date: Use current date
4. **Save**: Tap "Save Transaction"
5. **Verify**: Check that income total updates in Budget Overview

#### 💸 Adding Expenses

1. **Method 1**: Tap the "Add Expense" button
2. **Method 2**: Tap on "Expenses" in the Budget Overview card
3. **Fill Form**:
   - Amount: `$1000`
   - Description: `Groceries`
   - Category: Select `Food & Dining` from dropdown
   - Date: Use current date
4. **Save**: Tap "Save Transaction"
5. **Verify**: Check that expense total updates and net income shows $4000

#### 📋 Viewing Transactions

1. **Budget Overview**: See summary totals
2. **Income/Expense Sections**: View individual transactions
3. **View Details**: Tap "View Details" button in Budget Overview for complete breakdown
4. **Transaction List**: Scroll through all transactions with categories and amounts

### 3. **Assets & Debts Management**

#### 🏦 Assets & Debts Screen

1. **Navigate**: Tap the "Debt/Asset" tab in bottom navigation
2. **Net Worth Display**: Shows current net worth calculation at bottom

#### 💎 Adding Assets

1. **Tap**: "Add Asset" button
2. **Fill Form**:
   - Amount: `$10000`
   - Description: `Savings Account`
   - Category: Select `Savings` from dropdown
   - Date: Use current date
3. **Save**: Tap "Save Asset"
4. **Verify**: Net worth updates to show $10000

#### 💳 Adding Debts

1. **Tap**: "Add Debt" button
2. **Fill Form**:
   - Amount: `$5000`
   - Description: `Car Loan`
   - Category: Select `Auto Loan` from dropdown
   - Date: Use current date
3. **Save**: Tap "Save Debt"
4. **Verify**: Net worth updates to show $5000 ($10000 - $5000)

#### 🏦 Financial Accounts (Premium Feature)

1. **After Plaid Connection**: Tap "View Financial Accounts" button
2. **View**: Connected bank accounts with balances
3. **Import**: Use import buttons to sync account data

### 4. **Goal Setting & Tracking**

#### 🎯 Goals Screen

1. **Navigate**: Tap the "Goals" tab in bottom navigation
2. **Goal List**: View existing goals (if any)

#### 🎯 Creating a Goal

1. **Tap**: "Add Goal" button
2. **Fill Form**:
   - Goal Name: `Spain Trip`
   - Target Amount: `$5000`
   - Current Amount: `$0` (or any amount)
   - Target Date: Select a future date (e.g., 6 months from now)
   - Category: Select `Travel` from dropdown
3. **Save**: Tap "Save Goal"
4. **Verify**: Goal appears in list with progress bar

#### 📊 Goal Progress

1. **Progress Bar**: Visual representation of goal completion
2. **Amount Tracking**: Shows current vs target amount
3. **Date Tracking**: Shows days remaining until target date

### 5. **AI Financial Assistant**

#### 🤖 AI Chat Interface

1. **Access**: Tap the floating green chat icon (bottom right)
2. **Welcome Message**: AI introduces itself and capabilities
3. **Chat Interface**: Clean, modern chat UI with message history

#### 💬 Testing AI Responses

1. **Basic Question**: Ask "How does my financial situation look currently?"
2. **Budget Advice**: Ask "How can I improve my budget?"
3. **Goal Planning**: Ask "What should I do to reach my Spain Trip goal?"
4. **Financial Tips**: Ask "Give me some money-saving tips"

#### 🧠 AI Features to Test

- **Contextual Responses**: AI should reference your actual data
- **Budget Analysis**: AI should analyze your income/expenses
- **Goal Recommendations**: AI should provide actionable advice
- **Natural Language**: AI should understand various question formats

### 6. **Premium Features & Bank Connection**

#### 💳 Premium Paywall

1. **Navigate**: Settings → Connect to Bank
2. **Paywall Display**: Shows premium features and pricing
3. **Options**:
   - Start Free Trial
   - Upgrade to Premium
   - View Premium Features

#### 🏦 Plaid Bank Connection (Premium)

1. **After Premium**: Tap "Connect Bank Account"
2. **Plaid Interface**: Select a bank (USAA, Chase, etc.)
3. **Sandbox Login**:
   - Username: `user_good`
   - Password: `pass_good`
   - 2FA Code: `1234` (if prompted)
4. **Account Selection**: Choose accounts to connect
5. **Success**: Bank connection established

#### 📥 Transaction Import

1. **Navigate**: Budget screen after bank connection
2. **Download Icon**: Look for download icon next to "Budget Overview"
3. **Badge**: Red badge shows number of new transactions
4. **Month Navigation**: Navigate to August/July to see historical transactions
5. **Import**: Tap download icon to import all transactions
6. **Categorization**: Transactions automatically categorized

### 7. **Settings & Configuration**

#### ⚙️ Settings Screen

1. **Navigate**: Tap "Settings" tab in bottom navigation
2. **Settings Options**: View all available settings

#### 🎨 Friendly Mode

1. **Navigate**: Settings → Help & Support
2. **Toggle**: "Show Helpful Tooltips" switch
3. **Test**: Navigate back to other screens to see tooltips
4. **Verify**: Tooltips appear for various features

#### 🔒 Privacy & Security

1. **Navigate**: Settings → Privacy & Security
2. **Security Options**: View security settings
3. **Account Deletion**: Test delete account functionality
4. **Verification**: Confirm deletion process works

#### 👤 Account Management

1. **Profile**: View user profile information
2. **Logout**: Test logout functionality
3. **Re-login**: Verify login works after logout

### 8. **Advanced Features Testing**

#### 📊 Data Persistence

1. **Add Data**: Create transactions, goals, assets
2. **Close App**: Force close the app
3. **Reopen**: Launch app and login
4. **Verify**: All data persists correctly

#### 🔄 Real-time Updates

1. **Add Transaction**: Create new income/expense
2. **Navigation**: Switch between tabs
3. **Verify**: Totals update in real-time across all screens

#### 📱 Navigation Testing

1. **Tab Navigation**: Test all 5 main tabs
2. **Screen Transitions**: Verify smooth transitions
3. **Back Navigation**: Test back button functionality
4. **Deep Linking**: Test navigation from notifications

## 🎯 Key Features to Verify

### ✅ Core Functionality

- [ ] **Budget Management**: Income/expense tracking works
- [ ] **Asset/Debt Tracking**: Net worth calculation accurate
- [ ] **Goal Setting**: Goal creation and progress tracking
- [ ] **Data Persistence**: Data saves across app restarts
- [ ] **Real-time Updates**: Totals update immediately

### ✅ AI Features

- [ ] **AI Assistant**: Responds to financial questions
- [ ] **Contextual Advice**: References user's actual data
- [ ] **Natural Language**: Understands various question formats
- [ ] **Budget Analysis**: Provides actionable insights

### ✅ Premium Features

- [ ] **Paywall Display**: Shows premium features clearly
- [ ] **Bank Connection**: Plaid integration works
- [ ] **Transaction Import**: Imports and categorizes transactions
- [ ] **Premium UI**: Premium features clearly marked

### ✅ User Experience

- [ ] **Smooth Navigation**: No lag or crashes
- [ ] **Intuitive Interface**: Easy to understand and use
- [ ] **Error Handling**: Graceful error messages
- [ ] **Loading States**: Proper loading indicators

## 🚨 Expected Behavior

### ✅ Normal Operation

- **Smooth Performance**: No crashes or freezes
- **Real-time Updates**: Totals update immediately
- **Data Persistence**: All data saves correctly
- **AI Responses**: AI provides relevant, helpful advice
- **Premium Flow**: Paywall and bank connection work smoothly

### ⚠️ Known Limitations

- **Sandbox Data**: Plaid uses test data, not real transactions
- **Limited Banks**: Only sandbox banks available for testing
- **Sample Data**: All financial data is for demonstration purposes

## 📞 Support Information

### 🆘 If Issues Occur

- **App Version**: Latest development build
- **Test Environment**: Sandbox mode with sample data
- **Platform**: iOS (iPhone/iPad)
- **Data**: All transactions are simulated for testing

### 🔧 Troubleshooting

- **Login Issues**: Use exact credentials provided
- **Bank Connection**: Ensure using sandbox credentials
- **AI Not Responding**: Check internet connection
- **Data Not Saving**: Verify all required fields filled

## 🎯 Testing Focus Areas

### 1. **Core Functionality** (Priority 1)

- Budget management works correctly
- Data persistence across app restarts
- Real-time calculation updates

### 2. **AI Features** (Priority 1)

- AI responds to financial questions
- Provides contextual advice based on user data
- Natural language understanding

### 3. **Premium Integration** (Priority 2)

- Paywall displays correctly
- Bank connection works with Plaid
- Transaction import and categorization

### 4. **User Experience** (Priority 2)

- Smooth navigation and transitions
- Intuitive interface design
- Proper error handling

### 5. **Security & Privacy** (Priority 3)

- Account deletion works for all user types
- Data encryption and security measures
- Privacy policy accessibility

---

## 🚀 Final Notes

**VectorFi** represents a new generation of personal finance apps, combining traditional budgeting with AI-powered insights. The app is designed to be both powerful for advanced users and accessible for beginners through features like Friendly Mode.

**Key Differentiators:**

- 🤖 **AI Financial Assistant**: Unique in the market
- 👥 **Shared Finance Groups**: Rare feature for couples/families
- 🎨 **Modern UX**: Clean, intuitive interface
- 🔒 **Advanced Security**: Enterprise-grade data protection

**Thank you for reviewing VectorFi!** 🎉

This comprehensive personal finance app aims to make financial management accessible, intelligent, and collaborative for users of all experience levels.
