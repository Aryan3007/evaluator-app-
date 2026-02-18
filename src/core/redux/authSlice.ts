import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import axios from '../api/axios';
import { storage } from '../utils/storage';

export interface User {
    user_id: string;
    email: string;
    user_name: string;
    is_active: boolean;
    created_at: string;
}

interface AuthState {
    user: User | null;
    access_token: string | null;
    isAuthenticated: boolean;
    isLoading: boolean;
    error: string | null;
}

const initialState: AuthState = {
    user: null,
    access_token: null,
    isAuthenticated: false,
    isLoading: false,
    error: null,
};

// Async thunk for login
export const loginUser = createAsyncThunk(
    'auth/loginUser',
    async (credentials: { email: string; password: string }, { rejectWithValue }) => {
        try {
            const formData = new URLSearchParams();
            formData.append('grant_type', 'password');
            formData.append('username', credentials.email);
            formData.append('password', credentials.password);
            formData.append('scope', '');
            formData.append('client_id', 'string');
            formData.append('client_secret', 'string');

            const response = await axios.post('https://ai-evaluator.srv1240507.hstgr.cloud/api/auth/login', formData.toString(), {
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'accept': 'application/json'
                }
            });

            if (response.data.success) {
                // Store token and user data
                await storage.setAuthToken(response.data.access_token);
                await storage.setUserData(response.data.user);

                return {
                    user: response.data.user,
                    access_token: response.data.access_token
                };
            } else {
                const msg = response.data.error?.message || response.data.message || 'Login failed';
                return rejectWithValue(msg);
            }
        } catch (error: any) {
            let errorMessage = 'An error occurred during login';
            if (error.response?.data?.error?.message) {
                errorMessage = error.response.data.error.message;
            } else if (error.response?.data?.detail) {
                errorMessage = error.response.data.detail;
            } else if (error.message) {
                errorMessage = error.message;
            }
            return rejectWithValue(errorMessage);
        }
    }
);

const authSlice = createSlice({
    name: 'auth',
    initialState,
    reducers: {
        logout: (state) => {
            state.user = null;
            state.access_token = null;
            state.isAuthenticated = false;
            state.error = null;
        },
        clearError: (state) => {
            state.error = null;
        },
        setAuthFromStorage: (state, action: PayloadAction<{ user: User; access_token: string }>) => {
            state.user = action.payload.user;
            state.access_token = action.payload.access_token;
            state.isAuthenticated = true;
        }
    },
    extraReducers: (builder) => {
        builder
            .addCase(loginUser.pending, (state) => {
                state.isLoading = true;
                state.error = null;
            })
            .addCase(loginUser.fulfilled, (state, action) => {
                state.isLoading = false;
                state.isAuthenticated = true;
                state.user = action.payload.user;
                state.access_token = action.payload.access_token;
                state.error = null;
            })
            .addCase(loginUser.rejected, (state, action) => {
                state.isLoading = false;
                state.error = action.payload as string;
            });
    },
});

export const { logout, clearError, setAuthFromStorage } = authSlice.actions;
export default authSlice.reducer;
