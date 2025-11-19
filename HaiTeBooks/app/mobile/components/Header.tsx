import { useRouter } from "expo-router";
import React, { useState } from "react";
import { Dimensions, Image, Platform, StyleSheet, View } from "react-native";

import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";

import MenuButton from "./headerbutton/MenuButton";
import ScanButton from "./headerbutton/ScanButton";
import Search from "./headerbutton/Search";

interface HeaderProps {}

const { width: SCREEN_W } = Dimensions.get("window");

const Header: React.FC<HeaderProps> = () => {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [searchText, setSearchText] = useState("");

  const ROW_HEIGHT = 44;
  const LOGO_HEIGHT = 26;

  const logoTop = (insets.top ?? 0) + (ROW_HEIGHT - LOGO_HEIGHT) / 2;

  const handleSelectCategory = (category: string) => {
    console.log("Selected category:", category);
    // Có thể thêm logic filter books theo category ở đây
  };

  const handleSearchSubmit = () => {
    if (searchText.trim()) {
      // Navigate to CategoryBooks với search query
      router.push({
        pathname: "/mobile/page/homes/CategoryBooks",
        params: {
          category: "Tất cả",
          search: searchText.trim(),
        },
      });
      // Reset search text sau khi submit
      setSearchText("");
    }
  };

  return (
    <SafeAreaView style={[styles.container, { paddingTop: insets.top || 0 }]}>
      <View style={[styles.logoWrapper, { top: logoTop }]}>
        <Image
          source={require("../../../assets/images/logo2T.png")}
          style={styles.logo}
        />
      </View>

      <View style={[styles.actionRow, { height: ROW_HEIGHT }]}>
        <MenuButton onSelectCategory={handleSelectCategory} />
        <Search
          value={searchText}
          onChangeText={setSearchText}
          onSubmit={handleSearchSubmit}
          placeholder="Tìm kiếm sách, tác giả, thể loại..."
        />
        <ScanButton onPress={() => console.log("Scan pressed from Header")} />
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    position: "relative",
    backgroundColor: "#C92127",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 0.5 },
        shadowOpacity: 0.04,
        shadowRadius: 0.5,
      },
      android: {
        elevation: 1,
      },
    }),
  },

  logoWrapper: {
    position: "absolute",
    left: 0,
    right: 0,
    alignItems: "center",
    zIndex: 2,
  },

  actionRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
  },

  leftSpacing: {
    width: 36 + 8,
  },

  logo: {
    width: Math.min(120, SCREEN_W * 0.4),
    height: 26,
    resizeMode: "contain",
  },

  iconContainer: {
    width: 34,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 6,
  },
});

export default Header;
