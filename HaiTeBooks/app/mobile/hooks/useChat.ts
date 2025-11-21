import { useState, useCallback, useEffect, useRef } from "react";
import { ChatMessage, ChatResponse } from "../types/chat.types";
import chatService from "../services/chatService";

interface UseChatReturn {
  messages: ChatMessage[];
  conversationId: string | null;
  isLoading: boolean;
  error: string | null;
  sendMessage: (message: string) => Promise<void>;
  clearChat: () => void;
  retryLastMessage: () => Promise<void>;
}

const INITIAL_MESSAGE: ChatMessage = {
  id: "1",
  message: "Xin chào! Tôi là trợ lý AI của HaiTeBooks. Tôi có thể giúp bạn tìm sách, trả lời câu hỏi về đơn hàng, và tư vấn sách phù hợp. Bạn cần hỗ trợ gì?",
  isUser: false,
  timestamp: new Date(),
};

export const useChat = (): UseChatReturn => {
  const [messages, setMessages] = useState<ChatMessage[]>([INITIAL_MESSAGE]);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const lastUserMessageRef = useRef<string>("");

  // Load conversationId từ AsyncStorage khi hook được khởi tạo
  useEffect(() => {
    const loadConversationId = async () => {
      try {
        const savedId = await chatService.getConversationId();
        if (savedId) {
          setConversationId(savedId);
        }
      } catch (error) {
        console.error("❌ Error loading conversationId:", error);
      }
    };
    loadConversationId();
  }, []);

  const sendMessage = useCallback(
    async (message: string) => {
      const cleanMessage = message.trim();
      if (!cleanMessage || isLoading) return;

      // Thêm message của user vào UI ngay lập tức
      const userMessage: ChatMessage = {
        id: `user-${Date.now()}-${Math.random()}`,
        message: cleanMessage,
        isUser: true,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, userMessage]);
      lastUserMessageRef.current = cleanMessage;
      setIsLoading(true);
      setError(null);

      try {
        // Gửi request với conversationId (nếu có)
        const response: ChatResponse = await chatService.sendMessage(
          cleanMessage,
          conversationId
        );

        // Lưu conversationId từ response (lần đầu hoặc giữ nguyên)
        if (response.conversationId) {
          setConversationId(response.conversationId);
        }

        // Thêm response của AI vào UI
        const aiMessage: ChatMessage = {
          id: `ai-${Date.now()}`,
          message: response.response,
          isUser: false,
          timestamp: new Date(),
        };

        setMessages((prev) => [...prev, aiMessage]);
      } catch (err: any) {
        const errorMessage =
          err instanceof Error ? err.message : "Xin lỗi, có lỗi xảy ra. Vui lòng thử lại sau.";

        setError(errorMessage);

        // Thêm message lỗi vào UI
        const errorMsg: ChatMessage = {
          id: `error-${Date.now()}`,
          message: errorMessage,
          isUser: false,
          timestamp: new Date(),
          isError: true,
          canRetry: true,
        };

        setMessages((prev) => [...prev, errorMsg]);
      } finally {
        setIsLoading(false);
      }
    },
    [conversationId, isLoading]
  );

  const retryLastMessage = useCallback(async () => {
    if (!lastUserMessageRef.current) return;

    // Xóa error message cũ
    setMessages((prev) => prev.filter((msg) => !msg.isError || !msg.canRetry));

    // Gửi lại message cuối cùng
    await sendMessage(lastUserMessageRef.current);
  }, [sendMessage]);

  const clearChat = useCallback(async () => {
    setMessages([INITIAL_MESSAGE]);
    setConversationId(null);
    setError(null);
    lastUserMessageRef.current = "";
    await chatService.clearConversationId();
  }, []);

  return {
    messages,
    conversationId,
    isLoading,
    error,
    sendMessage,
    clearChat,
    retryLastMessage,
  };
};

