import React, { useState } from "react";
import { RefreshControl, ScrollView, StyleSheet, View } from "react-native";
import BannerSale from "../../components/home/BannerSale";
import ProductCard from "../../components/home/ProductCard";

const Home: React.FC = () => {
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [refreshTrigger, setRefreshTrigger] = useState<number>(0);

  // ⭐ Pull-to-Refresh handler
  const onRefresh = () => {
    setRefreshing(true);
    setRefreshTrigger((prev) => prev + 1);

    // Giữ refreshing trong 1 giây để UX mượt hơn
    setTimeout(() => {
      setRefreshing(false);
    }, 1000);
  };

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          colors={["#C92127"]} // Android
          tintColor="#C92127" // iOS
          title="Đang làm mới..." // iOS
          titleColor="#666"
        />
      }
    >
      <BannerSale />
      <View style={styles.section}>
        <ProductCard refreshTrigger={refreshTrigger} />
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  section: { paddingTop: 8, paddingBottom: 12, backgroundColor: "#fff" },
});
export default Home;
