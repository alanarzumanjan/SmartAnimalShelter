export const config = {
  api: {
    baseUrl: import.meta.env.VITE_API_URL || 'http://localhost:5000'
  },
  app: {
    name: import.meta.env.VITE_APP_NAME || 'Smart Shelter IoT',
    debug: import.meta.env.VITE_DEBUG === 'true',
  },
};

export default config;