import api from './axios';

export const getPaymentConfig = () =>
  api.get('/payments/config');

export const createRazorpayOrder = (bookingId) =>
  api.post(`/payments/create-order/${bookingId}`);

export const verifyRazorpayPayment = (data) =>
  api.post('/payments/verify', data);

export const processDemoPayment = (bookingId) =>
  api.post(`/payments/demo/${bookingId}`);

export const getPaymentForBooking = (bookingId) =>
  api.get(`/payments/booking/${bookingId}`);
