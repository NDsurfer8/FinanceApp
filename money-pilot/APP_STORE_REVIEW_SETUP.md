# App Store Review Setup Guide

## 🔧 Environment Configuration

### Firebase Functions Environment Variables

Set these environment variables in Firebase Functions:

```bash
# For App Store Review (Sandbox)
PLAID_ENV=sandbox
APP_STORE_REVIEW=true

# For Production
PLAID_ENV=production
APP_STORE_REVIEW=false
```

### Setting Environment Variables

1. **Firebase Console**:

   - Go to Firebase Console > Functions > Configuration
   - Add environment variables
   - Deploy functions after changes

2. **Command Line**:
   ```bash
   firebase functions:config:set plaid.env="sandbox" app_store_review="true"
   firebase deploy --only functions
   ```

## 🧪 Testing Configuration

### App Store Review Mode

When `APP_STORE_REVIEW=true`:

- ✅ Plaid automatically uses sandbox environment
- ✅ All bank connections use test credentials
- ✅ No real financial data is processed
- ✅ Error handling is tested with sandbox scenarios

### Test Credentials

**Plaid Sandbox Banks**:

- **Chase**: user_good / pass_good
- **Bank of America**: user_good / pass_good
- **Wells Fargo**: user_good / pass_good

**Test Data**:

- Sample transactions are provided
- No real financial information
- Safe for App Store review testing

## 📱 App Store Review Instructions

### For Apple Reviewers:

1. **Environment**: App automatically uses sandbox mode
2. **Bank Connection**: Use provided test credentials
3. **Features**: All features work with test data
4. **Safety**: No real financial data is processed

### Testing Flow:

1. **Login**: Use test account (user@test.com / password)
2. **Bank Connection**: Use Plaid sandbox credentials
3. **Transaction Import**: Test with sample data
4. **AI Features**: Test with mock financial data
5. **Premium Features**: Test paywall and subscription flow

## 🚀 Deployment Checklist

### Before App Store Submission:

- [ ] Set `PLAID_ENV=sandbox` in Firebase Functions
- [ ] Set `APP_STORE_REVIEW=true` in Firebase Functions
- [ ] Deploy updated functions
- [ ] Test complete flow with sandbox credentials
- [ ] Verify error handling works correctly
- [ ] Test premium feature gating

### After App Store Approval:

- [ ] Set `PLAID_ENV=production` in Firebase Functions
- [ ] Set `APP_STORE_REVIEW=false` in Firebase Functions
- [ ] Deploy updated functions
- [ ] Test production flow

## 🔒 Security Notes

- **Sandbox Mode**: Completely isolated from real financial data
- **Test Credentials**: Provided by Plaid for testing only
- **No Real Data**: All transactions are simulated
- **Safe Testing**: Reviewers cannot access real user data
