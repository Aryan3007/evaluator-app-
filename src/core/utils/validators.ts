export const validators = {
    email: (email: string): boolean => {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    },

    password: (password: string): boolean => {
        return password.length >= 6;
    },

    required: (value: string): boolean => {
        return value.trim().length > 0;
    },
};
