# App Store Review Instructions for VectorFi

## Test Mode for Apple Reviewers

**No special setup required!** The app automatically detects Apple reviewers and provides test data.

### How It Works

The app automatically enables test mode when it detects:

- Email addresses containing `@apple.com` (Apple's official domain)
- Very specific test email patterns like `apple.reviewer@test.com`
- **Recommended test account**: `user@test.com` (provided for Apple reviewers)
- User IDs containing `apple_reviewer_` (with underscore)
- Specific test domains like `@apple.reviewer`, `@appstore.test`

**Safety Note**: The detection patterns are very specific to avoid affecting legitimate users.

### Test Mode Features

When test mode is automatically detected, the app will:

- Use test bank connection tokens
- Display mock financial data (test accounts and transactions)
- Allow full testing of all features without real bank connections
- Provide realistic sample data for testing

### Test Data Available

- **Test Accounts**: Checking ($5,000) and Savings ($15,000) accounts
- **Test Transactions**: Grocery, gas, and salary transactions
- **Test Categories**: Food, Transportation, and Transfer categories
- **All Features**: Budgeting, AI advisor, and financial planning work with test data

### For Apple Reviewers

1. **Use the provided test account**: `user@test.com` (recommended)
2. **Or sign up with any Apple test email** (the app will detect if it's a test account)
3. **All features work automatically** with test data
4. **No real bank connections required**
5. **Full app functionality testable**

## Production Safety

- **Legitimate users**: Continue using production Plaid environment
- **Test mode**: Only activates for very specific Apple reviewer patterns
- **No conflicts**: Test and production data are completely separate
- **Safe patterns**: Detection is very specific to avoid false positives

## Notes for Reviewers

- All financial features work with test data
- No real bank connections required
- AI advisor responds with sample financial advice
- Budget categories initialize with $0 limits for new users
- Account deletion works with test data
- Test mode is automatically enabled - no configuration needed

## Contact

For any questions during review, contact: [your contact info]
