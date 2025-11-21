import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { useEffect, useState } from "react";
import {
  Alert,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "../../context/ThemeContext";
import { User } from "../../types/user";
import ChangePassword from "./ChangePassword";
import DeactivateAccount from "./DeactivateAccount";

interface AppSettingsProps {
  user: User;
  onBack?: () => void;
  onAccountDeleted?: () => void;
}

type Language = "vi" | "en";

const AppSettings: React.FC<AppSettingsProps> = ({
  user,
  onBack,
  onAccountDeleted,
}) => {
  const insets = useSafeAreaInsets();
  const { theme, isDark, toggleTheme, setTheme: setThemeContext } = useTheme();
  const [language, setLanguage] = useState<Language>("vi");

  // Debug: Log when component mounts
  useEffect(() => {
    console.log(
      "AppSettings component mounted, user:",
      user?.id,
      user?.username
    );
    if (!user) {
      console.error("AppSettings: user is null or undefined!");
    }
  }, [user]);

  // Load saved language
  useEffect(() => {
    const loadLanguage = async () => {
      try {
        const savedLanguage = await AsyncStorage.getItem("app_language");
        if (savedLanguage === "vi" || savedLanguage === "en") {
          setLanguage(savedLanguage);
        }
      } catch (error) {
        console.error("Error loading language:", error);
      }
    };
    loadLanguage();
  }, []);

  // Save language
  const handleLanguageChange = async (newLang: Language) => {
    try {
      await AsyncStorage.setItem("app_language", newLang);
      setLanguage(newLang);
      Alert.alert("Thành công", "Ngôn ngữ đã được thay đổi");
    } catch (error) {
      console.error("Error saving language:", error);
      Alert.alert("Lỗi", "Không thể lưu cài đặt ngôn ngữ");
    }
  };

  // Handle theme change
  const handleThemeChange = (value: boolean) => {
    const newTheme = value ? "dark" : "light";
    setThemeContext(newTheme);
  };

  const { colors } = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View
        style={[
          styles.header,
          { paddingTop: insets.top, backgroundColor: colors.primary },
        ]}
      >
        <TouchableOpacity
          style={styles.backButton}
          onPress={onBack}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Cài đặt ứng dụng</Text>
        <View style={styles.backButtonPlaceholder} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Language Setting */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Ngôn ngữ</Text>
          <View style={styles.languageContainer}>
            <TouchableOpacity
              style={[
                styles.languageButton,
                { borderColor: colors.border, backgroundColor: colors.surface },
                language === "vi" && [
                  styles.languageButtonActive,
                  {
                    backgroundColor: colors.primary,
                    borderColor: colors.primary,
                  },
                ],
              ]}
              onPress={() => handleLanguageChange("vi")}
            >
              <Text
                style={[
                  styles.languageText,
                  { color: colors.textSecondary },
                  language === "vi" && [
                    styles.languageTextActive,
                    { color: "#FFFFFF" },
                  ],
                ]}
              >
                Tiếng Việt
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.languageButton,
                { borderColor: colors.border, backgroundColor: colors.surface },
                language === "en" && [
                  styles.languageButtonActive,
                  {
                    backgroundColor: colors.primary,
                    borderColor: colors.primary,
                  },
                ],
              ]}
              onPress={() => handleLanguageChange("en")}
            >
              <Text
                style={[
                  styles.languageText,
                  { color: colors.textSecondary },
                  language === "en" && [
                    styles.languageTextActive,
                    { color: "#FFFFFF" },
                  ],
                ]}
              >
                English
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Theme Setting */}
        <View
          style={[
            styles.section,
            { backgroundColor: colors.surface, borderColor: colors.border },
          ]}
        >
          <View style={styles.settingRow}>
            <View style={styles.settingLeft}>
              <Text style={[styles.settingLabel, { color: colors.text }]}>
                Chế độ xem
              </Text>
              <Text
                style={[
                  styles.settingDescription,
                  { color: colors.textSecondary },
                ]}
              >
                {isDark ? "Tối" : "Sáng"}
              </Text>
            </View>
            <Switch
              value={isDark}
              onValueChange={handleThemeChange}
              trackColor={{ false: "#D1D5DB", true: "#C92127" }}
              thumbColor="#FFFFFF"
            />
          </View>
        </View>

        {/* Change Password */}
        <ChangePassword />

        {/* Deactivate Account */}
        <DeactivateAccount
          user={user}
          onAccountDeactivated={onAccountDeleted}
        />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#C92127",
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
  backButtonPlaceholder: {
    width: 40,
  },
  headerTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: "800",
    color: "#FFFFFF",
    textAlign: "center",
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  section: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 12,
  },
  languageContainer: {
    flexDirection: "row",
    gap: 12,
  },
  languageButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    backgroundColor: "#FFFFFF",
    alignItems: "center",
  },
  languageButtonActive: {
    backgroundColor: "#C92127",
    borderColor: "#C92127",
  },
  languageText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#6B7280",
  },
  languageTextActive: {
    color: "#FFFFFF",
  },
  settingRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  settingLeft: {
    flex: 1,
  },
  settingLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111827",
    marginBottom: 4,
  },
  settingDescription: {
    fontSize: 14,
    color: "#6B7280",
  },
});

export default AppSettings;
