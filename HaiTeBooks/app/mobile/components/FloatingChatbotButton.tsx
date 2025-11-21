import { Ionicons } from "@expo/vector-icons";
import { usePathname, useRouter } from "expo-router";
import React from "react";
import { StyleSheet, TouchableOpacity } from "react-native";
import { useTheme } from "../context/ThemeContext";

const FloatingChatbotButton: React.FC = () => {
  const router = useRouter();
  const pathname = usePathname();
  const { colors } = useTheme();

  // Ẩn nút khi đang ở trang Chatbot
  if (pathname?.includes("/Chatbot")) {
    return null;
  }

  const handlePress = () => {
    router.push("/mobile/page/accounts/Chatbot");
  };

  return (
    <TouchableOpacity
      style={[styles.button, { backgroundColor: colors.primary }]}
      onPress={handlePress}
      activeOpacity={0.8}
    >
      <Ionicons name="chatbubbles" size={24} color="#FFFFFF" />
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    position: "absolute",
    bottom: 90, // Phía trên BotTabs (BotTabs cao khoảng 60-70px + safe area)
    right: 16,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#C92127",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 4.65,
    elevation: 8,
    zIndex: 999,
  },
});

export default FloatingChatbotButton;

