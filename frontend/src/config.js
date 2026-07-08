// URL для API
const API_URL = import.meta.env.PROD 
  ? 'https://hohchat.onrender.com/api'
  : 'http://localhost:5000/api';

export { API_URL };
