# Translation Implementation Guide

## Overview

The app now supports 10 languages using Expo Localization and i18next:

- English (en)
- Spanish (es)
- Chinese (zh)
- Hindi (hi)
- Arabic (ar)
- Portuguese (pt)
- Russian (ru)
- Japanese (ja)
- French (fr)
- German (de)

## How to Use Translations

### 1. Basic Translation Usage

```tsx
import { useTranslation } from "../hooks/useTranslation";

const MyComponent = () => {
  const { t } = useTranslation();

  return <Text>{t("common.loading")}</Text>;
};
```

### 2. Translation with Variables

```tsx
const { t } = useTranslation();

// In translation file: "save_percent": "Save {{percent}}%"
<Text>{t("premium.save_percent", { percent: 20 })}</Text>;
```

### 3. Language Selection

```tsx
import { useLanguage } from "../contexts/LanguageContext";

const MyComponent = () => {
  const { currentLanguage, changeLanguage, availableLanguages } = useLanguage();

  return (
    <TouchableOpacity onPress={() => changeLanguage("es")}>
      <Text>Switch to Spanish</Text>
    </TouchableOpacity>
  );
};
```

## Translation Keys Structure

### Common Keys

- `common.loading` - "Loading..."
- `common.error` - "Error"
- `common.success` - "Success"
- `common.cancel` - "Cancel"
- `common.ok` - "OK"
- `common.save` - "Save"
- `common.delete` - "Delete"
- `common.edit` - "Edit"
- `common.add` - "Add"
- `common.back` - "Back"
- `common.next` - "Next"
- `common.done` - "Done"

### Navigation Keys

- `navigation.dashboard` - "Dashboard"
- `navigation.budget` - "Budget"
- `navigation.transactions` - "Transactions"
- `navigation.assets` - "Assets & Debts"
- `navigation.goals` - "Goals"
- `navigation.settings` - "Settings"
- `navigation.ai_advisor` - "AI Advisor"
- `navigation.bank_accounts` - "Bank Accounts"

### Authentication Keys

- `auth.login` - "Login"
- `auth.signup` - "Sign Up"
- `auth.logout` - "Logout"
- `auth.email` - "Email"
- `auth.password` - "Password"
- `auth.welcome_back` - "Welcome back!"
- `auth.welcome` - "Welcome to Vectra"

### Dashboard Keys

- `dashboard.title` - "Dashboard"
- `dashboard.welcome_message` - "Welcome back!"
- `dashboard.total_balance` - "Total Balance"
- `dashboard.monthly_income` - "Monthly Income"
- `dashboard.monthly_expenses` - "Monthly Expenses"
- `dashboard.savings_rate` - "Savings Rate"
- `dashboard.budget_overview` - "Budget Overview"
- `dashboard.recent_transactions` - "Recent Transactions"
- `dashboard.quick_actions` - "Quick Actions"
- `dashboard.financial_insights` - "Financial Insights"

### Budget Keys

- `budget.title` - "Budget"
- `budget.monthly_budget` - "Monthly Budget"
- `budget.spent` - "Spent"
- `budget.remaining` - "Remaining"
- `budget.categories` - "Categories"
- `budget.add_category` - "Add Category"
- `budget.edit_category` - "Edit Category"
- `budget.delete_category` - "Delete Category"
- `budget.budget_amount` - "Budget Amount"
- `budget.category_name` - "Category Name"
- `budget.auto_import` - "Auto Import"
- `budget.import_transactions` - "Import Transactions"
- `budget.available_transactions` - "Available Transactions"

### Transactions Keys

