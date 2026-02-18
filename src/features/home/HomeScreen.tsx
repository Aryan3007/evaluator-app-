import React from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    Dimensions,
    Image,
    StatusBar,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useDispatch, useSelector } from 'react-redux';
import { ArrowRight, Scan, FileText, LogOut, User as UserIcon } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { logout } from '../../core/redux/authSlice';
import { colors } from '../../theme/colors';
import { spacing, borderRadius } from '../../theme/spacing';
import { typography } from '../../theme/typography';

const { width } = Dimensions.get('window');

export const HomeScreen: React.FC = () => {
    const navigation = useNavigation<any>();
    const dispatch = useDispatch();
    const insets = useSafeAreaInsets();
    const user = useSelector((state: any) => state.auth.user);

    const handleLogout = () => {
        dispatch(logout());
    };

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" />

            <ScrollView
                contentContainerStyle={[
                    styles.scrollContent,
                    { paddingTop: insets.top + spacing.lg }
                ]}
                showsVerticalScrollIndicator={false}
            >
                {/* Header */}
                <View style={styles.header}>
                    <View>
                        <Text style={styles.greetingTitle}>
                            Hello,
                        </Text>
                        <Text style={styles.userName}>
                            {user?.user_name || 'User'}!
                        </Text>
                    </View>
                    <TouchableOpacity onPress={handleLogout} style={styles.profileButton}>
                        {/* Placeholder for profile image, using Icon for now if no image */}
                        <Text style={styles.logoutText}>Logout</Text>
                        <View style={styles.profileImagePlaceholder}>
                            <LogOut size={24} color={'#fd4e4eff'} />
                        </View>
                    </TouchableOpacity>
                </View>

                {/* Cards Container */}
                <View style={styles.cardsContainer}>
                    {/* Start Scanning Card - Dark Theme */}
                    <TouchableOpacity
                        style={[styles.card, styles.cardDark]}
                        onPress={() => navigation.navigate('Scanning')}
                        activeOpacity={0.9}
                    >
                        <View style={styles.cardHeader}>
                            <Text style={[styles.cardLabel, { color: colors.darkTextSecondary }]}>
                                Action
                            </Text>
                            <View style={styles.cardBadge}>
                                <Scan size={16} color={colors.white} />
                                <Text style={styles.cardBadgeText}>New</Text>
                            </View>
                        </View>

                        <View style={styles.cardMainContent}>
                            <Text style={styles.cardTitle}>
                                Start{'\n'}Scanning
                            </Text>
                            <View style={[styles.actionButton, { backgroundColor: colors.primary }]}>
                                <ArrowRight size={24} color={colors.white} />
                            </View>
                        </View>

                        <View style={styles.cardFooter}>
                            <View>
                                <Text style={styles.footerLabel}>Type</Text>
                                <Text style={styles.footerValue}>Physical Sheet</Text>
                            </View>
                            <View>
                                <Text style={styles.footerLabel}>Status</Text>
                                <Text style={styles.footerValue}>Ready</Text>
                            </View>
                        </View>
                    </TouchableOpacity>

                    {/* Evaluations Card - Orange Theme */}
                    <TouchableOpacity
                        style={[styles.card, styles.cardOrange]}
                        onPress={() => navigation.navigate('Dashboard')}
                        activeOpacity={0.9}
                    >
                        <View style={styles.cardHeader}>
                            <Text style={[styles.cardLabel, { color: 'rgba(255,255,255,0.8)' }]}>
                                History
                            </Text>
                            <View style={[styles.cardBadge, { backgroundColor: 'rgba(255,255,255,0.2)' }]}>
                                <FileText size={16} color={colors.white} />
                                <Text style={styles.cardBadgeText}>View</Text>
                            </View>
                        </View>

                        <View style={styles.cardMainContent}>
                            <Text style={[styles.cardTitle, { color: colors.white }]}>
                                Past{'\n'}Evaluations
                            </Text>
                            <View style={[styles.actionButton, { backgroundColor: colors.white }]}>
                                <ArrowRight size={24} color={colors.primary} />
                            </View>
                        </View>

                        <View style={styles.cardFooter}>
                            <View>
                                <Text style={[styles.footerLabel, { color: 'rgba(255,255,255,0.6)' }]}>Total</Text>
                                <Text style={[styles.footerValue, { color: colors.white }]}>View All</Text>
                            </View>
                            <View>
                                <Text style={[styles.footerLabel, { color: 'rgba(255,255,255,0.6)' }]}>Latest</Text>
                                <Text style={[styles.footerValue, { color: colors.white }]}>Check Scores</Text>
                            </View>
                        </View>
                    </TouchableOpacity>
                </View>
            </ScrollView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.darkBackground || '#000000',
    },
    scrollContent: {
        padding: spacing.lg,
        paddingBottom: 40,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',

        marginBottom: spacing.xxl,
        marginTop: spacing.md,
    },
    greetingTitle: {
        fontSize: 32,
        fontWeight: '400',
        color: colors.white,
        lineHeight: 38,
    },
    userName: {
        fontSize: 32,
        fontWeight: '700',
        color: colors.white,
        lineHeight: 38,
    },
    profileButton: {
        width: 120,
        height: 48,
        borderRadius: 24,
        overflow: 'hidden',
        backgroundColor: colors.iconBackground || '#1C1C1E',
        justifyContent: 'center',
        alignItems: 'center',
        flexDirection: 'row',
        borderWidth: 1,
        paddingLeft: 12,
        borderColor: colors.iconBackground || '#1C1C1E',
    },
    logoutText: {
        color: '#fd4e4eff',
        fontSize: 14,
        fontWeight: '700',
    },
    profileImagePlaceholder: {
        color: '#fd4e4eff',
        width: 48,
        height: 48,
        justifyContent: 'center',
        alignItems: 'center',
    },
    cardsContainer: {
        gap: spacing.lg,
    },
    card: {
        borderRadius: 32,
        padding: 24,
        height: 220,
        justifyContent: 'space-between',
        marginBottom: spacing.md,
    },
    cardDark: {
        backgroundColor: colors.cardBlack || '#1C1C1E',
    },
    cardOrange: {
        backgroundColor: colors.primary,
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    cardLabel: {
        fontSize: 14,
        fontWeight: '500',
    },
    cardBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingVertical: 6,
        paddingHorizontal: 12,
        borderRadius: 20,
        backgroundColor: colors.iconBackground || '#2C2C2E',
    },
    cardBadgeText: {
        color: colors.white,
        fontSize: 12,
        fontWeight: '600',
    },
    cardMainContent: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    cardTitle: {
        fontSize: 32,
        fontWeight: '500',
        color: colors.white,
        lineHeight: 36,
    },
    actionButton: {
        width: 56,
        height: 56,
        borderRadius: 28,
        justifyContent: 'center',
        alignItems: 'center',
    },
    cardFooter: {
        flexDirection: 'row',
        gap: spacing.xl,
    },
    footerLabel: {
        fontSize: 12,
        color: colors.darkTextSecondary || '#8E8E93',
        marginBottom: 4,
    },
    footerValue: {
        fontSize: 16,
        fontWeight: '600',
        color: colors.white,
    },
});
