# UI Integration Guide: Smart Recurring Transaction System

## 🚀 Quick Start

Replace your old transaction calls with the new smart system:

```typescript
// OLD WAY (don't use this anymore)
const transactions = await getTransactionsForMonth(userId, month);
const projected = await getProjectedTransactionsForMonth(userId, month);

// NEW WAY (use this)
const smartTransactions = await getSmartTransactionsForMonth(userId, month);
```

## 📱 Component Updates

### 1. **Transaction List Component**

#### **Before (Old System)**

```typescript
const TransactionList = ({ userId, month }) => {
  const [transactions, setTransactions] = useState([]);
  const [projected, setProjected] = useState([]);

  useEffect(() => {
    const loadData = async () => {
      const actual = await getTransactionsForMonth(userId, month);
      const projected = await getProjectedTransactionsForMonth(userId, month);
      setTransactions(actual);
      setProjected(projected);
    };
    loadData();
  }, [userId, month]);

  return (
    <View>
      {transactions.map((t) => (
        <TransactionItem key={t.id} transaction={t} />
      ))}
      {projected.map((t) => (
        <ProjectedItem key={t.id} transaction={t} />
      ))}
    </View>
  );
};
```

#### **After (Smart System)**

```typescript
const TransactionList = ({ userId, month }) => {
  const [transactions, setTransactions] = useState([]);

  useEffect(() => {
    const loadData = async () => {
      const smartTransactions = await getSmartTransactionsForMonth(
        userId,
        month
      );
      setTransactions(smartTransactions);
    };
    loadData();
  }, [userId, month]);

  return (
    <View>
      {transactions.map((t) => (
        <TransactionItem
          key={t.id}
          transaction={t}
          onConvertToActual={
            t.isProjected ? () => handleConvertToActual(t) : undefined
          }
        />
      ))}
    </View>
  );
};
```

### 2. **Transaction Item Component**

#### **Updated Transaction Item**

```typescript
const TransactionItem = ({ transaction, onConvertToActual }) => {
  const { colors } = useTheme();

  if (transaction.isProjected) {
    return (
      <View style={[styles.transactionItem, styles.projectedTransaction]}>
        {/* Projected Badge */}
        <View style={styles.projectedBadge}>
          <Text style={styles.projectedText}>Projected</Text>
        </View>

        {/* Transaction Details */}
        <View style={styles.transactionContent}>
          <Text style={styles.description}>{transaction.description}</Text>
          <Text style={styles.amount}>
            ${(transaction.amount / 100).toFixed(2)}
          </Text>
          <Text style={styles.category}>{transaction.category}</Text>
        </View>

        {/* Convert Button */}
        {onConvertToActual && (
          <TouchableOpacity
            style={styles.convertButton}
            onPress={onConvertToActual}
          >
            <Text style={styles.convertButtonText}>Confirm</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  }

  // Regular transaction
  return (
    <View style={[styles.transactionItem, styles.actualTransaction]}>
      <View style={styles.transactionContent}>
        <Text style={styles.description}>{transaction.description}</Text>
        <Text style={styles.amount}>
          ${(transaction.amount / 100).toFixed(2)}
        </Text>
        <Text style={styles.category}>{transaction.category}</Text>
      </View>

      {/* Regular transaction actions */}
      <View style={styles.actions}>
        <TouchableOpacity onPress={() => handleEdit(transaction)}>
          <Icon name="edit" size={20} color={colors.primary} />
        </TouchableOpacity>
        <TouchableOpacity onPress={() => handleDelete(transaction)}>
          <Icon name="delete" size={20} color={colors.error} />
        </TouchableOpacity>
      </View>
    </View>
  );
};
```

### 3. **Styles for Projected vs Actual**

