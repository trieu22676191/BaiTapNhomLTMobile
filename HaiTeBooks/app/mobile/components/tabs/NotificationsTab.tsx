import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

interface NotificationsTabProps {
  isActive?: boolean;
  unreadCount?: number;
}

const NotificationsTab: React.FC<NotificationsTabProps> = ({ 
  isActive = false,
  unreadCount = 0 
}) => {
  const iconColor = isActive ? '#C92127' : '#999';
  const textColor = isActive ? '#C92127' : '#999';

  return (
    <View style={styles.container}>
      <View style={styles.iconContainer}>
        <Ionicons 
          name={isActive ? "notifications" : "notifications-outline"} 
          size={25} 
          color={iconColor} 
        />
        {unreadCount > 0 && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>
              {unreadCount > 99 ? '99+' : unreadCount}
            </Text>
          </View>
        )}
      </View>
      <Text style={[styles.text, { color: textColor }]}>Thông báo</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  iconContainer: {
    marginBottom: 0,
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -8,
    backgroundColor: '#EF4444',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    paddingHorizontal: 6,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
  },
  text: {
    fontSize: 12,
    fontWeight: '500',
  },
});

export default NotificationsTab;
