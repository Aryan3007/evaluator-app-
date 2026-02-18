import React, { useEffect, useState, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    TouchableOpacity,
    RefreshControl,
    ActivityIndicator,
    Alert,
    StatusBar,
    Pressable,
    Linking,
    Modal,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { colors } from '../../theme/colors';
import { spacing, borderRadius } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import { fetchAnswerSheets, evaluateAnswerCopies } from '../../core/redux/evaluatorSlice';
import { AnswerSheet } from '../../core/redux/types';
import { FileText, ChevronRight, AlertTriangle, ArrowLeft, Square, CheckSquare, Play, RotateCw, CheckCircle, Clock, Eye, Filter } from 'lucide-react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PdfViewerModal } from '../scanning/components/PdfViewerModal';


export const DetailsScreen: React.FC<{ navigation: any; route: any }> = ({
    navigation,
    route,
}) => {
    const { id, title } = route.params;
    const dispatch = useDispatch<any>();
    const insets = useSafeAreaInsets();

    const paper = useSelector((state: any) =>
        state.evaluator.papers.find((p: any) => p.id === id)
    );

    const { answerSheets, loading, answerSheetsCompleted, answerSheetsTotal, evaluating } = useSelector(
        (state: any) => state.evaluator
    );

    const [refreshing, setRefreshing] = useState(false);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [filterStatus, setFilterStatus] = useState('all');
    const [filterVisible, setFilterVisible] = useState(false);
    const [selectedPdfUrl, setSelectedPdfUrl] = useState<string | null>(null);
    const [isPdfVisible, setIsPdfVisible] = useState(false);

    const [isLoadingMore, setIsLoadingMore] = useState(false);

    const loadData = useCallback(async () => {
        if (id) {
            await dispatch(fetchAnswerSheets({
                paperId: id,
                limit: 10,
                offset: 0,
                status: filterStatus === 'all' ? undefined : filterStatus
            }));
        }
    }, [dispatch, id, filterStatus]);

    useFocusEffect(
        useCallback(() => {
            loadData();
            setSelectedIds(new Set()); // Reset selection on focus/reload
        }, [loadData])
    );

    const onRefresh = async () => {
        setRefreshing(true);
        await loadData();
        setRefreshing(false);
    };

    const toggleSelection = (sheetId: string) => {
        const newSelected = new Set(selectedIds);
        if (newSelected.has(sheetId)) {
            newSelected.delete(sheetId);
        } else {
            newSelected.add(sheetId);
        }
        setSelectedIds(newSelected);
    };

    const handleLoadMore = () => {
        if (!loading && !isLoadingMore && answerSheets.length < answerSheetsTotal) {
            setIsLoadingMore(true);
            dispatch(fetchAnswerSheets({
                paperId: id,
                limit: 50,
                offset: answerSheets.length,
                status: filterStatus === 'all' ? undefined : filterStatus
            })).finally(() => setIsLoadingMore(false));
        }
    };

    const handleSelectAll = () => {
        const selectableSheets = answerSheets.filter(
            (item: AnswerSheet) => item.status !== 'processing'
        );

        // If all currently selectable items are strictly already selected, then deselect all.
        // Otherwise, select all selectable items.
        // Note: selectedIds might contain items that are no longer selectable/visible? 
        // Let's just check if the count matches.

        const allSelectableIds = new Set<string>(selectableSheets.map((item: AnswerSheet) => item.id));
        const areAllSelected = selectableSheets.length > 0 && selectableSheets.every((item: AnswerSheet) => selectedIds.has(item.id));

        if (areAllSelected) {
            setSelectedIds(new Set());
        } else {
            setSelectedIds(allSelectableIds);
        }
    };

    const handleEvaluate = async () => {
        if (selectedIds.size === 0) {
            Alert.alert('Selection Required', 'Please select at least one answer sheet to evaluate.');
            return;
        }

        try {
            await dispatch(evaluateAnswerCopies({
                paperCodeId: id,
                fileIds: Array.from(selectedIds)
            })).unwrap();

            Alert.alert('Success', 'Evaluation started for selected items.');
            setSelectedIds(new Set());
            loadData(); // Refresh list to show status changes if any specific "evaluating" status exists, mainly rely on server update
        } catch (error: any) {
            Alert.alert('Error', error.toString());
        }
    };

    // If paper status is pending, show Setup Required state
    if (paper?.status === 'pending') {
        return (
            <View style={styles.container}>
                <StatusBar barStyle="light-content" backgroundColor={colors.darkBackground || '#000000'} />
                <View style={[styles.header, { paddingTop: insets.top }]}>
                    <TouchableOpacity onPress={() => navigation.goBack()} style={styles.iconButton}>
                        <ArrowLeft color={colors.white} size={24} />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>{title || "Details"}</Text>
                    <View style={{ width: 40 }} />
                </View>

                <View style={styles.emptyState}>
                    <View style={styles.iconCircle}>
                        <AlertTriangle size={48} color={colors.warning} />
                    </View>
                    <Text style={styles.emptyTitle}>Setup Required</Text>
                    <Text style={styles.emptyText}>
                        This paper hasn't been configured for evaluation yet. Please upload the question paper and set marking rules.
                    </Text>
                    <TouchableOpacity
                        style={styles.setupButton}
                        onPress={() => navigation.navigate('EvaluatorSetup', { paper })}
                    >
                        <Text style={styles.setupButtonText}>Configure Evaluation</Text>
                        <ChevronRight size={20} color={colors.white} />
                    </TouchableOpacity>
                </View>
            </View>
        );
    }

    const openPdf = (url: string) => {
        if (!url) {
            Alert.alert('Unavailable', 'No PDF URL found for this item.');
            return;
        }
        setSelectedPdfUrl(url);
        setIsPdfVisible(true);
    };

    const renderItem = ({ item }: { item: AnswerSheet }) => {
        const isSelected = selectedIds.has(item.id);
        const isCompleted = item.status === 'completed';
        const isProcessing = item.status === 'processing';
        const isSelectable = !isProcessing;

        const handlePress = () => {
            if (isSelectable) {
                toggleSelection(item.id);
            }
        };

        return (
            <TouchableOpacity
                style={[
                    styles.card,
                    isSelected && styles.cardSelected,
                    !isSelectable && { opacity: 0.8 }
                ]}
                onPress={handlePress}
                activeOpacity={isSelectable ? 0.7 : 1}
            >
                {/* Selection Checkbox */}
                <View style={[styles.checkboxContainer, !isSelectable && { opacity: 0.5 }]}>
                    {isSelectable ? (
                        isSelected ? (
                            <CheckSquare size={20} color={colors.primary} />
                        ) : (
                            <Square size={20} color={colors.darkTextSecondary} />
                        )
                    ) : (
                        <Square size={20} color={colors.darkTextSecondary} style={{ opacity: 0.3 }} />
                    )}
                </View>

                {/* Content */}
                <View style={styles.cardContent}>
                    <View style={styles.cardRow}>
                        <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8, marginRight: 8 }}>
                            <Text style={[styles.fileName, { flex: 0, flexShrink: 1, marginRight: 0 }]} numberOfLines={1}>
                                {item.fileName}
                            </Text>
                            <TouchableOpacity onPress={() => openPdf(item.s3Url)} hitSlop={8}>
                                <Eye size={18} color={colors.primary} />
                            </TouchableOpacity>
                        </View>

                        {isCompleted ? (
                            <View style={styles.statusBadgeSuccess}>
                                <Text style={styles.statusTextSuccess}>Completed</Text>
                            </View>
                        ) : isProcessing ? (
                            <View style={[styles.statusBadgePending, { flexDirection: 'row', alignItems: 'center', gap: 4 }]}>
                                <ActivityIndicator size="small" color={colors.warning} />
                                <Text style={[styles.statusTextPending, { color: colors.warning }]}>Processing</Text>
                            </View>
                        ) : (
                            <View style={styles.statusBadgePending}>
                                <Text style={styles.statusTextPending}>Not Evaluated</Text>
                            </View>
                        )}
                    </View>

                    <View style={styles.cardRow}>
                        {isProcessing ? (
                            <Text style={{ color: colors.darkTextSecondary, fontSize: 12, fontStyle: 'italic' }}>
                                AI is analyzing this document...
                            </Text>
                        ) : (
                            <>
                                <View style={styles.metricContainer}>
                                    <Text style={styles.metricLabel}>Score</Text>
                                    <Text style={styles.metricValue}>
                                        {isCompleted ? `${item.score}/${item.maxScore}` : '-'}
                                    </Text>
                                </View>
                                <View style={styles.metricContainer}>
                                    <Text style={styles.metricLabel}>Percentage</Text>
                                    <Text style={styles.metricValue}>
                                        {isCompleted && item.percentage ? `${item.percentage.toFixed(1)}%` : '-'}
                                    </Text>
                                </View>
                            </>
                        )}

                        {isCompleted && (
                            <TouchableOpacity
                                onPress={() => navigation.navigate('Report', { id: item.id, sheetId: item.id })}
                                style={styles.detailsLink}
                            >
                                <Text style={styles.detailsLinkText}>View Details</Text>
                                <ChevronRight size={14} color={colors.primary} />
                            </TouchableOpacity>
                        )}
                    </View>
                </View>
            </TouchableOpacity>
        );
    };

    const handleFilterSelect = (status: string) => {
        setFilterStatus(status);
        setFilterVisible(false);
    };

    const renderFilterMenu = () => (
        <Modal
            transparent
            visible={filterVisible}
            animationType="fade"
            onRequestClose={() => setFilterVisible(false)}
        >
            <TouchableOpacity
                style={styles.modalOverlay}
                activeOpacity={1}
                onPress={() => setFilterVisible(false)}
            >
                <View style={[styles.filterMenu, { marginTop: insets.top + 50 }]}>
                    <TouchableOpacity style={styles.menuItem} onPress={() => handleFilterSelect('all')}>
                        <Text style={[styles.menuText, filterStatus === 'all' && styles.menuTextSelected]}>All Sheets</Text>
                        {filterStatus === 'all' && <CheckCircle size={16} color={colors.primary} />}
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.menuItem} onPress={() => handleFilterSelect('processing')}>
                        <Text style={[styles.menuText, filterStatus === 'processing' && styles.menuTextSelected]}>Processing</Text>
                        {filterStatus === 'processing' && <CheckCircle size={16} color={colors.primary} />}
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.menuItem} onPress={() => handleFilterSelect('completed')}>
                        <Text style={[styles.menuText, filterStatus === 'completed' && styles.menuTextSelected]}>Completed</Text>
                        {filterStatus === 'completed' && <CheckCircle size={16} color={colors.primary} />}
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.menuItem, { borderBottomWidth: 0 }]} onPress={() => handleFilterSelect('failed')}>
                        <Text style={[styles.menuText, filterStatus === 'failed' && styles.menuTextSelected]}>Failed</Text>
                        {filterStatus === 'failed' && <CheckCircle size={16} color={colors.primary} />}
                    </TouchableOpacity>
                </View>
            </TouchableOpacity>
        </Modal>
    );

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" backgroundColor={colors.darkBackground || '#000000'} />

            {/* Header */}
            <View style={[styles.header, { paddingTop: insets.top }]}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.iconButton}>
                    <ArrowLeft color={colors.white} size={24} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>{title || "Details"}</Text>
                <TouchableOpacity onPress={() => navigation.navigate('EvaluatorSetup', { paper, mode: 'edit' })}>
                    <Text style={{ color: colors.primary, fontWeight: '600', fontSize: 16 }}>Settings</Text>
                </TouchableOpacity>
            </View>

            {/* Stats Overview */}
            <View style={styles.statsCard}>
                <View style={styles.statItem}>
                    <View style={[styles.statIconContainer, { backgroundColor: '#2C2C2E' }]}>
                        <FileText size={20} color={colors.white} />
                    </View>
                    <View>
                        <Text style={styles.statValue}>{answerSheetsTotal}</Text>
                        <Text style={styles.statLabel}>Total</Text>
                    </View>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.statItem}>
                    <View style={[styles.statIconContainer, { backgroundColor: 'rgba(76, 175, 80, 0.15)' }]}>
                        <CheckCircle size={20} color={colors.success} />
                    </View>
                    <View>
                        <Text style={styles.statValue}>{answerSheetsCompleted}</Text>
                        <Text style={styles.statLabel}>Evaluated</Text>
                    </View>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.statItem}>
                    <View style={[styles.statIconContainer, { backgroundColor: 'rgba(255, 193, 7, 0.15)' }]}>
                        <Clock size={20} color={colors.warning} />
                    </View>
                    <View>
                        <Text style={styles.statValue}>{answerSheetsTotal - answerSheetsCompleted}</Text>
                        <Text style={styles.statLabel}>Pending</Text>
                    </View>
                </View>
            </View>

            {/* Action Bar */}
            <View style={styles.toolbar}>
                <TouchableOpacity onPress={handleSelectAll} style={styles.selectAllContainer} activeOpacity={0.7}>
                    {selectedIds.size === answerSheets?.length && answerSheets.length > 0 ? (
                        <CheckSquare size={22} color={colors.primary} />
                    ) : (
                        <Square size={22} color={colors.darkTextSecondary} />
                    )}
                    <Text style={[styles.selectAllText, selectedIds.size > 0 && { color: colors.white }]}>
                        Select All
                    </Text>
                </TouchableOpacity>

                <View style={styles.toolbarActions}>
                    <TouchableOpacity
                        onPress={() => setFilterVisible(true)}
                        style={[styles.iconActionButton, filterStatus !== 'all' && styles.activeFilter]}
                        activeOpacity={0.7}
                    >
                        <Filter size={20} color={filterStatus !== 'all' ? colors.primary : colors.darkTextSecondary} />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={onRefresh} style={styles.iconActionButton} activeOpacity={0.7}>
                        <RotateCw size={20} color={colors.white} />
                    </TouchableOpacity>

                    <TouchableOpacity
                        onPress={handleEvaluate}
                        style={[styles.primaryActionButton, selectedIds.size === 0 && styles.buttonDisabled]}
                        disabled={selectedIds.size === 0 || evaluating}
                        activeOpacity={0.8}
                    >
                        {evaluating ? (
                            <ActivityIndicator size="small" color={colors.white} />
                        ) : (
                            <>
                                <Text style={styles.primaryButtonText}>Evaluate</Text>
                                {selectedIds.size > 0 && (
                                    <View style={styles.countBadge}>
                                        <Text style={styles.countBadgeText}>{selectedIds.size}</Text>
                                    </View>
                                )}
                            </>
                        )}
                    </TouchableOpacity>
                </View>
            </View>

            <FlatList
                data={answerSheets}
                renderItem={renderItem}
                keyExtractor={(item) => item.id}
                contentContainerStyle={styles.listContent}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} colors={[colors.primary]} />
                }
                onEndReached={handleLoadMore}
                onEndReachedThreshold={0.5}
                ListEmptyComponent={
                    !loading ? (
                        <View style={styles.emptyList}>
                            <Text style={styles.emptyListText}>No answer sheets found.</Text>
                        </View>
                    ) : null
                }
                ListFooterComponent={
                    (loading || isLoadingMore) ?
                        <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 20 }} />
                        : <View style={{ height: 20 }} />
                }
            />
            {renderFilterMenu()}

            <PdfViewerModal
                visible={isPdfVisible}
                fileUri={selectedPdfUrl || ''}
                onClose={() => {
                    setIsPdfVisible(false);
                    setSelectedPdfUrl(null);
                }}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.darkBackground || '#000000',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingBottom: 20,
        backgroundColor: colors.darkBackground || '#000000',
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: colors.white,
    },
    iconButton: {
        padding: 8,
        backgroundColor: colors.iconBackground || '#2C2C2E',
        borderRadius: 20,
    },
    listContent: {
        padding: 16,
        paddingBottom: 40,
    },
    statsCard: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        backgroundColor: colors.cardBlack || '#1C1C1E',
        marginHorizontal: 16,
        padding: 12,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: '#2C2C2E',
        gap: 12,
        marginBottom: 16,
    },
    statItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        minWidth: '30%',
        flex: 1,
        paddingVertical: 4,
    },
    statIconContainer: {
        width: 36,
        height: 36,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
    },
    statDivider: {
        width: 1,
        height: 30,
        backgroundColor: '#2C2C2E',
        marginHorizontal: 0,
        display: 'none', // Hide dividers for responsive layout
    },
    statLabel: {
        fontSize: 10,
        color: colors.darkTextSecondary,
        textTransform: 'uppercase',
        fontWeight: '600',
    },
    statValue: {
        fontSize: 18,
        fontWeight: '700',
        color: colors.white,
        lineHeight: 22,
    },
    toolbar: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingBottom: 12,
    },
    selectAllContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        padding: 8,
    },
    selectAllText: {
        color: colors.darkTextSecondary,
        fontSize: 14,
        fontWeight: '600',
    },
    toolbarActions: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    iconActionButton: {
        width: 40,
        height: 40,
        borderRadius: 12,
        backgroundColor: colors.cardBlack,
        borderWidth: 1,
        borderColor: '#2C2C2E',
        alignItems: 'center',
        justifyContent: 'center',
    },
    primaryActionButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.primary,
        height: 40,
        borderRadius: 12,
        paddingHorizontal: 16,
        gap: 8,
    },
    buttonDisabled: {
        backgroundColor: '#2C2C2E',
        opacity: 0.5,
    },
    primaryButtonText: {
        color: colors.white,
        fontWeight: '700',
        fontSize: 14,
    },
    countBadge: {
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 6,
    },
    countBadgeText: {
        color: colors.white,
        fontSize: 10,
        fontWeight: '700',
    },
    card: {
        backgroundColor: colors.cardBlack || '#1C1C1E',
        borderRadius: 12,
        marginBottom: 12,
        flexDirection: 'row',
        alignItems: 'flex-start', // Top align check box
        padding: 16,
        borderWidth: 1,
        borderColor: '#2C2C2E',
    },
    cardSelected: {
        borderColor: colors.primary,
        backgroundColor: 'rgba(255, 107, 53, 0.05)',
    },
    checkboxContainer: {
        marginRight: 16,
        paddingTop: 2,
    },
    cardContent: {
        flex: 1,
    },
    cardRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    fileName: {
        fontSize: 16,
        fontWeight: '600',
        color: colors.white, // Red in screenshot, but white probably better for dark theme text unless specific. Screenshot implies red for PDF? Let's use primary or user preference. Let's stick to white/primary.
        flex: 1,
        marginRight: 8,
    },
    statusBadgeSuccess: {
        backgroundColor: 'rgba(76, 175, 80, 0.15)',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: colors.success,
    },
    statusTextSuccess: {
        fontSize: 10,
        fontWeight: '700',
        color: colors.success,
        textTransform: 'uppercase',
    },
    statusBadgePending: {
        backgroundColor: '#2C2C2E',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
    },
    statusTextPending: {
        fontSize: 10,
        fontWeight: '700',
        color: colors.darkTextSecondary,
        textTransform: 'uppercase',
    },
    metricContainer: {
        alignItems: 'flex-start',
    },
    metricLabel: {
        fontSize: 10,
        color: colors.darkTextSecondary,
        marginBottom: 2,
        textTransform: 'uppercase',
    },
    metricValue: {
        fontSize: 14,
        fontWeight: '700',
        color: colors.white,
    },
    detailsLink: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 4,
        gap: 2,
    },
    detailsLinkText: {
        fontSize: 12,
        fontWeight: '600',
        color: colors.primary,
    },
    emptyList: {
        padding: 40,
        alignItems: 'center',
    },
    emptyListText: {
        fontSize: 14,
        color: colors.darkTextSecondary,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'flex-start',
        alignItems: 'flex-end',
    },
    filterMenu: {
        backgroundColor: colors.cardBlack,
        borderRadius: 12,
        padding: 8,
        marginRight: 20,
        minWidth: 180,
        borderWidth: 1,
        borderColor: '#2C2C2E',
        shadowColor: "#000",
        shadowOffset: {
            width: 0,
            height: 4,
        },
        shadowOpacity: 0.30,
        shadowRadius: 4.65,
        elevation: 8,
    },
    menuItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#2C2C2E',
    },
    menuText: {
        fontSize: 14,
        color: colors.darkTextSecondary,
        fontWeight: '500',
    },
    menuTextSelected: {
        color: colors.primary,
        fontWeight: '700',
    },
    activeFilter: {
        backgroundColor: 'rgba(255, 107, 53, 0.1)',
        borderColor: colors.primary,
    },
    emptyState: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        padding: 40,
        marginTop: -60,
    },
    iconCircle: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: 'rgba(255, 193, 7, 0.1)',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 24,
    },
    emptyTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: colors.white,
        marginBottom: 8,
    },
    emptyText: {
        fontSize: 14,
        color: colors.darkTextSecondary,
        textAlign: 'center',
        marginBottom: 32,
        maxWidth: 300,
        lineHeight: 20,
    },
    setupButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.primary,
        paddingVertical: 14,
        paddingHorizontal: 24,
        borderRadius: 30,
        gap: 8,
    },
    setupButtonText: {
        fontWeight: '600',
        color: colors.white,
        fontSize: 16,
    },
});