```typescript
const styles = StyleSheet.create({
  transactionItem: {
    flexDirection: "row",
    padding: 16,
    marginVertical: 4,
    borderRadius: 8,
    alignItems: "center",
  },

  // Projected Transaction Styling
  projectedTransaction: {
    backgroundColor: "#f8f9fa",
    borderWidth: 2,
    borderColor: "#dee2e6",
    borderStyle: "dashed",
  },

  projectedBadge: {
    backgroundColor: "#6c757d",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 12,
  },

  projectedText: {
    color: "white",
    fontSize: 12,
    fontWeight: "600",
  },

  // Actual Transaction Styling
  actualTransaction: {
    backgroundColor: "white",
    borderWidth: 1,
    borderColor: "#e9ecef",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },

  // Common Styles
  transactionContent: {
    flex: 1,
  },

  description: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 4,
  },

  amount: {
    fontSize: 18,
    fontWeight: "700",
    color: "#28a745",
    marginBottom: 4,
  },

  category: {
    fontSize: 14,
    color: "#6c757d",
  },

  convertButton: {
    backgroundColor: "#007bff",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
    marginLeft: 12,
  },

  convertButtonText: {
    color: "white",
    fontSize: 14,
    fontWeight: "600",
  },

  actions: {
    flexDirection: "row",
    gap: 12,
  },
});
```

## 🔄 Convert Projected to Actual

### **Implementation**

```typescript
const handleConvertToActual = async (projectedTransaction) => {
  try {
    if (
      !projectedTransaction.isProjected ||
      !projectedTransaction.recurringTransactionId
    ) {
      return;
    }

    // Show loading state
    setIsLoading(true);

    // Convert projected to actual
    const actualTransactionId = await convertProjectedToActual(
      userId,
      projectedTransaction.recurringTransactionId,
      new Date(projectedTransaction.date)
    );

    // Refresh the transaction list
    await refreshTransactions();

    // Show success message
    Alert.alert(
      "Success",
      "Transaction confirmed and added to your actual transactions"
    );
  } catch (error) {
    console.error("Error converting projected to actual:", error);
    Alert.alert("Error", "Failed to confirm transaction. Please try again.");
  } finally {
    setIsLoading(false);
  }
};
```

## 📅 Month Navigation

### **Smart Month Loading**

```typescript
const MonthNavigator = ({ userId, currentMonth, onMonthChange }) => {
  const [transactions, setTransactions] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  const loadMonthData = async (month) => {
    try {
      setIsLoading(true);
      const smartTransactions = await getSmartTransactionsForMonth(
        userId,
        month
      );
      setTransactions(smartTransactions);
    } catch (error) {
      console.error("Error loading month data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadMonthData(currentMonth);
  }, [currentMonth, userId]);

  const handleMonthChange = (newMonth) => {
    onMonthChange(newMonth);
    loadMonthData(newMonth);
  };

  return (
    <View>
      <MonthPicker
        currentMonth={currentMonth}
        onMonthChange={handleMonthChange}
      />

      {isLoading ? (
        <ActivityIndicator size="large" color="#007bff" />
      ) : (
        <TransactionList
          transactions={transactions}
          onConvertToActual={handleConvertToActual}
        />
      )}
    </View>
  );
};
```

## 🎯 Recurring Transaction Management

### **Create Recurring Transaction**

```typescript
const CreateRecurringTransaction = ({ userId, onSuccess }) => {
  const [formData, setFormData] = useState({
    name: "",
    amount: "",
    type: "expense",
    category: "",
    frequency: "monthly",
    startDate: new Date(),
  });

  const handleSubmit = async () => {
    try {
      const recurringTransaction = await createRecurringTransaction({
        ...formData,
        amount: parseFloat(formData.amount) * 100, // Convert to cents
        startDate: formData.startDate.getTime(),
        userId,
        isActive: true,
      });

      onSuccess(recurringTransaction);
      Alert.alert("Success", "Recurring transaction created successfully");
    } catch (error) {
      console.error("Error creating recurring transaction:", error);
      Alert.alert("Error", "Failed to create recurring transaction");
    }
  };

  return (
    <View style={styles.form}>
      <TextInput
        placeholder="Transaction Name"
        value={formData.name}
        onChangeText={(text) => setFormData({ ...formData, name: text })}
        style={styles.input}
      />

      <TextInput
        placeholder="Amount"
        value={formData.amount}
        onChangeText={(text) => setFormData({ ...formData, amount: text })}
        keyboardType="numeric"
        style={styles.input}
      />

      <Picker
        selectedValue={formData.frequency}
        onValueChange={(value) =>
          setFormData({ ...formData, frequency: value })
        }
      >
        <Picker.Item label="Weekly" value="weekly" />
        <Picker.Item label="Biweekly" value="biweekly" />
        <Picker.Item label="Monthly" value="monthly" />
        <Picker.Item label="Quarterly" value="quarterly" />
        <Picker.Item label="Yearly" value="yearly" />
      </Picker>

      <TouchableOpacity style={styles.submitButton} onPress={handleSubmit}>
        <Text style={styles.submitButtonText}>
          Create Recurring Transaction
        </Text>
      </TouchableOpacity>
    </View>
  );
};
```

