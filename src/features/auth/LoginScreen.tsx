import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    TextInput,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    ActivityIndicator,
    StatusBar,
} from 'react-native';
import Toast from 'react-native-toast-message';
import { useDispatch, useSelector } from 'react-redux';
import { Mail, Lock, Eye, EyeOff, Check, ArrowRight } from 'lucide-react-native';
import { AppDispatch, RootState } from '../../app/store';
import { loginUser, clearError } from '../../core/redux/authSlice';
import { colors } from '../../theme/colors';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { typography } from '../../theme/typography';

export const LoginScreen: React.FC = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [rememberMe, setRememberMe] = useState(false);
    const insets = useSafeAreaInsets();

    const dispatch = useDispatch<AppDispatch>();
    const { isLoading, error } = useSelector((state: RootState) => state.auth);

    const handleLogin = async () => {
        if (!email || !password) {
            Toast.show({
                type: 'error',
                text1: 'Validation Error',
                text2: 'Please enter both email and password'
            });
            return;
        }

        try {
            await dispatch(loginUser({ email, password })).unwrap();

            Toast.show({
                type: 'success',
                text1: 'Success',
                text2: 'Login successful'
            });
            // Navigation is handled by RootNavigator observing auth state
        } catch (error: any) {
            console.error('Login failed:', error);
            Toast.show({
                type: 'error',
                text1: 'Login Failed',
                text2: error || 'Login failed'
            });
        }
    };

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" />
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                style={styles.keyboardView}
            >
                <ScrollView
                    contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top + 40 }]}
                    showsVerticalScrollIndicator={false}
                >
                    {/* Header */}
                    <View style={styles.header}>
                        <Text style={styles.headerTitle}>
                            Welcome back!{'\n'}
                            <Text style={styles.highlightText}>Sign in</Text> to Evaluate{'\n'}
                            your Copies.
                        </Text>
                    </View>

                    <View style={styles.form}>
                        <View>
                            {/* Email Input */}
                            <View style={styles.inputContainer}>
                                <Mail size={20} color={colors.darkTextSecondary} style={styles.inputIcon} />
                                <TextInput
                                    style={styles.input}
                                    placeholder="Enter your email address"
                                    placeholderTextColor={colors.darkTextSecondary}
                                    value={email}
                                    onChangeText={setEmail}
                                    autoCapitalize="none"
                                    keyboardType="email-address"
                                />
                            </View>

                            {/* Password Input */}
                            <View style={styles.inputContainer}>
                                <Lock size={20} color={colors.darkTextSecondary} style={styles.inputIcon} />
                                <TextInput
                                    style={styles.input}
                                    placeholder="Enter your password"
                                    placeholderTextColor={colors.darkTextSecondary}
                                    value={password}
                                    onChangeText={setPassword}
                                    secureTextEntry={!showPassword}
                                />
                                <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                                    {showPassword ? (
                                        <EyeOff size={20} color={colors.darkTextSecondary} />
                                    ) : (
                                        <Eye size={20} color={colors.darkTextSecondary} />
                                    )}
                                </TouchableOpacity>
                            </View>

                            
                        </View>

                        {/* Login Button */}
                        <TouchableOpacity
                            style={styles.loginButton}
                            onPress={handleLogin}
                            disabled={isLoading}
                            activeOpacity={0.8}
                        >
                            {isLoading ? (
                                <ActivityIndicator color="white" />
                            ) : (
                                <View style={styles.loginButtonContent}>
                                    <Text style={styles.loginButtonText}>Login</Text>
                                    <View style={styles.loginIconContainer}>
                                        <ArrowRight size={20} color={colors.primary} />
                                    </View>
                                </View>
                            )}
                        </TouchableOpacity>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.darkBackground || '#000000',
    },
    keyboardView: {
        flex: 1,
    },
    scrollContent: {
        flexGrow: 1,
        paddingHorizontal: 24,
        paddingBottom: 24,
    },
    header: {
        marginBottom: 48,
    },
    headerTitle: {
        fontSize: 36,
        fontWeight: '700',
        color: colors.white,
        lineHeight: 44,
        letterSpacing: -0.5,
    },
    highlightText: {
        color: colors.primary,
        textDecorationLine: 'underline',
        textDecorationColor: colors.primary,
    },
    form: {
        width: '100%',
        flex: 1,
        justifyContent: 'space-between',
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.cardBlack || '#1C1C1E',
        borderRadius: 20,
        paddingHorizontal: 20,
        height: 56, // Reduced from 64
        marginBottom: 16,
        borderWidth: 1,
        borderColor: '#2C2C2E',
    },
    inputIcon: {
        marginRight: 12,
    },
    input: {
        flex: 1,
        fontSize: 16,
        color: colors.white,
        fontWeight: '500',
    },
    optionsRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 32,
        marginTop: 8,
    },
    rememberMeContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    checkbox: {
        width: 20,
        height: 20,
        borderRadius: 6,
        borderWidth: 2,
        borderColor: colors.darkTextSecondary || '#8E8E93',
        marginRight: 8,
        alignItems: 'center',
        justifyContent: 'center',
    },
    checkboxChecked: {
        backgroundColor: colors.primary,
        borderColor: colors.primary,
    },
    rememberMeText: {
        color: colors.darkTextSecondary || '#8E8E93',
        fontSize: 14,
        fontWeight: '500',
    },
    forgotPasswordText: {
        color: colors.white,
        fontSize: 14,
        fontWeight: '600',
    },
    loginButton: {
        backgroundColor: colors.primary,
        height: 56, // Reduced from 64
        borderRadius: 28,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 32,
        shadowColor: colors.primary,
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.3,
        shadowRadius: 16,
        elevation: 8,
    },
    loginButtonContent: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        width: '100%',
        paddingHorizontal: 8,
    },
    loginButtonText: {
        color: 'white',
        fontSize: 18,
        fontWeight: '700',
        marginRight: 12,
    },
    loginIconContainer: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: 'white',
        justifyContent: 'center',
        alignItems: 'center',
        position: 'absolute',
        right: 16,
    },
    signupRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
    },
    signupText: {
        color: colors.darkTextSecondary || '#8E8E93',
        fontSize: 14,
        fontWeight: '500',
    },
    signupLink: {
        color: colors.white,
        fontWeight: '700',
        fontSize: 14,
    },
});
