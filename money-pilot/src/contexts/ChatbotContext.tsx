import React, { createContext, useContext, useState, ReactNode } from 'react';

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
    throw new Error('useChatbot must be used within a ChatbotProvider');
  }
  return context;
};

interface ChatbotProviderProps {
  children: ReactNode;
}

export const ChatbotProvider: React.FC<ChatbotProviderProps> = ({ children }) => {
  const [isVisible, setIsVisible] = useState(true);

  const showChatbot = () => setIsVisible(true);
  const hideChatbot = () => setIsVisible(false);
  const toggleChatbot = () => setIsVisible(!isVisible);

  const value = {
    isVisible,
    showChatbot,
    hideChatbot,
    toggleChatbot,
  };

  return (
    <ChatbotContext.Provider value={value}>
      {children}
    </ChatbotContext.Provider>
  );
};
