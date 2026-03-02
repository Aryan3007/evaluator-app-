import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Header } from '../../components/Header';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';

export const PreviewScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
    return (
        <View style={styles.container}>
            <Header
                title="Review Scan"
                showBack
                onBackPress={() => navigation.goBack()}
            />
            <View style={styles.content}>
                <Text style={styles.title}>Preview Not Available</Text>
                <Text style={styles.subtitle}>
                    Full preview functionality will be implemented in future updates.
                    Please check recent uploads in the Scanning screen.
                </Text>

                <TouchableOpacity
                    style={styles.button}
                    onPress={() => navigation.navigate('Camera')}
                >
                    <Text style={styles.buttonText}>Go Back to Camera</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },
    content: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: spacing.xl,
    },
    title: {
        ...typography.h3,
        color: colors.textPrimary,
        marginBottom: spacing.md,
    },
    subtitle: {
        ...typography.body,
        color: colors.textSecondary,
        textAlign: 'center',
        marginBottom: spacing.xl,
    },
    button: {
        backgroundColor: colors.primary,
        paddingVertical: spacing.md,
        paddingHorizontal: spacing.xl,
        borderRadius: spacing.md,
    },
    buttonText: {
        color: colors.white,
        fontWeight: '600',
    },
});
