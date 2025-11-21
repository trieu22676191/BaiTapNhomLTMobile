export interface ChatRequest {
  message: string;
  conversationId?: string | null;
}

export interface ChatResponse {
  response: string;
  conversationId: string;
}

export interface ChatMessage {
  id: string;
  message: string;
  isUser: boolean;
  timestamp: Date;
  isError?: boolean;
  canRetry?: boolean;
}

