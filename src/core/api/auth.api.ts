import axios from './axios';
import { LoginCredentials, User, ApiResponse } from '../types';

export const authApi = {
    login: async (credentials: LoginCredentials): Promise<ApiResponse<User>> => {
        try {
            // Simulated API call - replace with real endpoint
            const response = await axios.post('/auth/login', credentials);
            return response.data;
        } catch (error: any) {
            return {
                success: false,
                error: error.response?.data?.message || 'Login failed',
            };
        }
    },

    logout: async (): Promise<ApiResponse<void>> => {
        try {
            const response = await axios.post('/auth/logout');
            return response.data;
        } catch (error: any) {
            return {
                success: false,
                error: error.response?.data?.message || 'Logout failed',
            };
        }
    },

    getCurrentUser: async (): Promise<ApiResponse<User>> => {
        try {
            const response = await axios.get('/auth/me');
            return response.data;
        } catch (error: any) {
            return {
                success: false,
                error: error.response?.data?.message || 'Failed to get user',
            };
        }
    },
};
