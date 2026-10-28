import api from './axios';

export const getRooms = (params) => api.get('/rooms', { params });
export const getRoomById = (id) => api.get(`/rooms/${id}`);
export const updateRoomStatus = (id, status) => api.patch(`/rooms/${id}/status`, { status });
