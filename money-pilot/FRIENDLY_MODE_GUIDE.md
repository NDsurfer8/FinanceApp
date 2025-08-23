# Friendly Mode Guide

## Overview

Friendly Mode is a powerful accessibility feature that translates complex financial terms into simple, easy-to-understand language. This makes the app accessible to users of all financial literacy levels, from beginners to children learning about money management.

## How to Enable Friendly Mode

1. **Open the App**: Launch the Finance App
2. **Go to Help & Support**: Navigate to the Help & Support screen
3. **Toggle Friendly Mode**: Tap the toggle switch next to "Friendly Mode"
4. **Confirm**: Tap "OK" to confirm the change

## What Friendly Mode Does

When enabled, Friendly Mode translates financial terms throughout the app:

### Navigation

- **Dashboard** → **Money Overview**
- **Budget** → **Spending Plan**
- **Goals** → **Dreams**
- **Assets & Debts** → **Own & Owe**

### Financial Terms

- **Income** → **Money In**
- **Expenses** → **Money Out**
- **Savings** → **Money Saved**
- **Debt** → **Money Owed**
- **Assets** → **Things Owned**
- **Liabilities** → **Money Owed**
- **Net Worth** → **Net Worth** (kept for familiarity)
- **Discretionary Income** → **Extra Money**
- **Available** → **Available**
- **Remaining Balance** → **Left Over**

### Budget Terms

- **Net Income** → **Net Income**
- **Savings %** → **Save %**
- **Debt Payoff %** → **Pay Debt %**
- **Total Expenses** → **Total Out**
- **Total Income** → **Total In**
- **Monthly Contribution** → **Monthly Save**

### Goal Terms

- **Target Amount** → **Target**
- **Current Amount** → **Current**
- **Target Date** → **Target Date**
- **Progress** → **Progress**
- **Payments Left** → **Payments Left**

### Transaction Terms

- **Transaction** → **Transaction**
- **Recurring Transaction** → **Regular**
- **Category** → **Category**
- **Description** → **Description**
- **Amount** → **Amount**
- **Date** → **Date**

### Smart Insights

- **Smart Insights** → **Smart Tips**
- **Discretionary Savings Rate** → **Extra Savings**
- **Active Budgeting** → **Active Month**
- **Diversified Income** → **Multiple Sources**
- **Excellent Discretionary Savings** → **Great Savings!**
- **Over Budget** → **Over Budget**
- **High Debt Ratio** → **High Debt**
- **Emergency Fund Complete** → **Emergency Ready!**
- **Emergency Fund Progress** → **Building Emergency**
- **Build Emergency Fund** → **Need Emergency**

### Actions

- **Add Transaction** → **Add Transaction**
- **Add Goal** → **Add Dream**
- **Add Asset** → **Add Asset**
- **Add Debt** → **Add Debt**
- **Save** → **Save**
- **Cancel** → **Cancel**
- **Delete** → **Delete**
- **Edit** → **Edit**

### Messages

- **No Transactions** → **No Transactions**
- **No Goals** → **No Dreams**
- **No Assets** → **No Assets**
- **No Debts** → **No Debts**
- **Loading...** → **Loading...**
- **Error** → **Error**
- **Success!** → **Success!**

## Implementation for Developers

### Using Friendly Mode in Components

```typescript
import { useFriendlyMode } from "../contexts/FriendlyModeContext";
import { translate } from "../services/translations";

const MyComponent = () => {
  const { isFriendlyMode } = useFriendlyMode();

  return <Text>{translate("income", isFriendlyMode)}</Text>;
};
```

### Adding New Translations

To add a new translation:

1. **Update the Interface**: Add the new term to `FinancialTranslations` interface in `translations.ts`
2. **Add Translations**: Add both friendly and standard translations:

```typescript
export const friendlyTranslations: FinancialTranslations = {
  // ... existing translations
  myNewTerm: "Simple explanation",
};

export const standardTranslations: FinancialTranslations = {
  // ... existing translations
  myNewTerm: "Professional term",
};
```

### Context Management

The Friendly Mode state is managed globally through the `FriendlyModeContext`. The context is already set up in the app's provider chain:

```typescript
const { isFriendlyMode, setIsFriendlyMode } = useFriendlyMode();
```

### Settings Persistence

Friendly Mode setting is persisted using AsyncStorage and managed through the settings service:

```typescript
import {
  getFriendlyModeEnabled,
  setFriendlyModeEnabled,
} from "../services/settings";

const enabled = await getFriendlyModeEnabled();
await setFriendlyModeEnabled(true);
```

## Benefits

- **Accessibility**: Makes financial concepts accessible to everyone
- **Educational**: Helps users learn financial terminology
- **Flexible**: Users can switch between modes as needed
- **Maintainable**: Clear separation between friendly and standard modes
- **Consistent**: All translations are centralized and consistent

## Best Practices

1. **Keep friendly translations** truly simple and child-friendly
2. **Use consistent terminology** across the app
3. **Test both modes** to ensure clarity
4. **Consider context** when choosing translations

### Translation Guidelines

- **Friendly Mode**: Use everyday language, avoid jargon
- **Standard Mode**: Use professional financial terminology
- **Consistency**: Use the same friendly term for related concepts
- **Clarity**: Ensure translations are immediately understandable

## Example Usage

Here's how the Dashboard screen uses Friendly Mode:

```typescript
const quickActions = [
  {
    title: translate("addTransaction", isFriendlyMode), // "Add Money Move" or "Add Transaction"
    // ...
  },
  {
    title: translate("addAsset", isFriendlyMode), // "Add Thing You Own" or "Add Asset"
    // ...
  },
];
```

## Future Enhancements

Potential improvements for Friendly Mode:

- **Contextual Help**: Tooltips explaining terms in Friendly Mode
- **Custom Translations**: Allow users to customize translations
- **Learning Mode**: Gradually introduce standard terms
- **Voice Support**: Audio explanations for terms
- **Visual Aids**: Icons and illustrations for complex concepts

## Support

If you encounter any issues with Friendly Mode or have suggestions for new translations, please contact support through the Help & Support screen.
