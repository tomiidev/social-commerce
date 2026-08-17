import axios from 'axios';

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api',
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add request interceptor to attach JWT token
api.interceptors.request.use(
  (config) => {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Add interceptor to redirect to login on 401 unauthenticated errors
if (typeof window !== 'undefined') {
  api.interceptors.response.use(
    (response) => response,
    (error) => {
      if (error.response && error.response.status === 401) {
        // Only redirect if we are not already on the login or register pages
        const pathname = window.location.pathname;
        if (pathname !== '/login' && pathname !== '/register') {
          window.location.href = '/login';
        }
      }
      return Promise.reject(error);
    }
  );
}

export default api;
