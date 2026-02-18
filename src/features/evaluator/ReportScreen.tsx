import React, { useEffect, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    ActivityIndicator,
    Share,
    Alert,
    Platform,
    StatusBar,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { colors } from '../../theme/colors';
import { spacing, borderRadius } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import { fetchEvaluationReport } from '../../core/redux/evaluatorSlice';
import { ApiEvaluationAnswer } from '../../core/redux/types';
import { CheckCircle, AlertTriangle, ChevronDown, ChevronUp, Copy, Share2, Printer, Star, ArrowLeft, Download, FileText } from 'lucide-react-native';
import Clipboard from '@react-native-clipboard/clipboard';
import ReactNativeBlobUtil from 'react-native-blob-util';
// import LinearGradient from 'react-native-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export const ReportScreen: React.FC<{ navigation: any; route: any }> = ({
    navigation,
    route,
}) => {
    const { sheetId } = route.params;
    const dispatch = useDispatch<any>();
    const insets = useSafeAreaInsets();

    const { currentReport, reportLoading, reportError, answerSheets } = useSelector((state: any) => state.evaluator);

    useEffect(() => {
        if (sheetId) {
            dispatch(fetchEvaluationReport(sheetId));
        }
    }, [dispatch, sheetId]);

    const handleCopy = (text: string) => {
        Clipboard.setString(text);
        Alert.alert('Copied', 'Model answer copied to clipboard');
    };

    const handleShare = async () => {
        try {
            await Share.share({
                message: `Evaluation Report for ${currentReport?.student_name || 'Student'}. Score: ${currentReport?.overall_score}/${currentReport?.max_score}`,
            });
        } catch (error: any) {
            Alert.alert(error.message);
        }
    };

    const handleDownload = async () => {
        let url = currentReport?.s3_url || currentReport?.file_url;

        // Fallback: Check answerSheets if URL is missing in the report
        if (!url && answerSheets && answerSheets.length > 0) {
            const sheet = answerSheets.find((s: any) => s.id === currentReport?.file_id || s.file_id === currentReport?.file_id);
            if (sheet) {
                url = sheet.s3Url || sheet.s3_url;
            }
        }

        if (!url) {
            Alert.alert('Error', 'Download URL not available');
            return;
        }

        try {
            const { dirs } = ReactNativeBlobUtil.fs;
            const fileName = currentReport.file_name || `report_${sheetId}.pdf`;
            const path = Platform.OS === 'ios' ? dirs.DocumentDir + '/' + fileName : dirs.DownloadDir + '/' + fileName;

            ReactNativeBlobUtil.config({
                fileCache: true,
                path: path,
                addAndroidDownloads: {
                    useDownloadManager: true,
                    notification: true,
                    mediaScannable: true,
                    title: fileName,
                    path: path,
                }
            })
                .fetch('GET', url)
                .then((res) => {
                    Alert.alert('Success', 'File downloaded successfully');
                    if (Platform.OS === 'ios') {
                        ReactNativeBlobUtil.ios.openDocument(res.data());
                    }
                })
                .catch((err) => {
                    Alert.alert('Error', 'Download failed: ' + err.message);
                });
        } catch (error: any) {
            Alert.alert('Error', 'Download failed');
        }
    };

    if (reportLoading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={colors.primary} />
            </View>
        );
    }

    if (reportError || !currentReport) {
        return (
            <View style={styles.container}>
                <View style={[styles.header, { paddingTop: insets.top }]}>
                    <TouchableOpacity onPress={() => navigation.goBack()} style={styles.iconButton}>
                        <ArrowLeft color={colors.white} size={24} />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Report</Text>
                    <View style={{ width: 40 }} />
                </View>
                <View style={styles.errorContainer}>
                    <Text style={styles.errorText}>Failed to load report</Text>
                    <TouchableOpacity onPress={() => dispatch(fetchEvaluationReport(sheetId))} style={styles.retryBtn}>
                        <Text style={styles.retryText}>Retry</Text>
                    </TouchableOpacity>
                </View>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" backgroundColor={colors.darkBackground || '#000000'} />

            <View style={[styles.header, { paddingTop: insets.top }]}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.iconButton}>
                    <ArrowLeft color={colors.white} size={24} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Evaluation Report</Text>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                    <TouchableOpacity onPress={handleDownload} style={styles.iconButton}>
                        <Download size={24} color={colors.white} />
                    </TouchableOpacity>

                </View>
            </View>

            <ScrollView contentContainerStyle={styles.content}>

                {/* Score Card */}
                {/* Student Info */}
                <View style={styles.studentHeader}>
                    <Text style={styles.studentLabel}>STUDENT DETAILS</Text>
                    <View>
                        <Text style={styles.studentName} numberOfLines={1}>{currentReport.student_name || 'Unknown'}</Text>
                        <Text style={styles.studentRoll}>Roll No: {currentReport.student_roll_number || 'N/A'}</Text>
                    </View>
                </View>

                {/* Stats Grid - Simple Dark UI */}
                {/* Stats Grid */}
                <View style={styles.statsGrid}>
                    <View style={styles.statCard}>
                        <View style={[styles.iconCircle, { backgroundColor: 'rgba(76, 175, 80, 0.15)' }]}>
                            <CheckCircle size={28} color={colors.success} />
                        </View>
                        <View style={{ alignItems: 'center' }}>
                            <Text style={styles.statValueBig}>
                                {currentReport.overall_score}
                                <Text style={styles.statMax}>/{currentReport.max_score || 0}</Text>
                            </Text>
                            <Text style={styles.statLabelSmall}>Marks Scored</Text>
                        </View>
                    </View>

                    <View style={styles.statCard}>
                        <View style={[styles.iconCircle, { backgroundColor: 'rgba(255, 193, 7, 0.15)' }]}>
                            <Star size={28} color={colors.warning} fill={colors.warning} />
                        </View>
                        <View style={{ alignItems: 'center' }}>
                            <Text style={styles.statValueBig}>
                                {currentReport.percentage ? Math.round(currentReport.percentage) : 0}%
                            </Text>
                            <Text style={styles.statLabelSmall}>Final Result</Text>
                        </View>
                    </View>
                </View>

                {/* Questions List */}
                <Text style={styles.sectionTitle}>Detailed Analysis</Text>

                {currentReport.answers?.map((answer: ApiEvaluationAnswer, index: number) => (
                    <QuestionCard key={answer.answer_id} data={answer} index={index} onCopy={handleCopy} />
                ))}

            </ScrollView>
        </View>
    );
};

