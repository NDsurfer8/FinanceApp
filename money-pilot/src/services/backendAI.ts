import { getFunctions, httpsCallable } from "firebase/functions";
import { app } from "./firebase";

const functions = getFunctions(app);

// AI Chat function
export const backendAIChat = httpsCallable(functions, "aiChat");

// AI Feedback function
export const backendAIFeedback = httpsCallable(functions, "aiFeedback");

// Interface for AI response
export interface AIResponse {
  response: string;
  tokensUsed: number;
  cost: number;
  isPlanRequest: boolean;
}

// Interface for AI feedback
export interface AIFeedback {
  messageId: string;
  feedback: "like" | "dislike";
  preferences?: any;
}

// Main function to call backend AI
export const callBackendAI = async (
  message: string,
  financialData?: any,
  userPreferences?: any,
  conversationHistory?: Array<{ role: string; content: string }>
): Promise<AIResponse> => {
  try {
    console.log("Calling backend AI with:", {
      messageLength: message.length,
      hasFinancialData: !!financialData,
      userPreferences,
      conversationHistoryLength: conversationHistory?.length || 0,
    });

    const result = await backendAIChat({
      message,
      financialData,
      userPreferences,
      conversationHistory,
    });

    const data = result.data as AIResponse;

    console.log("Backend AI response:", {
      responseLength: data.response.length,
      tokensUsed: data.tokensUsed,
      cost: data.cost,
      isPlanRequest: data.isPlanRequest,
    });

    return data;
  } catch (error) {
    console.error("Backend AI call failed:", error);
    throw error;
  }
};

// Function to send feedback to backend
export const sendBackendAIFeedback = async (
  messageId: string,
  feedback: "like" | "dislike",
  preferences?: any
): Promise<void> => {
  try {
    console.log("Sending feedback to backend:", {
      messageId,
      feedback,
      preferences,
    });

    await backendAIFeedback({
      messageId,
      feedback,
      preferences,
    });

    console.log("Feedback sent successfully");
  } catch (error) {
    console.error("Failed to send feedback to backend:", error);
    throw error;
  }
};
