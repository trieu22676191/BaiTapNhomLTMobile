import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React from "react";
import {
  Linking,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTheme } from "../../context/ThemeContext";

const HelpCenter: React.FC = () => {
  const router = useRouter();
  const { colors } = useTheme();

  const helpTopics = [
    "Giới thiệu HAITE",
    "Điều khoản sử dụng",
    "Chính sách bảo mật",
    "Chính sách đổi - trả - hoàn tiền",
    "Phương thức vận chuyển",
    "Phương thức thanh toán",
    "Chính sách khách sỉ",
    "Điều khoản HAITE",
  ];

  const handleTopicPress = (topic: string) => {
    // Có thể mở modal hoặc navigate đến trang chi tiết
    console.log("Topic pressed:", topic);
  };

  const handlePhonePress = () => {
    Linking.openURL("tel:1900636467");
  };

  const handleEmailPress = () => {
    Linking.openURL("mailto:cskh@haite.com.vn");
  };

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.primary }]}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Trung tâm trợ giúp</Text>
        <View style={styles.backButton} />
      </View>

      {/* Content */}
      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.contentContainer}
      >
        {/* Help Topics */}
        <View style={styles.section}>
          {helpTopics.map((topic, index) => (
            <TouchableOpacity
              key={index}
              style={styles.topicItem}
              activeOpacity={0.7}
              onPress={() => handleTopicPress(topic)}
            >
              <Text style={styles.topicText}>{topic}</Text>
              {index < helpTopics.length - 1 && (
                <View style={styles.separator} />
              )}
            </TouchableOpacity>
          ))}
        </View>

        {/* Contact Section */}
        <View style={styles.contactSection}>
          <Text style={styles.contactTitle}>Liên hệ</Text>

          <TouchableOpacity
            style={styles.contactItem}
            activeOpacity={0.7}
            onPress={handlePhonePress}
          >
            <View style={[styles.contactIcon, { backgroundColor: "#10B981" }]}>
              <Ionicons name="call" size={20} color="#FFFFFF" />
            </View>
            <Text style={styles.contactText}>Hotline: 1900 63 64 67</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.contactItem}
            activeOpacity={0.7}
            onPress={handleEmailPress}
          >
            <View style={[styles.contactIcon, { backgroundColor: "#F97316" }]}>
              <Ionicons name="mail" size={20} color="#FFFFFF" />
            </View>
            <Text style={styles.contactText}>Email: cskh@haite.com.vn</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
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
  headerTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingBottom: 32,
  },
  section: {
    backgroundColor: "#FFFFFF",
  },
  topicItem: {
    paddingVertical: 16,
    paddingHorizontal: 16,
    position: "relative",
  },
  topicText: {
    fontSize: 14,
    color: "#111827",
  },
  separator: {
    position: "absolute",
    bottom: 0,
    left: 16,
    right: 16,
    height: 1,
    backgroundColor: "#E5E7EB",
  },
  contactSection: {
    backgroundColor: "#FFFFFF",
    marginTop: 24,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  contactTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 16,
  },
  contactItem: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  contactIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  contactText: {
    fontSize: 14,
    color: "#111827",
  },
});

export default HelpCenter;

