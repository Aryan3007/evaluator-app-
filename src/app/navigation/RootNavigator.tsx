import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useSelector, useDispatch } from 'react-redux';
import type { RootState, AppDispatch } from '../store';
import { setAuthFromStorage } from '../../core/redux/authSlice';
import { storage } from '../../core/utils/storage';
import { AuthNavigator } from './AuthNavigator';
import { MainNavigator } from './MainNavigator';
import { Loader } from '../../components/Loader';

const Stack = createNativeStackNavigator();

export const RootNavigator: React.FC = () => {
    const [isCheckingAuth, setIsCheckingAuth] = useState(true);
    const dispatch = useDispatch<AppDispatch>();
    const { isAuthenticated } = useSelector((state: RootState) => state.auth);

    useEffect(() => {
        checkAuthStatus();
    }, []);

    const checkAuthStatus = async () => {
        try {
            const token = await storage.getAuthToken();
            const userData = await storage.getUserData();

            if (token && userData) {
                dispatch(setAuthFromStorage({ user: userData, access_token: token }));
            }
        } catch (error) {
            console.error('Error checking auth status:', error);
        } finally {
            setIsCheckingAuth(false);
        }
    };

    if (isCheckingAuth) {
        return <Loader />;
    }

    return (
        <NavigationContainer>
            <Stack.Navigator
                screenOptions={{
                    headerShown: false,
                }}
            >
                {isAuthenticated ? (
                    <Stack.Screen name="Main" component={MainNavigator} />
                ) : (
                    <Stack.Screen name="Auth" component={AuthNavigator} />
                )}
            </Stack.Navigator>
        </NavigationContainer>
    );
};