- `transactions.title` - "Transactions"
- `transactions.add_transaction` - "Add Transaction"
- `transactions.edit_transaction` - "Edit Transaction"
- `transactions.delete_transaction` - "Delete Transaction"
- `transactions.amount` - "Amount"
- `transactions.description` - "Description"
- `transactions.category` - "Category"
- `transactions.date` - "Date"
- `transactions.type` - "Type"
- `transactions.income` - "Income"
- `transactions.expense` - "Expense"
- `transactions.transfer` - "Transfer"
- `transactions.recurring` - "Recurring"
- `transactions.search_transactions` - "Search transactions..."
- `transactions.filter_by_category` - "Filter by category"
- `transactions.filter_by_date` - "Filter by date"
- `transactions.no_transactions` - "No transactions found"
- `transactions.transaction_added` - "Transaction added successfully"
- `transactions.transaction_updated` - "Transaction updated successfully"
- `transactions.transaction_deleted` - "Transaction deleted successfully"

### Bank Accounts Keys

- `bank_accounts.title` - "Bank Accounts"
- `bank_accounts.connect_bank` - "Connect Bank"
- `bank_accounts.connected_accounts` - "Connected Accounts"
- `bank_accounts.account_balances` - "Account Balances"
- `bank_accounts.credit_cards` - "Credit Cards"
- `bank_accounts.loan_accounts` - "Loan Accounts"
- `bank_accounts.investment_accounts` - "Investment Accounts"
- `bank_accounts.disconnect_bank` - "Disconnect Bank"
- `bank_accounts.disconnect_all_banks` - "Disconnect All Banks"
- `bank_accounts.add_another_bank` - "Add Another Bank"
- `bank_accounts.bank_connected` - "Bank Connected Successfully"
- `bank_accounts.bank_disconnected` - "Bank Disconnected"
- `bank_accounts.current_balance` - "Current Balance"
- `bank_accounts.remaining_balance` - "Remaining Balance"
- `bank_accounts.credit_limit` - "Credit Limit"
- `bank_accounts.auto_sync_enabled` - "Auto-sync enabled"
- `bank_accounts.manual_refresh` - "Manual Refresh"

### Assets & Debts Keys

- `assets_debts.title` - "Assets & Debts"
- `assets_debts.assets` - "Assets"
- `assets_debts.debts` - "Debts"
- `assets_debts.net_worth` - "Net Worth"
- `assets_debts.add_asset` - "Add Asset"
- `assets_debts.add_debt` - "Add Debt"
- `assets_debts.edit_asset` - "Edit Asset"
- `assets_debts.edit_debt` - "Edit Debt"
- `assets_debts.delete_asset` - "Delete Asset"
- `assets_debts.delete_debt` - "Delete Debt"
- `assets_debts.asset_name` - "Asset Name"
- `assets_debts.debt_name` - "Debt Name"
- `assets_debts.asset_value` - "Asset Value"
- `assets_debts.debt_amount` - "Debt Amount"
- `assets_debts.interest_rate` - "Interest Rate"
- `assets_debts.monthly_payment` - "Monthly Payment"

### Goals Keys

- `goals.title` - "Goals"
- `goals.add_goal` - "Add Goal"
- `goals.edit_goal` - "Edit Goal"
- `goals.delete_goal` - "Delete Goal"
- `goals.goal_name` - "Goal Name"
- `goals.target_amount` - "Target Amount"
- `goals.current_amount` - "Current Amount"
- `goals.target_date` - "Target Date"
- `goals.monthly_contribution` - "Monthly Contribution"
- `goals.priority` - "Priority"
- `goals.high` - "High"
- `goals.medium` - "Medium"
- `goals.low` - "Low"
- `goals.progress` - "Progress"
- `goals.on_track` - "On Track"
- `goals.behind` - "Behind"
- `goals.ahead` - "Ahead"

### AI Advisor Keys

- `ai_advisor.title` - "AI Financial Advisor"
- `ai_advisor.ask_question` - "Ask a question about your finances..."
- `ai_advisor.analyzing` - "Analyzing..."
- `ai_advisor.thinking` - "Thinking..."
- `ai_advisor.voice_input` - "Voice Input"
- `ai_advisor.send` - "Send"
- `ai_advisor.clear_chat` - "Clear Chat"
- `ai_advisor.suggestions` - "Suggestions"
- `ai_advisor.budget_advice` - "Budget Advice"
- `ai_advisor.savings_tips` - "Savings Tips"
- `ai_advisor.debt_payoff` - "Debt Payoff Strategy"
- `ai_advisor.investment_advice` - "Investment Advice"