### **Edit Recurring Transaction**

```typescript
const EditRecurringTransaction = ({ recurringTransaction, onUpdate }) => {
  const [formData, setFormData] = useState({
    name: recurringTransaction.name,
    amount: (recurringTransaction.amount / 100).toString(),
    type: recurringTransaction.type,
    category: recurringTransaction.category,
    frequency: recurringTransaction.frequency,
    isActive: recurringTransaction.isActive,
  });

  const handleSubmit = async () => {
    try {
      const updatedTransaction = await updateRecurringTransaction({
        ...recurringTransaction,
        ...formData,
        amount: parseFloat(formData.amount) * 100,
        updatedAt: Date.now(),
      });

      onUpdate(updatedTransaction);
      Alert.alert("Success", "Recurring transaction updated successfully");
    } catch (error) {
      console.error("Error updating recurring transaction:", error);
      Alert.alert("Error", "Failed to update recurring transaction");
    }
  };

  return (
    <View style={styles.form}>
      {/* Form fields similar to create */}
      <TouchableOpacity style={styles.submitButton} onPress={handleSubmit}>
        <Text style={styles.submitButtonText}>
          Update Recurring Transaction
        </Text>
      </TouchableOpacity>
    </View>
  );
};
```

### **Delete Recurring Transaction**

```typescript
const handleDeleteRecurring = async (recurringTransaction) => {
  try {
    Alert.alert(
      "Delete Recurring Transaction",
      "This will:\n\n• Stop all future recurring transactions\n• Keep the current transaction (for your records)\n• Remove the recurring template\n\nThis action cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Stop Future Recurring",
          style: "destructive",
          onPress: async () => {
            await deleteRecurringTransaction(recurringTransaction.id, userId);
            onDelete(recurringTransaction.id);
            Alert.alert("Success", "Recurring transaction stopped! Future occurrences will no longer be created.");
          },
        },
      ]
    );
  } catch (error) {
    console.error("Error deleting recurring transaction:", error);
    Alert.alert("Error", "Failed to delete recurring transaction");
  }
};
```

## 🎨 Advanced UI Features

### **1. Skip Month Functionality**

```typescript
const SkipMonthButton = ({ recurringTransaction, month, onSkip }) => {
  const handleSkip = async () => {
    try {
      const monthKey = `${month.getFullYear()}-${String(
        month.getMonth() + 1
      ).padStart(2, "0")}`;
      await skipRecurringTransactionForMonth(
        userId,
        recurringTransaction.id,
        monthKey
      );
      onSkip();
      Alert.alert("Success", `Skipped for ${month.toLocaleDateString()}`);
    } catch (error) {
      console.error("Error skipping month:", error);
      Alert.alert("Error", "Failed to skip month");
    }
  };

  return (
    <TouchableOpacity style={styles.skipButton} onPress={handleSkip}>
      <Text style={styles.skipButtonText}>Skip This Month</Text>
    </TouchableOpacity>
  );
};
```

### **2. Projected Transaction Summary**

```typescript
const ProjectedSummary = ({ transactions }) => {
  const projectedTransactions = transactions.filter((t) => t.isProjected);
  const totalProjected = projectedTransactions.reduce(
    (sum, t) => sum + t.amount,
    0
  );

  if (projectedTransactions.length === 0) {
    return null;
  }

  return (
    <View style={styles.projectedSummary}>
      <Text style={styles.summaryTitle}>Projected This Month</Text>
      <Text style={styles.summaryAmount}>
        ${(totalProjected / 100).toFixed(2)}
      </Text>
      <Text style={styles.summaryCount}>
        {projectedTransactions.length} recurring transactions
      </Text>
    </View>
  );
};
```

