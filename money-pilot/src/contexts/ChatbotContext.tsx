import React, { createContext, useContext, useState, ReactNode } from "react";

interface ChatbotContextType {
  isVisible: boolean;
  showChatbot: () => void;
  hideChatbot: () => void;
  toggleChatbot: () => void;
}

const ChatbotContext = createContext<ChatbotContextType | undefined>(undefined);

export const useChatbot = () => {
  const context = useContext(ChatbotContext);
  if (context === undefined) {
    throw new Error("useChatbot must be used within a ChatbotProvider");
  }
  return context;
};

interface ChatbotProviderProps {
  children: ReactNode;
}

export const ChatbotProvider: React.FC<ChatbotProviderProps> = ({
  children,
}) => {
  const [isVisible, setIsVisible] = useState<boolean>(true);

  const showChatbot = React.useCallback(() => {
    setIsVisible(true);
  }, []);

  const hideChatbot = React.useCallback(() => {
    setIsVisible(false);
  }, []);

  const toggleChatbot = React.useCallback(() => {
    setIsVisible((prev) => !prev);
  }, []);

  const value = React.useMemo(
    () => ({
      isVisible,
      showChatbot,
      hideChatbot,
      toggleChatbot,
    }),
    [isVisible, showChatbot, hideChatbot, toggleChatbot]
  );

  return (
    <ChatbotContext.Provider value={value}>{children}</ChatbotContext.Provider>
  );
};
