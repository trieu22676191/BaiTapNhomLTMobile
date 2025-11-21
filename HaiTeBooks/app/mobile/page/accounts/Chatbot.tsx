import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import axiosInstance from "../../config/axiosConfig";
import { useTheme } from "../../context/ThemeContext";

interface Message {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: Date;
  suggestedBooks?: string[];
  sources?: string[];
}

interface ChatResponse {
  response: string;
  suggestedBooks: string[];
  sources: string[];
  conversationId: string;
}

const Chatbot: React.FC = () => {
  const router = useRouter();
  const { colors } = useTheme();
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      text: "Xin chào! Tôi là trợ lý AI của HaiTeBooks. Tôi có thể giúp bạn tìm sách, trả lời câu hỏi về đơn hàng, và tư vấn sách phù hợp. Bạn cần hỗ trợ gì?",
      isUser: false,
      timestamp: new Date(),
    },
  ]);
  const [inputText, setInputText] = useState("");
  const [loading, setLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    // Scroll to bottom when new message is added
    if (messages.length > 0) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages]);

  const handleSend = async () => {
    if (!inputText.trim() || loading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      text: inputText.trim(),
      isUser: true,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputText("");
    setLoading(true);

    try {
      const response = await axiosInstance.post<ChatResponse>("/ai/chat", {
        message: inputText.trim(),
        conversationId: conversationId || undefined,
      });

      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: response.data.response,
        isUser: false,
        timestamp: new Date(),
        suggestedBooks: response.data.suggestedBooks || [],
        sources: response.data.sources || [],
      };

      setMessages((prev) => [...prev, aiMessage]);
      setConversationId(response.data.conversationId);
    } catch (error: any) {
      console.error("❌ Error sending message:", error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: "Xin lỗi, tôi đang gặp sự cố kỹ thuật. Vui lòng thử lại sau.",
        isUser: false,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  const renderMessage = ({ item }: { item: Message }) => {
    return (
      <View>
        <View
          style={[
            styles.messageContainer,
            item.isUser ? styles.userMessageContainer : styles.aiMessageContainer,
          ]}
        >
          {!item.isUser && (
            <View style={[styles.avatar, { backgroundColor: colors.primary }]}>
              <Ionicons name="chatbubbles" size={20} color="#FFFFFF" />
            </View>
          )}
          <View
            style={[
              styles.messageBubble,
              item.isUser
                ? [styles.userBubble, { backgroundColor: colors.primary }]
                : styles.aiBubble,
            ]}
          >
            <Text
              style={[
                styles.messageText,
                item.isUser ? styles.userMessageText : styles.aiMessageText,
              ]}
            >
              {item.text}
            </Text>
          </View>
          {item.isUser && (
            <View style={[styles.avatar, { backgroundColor: "#E5E7EB" }]}>
              <Ionicons name="person" size={20} color="#6B7280" />
            </View>
          )}
        </View>
        {!item.isUser && item.suggestedBooks && item.suggestedBooks.length > 0 && (
          <View style={styles.suggestedBooksWrapper}>
            {renderSuggestedBooks(item.suggestedBooks)}
          </View>
        )}
      </View>
    );
  };

  const renderSuggestedBooks = (suggestedBooks: string[]) => {
    if (!suggestedBooks || suggestedBooks.length === 0) return null;

    return (
      <View style={styles.suggestedBooksContainer}>
        <Text style={styles.suggestedBooksTitle}>📚 Sách được đề xuất:</Text>
        {suggestedBooks.map((book, index) => (
          <TouchableOpacity
            key={index}
            style={styles.suggestedBookItem}
            activeOpacity={0.7}
            onPress={() => {
              // Navigate đến trang tìm kiếm với tên sách
              router.push({
                pathname: "/mobile/page/suggestions/Suggestion",
                params: { searchQuery: book },
              });
            }}
          >
            <Ionicons name="book" size={16} color={colors.primary} />
            <Text style={styles.suggestedBookText}>{book}</Text>
            <Ionicons name="chevron-forward" size={16} color="#9CA3AF" />
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
      edges={["top"]}
    >
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.primary }]}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitle}>Trợ lý AI</Text>
          <Text style={styles.headerSubtitle}>HaiTeBooks</Text>
        </View>
        <View style={styles.backButton} />
      </View>

      {/* Messages */}
      <FlatList
        ref={flatListRef}
        data={messages}
        renderItem={renderMessage}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.messagesContainer}
        onContentSizeChange={() => {
          flatListRef.current?.scrollToEnd({ animated: true });
        }}
        ListFooterComponent={
          loading ? (
            <View style={styles.loadingContainer}>
              <View style={styles.aiMessageContainer}>
                <View style={[styles.avatar, { backgroundColor: colors.primary }]}>
                  <Ionicons name="chatbubbles" size={20} color="#FFFFFF" />
                </View>
                <View style={styles.aiBubble}>
                  <ActivityIndicator size="small" color={colors.primary} />
                </View>
              </View>
            </View>
          ) : null
        }
      />

      {/* Input */}
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
      >
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            value={inputText}
            onChangeText={setInputText}
            placeholder="Nhập câu hỏi của bạn..."
            placeholderTextColor="#9CA3AF"
            multiline
            maxLength={500}
            editable={!loading}
          />
          <TouchableOpacity
            style={[
              styles.sendButton,
              { backgroundColor: colors.primary },
              (!inputText.trim() || loading) && styles.sendButtonDisabled,
            ]}
            onPress={handleSend}
            disabled={!inputText.trim() || loading}
            activeOpacity={0.7}
          >
            {loading ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Ionicons name="send" size={20} color="#FFFFFF" />
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F9FAFB",
  },
  header: {
    backgroundColor: "#C92127",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    paddingHorizontal: 16,
    minHeight: 56,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitleContainer: {
    flex: 1,
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  headerSubtitle: {
    fontSize: 12,
    color: "#FFFFFF",
    opacity: 0.9,
    marginTop: 2,
  },
  messagesContainer: {
    padding: 16,
    paddingBottom: 8,
  },
  messageContainer: {
    flexDirection: "row",
    marginBottom: 16,
    alignItems: "flex-end",
  },
  userMessageContainer: {
    justifyContent: "flex-end",
  },
  aiMessageContainer: {
    justifyContent: "flex-start",
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    marginHorizontal: 8,
  },
  messageBubble: {
    maxWidth: "75%",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 18,
  },
  userBubble: {
    backgroundColor: "#C92127",
    borderBottomRightRadius: 4,
  },
  aiBubble: {
    backgroundColor: "#FFFFFF",
    borderBottomLeftRadius: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  messageText: {
    fontSize: 15,
    lineHeight: 20,
  },
  userMessageText: {
    color: "#FFFFFF",
  },
  aiMessageText: {
    color: "#111827",
  },
  loadingContainer: {
    paddingVertical: 8,
  },
  suggestedBooksWrapper: {
    marginLeft: 48,
    marginTop: 8,
  },
  suggestedBooksContainer: {
    padding: 12,
    backgroundColor: "#F3F4F6",
    borderRadius: 12,
    borderLeftWidth: 3,
    borderLeftColor: "#C92127",
  },
  suggestedBooksTitle: {
    fontSize: 13,
    fontWeight: "600",
    color: "#6B7280",
    marginBottom: 8,
  },
  suggestedBookItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    paddingHorizontal: 8,
    marginBottom: 4,
    backgroundColor: "#FFFFFF",
    borderRadius: 8,
  },
  suggestedBookText: {
    flex: 1,
    fontSize: 14,
    color: "#111827",
    marginLeft: 8,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "flex-end",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#FFFFFF",
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
  },
  input: {
    flex: 1,
    maxHeight: 100,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#F3F4F6",
    borderRadius: 24,
    fontSize: 15,
    color: "#111827",
    marginRight: 8,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#C92127",
    alignItems: "center",
    justifyContent: "center",
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
});

export default Chatbot;

