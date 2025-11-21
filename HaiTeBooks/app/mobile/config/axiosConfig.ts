import axios from 'axios';
import { Alert } from 'react-native';

let authToken: string | null = null;
let isLoggingOut = false; // Flag để tránh logout nhiều lần
let navigationCallback: ((path: string) => void) | null = null;

// Set navigation callback từ _layout.tsx
export const setNavigationCallback = (callback: (path: string) => void) => {
  navigationCallback = callback;
};

const axiosInstance = axios.create({
  baseURL: 'https://haitebooks-backend.onrender.com/api',
  // baseURL: 'http://192.168.100.156:8080/api',
  timeout: 30000, // Tăng timeout lên 30 giây cho AI chat
  headers: { 
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
});

export const setAuthToken = (token?: string) => {
  authToken = token || null;
  if (authToken) {
    // Spring Security yêu cầu format "Bearer {token}"
    axiosInstance.defaults.headers.Authorization = `Bearer ${authToken}`;
  } else {
    delete axiosInstance.defaults.headers.Authorization;
  }
};

// Gắn token cho mọi request (kể cả khi defaults bị reset)
axiosInstance.interceptors.request.use((config) => {
  if (authToken) {
    config.headers = config.headers ?? {};
    // Spring Security yêu cầu format "Bearer {token}"
    config.headers.Authorization = `Bearer ${authToken}`;
  }
  return config;
});

// Log response errors và auto logout khi 401/403
axiosInstance.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response) {
      const url = error.config?.url || '';
      const status = error.response.status;
      
      console.log('❌ API Error:', url);
      console.log('❌ Status:', status);
      console.log('❌ Status Text:', error.response.statusText);
      console.log('❌ Response Data:', JSON.stringify(error.response.data, null, 2));
      
      // Xử lý lỗi 400 cho endpoint /books (có thể do backend Hibernate issue)
      if (status === 400 && url.includes('/books')) {
        console.log('⚠️ Backend Hibernate error for /books endpoint - this is a backend issue');
        console.log('💡 Suggestion: Backend needs to fix lazy loading of BookCategory entity');
      }
      
      // Auto logout khi token invalid (401) hoặc forbidden (403)
      if (status === 401 || status === 403) {
        // Bỏ qua logout cho auth endpoints và một số endpoints đặc biệt
        // Không logout khi xóa cart item hoặc tạo order (có thể do lỗi khác, không phải token invalid)
        // Bỏ qua logout cho /users/me vì _layout.tsx đã tự xử lý
        const shouldSkipLogout = 
          url.includes('/auth/') || 
          url.includes('/users/me') || // Skip vì _layout.tsx đã xử lý
          (url.includes('/cart/') && error.config.method === 'delete') ||
          (url.includes('/orders') && error.config.method === 'post');
        
        if (!shouldSkipLogout && !isLoggingOut) {
          isLoggingOut = true; // Đặt flag để tránh logout nhiều lần
          console.log('🔴 Token invalid - Auto logout');
          
          // Import AsyncStorage để clear token
          const AsyncStorage = require('@react-native-async-storage/async-storage').default;
          
          try {
            await AsyncStorage.multiRemove(['auth_token', 'auth_user']);
            setAuthToken(undefined);
            console.log('✅ Cleared auth data');
            
            // Hiển thị thông báo và navigate đến trang login
            Alert.alert(
              'Phiên đăng nhập hết hạn',
              'Phiên đăng nhập của bạn đã hết hạn. Vui lòng đăng nhập lại để tiếp tục sử dụng.',
              [
                {
                  text: 'Đăng nhập',
                  onPress: () => {
                    // Navigate đến trang account (sẽ hiển thị Login component)
                    if (navigationCallback) {
                      navigationCallback('/account');
                    } else {
                      console.log('⚠️ Navigation callback not set');
                    }
                  },
                },
              ],
              { cancelable: false }
            );
          } catch (e) {
            console.error('❌ Error clearing auth data:', e);
          } finally {
            // Reset flag sau 2 giây để cho phép logout lại nếu cần
            setTimeout(() => {
              isLoggingOut = false;
            }, 2000);
          }
        } else {
          if (isLoggingOut) {
            console.log('⚠️ Already logging out, skipping duplicate logout for:', url);
          } else {
            console.log('⚠️ Skipping auto logout for:', url);
          }
        }
      }
      
      // Kiểm tra có message từ Spring Security không
      if (error.response.data) {
        console.log('❌ Error Message:', error.response.data.message || error.response.data.error);
      }
    } else if (error.request) {
      console.log('❌ No response received:', error.request);
    } else {
      console.log('❌ Error setting up request:', error.message);
    }
    return Promise.reject(error);
  }
);

export default axiosInstance;