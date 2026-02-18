import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { colors } from '../theme/colors';
import { spacing, borderRadius } from '../theme/spacing';
import { typography } from '../theme/typography';

interface ButtonProps {
    title: string;
    onPress: () => void;
    variant?: 'primary' | 'secondary' | 'outline';
    disabled?: boolean;
    loading?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
    title,
    onPress,
    variant = 'primary',
    disabled = false,
    loading = false,
}) => {
    return (
        <TouchableOpacity
            style={[
                styles.button,
                variant === 'primary' && styles.primaryButton,
                variant === 'secondary' && styles.secondaryButton,
                variant === 'outline' && styles.outlineButton,
                disabled && styles.disabledButton,
            ]}
            onPress={onPress}
            disabled={disabled || loading}
            activeOpacity={0.7}
        >
            {loading ? (
                <ActivityIndicator color={variant === 'outline' ? colors.primary : colors.white} />
            ) : (
                <Text
                    style={[
                        styles.buttonText,
                        variant === 'primary' && styles.primaryButtonText,
                        variant === 'secondary' && styles.secondaryButtonText,
                        variant === 'outline' && styles.outlineButtonText,
                    ]}
                >
                    {title}
                </Text>
            )}
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    button: {
        paddingVertical: spacing.md,
        paddingHorizontal: spacing.lg,
        borderRadius: borderRadius.md,
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 48,
    },
    primaryButton: {
        backgroundColor: colors.primary,
    },
    secondaryButton: {
        backgroundColor: colors.primaryLight,
    },
    outlineButton: {
        backgroundColor: 'transparent',
        borderWidth: 2,
        borderColor: colors.primary,
    },
    disabledButton: {
        opacity: 0.5,
    },
    buttonText: {
        ...typography.bodyBold,
    },
    primaryButtonText: {
        color: colors.white,
    },
    secondaryButtonText: {
        color: colors.white,
    },
    outlineButtonText: {
        color: colors.primary,
    },
});
