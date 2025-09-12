# Transaction Matching System Guide

## Overview

The Transaction Matching System automatically links manual transactions (like checks, bills, or expected expenses) with corresponding bank transactions when they appear. When a match is found, the manual transaction is marked as "Paid" and the bank transaction is not saved as a duplicate entry.

## How It Works

### 1. Manual Transaction Entry

- When a user creates a manual transaction, it's automatically marked as "Pending"
- The system stores the transaction with `status: "pending"` and `isManual: true`

### 2. Bank Transaction Import

- When bank transactions are imported (via Plaid), the system checks for potential matches
- Matches are evaluated based on:
  - **Exact amount match** (within $0.01 tolerance) - **PRIMARY FACTOR**
  - **Date proximity** (within 14 days of expected date) - **HELPFUL**
  - **Category similarity** (optional bonus) - **HELPFUL**
  - **Description similarity** (merchant name analysis) - **HELPFUL**

### 3. Automatic Matching

- **High Confidence (≥60%)**: Automatically matched and marked as "Paid"
- **Bank transaction is NOT saved** as a separate entry (prevents duplicates)
- **Only the manual transaction shows** in the transaction list with "Paid" status

## Key Features

### Smart Matching Algorithm

```typescript
// Match confidence calculation
- Base confidence: 70% (for amount match - PRIMARY FACTOR)
- Date proximity bonus: +20% (≤1 day), +15% (≤3 days), +10% (≤7 days), +5% (≤14 days)
- Category similarity: +0-10% (helpful but not required)
- Description similarity: +0-10% (helpful but not required)
```

### Transaction Status System

- **Pending**: Manual transaction waiting for bank confirmation
- **Paid**: Successfully matched with bank transaction
- **Cancelled**: User marked as cancelled
- **Normal**: Regular bank transaction (no status badge)

### Visual Indicators

- **Status Badges**: Show transaction status in transaction lists
- **Color Coding**:
  - 🟡 Pending (amber)
  - 🟢 Paid (green)
  - 🔴 Cancelled (red)
  - ⚪ Normal (no badge)

## Implementation Details

### Files Created/Modified

#### New Files:

- `src/services/transactionMatching.ts` - Core matching logic and service
- `src/components/TransactionStatusBadge.tsx` - Status display component
- `src/screens/TransactionMatchesScreen.tsx` - User review interface

#### Modified Files:

- `src/services/userData.ts` - Added matching integration to saveTransaction
- `src/components/AutoBudgetImporter.tsx` - Added match checking after import
- `src/components/TransactionListCard.tsx` - Added status badges
- `src/screens/SettingsScreen.tsx` - Added Transaction Matches option
- Navigation files - Added new screen to navigation

### Database Structure

#### Transaction Records

```typescript
{
  id: string,
  userId: string,
  description: string,
  amount: number,
  category: string,
  date: number,
  type: "income" | "expense",
  status: "pending" | "paid" | "cancelled",
  isManual: boolean,
  bankTransactionId?: string,
  matchedAt?: number,
  expectedDate?: number
}
```

#### Match Records

```typescript
{
  manualTransactionId: string,
  bankTransactionId: string,
  matchType: "auto" | "manual",
  matchConfidence: number,
  matchedAt: number,
  matchedBy?: string
}
```

## User Experience

### For Users:

#### 1. Creating Manual Transactions

- Enter transaction as usual (check, bill, expected expense)
- Transaction automatically marked as "Pending"
- Status badge appears in transaction lists

#### 2. Bank Transaction Processing

- When bank transaction appears, system checks for matches
- High-confidence matches are automatically marked as "Paid"
- Lower-confidence matches appear in review queue

#### 3. Reviewing Matches

- Go to Settings → Transaction Matches
- Review potential matches with confidence scores
- Confirm or dismiss matches
- View match details and transaction IDs

#### 4. Status Tracking

- See status badges on all transactions
- Pending transactions show amber "Pending" badge
- Paid transactions show green "Paid" badge
- Easy visual tracking of transaction lifecycle

### Example Workflow:

1. **User writes a check** for $150 to "Electric Company"

   - Creates manual transaction: "Electric Bill - $150"
   - Status: Pending (amber badge)

2. **Bank processes the check** 3 days later

   - Bank transaction: "ELECTRIC COMPANY - $150"
   - System calculates 85% confidence match
   - Auto-matches and marks as "Paid" (green badge)

3. **User sees the update**
   - Original manual transaction now shows "Paid" status
   - No duplicate transactions created
   - Clean, organized transaction history

## Configuration

### Matching Parameters

```typescript
MATCH_TOLERANCE_DAYS = 14; // Days to look for matches
AMOUNT_TOLERANCE = 0.01; // Exact amount match required
MIN_MATCH_CONFIDENCE = 60; // Confidence threshold for auto-matching
```

### Customization Options

- Adjustable confidence thresholds
- Customizable date tolerance
- Description similarity weights
- Manual override capabilities

## Benefits

### For Users:

- **No Duplicates**: Prevents duplicate transactions
- **Automatic Tracking**: Reduces manual work
- **Visual Clarity**: Clear status indicators
- **Peace of Mind**: Know when transactions are processed

### For the App:

- **Data Quality**: Cleaner transaction data
- **User Engagement**: More accurate financial tracking
- **Reduced Support**: Fewer duplicate transaction issues
- **Better Analytics**: More accurate spending patterns

## Technical Features

### Performance Optimizations

- Efficient database queries
- Batch processing for multiple transactions
- Caching of match results
- Minimal impact on transaction import speed

### Error Handling

- Graceful degradation if matching fails
- Detailed logging for debugging
- User-friendly error messages
- Fallback to manual review

### Security

- User data isolation
- Secure match storage
- No cross-user data leakage
- Encrypted transaction data

## Future Enhancements

### Planned Features:

- **Machine Learning**: Improved matching accuracy
- **Custom Rules**: User-defined matching criteria
- **Bulk Operations**: Process multiple matches at once
- **Notifications**: Alert users of new matches
- **Analytics**: Match success rate tracking

### Advanced Matching:

- **Fuzzy Amount Matching**: Handle small discrepancies
- **Merchant Normalization**: Better merchant name matching
- **Time Pattern Analysis**: Learn user transaction patterns
- **Category Validation**: Verify category consistency

## Troubleshooting

### Common Issues:

#### 1. Transactions Not Matching

- Check amount accuracy (must be exact)
- Verify date proximity (within 7 days)
- Review description similarity
- Check if transaction is marked as manual

#### 2. False Matches

- Use manual review to dismiss incorrect matches
- System learns from user corrections
- Adjust confidence thresholds if needed

#### 3. Missing Matches

- Check potential matches in Settings
- Manually confirm matches if needed
- Verify bank transaction import

### Debug Information:

- Check Firebase logs for matching details
- Review match confidence scores
- Verify transaction status in database
- Test with simple transactions first

## Support

For issues or questions:

1. Check transaction status badges
2. Review potential matches in Settings
3. Verify manual transaction creation
4. Check bank transaction import
5. Contact support if needed

---

This system provides intelligent transaction matching that reduces manual work while maintaining accuracy and user control. It's designed to handle real-world scenarios where users need to track both planned and actual transactions seamlessly.
