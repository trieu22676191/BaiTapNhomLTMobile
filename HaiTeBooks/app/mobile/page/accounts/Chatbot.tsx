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
import { useTheme } from "../../context/ThemeContext";
import { useChat } from "../../hooks/useChat";
import { ChatMessage } from "../../types/chat.types";

const Chatbot: React.FC = () => {
  const router = useRouter();
  const { colors } = useTheme();
  const flatListRef = useRef<FlatList>(null);
  const [inputText, setInputText] = useState("");
  const {
    messages,
    isLoading,
    sendMessage,
    clearChat,
    retryLastMessage,
  } = useChat();

  // Tự động scroll xuống khi có message mới
  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages]);

  const handleSend = async () => {
    const cleanMessage = inputText.trim();
    if (!cleanMessage || isLoading) return;

    setInputText("");
    await sendMessage(cleanMessage);
  };

  const renderMessage = ({ item }: { item: ChatMessage }) => {
    return (
      <View>
        <View
          style={[
            styles.messageContainer,
            item.isUser ? styles.userMessageContainer : styles.aiMessageContainer,
          ]}
        >
          {!item.isUser && (
            <View style={[styles.avatar, { backgroundColor: item.isError ? "#EF4444" : colors.primary }]}>
              <Ionicons 
                name={item.isError ? "alert-circle" : "chatbubbles"} 
                size={20} 
                color="#FFFFFF" 
              />
            </View>
          )}
          <View
            style={[
              styles.messageBubble,
              item.isUser
                ? [styles.userBubble, { backgroundColor: colors.primary }]
                : item.isError
                ? styles.errorBubble
                : styles.aiBubble,
            ]}
          >
            {item.isError && (
              <View style={styles.errorHeader}>
                <Ionicons name="alert-circle" size={16} color="#EF4444" />
                <Text style={styles.errorHeaderText}>Đã xảy ra lỗi</Text>
              </View>
            )}
            <Text
              style={[
                styles.messageText,
                item.isUser
                  ? styles.userMessageText
                  : item.isError
                  ? styles.errorMessageText
                  : styles.aiMessageText,
              ]}
            >
              {item.message}
            </Text>
            {item.isError && item.canRetry && (
              <TouchableOpacity
                style={styles.retryButton}
                onPress={retryLastMessage}
                activeOpacity={0.7}
              >
                <Ionicons name="refresh" size={16} color={colors.primary} />
                <Text style={styles.retryButtonText}>Thử lại</Text>
              </TouchableOpacity>
            )}
          </View>
          {item.isUser && (
            <View style={[styles.avatar, { backgroundColor: "#E5E7EB" }]}>
              <Ionicons name="person" size={20} color="#6B7280" />
            </View>
          )}
        </View>
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
        <TouchableOpacity
          onPress={clearChat}
          style={styles.clearButton}
        >
          <Ionicons name="trash-outline" size={20} color="#FFFFFF" />
        </TouchableOpacity>
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
        onLayout={() => {
          flatListRef.current?.scrollToEnd({ animated: false });
        }}
        removeClippedSubviews={false}
        ListFooterComponent={
          isLoading ? (
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
            editable={!isLoading}
            onSubmitEditing={handleSend}
          />
          <TouchableOpacity
            style={[
              styles.sendButton,
              { backgroundColor: colors.primary },
              (!inputText.trim() || isLoading) && styles.sendButtonDisabled,
            ]}
            onPress={handleSend}
            disabled={!inputText.trim() || isLoading}
            activeOpacity={0.7}
          >
            {isLoading ? (
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
  clearButton: {
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
  errorBubble: {
    backgroundColor: "#FEF2F2",
    borderBottomLeftRadius: 4,
    borderLeftWidth: 3,
    borderLeftColor: "#EF4444",
    borderWidth: 1,
    borderColor: "#FCA5A5",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  errorHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#FCA5A5",
  },
  errorHeaderText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#DC2626",
    marginLeft: 6,
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
  errorMessageText: {
    color: "#DC2626",
  },
  retryButton: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#FCA5A5",
  },
  retryButtonText: {
    fontSize: 13,
    color: "#C92127",
    marginLeft: 4,
    fontWeight: "600",
  },
  loadingContainer: {
    paddingVertical: 8,
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
