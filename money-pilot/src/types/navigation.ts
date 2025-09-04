export type SharedFinanceStackParamList = {
  SharedFinance: undefined;
  SharedGroupDetail: {
    groupId: string;
  };
  SharedGroupDetailFixed: {
    groupId: string;
  };
  DataSharingSettings: undefined;
  GroupDataSharing: {
    groupId: string;
  };
};

export type RootStackParamList = {
  // Main app screens
  MainTabs: undefined;
  Dashboard: undefined;
  Budget: undefined;
  Goals: undefined;
  "Assets/Debts": undefined;
  Settings: undefined;

  // Shared Finance screens
  SharedFinance: undefined;
  SharedGroupDetail: {
    groupId: string;
  };
  SharedGroupDetailFixed: {
    groupId: string;
    onGroupDeleted?: (groupId: string) => void;
    onGroupLeft?: (groupId: string) => void;
  };
  DataSharingSettings: undefined;
  GroupDataSharing: {
    groupId: string;
  };
  GroupMembers: { groupId: string; group: any };

  // Other screens
  AddTransaction: undefined;
  AddAssetDebt: undefined;
  AddGoal: undefined;
  FinancialRisk: undefined;
  EditProfile: undefined;
  NotificationSettings: undefined;
  PrivacySecurity: undefined;
  About: undefined;
  AIUsageAdmin: undefined;
  HelpSupport: undefined;
  ForgotPassword: undefined;
  RecurringTransactions: undefined;
  Subscription: undefined;
  BankTransactions: undefined;
  AIFinancialAdvisor: undefined;
  FinancialPlans: undefined;
  PrivacyPolicy: undefined;
  TermsOfService: undefined;
  BudgetCategories: { selectedMonth?: Date };
};
