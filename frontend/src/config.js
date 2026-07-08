// URL для API
const API_URL = import.meta.env.PROD 
  ? 'const API_URL = 'https://hohchat.onrender.com/api';'  // Замените на ваш URL
  : 'http://localhost:5000/api';

export { API_URL };