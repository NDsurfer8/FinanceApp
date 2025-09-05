import React, { createContext, useContext, useState, ReactNode } from "react";

interface SelectedMonthContextType {
  selectedMonth: Date;
  setSelectedMonth: (month: Date) => void;
}

const SelectedMonthContext = createContext<
  SelectedMonthContextType | undefined
>(undefined);

export const useSelectedMonth = () => {
  const context = useContext(SelectedMonthContext);
  if (!context) {
    throw new Error(
      "useSelectedMonth must be used within a SelectedMonthProvider"
    );
  }
  return context;
};

interface SelectedMonthProviderProps {
  children: ReactNode;
}

export const SelectedMonthProvider: React.FC<SelectedMonthProviderProps> = ({
  children,
}) => {
  const [selectedMonth, setSelectedMonth] = useState(new Date());

  return (
    <SelectedMonthContext.Provider value={{ selectedMonth, setSelectedMonth }}>
      {children}
    </SelectedMonthContext.Provider>
  );
};
