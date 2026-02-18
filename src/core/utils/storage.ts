import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEYS = {
    AUTH_TOKEN: '@auth_token',
    USER_DATA: '@user_data',
    THEME: '@theme',
};

export const storage = {
    // Auth Token
    async setAuthToken(token: string): Promise<void> {
        await AsyncStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, token);
    },

    async getAuthToken(): Promise<string | null> {
        return await AsyncStorage.getItem(STORAGE_KEYS.AUTH_TOKEN);
    },

    async removeAuthToken(): Promise<void> {
        await AsyncStorage.removeItem(STORAGE_KEYS.AUTH_TOKEN);
    },

    // User Data
    async setUserData(userData: any): Promise<void> {
        await AsyncStorage.setItem(STORAGE_KEYS.USER_DATA, JSON.stringify(userData));
    },

    async getUserData(): Promise<any | null> {
        const data = await AsyncStorage.getItem(STORAGE_KEYS.USER_DATA);
        return data ? JSON.parse(data) : null;
    },

    async removeUserData(): Promise<void> {
        await AsyncStorage.removeItem(STORAGE_KEYS.USER_DATA);
    },

    // Clear All
    async clearAll(): Promise<void> {
        await AsyncStorage.clear();
    },
};
