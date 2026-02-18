import React, { useEffect, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    FlatList,
    Animated,
    Dimensions,
    TouchableWithoutFeedback,
    StatusBar,
} from 'react-native';
import { ScanLine, X, LogOut, FileText, CheckCircle, Clock, AlertTriangle } from 'lucide-react-native';
import { PdfViewerModal } from './components/PdfViewerModal';

import { logout } from '../../core/redux/authSlice';
import { useAppDispatch, useAppSelector } from '../../core/hooks/useRedux';
import { fetchFileHistory } from '../../core/redux/scanningSlice';
import { colors } from '../../theme/colors';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width } = Dimensions.get('window');
const SIDEBAR_WIDTH = width * 0.8;

interface ScanningSidebarProps {
    onClose: () => void;
}

const ScanningSidebar: React.FC<ScanningSidebarProps> = ({ onClose }) => {
    const dispatch = useAppDispatch();
    const insets = useSafeAreaInsets();
    const { fileHistory } = useAppSelector((state) => state.scanning);

    // Animation Values
    const slideAnim = useRef(new Animated.Value(-SIDEBAR_WIDTH)).current;
    const fadeAnim = useRef(new Animated.Value(0)).current;

    // PDF Preview State
    const [selectedPdf, setSelectedPdf] = React.useState<{ uri: string; name: string } | null>(null);
    const [isPdfVisible, setIsPdfVisible] = React.useState(false);

    useEffect(() => {
        dispatch(fetchFileHistory({ limit: 10 }));
        // Animate In
        Animated.parallel([
            Animated.timing(slideAnim, {
                toValue: 0,
                duration: 300,
                useNativeDriver: true,
            }),
            Animated.timing(fadeAnim, {
                toValue: 1,
                duration: 300,
                useNativeDriver: true,
            }),
        ]).start();
    }, [dispatch, slideAnim, fadeAnim]);

    const handleClose = () => {
        // Animate Out
        Animated.parallel([
            Animated.timing(slideAnim, {
                toValue: -SIDEBAR_WIDTH,
                duration: 250,
                useNativeDriver: true,
            }),
            Animated.timing(fadeAnim, {
                toValue: 0,
                duration: 250,
                useNativeDriver: true,
            }),
        ]).start(() => {
            onClose();
        });
    };

    const handleLogout = () => {
        dispatch(logout());
    };

    const StatusIcon = ({ status }: { status: string }) => {
        switch (status) {
            case 'processed':
                return <CheckCircle size={16} color={colors.success} />;
            case 'processing':
                return <Clock size={16} color={colors.info} />;
            case 'failed':
                return <AlertTriangle size={16} color={colors.error} />;
            default:
                return <Clock size={16} color={colors.darkTextSecondary} />;
        }
    };

    const renderItem = ({ item }: { item: any }) => (
        <TouchableOpacity
            style={styles.historyItem}
            onPress={() => {
                if (item.s3_url) {
                    setSelectedPdf({
                        uri: item.s3_url,
                        name: item.file_name || 'Document.pdf'
                    });
                    setIsPdfVisible(true);
                }
            }}
        >
            <View style={styles.historyIcon}>
                <FileText color={colors.darkTextSecondary} size={20} />
            </View>
            <View style={styles.historyContent}>
                <View style={styles.historyMeta}>
                    <Text style={styles.historySubject} numberOfLines={1}>

                        {item.subject_name || 'Unknown Subject'}
                    </Text>
                    <Text style={styles.historyDate}>
                        {new Date(item.created_at).toLocaleDateString()}
                    </Text>
                </View>
                <Text style={styles.historyFile} numberOfLines={1}>
                    Paper code - {item.paper_code}
                </Text>
                <View style={styles.historyMeta}>



                </View>
            </View>
        </TouchableOpacity>
    );

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

            {/* Backdrop */}
            <TouchableWithoutFeedback onPress={handleClose}>
                <Animated.View style={[styles.backdrop, { opacity: fadeAnim }]} />
            </TouchableWithoutFeedback>

            {/* Sidebar Content */}
            <Animated.View
                style={[
                    styles.sidebar,
                    {
                        transform: [{ translateX: slideAnim }],
                    },
                ]}
            >
                {/* Header */}
                <View style={[styles.header, { paddingTop: Math.max(insets.top, 20) }]}>
                    <View style={styles.headerTitleContainer}>
                        <View style={styles.logoBox}>
                            <ScanLine color={colors.white} size={20} />
                        </View>
                        <Text style={styles.headerTitle}>History</Text>
                    </View>
                    <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
                        <X color={colors.darkTextSecondary} size={24} />
                    </TouchableOpacity>
                </View>

                {/* List */}
                <FlatList
                    style={{ flex: 1 }}
                    data={fileHistory}
                    renderItem={renderItem}
                    keyExtractor={(item) => item.file_id}
                    contentContainerStyle={styles.listContent}
                    showsVerticalScrollIndicator={false}
                    ListEmptyComponent={
                        <View style={styles.emptyState}>
                            <FileText size={48} color={colors.darkTextSecondary} style={{ marginBottom: 16, opacity: 0.5 }} />
                            <Text style={styles.emptyText}>No recent uploads</Text>
                            <Text style={styles.emptySubText}>Your scanned documents will appear here.</Text>
                        </View>
                    }
                />

                {/* Footer */}
                <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 20) + 16 }]}>
                    <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
                        <View style={styles.logoutIconBox}>
                            <LogOut color={colors.error} size={20} />
                        </View>
                        <View>
                            <Text style={styles.logoutText}>Logout</Text>
                            <Text style={styles.logoutSubText}>End active session</Text>
                        </View>
                    </TouchableOpacity>
                </View>
            </Animated.View>

            <PdfViewerModal
                visible={isPdfVisible}
                fileUri={selectedPdf?.uri || null}
                fileName={selectedPdf?.name}
                onClose={() => {
                    setIsPdfVisible(false);
                    setSelectedPdf(null);
                }}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        // modal is transparent, so container background is implicitly transparent
    },
    backdrop: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.7)',
    },
    sidebar: {
        width: SIDEBAR_WIDTH,
        height: '100%',
        backgroundColor: colors.cardBlack, // Dark drawer background
        borderRightWidth: 1,
        borderRightColor: '#2C2C2E',
        shadowColor: '#000',
        shadowOffset: { width: 4, height: 0 },
        shadowOpacity: 0.3,
        shadowRadius: 10,
        elevation: 10,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingBottom: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#2C2C2E',
    },
    headerTitleContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    logoBox: {
        width: 40,
        height: 40,
        backgroundColor: colors.primary,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: colors.white,
    },
    closeButton: {
        padding: 8,
        backgroundColor: colors.iconBackground,
        borderRadius: 20,
    },
    listContent: {
        padding: 8,
    },
    historyItem: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 6,
        padding: 16,
        backgroundColor: colors.darkBackground,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: '#2C2C2E',
    },
    historyIcon: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: colors.iconBackground,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 16,
    },
    historyContent: {
        flex: 1,
    },
    historySubject: {
        color: colors.white,
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 4,
    },
    historyFile: {
        textTransform: 'uppercase',
        color: colors.darkTextSecondary,
        fontSize: 10,
        marginBottom: 8,
    },
    historyMeta: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: 6,
    },
    historyStatus: {
        color: colors.darkTextSecondary,
        fontSize: 12,
        textTransform: 'capitalize',
        marginRight: 8,
        fontWeight: '500',
    },
    historyDate: {
        color: colors.darkTextSecondary,
        fontSize: 12,
    },
    emptyState: {
        padding: 32,
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 40,
    },
    emptyText: {
        color: colors.white,
        fontSize: 18,
        fontWeight: '600',
        marginBottom: 8,
    },
    emptySubText: {
        color: colors.darkTextSecondary,
        textAlign: 'center',
        lineHeight: 20,
    },
    footer: {
        paddingHorizontal: 16,
        paddingTop: 16,
        borderTopWidth: 1,
        borderTopColor: '#2C2C2E',
        backgroundColor: colors.cardBlack,
    },
    logoutButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(239, 68, 68, 0.1)',
        padding: 16,
        borderRadius: 16,
    },
    logoutIconBox: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(239, 68, 68, 0.2)',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 16,
    },
    logoutText: {
        color: colors.error,
        fontSize: 16,
        fontWeight: '700',
    },
    logoutSubText: {
        color: colors.error,
        fontSize: 12,
        opacity: 0.8,
    },
});

export default ScanningSidebar;
