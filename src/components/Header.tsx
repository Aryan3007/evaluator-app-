import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft } from 'lucide-react-native';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';
import { typography } from '../theme/typography';

interface HeaderProps {
    title: string;
    showBack?: boolean;
    onBackPress?: () => void;
    rightAction?: React.ReactNode;
}

export const Header: React.FC<HeaderProps> = ({
    title,
    showBack = false,
    onBackPress,
    rightAction,
}) => {
    const insets = useSafeAreaInsets();

    return (
        <View style={[styles.container, { paddingTop: insets.top }]}>
            <View style={styles.content}>
                <View style={styles.leftSection}>
                    {showBack && onBackPress && (
                        <TouchableOpacity onPress={onBackPress} style={styles.backButton}>
                            <ArrowLeft size={24} color={colors.white} />
                        </TouchableOpacity>
                    )}
                </View>
                <Text style={styles.title} numberOfLines={1}>{title}</Text>
                <View style={styles.rightSection}>{rightAction}</View>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        backgroundColor: colors.primary,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(0,0,0,0.05)',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 3,
        elevation: 4,
        zIndex: 10,
    },
    content: {
        height: 56, // Standard header height
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: spacing.md,
    },
    leftSection: {
        width: 48,
        alignItems: 'flex-start',
    },
    rightSection: {
        width: 48,
        alignItems: 'flex-end',
    },
    title: {
        ...typography.h3,
        color: colors.white,
        flex: 1,
        textAlign: 'center',
        fontSize: 18,
        fontWeight: '600',
    },
    backButton: {
        padding: 8,
        marginLeft: -8, // Align icon properly
    },
});
