import axios from 'axios';
const api = axios.create({ baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api', timeout: 15000 });
api.interceptors.request.use((config) => { const token = localStorage.getItem('accessToken'); if (token) config.headers.Authorization = `Bearer ${token}`; return config; });
api.interceptors.response.use((r) => r, async (error) => {
  const original = error.config;
  if (error.response?.status === 401 && !original._retry) {
    original._retry = true;
    try {
      const rt = localStorage.getItem('refreshToken');
      const { data } = await axios.post(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/auth/refresh`, { refreshToken: rt });
      localStorage.setItem('accessToken', data.data.accessToken);
      localStorage.setItem('refreshToken', data.data.refreshToken);
      original.headers.Authorization = `Bearer ${data.data.accessToken}`;
      return api(original);
    } catch { localStorage.clear(); window.location.href = '/login'; }
  }
  return Promise.reject(error);
});
export default api;
