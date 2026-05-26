import axios from 'axios';

const API_BASE_URL = '/api';

const api = axios.create({
  baseURL: API_BASE_URL,
});

export const getTasks = (filters = {}) => {
  const params = new URLSearchParams();
  if (filters.status && filters.status !== 'all') params.append('status', filters.status);
  if (filters.minImportance) params.append('minImportance', filters.minImportance);
  return api.get(`/tasks?${params.toString()}`);
};

export const createTask = (taskData) => api.post('/tasks', taskData);

export const updateTask = (id, updates) => api.patch(`/tasks/${id}`, updates);

export const deleteTask = (id) => api.delete(`/tasks/${id}`);

export const getStats = () => api.get('/tasks/stats');

export default api;