### Settings Keys

- `settings.title` - "Settings"
- `settings.profile` - "Profile"
- `settings.notifications` - "Notifications"
- `settings.privacy` - "Privacy & Security"
- `settings.language` - "Language"
- `settings.currency` - "Currency"
- `settings.theme` - "Theme"
- `settings.about` - "About"
- `settings.help` - "Help & Support"
- `settings.terms_of_service` - "Terms of Service"
- `settings.privacy_policy` - "Privacy Policy"
- `settings.logout` - "Logout"
- `settings.delete_account` - "Delete Account"
- `settings.premium` - "Premium"
- `settings.subscription` - "Subscription"

### Premium Keys

- `premium.title` - "Premium Features"
- `premium.upgrade` - "Upgrade to Premium"
- `premium.features` - "Premium Features"
- `premium.unlimited_banks` - "Unlimited Bank Connections"
- `premium.ai_advisor` - "AI Financial Advisor"
- `premium.advanced_analytics` - "Advanced Analytics"
- `premium.priority_support` - "Priority Support"
- `premium.monthly` - "Monthly"
- `premium.yearly` - "Yearly"
- `premium.most_popular` - "Most Popular"
- `premium.save_percent` - "Save {{percent}}%"
- `premium.get_premium` - "Get Premium"
- `premium.restore_purchases` - "Restore Purchases"

### Error Keys

- `errors.network_error` - "Network error. Please check your connection."
- `errors.server_error` - "Server error. Please try again later."
- `errors.invalid_credentials` - "Invalid email or password."
- `errors.email_already_exists` - "Email already exists."
- `errors.weak_password` - "Password is too weak."
- `errors.user_not_found` - "User not found."
- `errors.bank_connection_failed` - "Failed to connect bank account."
- `errors.transaction_failed` - "Transaction failed."
- `errors.insufficient_funds` - "Insufficient funds."
- `errors.invalid_amount` - "Invalid amount."
- `errors.required_field` - "This field is required."
- `errors.invalid_email` - "Invalid email address."
- `errors.passwords_dont_match` - "Passwords don't match."

### Setup Keys

- `setup.welcome` - "Welcome to Vectra"
- `setup.get_started` - "Get Started"
- `setup.connect_bank` - "Connect Your Bank"
- `setup.set_budget` - "Set Your Budget"
- `setup.create_goals` - "Create Financial Goals"
- `setup.complete` - "Complete Setup"
- `setup.skip` - "Skip for Now"
- `setup.next_step` - "Next Step"
- `setup.previous_step` - "Previous Step"
- `setup.setup_complete` - "Setup Complete!"
- `setup.ready_to_go` - "You're all set! Start managing your finances."

## Implementation Steps

### 1. Replace Hardcoded Strings

Find hardcoded strings in your components and replace them with translation keys:

```tsx
// Before
<Text>Loading...</Text>

// After
<Text>{t('common.loading')}</Text>
```

### 2. Add Language Selector

The language selector is already implemented and can be used in any component:

```tsx
import { LanguageSelector } from "../components/LanguageSelector";

const MyComponent = () => {
  const [showLanguageSelector, setShowLanguageSelector] = useState(false);

  return (
    <>
      <TouchableOpacity onPress={() => setShowLanguageSelector(true)}>
        <Text>Change Language</Text>
      </TouchableOpacity>

      <LanguageSelector
        visible={showLanguageSelector}
        onClose={() => setShowLanguageSelector(false)}
      />
    </>
  );
};
```

### 3. Test Translations

1. Change the device language in settings
2. Use the language selector in the app
3. Verify all text appears in the selected language

## Notes

- The app automatically detects the device language on first launch
- Language preference is saved and persists across app restarts
- All 10 languages are fully translated with comprehensive coverage
- The translation system is optimized for performance and memory usage
