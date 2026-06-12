import axios from 'axios';
import * as SecureStore from 'expo-secure-store';

// Cambia esta IP por la IP local de tu PC cuando pruebes en dispositivo físico
// Para emulador Android: 10.0.2.2 | Para dispositivo físico: tu IP local ej: 192.168.1.x
const BASE_URL = __DEV__ ? 'http://192.168.0.80:3000/api' : 'https://tu-backend.com/api';

export const api = axios.create({ baseURL: BASE_URL });

api.interceptors.request.use(async (config) => {
  const token = await SecureStore.getItemAsync('auth_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});