// Sub-component for Question Card
const QuestionCard = ({ data, index, onCopy }: { data: ApiEvaluationAnswer, index: number, onCopy: (text: string) => void }) => {
    const [showModel, setShowModel] = useState(false);

    const isCorrect = data.marks_obtained >= data.max_marks;
    const isPartial = data.marks_obtained > 0 && data.marks_obtained < data.max_marks;

    return (
        <View style={styles.questionCard}>
            {/* Header */}
            <View style={styles.qHeader}>
                <View style={{ flex: 1 }}>
                    <Text style={styles.qTitle}>Question {data.question_number || index + 1}</Text>
                    <Text style={styles.qText}>{data.question_text}</Text>
                </View>
                <View style={[styles.markBadge,
                isCorrect ? styles.markSuccess : isPartial ? styles.markPartial : styles.markWrong
                ]}>
                    <Text style={[styles.markText,
                    isCorrect ? styles.textSuccess : isPartial ? styles.textPartial : styles.textWrong
                    ]}>
                        {data.marks_obtained}/{data.max_marks}
                    </Text>
                </View>
            </View>

            {/* Feedback */}
            <View style={styles.feedbackContainer}>
                {/* Strengths */}
                {data.strengths?.length > 0 && (
                    <View style={[styles.feedbackBox, styles.bgSuccess]}>
                        <View style={styles.feedbackHeader}>
                            <CheckCircle size={16} color={colors.success} />
                            <Text style={[styles.feedbackTitle, styles.textSuccess]}>Strengths</Text>
                        </View>
                        {data.strengths.map((point: string, i: number) => (
                            <Text key={i} style={[styles.feedbackPoint, styles.textSuccessDark]}>• {point}</Text>
                        ))}
                    </View>
                )}

                {/* Improvements */}
                {data.improvements?.length > 0 && (
                    <View style={[styles.feedbackBox, styles.bgWarning]}>
                        <View style={styles.feedbackHeader}>
                            <AlertTriangle size={16} color={colors.warning} />
                            <Text style={[styles.feedbackTitle, styles.textWarning]}>Improvements</Text>
                        </View>
                        {data.improvements.map((point: string, i: number) => (
                            <Text key={i} style={[styles.feedbackPoint, styles.textWarningDark]}>• {point}</Text>
                        ))}
                    </View>
                )}
            </View>

            {/* Model Answer Toggle */}
            <TouchableOpacity
                style={styles.modelToggle}
                onPress={() => setShowModel(!showModel)}
            >
                <Text style={styles.modelToggleText}>
                    {showModel ? 'Hide Model Answer' : 'View Model Answer'}
                </Text>
                {showModel ? <ChevronUp size={16} color={colors.primary} /> : <ChevronDown size={16} color={colors.primary} />}
            </TouchableOpacity>

            {showModel && (
                <View style={styles.modelBox}>
                    <View style={styles.modelHeader}>
                        <Text style={styles.modelTitle}>Correct Answer Reference</Text>
                        <TouchableOpacity onPress={() => onCopy(data.model_answer)}>
                            <Copy size={16} color={colors.darkTextSecondary} />
                        </TouchableOpacity>
                    </View>
                    <Text style={styles.modelText}>{data.model_answer}</Text>
                </View>
            )}
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
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: colors.darkBackground || '#000000',
    },
    content: {
        padding: 20,
    },
    errorContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    errorText: {
        fontSize: 16,
        color: colors.error,
        marginBottom: 16,
    },
    retryBtn: {
        paddingVertical: 12,
        paddingHorizontal: 24,
        backgroundColor: colors.primary,
        borderRadius: 8,
    },
    retryText: {
        color: colors.white,
        fontWeight: 'bold',
    },
    studentHeader: {
        marginBottom: 20,
        paddingHorizontal: 4,
    },
    studentLabel: {
        fontSize: 12,
        color: colors.darkTextSecondary,
        textTransform: 'uppercase',
        marginBottom: 6,
        fontWeight: '600',
        letterSpacing: 0.5,
    },
    studentName: {
        fontSize: 28,
        fontWeight: '700',
        color: colors.white,
        letterSpacing: -0.5,
        marginBottom: 4,
    },
    studentRoll: {
        fontSize: 16,
        color: 'rgba(255, 255, 255, 0.6)',
        fontWeight: '500',
    },
    statsGrid: {
        flexDirection: 'row',
        gap: 12,
        marginBottom: 24,
    },
    statCard: {
        flex: 1,
        backgroundColor: colors.cardBlack,
        borderRadius: 24,
        padding: 6,
        paddingVertical: 24,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: '#2C2C2E',
        gap: 16,
    },
    iconCircle: {
        width: 56,
        height: 56,
        borderRadius: 28,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 4,
    },
    statValueBig: {
        fontSize: 28,
        fontWeight: '800',
        color: colors.white,
        textAlign: 'center',
        lineHeight: 34,
    },
    statMax: {
        fontSize: 16,
        color: 'rgba(255, 255, 255, 0.5)',
        fontWeight: '600',
    },
    statLabelSmall: {
        fontSize: 12,
        color: colors.darkTextSecondary,
        fontWeight: '700',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
        textAlign: 'center',
        marginTop: 4,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: colors.white,
        marginBottom: 16,
    },
    questionCard: {
        backgroundColor: colors.cardBlack || '#1C1C1E',
        borderRadius: 16,
        marginBottom: 16,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: '#2C2C2E',
    },
    qHeader: {
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#2C2C2E',
        flexDirection: 'row',
        gap: 16,
    },
    qTitle: {
        fontSize: 12,
        fontWeight: 'bold',
        color: colors.darkTextSecondary,
        textTransform: 'uppercase',
        marginBottom: 4,
    },
    qText: {
        fontSize: 15,
        color: colors.white,
        lineHeight: 22,
    },
    markBadge: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 6,
        alignSelf: 'flex-start',
        borderWidth: 1,
    },
    markSuccess: { backgroundColor: 'rgba(76, 175, 80, 0.15)', borderColor: colors.success },
    markPartial: { backgroundColor: 'rgba(255, 107, 53, 0.15)', borderColor: colors.primary },
    markWrong: { backgroundColor: 'rgba(244, 67, 54, 0.15)', borderColor: colors.error },
    textSuccess: { color: colors.success },
    textPartial: { color: colors.primary },
    textWrong: { color: colors.error },
    markText: {
        fontWeight: 'bold',
        fontSize: 14,
    },
    feedbackContainer: {
        padding: 16,
        gap: 12,
    },
    feedbackBox: {
        padding: 12,
        borderRadius: 12,
        borderWidth: 1,
    },
    bgSuccess: { backgroundColor: 'rgba(76, 175, 80, 0.1)', borderColor: 'rgba(76, 175, 80, 0.3)' },
    bgWarning: { backgroundColor: 'rgba(255, 193, 7, 0.1)', borderColor: 'rgba(255, 193, 7, 0.3)' },
    // ... previous styles
    textSuccessDark: { color: colors.success }, // Brighter for dark mode
    textWarning: { color: colors.warning },
    textWarningDark: { color: colors.warning },
    feedbackHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 8,
    },
    // ... rest of styles
    feedbackTitle: {
        fontSize: 12,
        fontWeight: 'bold',
        textTransform: 'uppercase',
    },
    feedbackPoint: {
        fontSize: 14,
        lineHeight: 20,
        marginBottom: 2,
    },
    modelToggle: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
        gap: 8,
        borderTopWidth: 1,
        borderTopColor: '#2C2C2E',
    },
    modelToggleText: {
        color: colors.primary,
        fontWeight: '600',
        fontSize: 14,
    },
    modelBox: {
        backgroundColor: '#2C2C2E',
        padding: 16,
        borderTopWidth: 1,
        borderTopColor: '#3C3C3E',
    },
    modelHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 8,
    },
    modelTitle: {
        fontSize: 12,
        fontWeight: 'bold',
        color: colors.primary,
        textTransform: 'uppercase',
    },
    modelText: {
        fontSize: 14,
        color: colors.white,
        lineHeight: 22,
    },
});
