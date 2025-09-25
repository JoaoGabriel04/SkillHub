import axios, { AxiosResponse, InternalAxiosRequestConfig, AxiosError } from 'axios';

interface CustomAxiosRequestConfig extends InternalAxiosRequestConfig {
  _retry?: boolean;
}

interface RefreshTokenResponse {
  accessToken: string;
}

interface QueueItem {
  resolve: (value: string | null) => void;
  reject: (reason: AxiosError) => void;
}

const api = axios.create({
  baseURL: 'https://skillhub-server-tfmw.onrender.com',
  withCredentials: true,
});

if (typeof window !== 'undefined') {
  const token = localStorage.getItem('access_token');
  if (token) {
    api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  }
}

export const setAuthToken = (token: string | null): void => {
  if (token) {
    localStorage.setItem('access_token', token);
    api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  } else {
    localStorage.removeItem('access_token');
    delete api.defaults.headers.common['Authorization'];
  }
};

api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('access_token');
      if (token) {
        config.headers = config.headers ?? {};
        config.headers['Authorization'] = `Bearer ${token}`;
      }
    }
    return config;
  },
  (error: AxiosError) => Promise.reject(error)
);

let isRefreshing = false;
let failedQueue: QueueItem[] = [];

const processQueue = (error: AxiosError | null, token: string | null = null): void => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

api.interceptors.response.use(
  (response: AxiosResponse) => response,
  async (error: AxiosError) => {
    console.log('🚨 Erro interceptado:', error.response?.status);
    console.log(error)

    const originalRequest = error.config as CustomAxiosRequestConfig;

    if (
      (error.response?.status === 401 || error.response?.status === 403) &&
      originalRequest &&
      !originalRequest._retry
    ) {
      console.log('🔄 Token expirado (401), tentando refresh...');

      if (originalRequest.url && originalRequest.url.includes('/auth/refresh')) {
        console.log('❌ Refresh falhou, redirecionando...');
        localStorage.removeItem('access_token');
        delete api.defaults.headers.common['Authorization'];
        setTimeout(() => { 
          window.location.href = '/login';
         }, 2000);
        return Promise.reject(error);
      }

      if (isRefreshing) {
        console.log('⏳ Refresh já em andamento...');
        return new Promise<string | null>((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            if (originalRequest.headers && token) {
              originalRequest.headers['Authorization'] = `Bearer ${token}`;
            }
            return api(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        console.log('🔄 Fazendo POST /auth/refresh...');
        const response: AxiosResponse<RefreshTokenResponse> = await api.post('/auth/refresh');
        const newAccessToken = response.data.accessToken;

        console.log('✅ Novo token recebido!');

        localStorage.setItem('access_token', newAccessToken);
        api.defaults.headers.common['Authorization'] = `Bearer ${newAccessToken}`;

        // Atualizar o header da requisição original
        if (originalRequest.headers) {
          originalRequest.headers['Authorization'] = `Bearer ${newAccessToken}`;
        }

        processQueue(null, newAccessToken);

        console.log('🔄 Reenviando requisição original...');
        return api(originalRequest);
      } catch (refreshError) {
        console.log('❌ Erro no refresh:', refreshError);
        const axiosRefreshError = refreshError as AxiosError;
        processQueue(axiosRefreshError, null);
        localStorage.removeItem('access_token');
        delete api.defaults.headers.common['Authorization'];
        setTimeout(() => { window.location.href = '/login'; }, 2000);
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

export default api;