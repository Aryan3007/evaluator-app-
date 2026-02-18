import React, { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    TouchableOpacity,
    TextInput,
    ActivityIndicator,
    RefreshControl,
    Dimensions,
    StatusBar,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Search, Filter, Calendar, TrendingUp, ChevronRight, X, ArrowLeft, SortAsc, SortDesc } from 'lucide-react-native';
import { colors } from '../../theme/colors';
import { spacing, borderRadius } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import { fetchPaperCodes, setSelectedPaperId } from '../../core/redux/evaluatorSlice';
import { PaperCode } from '../../core/redux/types';

// Simple debounce hook
function useDebounce<T>(value: T, delay: number): T {
    const [debouncedValue, setDebouncedValue] = useState<T>(value);
    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedValue(value);
        }, delay);
        return () => clearTimeout(handler);
    }, [value, delay]);
    return debouncedValue;
}

const { width } = Dimensions.get('window');

export const DashboardScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
    const dispatch = useDispatch<any>();
    const insets = useSafeAreaInsets();
    const { papers, loading, totalPapers } = useSelector((state: any) => state.evaluator);

    const [searchQuery, setSearchQuery] = useState('');
    const debouncedSearchQuery = useDebounce(searchQuery, 500);
    const [statusFilter, setStatusFilter] = useState<'all' | 'completed' | 'in-progress' | 'pending'>('all');
    const [refreshing, setRefreshing] = useState(false);
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
    const [isLoadingMore, setIsLoadingMore] = useState(false);

    const loadData = useCallback(() => {
        dispatch(fetchPaperCodes({
            limit: 10,
            search: debouncedSearchQuery || undefined,
        }));
    }, [dispatch, debouncedSearchQuery]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    const onRefresh = async () => {
        setRefreshing(true);
        await dispatch(fetchPaperCodes({ limit: 10 }));
        setRefreshing(false);
    };

    const handlePaperPress = (paper: PaperCode) => {
        dispatch(setSelectedPaperId(paper.id));
        navigation.navigate('Details', { id: paper.id, title: paper.subject });
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'completed': return colors.success;
            case 'in-progress': return colors.warning;
            case 'pending': return colors.darkTextSecondary; // Using grey for pending
            default: return colors.darkTextSecondary;
        }
    };

    const getStatusLabel = (status: string) => {
        return status.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
    };

    const handleLoadMore = () => {
        if (!loading && !isLoadingMore && papers.length < totalPapers) {
            setIsLoadingMore(true);
            dispatch(fetchPaperCodes({
                limit: 10,
                offset: papers.length,
                search: debouncedSearchQuery || undefined,
            })).finally(() => setIsLoadingMore(false));
        }
    };

    const toggleSort = () => {
        setSortOrder(prev => prev === 'desc' ? 'asc' : 'desc');
    };

    // Filter locally if needed
    const filteredPapers = papers.filter((p: PaperCode) => {
        if (statusFilter === 'all') return true;
        return p.status === statusFilter;
    });

    const sortedPapers = [...filteredPapers].sort((a, b) => {
        const dateA = new Date(a.date).getTime();
        const dateB = new Date(b.date).getTime();
        return sortOrder === 'asc' ? dateA - dateB : dateB - dateA;
    });

    const renderFilterChip = (status: 'all' | 'completed' | 'in-progress' | 'pending', label: string) => (
        <TouchableOpacity
            style={[
                styles.filterChip,
                statusFilter === status && styles.filterChipActive,
            ]}
            onPress={() => setStatusFilter(status)}
        >
            <Text style={[
                styles.filterChipText,
                statusFilter === status && styles.filterChipTextActive,
            ]}>
                {label}
            </Text>
        </TouchableOpacity>
    );

    const renderItem = ({ item }: { item: PaperCode }) => {
        const progress = item.totalCopies > 0 ? (item.evaluated / item.totalCopies) : 0;

        return (
            <TouchableOpacity
                style={styles.card}
                onPress={() => handlePaperPress(item)}
                activeOpacity={0.7}
            >
                <View style={styles.cardHeader}>
                    <View style={styles.cardTitleContainer}>
                        <Text style={styles.cardTitle} numberOfLines={1}>{item.subject}</Text>
                        <Text style={styles.cardCode}>{item.code}</Text>
                    </View>
                    <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) + '20' }]}>
                        <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>
                            {getStatusLabel(item.status)}
                        </Text>
                    </View>
                </View>

                <View style={styles.cardContent}>
                    <View style={styles.progressContainer}>
                        <View style={styles.progressRow}>
                            <TrendingUp size={14} color={colors.darkTextSecondary} />
                            <Text style={styles.progressText}>
                                {item.evaluated} / {item.totalCopies} <Text style={{ fontSize: 10, color: colors.darkTextSecondary }}>Evaluated</Text>
                            </Text>
                        </View>
                        {/* Simple Progress Bar */}
                        <View style={styles.progressBarBg}>
                            <View style={[styles.progressBarFill, { width: `${Math.min(progress * 100, 100)}%`, backgroundColor: getStatusColor(item.status) }]} />
                        </View>
                    </View>

                    <View style={styles.dateContainer}>
                        <Calendar size={14} color={colors.darkTextSecondary} />
                        <Text style={styles.dateText}>
                            {new Date(item.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                        </Text>
                    </View>
                </View>
            </TouchableOpacity>
        );
    };

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" backgroundColor={colors.darkBackground || '#000000'} />

            {/* Custom Header */}
            <View style={[styles.header, { paddingTop: insets.top }]}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.iconButton}>
                    <ArrowLeft color={colors.white} size={24} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Dashboard</Text>
                <View style={{ width: 40 }} />
            </View>

            <View style={styles.searchContainer}>
                <View style={styles.searchInputContainer}>
                    <Search size={20} color={colors.darkTextSecondary} style={styles.searchIcon} />
                    <TextInput
                        style={styles.searchInput}
                        placeholder="Search by subject or paper code..."
                        placeholderTextColor={colors.darkTextSecondary}
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                    />
                    {searchQuery.length > 0 && (
                        <TouchableOpacity onPress={() => setSearchQuery('')}>
                            <X size={18} color={colors.darkTextSecondary} />
                        </TouchableOpacity>
                    )}
                    <TouchableOpacity onPress={toggleSort}>
                        {sortOrder === 'desc' ? (
                            <SortDesc size={18} color={colors.darkTextSecondary} />
                        ) : (
                            <SortAsc size={18} color={colors.darkTextSecondary} />
                        )}
                    </TouchableOpacity>
                </View>
            </View>

            <View style={styles.filtersContainer}>
                <FlatList
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    data={['all', 'pending', 'in-progress', 'completed'] as const}
                    keyExtractor={(item) => item}
                    renderItem={({ item }) => {
                        const labels: Record<string, string> = {
                            'all': 'All Papers',
                            'completed': 'Completed',
                            'in-progress': 'In Progress',
                            'pending': 'Pending'
                        };
                        return renderFilterChip(item, labels[item]);
                    }}
                    contentContainerStyle={styles.filtersContent}
                />
            </View>

            <FlatList
                data={sortedPapers}
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
                        <View style={styles.emptyState}>
                            <Search size={48} color={colors.darkTextSecondary} />
                            <Text style={styles.emptyStateTitle}>No papers found</Text>
                            <Text style={styles.emptyStateText}>Try adjusting your search or filters</Text>
                        </View>
                    ) : null
                }
                ListFooterComponent={
                    (loading || isLoadingMore) ?
                        <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 20 }} />
                        : <View style={{ height: 20 }} />
                }
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
        paddingBottom: 5,
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
    searchContainer: {
        backgroundColor: colors.darkBackground || '#000000',
        paddingHorizontal: 20,
        paddingVertical: 12,
    },
    searchInputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.cardBlack || '#1C1C1E',
        borderRadius: 12,
        paddingHorizontal: 16,
        height: 48,
        borderWidth: 1,
        borderColor: '#2C2C2E',
    },
    searchIcon: {
        marginRight: 12,
    },
    searchInput: {
        flex: 1,
        fontSize: 15,
        color: colors.white,
        height: '100%',
    },
    filtersContainer: {
        backgroundColor: colors.darkBackground || '#000000',
        paddingVertical: 12,
    },
    filtersContent: {
        paddingHorizontal: 20,
    },
    filterChip: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        backgroundColor: colors.cardBlack || '#1C1C1E',
        marginRight: 10,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: '#2C2C2E',
    },
    filterChipActive: {
        backgroundColor: 'rgba(255, 107, 53, 0.1)', // Primary opacity
        borderColor: colors.primary,
    },
    filterChipText: {
        fontSize: 13,
        fontWeight: '600',
        color: colors.darkTextSecondary,
    },
    filterChipTextActive: {
        color: colors.primary,
    },
    listContent: {
        padding: 20,
        paddingBottom: 100,
    },
    card: {
        backgroundColor: colors.cardBlack || '#1C1C1E',
        borderRadius: 16,
        padding: 16,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: '#2C2C2E',
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 12,
    },
    cardTitleContainer: {
        flex: 1,
        marginRight: 12,
    },
    cardTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: colors.white,
        marginBottom: 4,
    },
    cardCode: {
        fontSize: 12,
        color: colors.darkTextSecondary,
        backgroundColor: '#2C2C2E',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4,
        alignSelf: 'flex-start',
        overflow: 'hidden',
    },
    statusBadge: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 6,
    },
    statusText: {
        fontSize: 10,
        fontWeight: '700',
        textTransform: 'uppercase',
    },
    cardContent: {
        gap: 8,
    },
    progressContainer: {
        marginBottom: 4,
    },
    progressRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginBottom: 8,
    },
    progressText: {
        fontSize: 14,
        fontWeight: '600',
        color: colors.white,
    },
    progressBarBg: {
        height: 6,
        backgroundColor: '#2C2C2E',
        borderRadius: 3,
        overflow: 'hidden',
    },
    progressBarFill: {
        height: '100%',
        borderRadius: 3,
    },
    dateContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'flex-end',
        gap: 4,
        marginTop: 4,
    },
    dateText: {
        fontSize: 12,
        color: colors.darkTextSecondary,
        fontWeight: '500',
    },
    emptyState: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 60,
    },
    emptyStateTitle: {
        marginTop: 16,
        fontSize: 18,
        fontWeight: '600',
        color: colors.white,
    },
    emptyStateText: {
        marginTop: 4,
        fontSize: 14,
        color: colors.darkTextSecondary,
    },
});
