import { useRouter } from 'expo-router';
import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export interface CategoryTabsProps {
  categories: string[];
  active: string;
  onChange?: (category: string) => void;
  navigateOnClick?: boolean; // New prop to enable navigation
}

const CategoryTabs: React.FC<CategoryTabsProps> = ({ 
  categories, 
  active, 
  onChange,
  navigateOnClick = false 
}) => {
  const router = useRouter();

  const handlePress = (category: string) => {
    onChange?.(category);
    if (navigateOnClick) {
      router.push({
        pathname: "/mobile/page/homes/CategoryBooks",
        params: { category },
      });
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
        {categories.map((cat) => {
          const isActive = cat === active;
          return (
            <TouchableOpacity
              key={cat}
              onPress={() => handlePress(cat)}
              style={[styles.tab, isActive && styles.tabActive]}
              activeOpacity={0.7}
            >
              <Text style={[styles.tabText, isActive && styles.tabTextActive]}>{cat}</Text>
              {isActive ? <View style={styles.underline} /> : null}
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    paddingVertical: 8,
  },
  row: {
    paddingHorizontal: 12,
    gap: 16,
  },
  tab: {
    paddingVertical: 6,
  },
  tabActive: {},
  tabText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#4B5563',
  },
  tabTextActive: {
    color: '#C92127',
    fontWeight: '800',
  },
  underline: {
    height: 3,
    backgroundColor: '#C92127',
    borderRadius: 2,
    marginTop: 6,
  },
});

export default CategoryTabs;


