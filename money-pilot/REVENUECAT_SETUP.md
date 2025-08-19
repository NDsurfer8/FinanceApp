# RevenueCat Setup Guide

This guide will help you set up RevenueCat for subscription management in your VectorFi app.

## 1. RevenueCat Dashboard Setup

### Create Account

1. Go to [RevenueCat Dashboard](https://app.revenuecat.com/)
2. Sign up for a free account
3. Create a new project for VectorFi

### Get API Keys

1. In your RevenueCat dashboard, go to **Project Settings**
2. Copy your API keys:
   - **iOS API Key**: `appl_...`
   - **Android API Key**: `goog_...`

### Update API Keys

Update the API keys in `src/services/revenueCat.ts`:

```typescript
const REVENUECAT_API_KEYS = {
  ios: "appl_YOUR_ACTUAL_IOS_API_KEY",
  android: "goog_YOUR_ACTUAL_ANDROID_API_KEY",
};
```

## 2. App Store Connect Setup

### Create In-App Purchases

1. Go to [App Store Connect](https://appstoreconnect.apple.com/)
2. Select your app
3. Go to **Features** > **In-App Purchases**
4. Create the following subscription products:

#### Monthly Premium

- **Product ID**: `premium_monthly`
- **Type**: Auto-Renewable Subscription
- **Price**: $9.99/month
- **Description**: Premium monthly subscription

#### Yearly Premium

- **Product ID**: `premium_yearly`
- **Type**: Auto-Renewable Subscription
- **Price**: $99.99/year
- **Description**: Premium yearly subscription (save 17%)

#### Lifetime Premium

- **Product ID**: `premium_lifetime`
- **Type**: Non-Consumable
- **Price**: $299.99
- **Description**: One-time lifetime premium access

### Create Subscription Group

1. Create a subscription group called "Premium"
2. Add all subscription products to this group
3. Set up subscription levels and pricing

## 3. RevenueCat Product Configuration

### Create Entitlements

1. In RevenueCat dashboard, go to **Entitlements**
2. Create an entitlement called `premium`
3. Add all your subscription products to this entitlement

### Create Offerings

1. Go to **Offerings**
2. Create an offering called "default"
3. Add your subscription packages:
   - Monthly Premium
   - Yearly Premium
   - Lifetime Premium

## 4. Testing Setup

### Sandbox Testing

1. Create sandbox test users in App Store Connect
2. Use these accounts for testing
3. Test all subscription flows:
   - Initial purchase
   - Subscription renewal
   - Subscription cancellation
   - Restore purchases

### TestFlight Testing

1. Upload your app to TestFlight
2. Test with real App Store accounts
3. Verify subscription flows work correctly

## 5. Implementation Details

### Features Included

The app includes the following premium features:

- **Unlimited Transactions**: No limit on transaction tracking
- **Advanced Analytics**: Detailed financial insights
- **Export Data**: Export to CSV/PDF
- **Custom Categories**: Create custom transaction categories
- **Shared Finance**: Share finances with family/partners
- **Goal Tracking**: Set and track financial goals
- **Budget Planning**: Advanced budget tools
- **Priority Support**: Premium customer support
- **Ad-Free Experience**: No advertisements

### Code Structure

- `src/services/revenueCat.ts`: Main RevenueCat service
- `src/hooks/useSubscription.ts`: Subscription state management
- `src/components/PremiumFeature.tsx`: Feature gating component
- `src/screens/SubscriptionScreen.tsx`: Subscription UI

### Usage Examples

#### Check Premium Status

```typescript
import { useSubscription } from "../hooks/useSubscription";

const { hasPremiumAccess, isFeatureAvailable } = useSubscription();

if (hasPremiumAccess()) {
  // User has premium
}
```

#### Gate Premium Features

```typescript
import { PremiumFeature } from "../components/PremiumFeature";
import { PREMIUM_FEATURES } from "../services/revenueCat";

<PremiumFeature feature={PREMIUM_FEATURES.EXPORT_DATA}>
  <ExportButton />
</PremiumFeature>;
```

## 6. Production Deployment

### App Store Review

1. Ensure all subscription products are approved
2. Test with real accounts before submission
3. Verify subscription terms and conditions

### Analytics Setup

1. Enable RevenueCat analytics
2. Set up conversion tracking
3. Monitor subscription metrics

## 7. Troubleshooting

### Common Issues

1. **API Key Issues**: Verify API keys are correct
2. **Product Not Found**: Ensure product IDs match exactly
3. **Sandbox Testing**: Use sandbox accounts for testing
4. **Receipt Validation**: RevenueCat handles this automatically

### Debug Logs

Enable debug logging in development:

```typescript
if (__DEV__) {
  Purchases.setLogLevel(Purchases.LOG_LEVEL.DEBUG);
}
```

## 8. RevenueCat Dashboard Features

### Analytics

- Subscription conversion rates
- Revenue tracking
- Churn analysis
- Customer lifetime value

### Customer Management

- View customer subscriptions
- Handle refunds
- Manage subscription status

### Webhooks

- Set up webhooks for real-time updates
- Integrate with your backend
- Handle subscription events

## 9. Legal Requirements

### Terms of Service

- Include subscription terms in your app
- Explain auto-renewal policies
- Provide cancellation instructions

### Privacy Policy

- Update privacy policy for subscription data
- Explain data collection and usage
- Comply with App Store guidelines

## 10. Support Resources

- [RevenueCat Documentation](https://docs.revenuecat.com/)
- [App Store Connect Help](https://help.apple.com/app-store-connect/)
- [React Native Purchases SDK](https://docs.revenuecat.com/docs/react-native)

## Next Steps

1. Update API keys in the code
2. Set up products in App Store Connect
3. Configure RevenueCat dashboard
4. Test with sandbox accounts
5. Deploy to TestFlight for testing
6. Submit to App Store for review
