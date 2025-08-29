# Auto Budget Import Feature

## 🚀 Overview

The Auto Budget Import feature automatically categorizes and imports bank transactions into your budget with smart categorization and a one-click save option.

## 📱 How to Use

### 1. **Access the Feature**

- Go to the **Budget** screen
- If you have a connected bank account with transactions, you'll see a prominent **"Import Current Month"** button
- The button shows the number of available current month transactions to import

### 2. **Smart Categorization**

The system automatically categorizes transactions based on merchant names and patterns:

#### **Income Categories:**

- **Salary**: Deposits, transfers, payroll, direct deposits
- **Refund**: Refunds, returns
- **Other Income**: Other positive transactions

#### **Expense Categories:**

- **Food & Dining**: Restaurants, fast food, delivery services
- **Transportation**: Uber, Lyft, gas stations
- **Shopping**: Amazon, Walmart, Target, Costco
- **Bills & Utilities**: Electricity, water, internet, streaming services
- **Healthcare**: Pharmacies, medical services
- **Entertainment**: Movies, concerts, games
- **Other Expenses**: Uncategorized expenses

### 3. **Import Process**

1. **Review Transactions**: See all categorized transactions with amounts and dates
2. **Select/Deselect**: Choose which transactions to import
3. **Bulk Actions**: Use "Select All" or "Deselect All" for quick selection
4. **One-Click Save**: Import all selected transactions with a single button

## 🎯 Features

### **Smart Categorization**

- Automatically detects transaction types based on merchant names
- Categorizes income vs expenses
- Assigns appropriate budget categories

### **Visual Interface**

- Clear transaction cards with amounts and categories
- Color-coded income (green) and expenses (red)
- Selection indicators for easy management

### **Bulk Operations**

- Select all transactions at once
- Deselect all transactions at once
- Individual transaction selection

### **Success Feedback**

- Shows import count after successful import
- Auto-refreshes budget data
- Success message with auto-dismiss

## 🔧 Technical Details

### **Data Flow**

1. **Bank Connection**: Requires connected bank account via Plaid
2. **Transaction Fetching**: Pulls current month bank transactions only
3. **Smart Categorization**: Applies pattern matching rules
4. **User Selection**: Allows manual review and selection
5. **Budget Integration**: Saves to user's budget transactions
6. **Data Refresh**: Updates budget summary automatically

### **Categorization Rules**

The system uses pattern matching on transaction names:

- **Case-insensitive matching**
- **Partial string matching**
- **Common merchant name recognition**
- **Amount-based income/expense detection**

### **Data Safety**

- **No automatic imports**: User must manually select transactions
- **Preview before save**: See all categorizations before importing
- **Error handling**: Graceful handling of import failures
- **Data validation**: Ensures proper transaction format

## 🎨 User Experience

### **When Bank is Connected:**

- Prominent import button with transaction count
- Easy access from budget screen
- Clear visual feedback

### **When Bank is Not Connected:**

- Helpful message explaining the requirement
- Guidance to connect bank account first

### **During Import:**

- Loading states and progress indicators
- Clear success/error messages
- Automatic data refresh

## 📊 Integration with Budget

### **Budget Summary Updates**

- Imported transactions immediately appear in budget
- Income and expenses are properly categorized
- Budget calculations update automatically

### **Transaction Management**

- Imported transactions are regular budget transactions
- Can be edited, deleted, or categorized further
- Integrates with existing budget features

## 🚀 Benefits

### **Time Savings**

- No manual transaction entry
- Automatic categorization
- Bulk import capability

### **Accuracy**

- Direct bank data integration
- Consistent categorization
- Reduced manual errors

### **User Control**

- Review before importing
- Selective import capability
- Manual override options

## 🔮 Future Enhancements

### **Potential Improvements**

- **Machine Learning**: Better categorization over time
- **Custom Rules**: User-defined categorization rules
- **Recurring Detection**: Automatic recurring transaction setup
- **Smart Suggestions**: AI-powered transaction insights
- **Batch Scheduling**: Scheduled automatic imports

### **Advanced Features**

- **Category Learning**: Improve categorization based on user corrections
- **Merchant Mapping**: Custom merchant-to-category mappings
- **Import History**: Track and manage import history
- **Conflict Resolution**: Handle duplicate transaction detection

## 🛠️ Troubleshooting

### **Common Issues**

1. **No Import Button**: Ensure bank is connected and has transactions
2. **Categorization Errors**: Review and manually adjust as needed
3. **Import Failures**: Check network connection and try again
4. **Missing Transactions**: Verify bank connection is active

### **Support**

- Check bank connection status in Settings
- Verify transaction data is available
- Contact support for technical issues
