import React, { useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';

export const SplashScreen: React.FC = () => {
    return (
        <View style={styles.container}>
            <View style={styles.content}>
                <Text style={styles.logo}>📊</Text>
                <Text style={styles.title}>Evaluator</Text>
                <ActivityIndicator size="large" color={colors.primary} style={styles.loader} />
            </View>
            <View style={styles.footer}>
                <Text style={styles.footerText}>Powered by Kuberya</Text>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.darkBackground || '#000000',
        justifyContent: 'center',
        alignItems: 'center',
    },
    content: {
        alignItems: 'center',
    },
    logo: {
        fontSize: 80,
        marginBottom: 20,
    },
    title: {
        ...typography.h1,
        color: colors.white,
        fontSize: 40,
        marginBottom: 40,
    },
    loader: {
        transform: [{ scale: 1.2 }],
    },
    footer: {
        position: 'absolute',
        bottom: 50,
    },
    footerText: {
        color: 'rgba(255, 255, 255, 0.6)',
        fontSize: 14,
        fontWeight: '500',
    },
});
