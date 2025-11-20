import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_URL || '';

const api = axios.create({
  baseURL: API_BASE,
  // You can add other defaults here (timeout, headers, etc.)
});

export default api;
