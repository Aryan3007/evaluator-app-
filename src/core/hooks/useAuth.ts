import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../../app/store';
import { loginStart, loginSuccess, loginFailure, logout } from '../redux/authSlice';
import { authApi } from '../api/auth.api';
import { storage } from '../utils/storage';
import { LoginCredentials } from '../types';

export const useAuth = () => {
    const dispatch = useDispatch();
    const { user, isAuthenticated, isLoading, error } = useSelector(
        (state: RootState) => state.auth
    );

    const login = async (credentials: LoginCredentials) => {
        dispatch(loginStart());
        const response = await authApi.login(credentials);

        if (response.success && response.data) {
            await storage.setAuthToken(response.data.token);
            await storage.setUserData(response.data);
            dispatch(loginSuccess(response.data));
        } else {
            dispatch(loginFailure(response.error || 'Login failed'));
        }
    };

    const logoutUser = async () => {
        await authApi.logout();
        await storage.clearAll();
        dispatch(logout());
    };

    return {
        user,
        isAuthenticated,
        isLoading,
        error,
        login,
        logout: logoutUser,
    };
};
