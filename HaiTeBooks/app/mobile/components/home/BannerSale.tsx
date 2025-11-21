import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  Dimensions,
  FlatList,
  Image,
  NativeScrollEvent,
  NativeSyntheticEvent,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";

interface BannerImage {
  id: string | number;
  imageUrl: string;
  // Có thể thêm các field khác như: link, title, description, etc.
}

interface BannerSaleProps {
  images?: BannerImage[]; // Danh sách ảnh, nếu không có thì hiển thị placeholder
  autoPlayInterval?: number; // Thời gian tự động chuyển (ms), mặc định 3000ms
  height?: number; // Chiều cao banner, mặc định 200
}

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const BANNER_PADDING = 16; // Padding xung quanh banner
const BANNER_WIDTH = SCREEN_WIDTH - BANNER_PADDING * 2; // Width thực tế của banner

const BannerSale: React.FC<BannerSaleProps> = ({
  images = [],
  autoPlayInterval = 3000,
  height = 200,
}) => {
  const router = useRouter();
  const [currentIndex, setCurrentIndex] = useState(0);
  const flatListRef = useRef<FlatList>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Tạo placeholder images nếu chưa có ảnh
  const displayImages =
    images.length > 0
      ? images
      : [
          {
            id: 1,
            imageUrl:
              "https://res.cloudinary.com/dnxgjpunr/image/upload/v1761925042/km4_eitkkc.jpg",
          },
          {
            id: 2,
            imageUrl:
              "https://res.cloudinary.com/dnxgjpunr/image/upload/v1761925042/km5_wsrvpg.png",
          },
          {
            id: 3,
            imageUrl:
              "https://res.cloudinary.com/dnxgjpunr/image/upload/v1761925042/km1_ayu08r.jpg",
          },
          {
            id: 4,
            imageUrl:
              "https://res.cloudinary.com/dnxgjpunr/image/upload/v1761925041/km3_oyptwl.jpg",
          },
          {
            id: 5,
            imageUrl:
              "https://res.cloudinary.com/dnxgjpunr/image/upload/v1761925041/km2_u1utdn.jpg",
          },
        ];

  // Auto-play: tự động chuyển slide
  useEffect(() => {
    if (displayImages.length <= 1) return;

    const startAutoPlay = () => {
      intervalRef.current = setInterval(() => {
        setCurrentIndex((prev) => {
          const next = (prev + 1) % displayImages.length;
          flatListRef.current?.scrollToIndex({
            index: next,
            animated: true,
          });
          return next;
        });
      }, autoPlayInterval);
    };

    startAutoPlay();

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [displayImages.length, autoPlayInterval]);

  // Xử lý khi user scroll manually
  const onScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const scrollPosition = event.nativeEvent.contentOffset.x;
    const index = Math.round(
      scrollPosition / (BANNER_WIDTH + BANNER_PADDING * 2)
    );
    if (index !== currentIndex) {
      setCurrentIndex(index);
      // Reset auto-play timer khi user scroll manually
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      intervalRef.current = setInterval(() => {
        setCurrentIndex((prev) => {
          const next = (prev + 1) % displayImages.length;
          flatListRef.current?.scrollToIndex({
            index: next,
            animated: true,
          });
          return next;
        });
      }, autoPlayInterval);
    }
  };

  // Render mỗi banner item
  const renderBannerItem = ({ item }: { item: BannerImage }) => {
    // Nếu không có imageUrl, hiển thị placeholder
    if (!item.imageUrl || item.imageUrl.trim() === "") {
      return (
        <View style={styles.bannerItemContainer}>
          <TouchableOpacity
            style={[styles.bannerItem, { height }]}
            activeOpacity={0.9}
            onPress={() => router.push("/mobile/page/accounts/Voucher")}
          >
            <View style={styles.placeholder}>
              <Ionicons name="image-outline" size={48} color="#C92127" />
            </View>
          </TouchableOpacity>
        </View>
      );
    }

    return (
      <View style={styles.bannerItemContainer}>
        <TouchableOpacity
          style={[styles.bannerItem, { height }]}
          activeOpacity={0.9}
          onPress={() => router.push("/mobile/page/accounts/Voucher")}
        >
          <Image
            source={{ uri: item.imageUrl }}
            style={[styles.bannerImage, { height }]}
            resizeMode="cover"
            onError={() => {
              console.log("Banner image load error:", item.imageUrl);
            }}
          />
        </TouchableOpacity>
      </View>
    );
  };

  // Render pagination dots
  const renderPagination = () => {
    if (displayImages.length <= 1) return null;

    return (
      <View style={styles.pagination}>
        {displayImages.map((_, index) => (
          <View
            key={index}
            style={[styles.dot, index === currentIndex && styles.dotActive]}
          />
        ))}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <FlatList
        ref={flatListRef}
        data={displayImages}
        renderItem={renderBannerItem}
        keyExtractor={(item) => item.id.toString()}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={onScroll}
        scrollEventThrottle={16}
        getItemLayout={(_, index) => ({
          length: BANNER_WIDTH + BANNER_PADDING * 2,
          offset: (BANNER_WIDTH + BANNER_PADDING * 2) * index,
          index,
        })}
        onScrollToIndexFailed={(info) => {
          // Fallback nếu scrollToIndex fail
          setTimeout(() => {
            if (flatListRef.current) {
              flatListRef.current.scrollToIndex({
                index: info.index,
                animated: true,
              });
            }
          }, 100);
        }}
      />
      {renderPagination()}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: "relative",
    backgroundColor: "#FFFFFF",
    paddingVertical: 8,
  },
  bannerItemContainer: {
    width: SCREEN_WIDTH,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: BANNER_PADDING,
  },
  bannerItem: {
    width: BANNER_WIDTH,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 12,
    overflow: "hidden",
  },
  bannerImage: {
    width: BANNER_WIDTH,
    height: "100%",
    borderRadius: 12,
  },
  placeholder: {
    width: BANNER_WIDTH,
    height: "100%",
    backgroundColor: "#F3F4F6",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderStyle: "dashed",
    borderRadius: 12,
  },
  pagination: {
    position: "absolute",
    bottom: 12,
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "rgba(255, 255, 255, 0.5)",
  },
  dotActive: {
    width: 24,
    backgroundColor: "#C92127",
  },
});

export default BannerSale;
