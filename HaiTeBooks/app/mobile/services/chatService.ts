import AsyncStorage from "@react-native-async-storage/async-storage";
import { ChatRequest, ChatResponse } from "../types/chat.types";
import axiosInstance from "../config/axiosConfig";

const CONVERSATION_ID_KEY = "chatbot_conversation_id";

class ChatService {
  /**
   * Lưu conversationId vào AsyncStorage
   */
  async saveConversationId(conversationId: string): Promise<void> {
    try {
      await AsyncStorage.setItem(CONVERSATION_ID_KEY, conversationId);
    } catch (error) {
      console.error("❌ Error saving conversationId:", error);
    }
  }

  /**
   * Lấy conversationId từ AsyncStorage
   */
  async getConversationId(): Promise<string | null> {
    try {
      return await AsyncStorage.getItem(CONVERSATION_ID_KEY);
    } catch (error) {
      console.error("❌ Error getting conversationId:", error);
      return null;
    }
  }

  /**
   * Xóa conversationId khỏi AsyncStorage
   */
  async clearConversationId(): Promise<void> {
    try {
      await AsyncStorage.removeItem(CONVERSATION_ID_KEY);
    } catch (error) {
      console.error("❌ Error clearing conversationId:", error);
    }
  }

  /**
   * Gửi tin nhắn đến AI chat API
   */
  async sendMessage(
    message: string,
    conversationId?: string | null
  ): Promise<ChatResponse> {
    try {
      // Tạo request body
      const requestBody: ChatRequest = {
        message: message.trim(),
      };

      // Chỉ thêm conversationId nếu có giá trị hợp lệ
      if (conversationId && typeof conversationId === "string" && conversationId.trim() !== "") {
        requestBody.conversationId = conversationId.trim();
      }

      console.log("📤 Sending chat request:", JSON.stringify(requestBody, null, 2));
      console.log("📤 Endpoint: /ai/chat");

      const response = await axiosInstance.post<ChatResponse>(
        "/ai/chat",
        requestBody,
        {
          timeout: 0, // Không giới hạn thời gian chờ
        }
      );

      console.log("✅ Chat response received:", {
        hasResponse: !!response.data.response,
        responseLength: response.data.response?.length || 0,
        conversationId: response.data.conversationId,
      });

      // Lưu conversationId nếu có
      if (response.data.conversationId) {
        await this.saveConversationId(response.data.conversationId);
      }

      return response.data;
    } catch (error: any) {
      // Chỉ log error, không hiển thị overlay
      // Error sẽ được hiển thị như message trong chat
      console.error("❌ Error sending message:", error);

      // Nếu là lỗi từ backend (có response), throw với thông tin chi tiết
      if (error?.response) {
        const status = error.response.status;
        const errorData = error.response.data;

        // Nếu backend trả về error response với message
        if (errorData?.response) {
          throw new Error(errorData.response);
        }

        // Xử lý các loại lỗi khác
        if (status === 400) {
          throw new Error("Câu hỏi không hợp lệ. Vui lòng thử lại với câu hỏi khác.");
        } else if (status === 401 || status === 403) {
          throw new Error("Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.");
        } else if (status >= 500) {
          throw new Error("Máy chủ đang gặp sự cố. Vui lòng thử lại sau.");
        } else {
          throw new Error(errorData?.message || `Lỗi ${status}: ${errorData?.error || "Unknown error"}`);
        }
      }

      // Xử lý lỗi network
      if (!error?.response) {
        throw new Error("Không thể kết nối đến máy chủ. Vui lòng kiểm tra kết nối mạng.");
      }

      throw error;
    }
  }
}

export default new ChatService();