### **3. Smart Filtering**

```typescript
const TransactionFilters = ({ onFilterChange }) => {
  const [filter, setFilter] = useState("all"); // 'all', 'actual', 'projected'

  const handleFilterChange = (newFilter) => {
    setFilter(newFilter);
    onFilterChange(newFilter);
  };

  return (
    <View style={styles.filters}>
      <TouchableOpacity
        style={[
          styles.filterButton,
          filter === "all" && styles.filterButtonActive,
        ]}
        onPress={() => handleFilterChange("all")}
      >
        <Text style={styles.filterButtonText}>All</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[
          styles.filterButton,
          filter === "actual" && styles.filterButtonActive,
        ]}
        onPress={() => handleFilterChange("actual")}
      >
        <Text style={styles.filterButtonText}>Actual</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[
          styles.filterButton,
          filter === "projected" && styles.filterButtonActive,
        ]}
        onPress={() => handleFilterChange("projected")}
      >
        <Text style={styles.filterButtonText}>Projected</Text>
      </TouchableOpacity>
    </View>
  );
};
```

## 🔧 Migration Checklist

### **Phase 1: Update Service Calls**

- [ ] Replace `getTransactionsForMonth` with `getSmartTransactionsForMonth`
- [ ] Update `deleteRecurringTransaction` calls to include `userId` parameter
- [ ] Update `skipRecurringTransactionForMonth` calls to include `userId` parameter

### **Phase 2: Update UI Components**

- [ ] Add `isProjected` flag handling to transaction items
- [ ] Implement projected transaction styling
- [ ] Add convert to actual functionality
- [ ] Update recurring transaction management

### **Phase 3: Test and Deploy**

- [ ] Test with existing data
- [ ] Verify projected transactions display correctly
- [ ] Test convert functionality
- [ ] Deploy to production

## 🎯 Best Practices

### **1. Always Check isProjected Flag**

```typescript
// ✅ Good
if (transaction.isProjected) {
  // Handle projected transaction
} else {
  // Handle actual transaction
}

// ❌ Avoid
if (transaction.recurringTransactionId) {
  // This doesn't distinguish between actual and projected
}
```

### **2. Use Smart Functions**

```typescript
// ✅ Good
const transactions = await getSmartTransactionsForMonth(userId, month);

// ❌ Avoid
const actual = await getTransactionsForMonth(userId, month);
const projected = await getProjectedTransactionsForMonth(userId, month);
```

### **3. Handle Loading States**

```typescript
const [isLoading, setIsLoading] = useState(false);

const loadData = async () => {
  setIsLoading(true);
  try {
    const transactions = await getSmartTransactionsForMonth(userId, month);
    setTransactions(transactions);
  } finally {
    setIsLoading(false);
  }
};
```

### **4. Error Handling**

```typescript
try {
  const transactions = await getSmartTransactionsForMonth(userId, month);
  setTransactions(transactions);
} catch (error) {
  console.error("Error loading transactions:", error);
  Alert.alert("Error", "Failed to load transactions");
}
```

## 🚀 Performance Tips

### **1. Implement Caching**

```typescript
const [transactionCache, setTransactionCache] = useState({});

const loadMonthData = async (month) => {
  const monthKey = month.toISOString().slice(0, 7);

  if (transactionCache[monthKey]) {
    setTransactions(transactionCache[monthKey]);
    return;
  }

  const transactions = await getSmartTransactionsForMonth(userId, month);
  setTransactions(transactions);
  setTransactionCache((prev) => ({ ...prev, [monthKey]: transactions }));
};
```

### **2. Debounce Month Changes**

```typescript
import { useMemo } from "react";
import { debounce } from "lodash";

const debouncedMonthChange = useMemo(
  () =>
    debounce((newMonth) => {
      loadMonthData(newMonth);
    }, 300),
  []
);
```

This integration guide will help you seamlessly transition to the new Smart Recurring Transaction System while maintaining all existing functionality and adding powerful new features!
