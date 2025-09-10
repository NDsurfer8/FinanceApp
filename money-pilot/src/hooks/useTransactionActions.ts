import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Transaction } from "../services/userData";
import {
  TransactionActionsService,
  TransactionActions,
} from "../services/TransactionActionsService";

export interface UseTransactionActionsProps {
  transaction: Transaction | null;
  originalRecurringData?: {
    amount: number;
    category: string;
    name: string;
  } | null;
  isEditMode: boolean;
}

export interface UseTransactionActionsReturn {
  actions: TransactionActions;
  isFutureMonth: boolean;
  monthKey: string | null;
  isModified: boolean;
  canShowDeleteButton: boolean;
  canShowStopFutureButton: boolean;
  canShowModificationIndicator: boolean;
  deleteButtonText: string;
  stopFutureButtonText: string;
}

export const useTransactionActions = ({
  transaction,
  originalRecurringData,
  isEditMode,
}: UseTransactionActionsProps): UseTransactionActionsReturn => {
  const { t } = useTranslation();

  const actions = useMemo(() => {
    if (!transaction) {
      return {
        canDelete: false,
        canStopFuture: false,
        canModify: false,
        availableActions: [],
        deleteButtonText: t("add_transaction.delete"),
        stopFutureButtonText: t("add_transaction.stop_future_recurring"),
      };
    }

    const baseActions = TransactionActionsService.getAvailableActions(
      transaction,
      originalRecurringData,
      isEditMode
    );

    // Override button texts with translations
    const isRecurring = Boolean(
      transaction.isRecurring || transaction.recurringTransactionId
    );
    const isFutureMonth = TransactionActionsService.isFutureMonth(
      transaction.date
    );

    let deleteButtonText = t("add_transaction.delete");
    if (isRecurring) {
      deleteButtonText = isFutureMonth
        ? t("add_transaction.delete_custom_amount")
        : t("add_transaction.delete_recurring_transaction");
    }

    return {
      ...baseActions,
      deleteButtonText,
      stopFutureButtonText: t("add_transaction.stop_future_recurring"),
    };
  }, [transaction, originalRecurringData, isEditMode, t]);

  const isFutureMonth = useMemo(() => {
    if (!transaction?.date) return false;
    return TransactionActionsService.isFutureMonth(transaction.date);
  }, [transaction?.date]);

  const monthKey = useMemo(() => {
    if (!transaction?.date) return null;
    return TransactionActionsService.generateMonthKey(transaction.date);
  }, [transaction?.date]);

  const isModified = useMemo(() => {
    if (!transaction || !originalRecurringData) return false;
    return TransactionActionsService.isTransactionModified(
      transaction,
      originalRecurringData
    );
  }, [transaction, originalRecurringData]);

  const canShowDeleteButton = useMemo(() => {
    return actions.canDelete;
  }, [actions.canDelete]);

  const canShowStopFutureButton = useMemo(() => {
    return actions.canStopFuture;
  }, [actions.canStopFuture]);

  const canShowModificationIndicator = useMemo(() => {
    return Boolean(
      isEditMode &&
        (transaction?.isRecurring || transaction?.recurringTransactionId) &&
        originalRecurringData
    );
  }, [
    isEditMode,
    transaction?.isRecurring,
    transaction?.recurringTransactionId,
    originalRecurringData,
  ]);

  return {
    actions,
    isFutureMonth,
    monthKey,
    isModified,
    canShowDeleteButton,
    canShowStopFutureButton,
    canShowModificationIndicator,
    deleteButtonText: actions.deleteButtonText,
    stopFutureButtonText: actions.stopFutureButtonText,
  };
};
