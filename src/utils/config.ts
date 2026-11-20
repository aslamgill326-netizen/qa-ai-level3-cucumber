
import 'dotenv/config';

export const config = {
  baseURL: process.env.BASE_URL || '',

  routes: {
    home: '/',
    login: '/login',
    logout: '/logout',
  },

  recovery: {
    maxAttempts: 3,
    initialDelayMs: 2000,
  },

  timeouts: {
    navigation: 30000,
    assertion: 10000,
  },
};
