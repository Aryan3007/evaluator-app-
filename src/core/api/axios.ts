import axios from 'axios';
import { storage } from '../utils/storage';

// BASE URL - Using the one from your auth slice edit
const BASE_URL = 'https://ai-evaluator.srv1240507.hstgr.cloud';

const api = axios.create({
    baseURL: BASE_URL,
    timeout: 15000,
    headers: {
        'Content-Type': 'application/json',
    },
});

/* ---------- REQUEST LOG ---------- */
api.interceptors.request.use(
    async (config) => {
        // Add auth token if available
        const token = await storage.getAuthToken();
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }

        console.log('\n================ API REQUEST ================');
        // Handle both relative and absolute URLs in logging
        const fullUrl = config.baseURL && !config.url?.startsWith('http')
            ? `${config.baseURL}${config.url}`
            : config.url;

        console.log('URL:', fullUrl);
        console.log('METHOD:', config.method?.toUpperCase());
        console.log('HEADERS:', config.headers);
        if (config.data) {
            console.log('BODY:', JSON.stringify(config.data, null, 2));
        }
        console.log('=============================================\n');
        return config;
    },
    (error) => {
        console.error('API Request Error:', error);
        return Promise.reject(error);
    }
);

/* ---------- RESPONSE LOG ---------- */
api.interceptors.response.use(
    (response) => {
        console.log('\n================ API RESPONSE ================');
        console.log('URL:', response.config.url);
        console.log('STATUS:', response.status);
        console.log('DATA:', JSON.stringify(response.data, null, 2));
        console.log('==============================================\n');
        return response;
    },
    (error) => {
        console.log('\n================ API ERROR ===================');
        console.log('URL:', error.config?.url);
        console.log('STATUS:', error.response?.status);
        console.log('MESSAGE:', error.message);
        if (error.response?.data) {
            console.log('DATA:', JSON.stringify(error.response.data, null, 2));
        }
        console.log('==============================================\n');
        return Promise.reject(error);
    }
);

export default api;
