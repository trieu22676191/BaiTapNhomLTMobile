import axios from 'axios';

let authToken: string | null = null;

const axiosInstance = axios.create({
  baseURL: 'http://192.168.1.5:8080/api',
  timeout: 10000,
  headers: { 'Content-Type': 'application/json' },
});

export const setAuthToken = (token?: string) => {
  authToken = token || null;
  if (authToken) {
    // Spring Security yêu cầu format "Bearer {token}"
    axiosInstance.defaults.headers.Authorization = `Bearer ${authToken}`;
    console.log("🔐 setAuthToken called with token:", authToken.substring(0, 30) + "...");
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
    console.log('🔐 Request:', config.method?.toUpperCase(), config.url);
    console.log('🔐 Authorization:', config.headers.Authorization?.substring(0, 50) + '...');
  } else {
    console.log('⚠️ No authToken found for request:', config.url);
  }
  return config;
});

// Log response errors và auto logout khi 401/403
axiosInstance.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response) {
      console.log('❌ API Error:', error.config.url);
      console.log('❌ Status:', error.response.status);
      console.log('❌ Status Text:', error.response.statusText);
      console.log('❌ Response Data:', JSON.stringify(error.response.data, null, 2));
      
      // Auto logout khi token invalid (401) hoặc forbidden (403)
      if (error.response.status === 401 || error.response.status === 403) {
        const url = error.config.url || '';
        // Bỏ qua logout cho auth endpoints và một số endpoints đặc biệt
        // Không logout khi xóa cart item hoặc tạo order (có thể do lỗi khác, không phải token invalid)
        const shouldSkipLogout = 
          url.includes('/auth/') || 
          (url.includes('/cart/') && error.config.method === 'delete') ||
          (url.includes('/orders') && error.config.method === 'post');
        
        if (!shouldSkipLogout) {
          console.log('🔴 Token invalid - Auto logout');
          
          // Import AsyncStorage để clear token
          const AsyncStorage = require('@react-native-async-storage/async-storage').default;
          
          try {
            await AsyncStorage.multiRemove(['auth_token', 'auth_user']);
            setAuthToken(undefined);
            console.log('✅ Cleared auth data');
          } catch (e) {
            console.error('❌ Error clearing auth data:', e);
          }
        } else {
          console.log('⚠️ Skipping auto logout for:', url);
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