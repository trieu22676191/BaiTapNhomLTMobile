import AsyncStorage from "@react-native-async-storage/async-storage";
import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";
import { useColorScheme } from "react-native";

export type Theme = "light" | "dark";

interface ThemeContextType {
  theme: Theme;
  isDark: boolean;
  toggleTheme: () => void;
  setTheme: (theme: Theme) => void;
  colors: {
    background: string;
    surface: string;
    text: string;
    textSecondary: string;
    border: string;
    primary: string;
    error: string;
    success: string;
    warning: string;
  };
}

const lightColors = {
  background: "#FFFFFF",
  surface: "#FFFFFF",
  text: "#111827",
  textSecondary: "#6B7280",
  border: "#E5E7EB",
  primary: "#C92127",
  error: "#EF4444",
  success: "#10B981",
  warning: "#F59E0B",
};

const darkColors = {
  background: "#111827",
  surface: "#1F2937",
  text: "#F9FAFB",
  textSecondary: "#9CA3AF",
  border: "#374151",
  primary: "#C92127",
  error: "#EF4444",
  success: "#10B981",
  warning: "#F59E0B",
};

const ThemeContext = createContext<ThemeContextType>({
  theme: "light",
  isDark: false,
  toggleTheme: () => {},
  setTheme: () => {},
  colors: lightColors,
});

export const ThemeProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const systemColorScheme = useColorScheme();
  const [theme, setThemeState] = useState<Theme>("light");
  const [isInitialized, setIsInitialized] = useState(false);

  // Load saved theme from AsyncStorage
  useEffect(() => {
    const loadTheme = async () => {
      try {
        const savedTheme = await AsyncStorage.getItem("app_theme");
        if (savedTheme === "light" || savedTheme === "dark") {
          setThemeState(savedTheme);
        } else if (systemColorScheme) {
          // Use system theme if no saved theme
          setThemeState(systemColorScheme);
        }
      } catch (error) {
        console.error("Error loading theme:", error);
      } finally {
        setIsInitialized(true);
      }
    };
    loadTheme();
  }, [systemColorScheme]);

  // Save theme to AsyncStorage
  const setTheme = async (newTheme: Theme) => {
    try {
      await AsyncStorage.setItem("app_theme", newTheme);
      setThemeState(newTheme);
    } catch (error) {
      console.error("Error saving theme:", error);
    }
  };

  const toggleTheme = () => {
    const newTheme = theme === "light" ? "dark" : "light";
    setTheme(newTheme);
  };

  const isDark = theme === "dark";
  const colors = isDark ? darkColors : lightColors;

  // Don't render children until theme is loaded
  if (!isInitialized) {
    return null;
  }

  return (
    <ThemeContext.Provider
      value={{
        theme,
        isDark,
        toggleTheme,
        setTheme,
        colors,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within ThemeProvider");
  }
  return context;
};

