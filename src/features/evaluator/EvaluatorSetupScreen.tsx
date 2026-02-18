import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TextInput,
    TouchableOpacity,
    ScrollView,
    Alert,
    KeyboardAvoidingView,
    Platform,
    ActivityIndicator,
    StatusBar,
} from 'react-native';
import DocumentPicker from 'react-native-document-picker';
import { useDispatch } from 'react-redux';
import { Upload, FileText, CheckCircle, ArrowLeft, X, Eye, RefreshCw } from 'lucide-react-native';
import { colors } from '../../theme/colors';
import { spacing, borderRadius } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { startEvaluation } from '../../core/redux/evaluatorSlice';
import { PaperCode } from '../../core/redux/types';
import axiosInstance from '../../core/api/axios';
import { PdfViewerModal } from '../scanning/components/PdfViewerModal';

const EvaluatorSetupScreen: React.FC<{ navigation: any, route: any }> = ({ navigation, route }) => {
    const { paper } = route.params;
    const dispatch = useDispatch<any>();
    const insets = useSafeAreaInsets();

    const [rules, setRules] = useState(paper.strictnessRules === 'none' ? '' : paper.strictnessRules || '');
    const [selectedFile, setSelectedFile] = useState<any>(null);
    const [isUploading, setIsUploading] = useState(false);
    const [showPdf, setShowPdf] = useState(false);

    const handleFilePick = async () => {
        try {
            const res = await DocumentPicker.pickSingle({
                type: [DocumentPicker.types.pdf],
            });
            setSelectedFile(res);
        } catch (err) {
            if (DocumentPicker.isCancel(err)) {
                // User cancelled
            } else {
                Alert.alert('Error', 'Failed to pick file');
            }
        }
    };

    const handleUploadAndStart = async () => {
        if (!selectedFile && !paper.questionPaperUrl) {
            Alert.alert('Required', 'Please upload a question paper PDF.');
            return;
        }

        setIsUploading(true);
        try {
            let fileUrl = paper.questionPaperUrl;

            // 1. Upload if new file selected
            if (selectedFile) {
                fileUrl = await uploadFileHelper(selectedFile, paper.code, paper.subject);
            }

            // 2. Start Evaluation
            await dispatch(startEvaluation({
                paperId: paper.id,
                fileUrl: fileUrl!,
                rules: rules || "none"
            })).unwrap();

            Alert.alert('Success', 'Evaluation started successfully!', [
                { text: 'OK', onPress: () => navigation.goBack() }
            ]);

        } catch (error: any) {
            Alert.alert('Error', error.toString());
        } finally {
            setIsUploading(false);
        }
    };

    // Helper to handle upload flow
    const uploadFileHelper = async (file: any, code: string, subject: string): Promise<string> => {
        // 1. Get Presigned URL
        const presignedRes = await axiosInstance.post('/api/files/presigned-upload', {
            subject_name: subject,
            paper_code: code,
            files: [{ file_name: file.name, file_type: file.type }]
        });

        if (!presignedRes.data.success || !presignedRes.data.uploads || presignedRes.data.uploads.length === 0) {
            throw new Error('Failed to get upload URL');
        }

        const uploadData = presignedRes.data.uploads[0];

        // 2. Upload to S3
        if (uploadData.fields && uploadData.base_url) {
            const formData = new FormData();
            Object.entries(uploadData.fields).forEach(([key, value]) => {
                formData.append(key, value as string);
            });
            formData.append('file', {
                uri: file.uri,
                name: file.name,
                type: file.type
            } as any);

            await fetch(uploadData.base_url, {
                method: 'POST',
                body: formData
            });
        } else {
            // PUT upload
            const blob = await (await fetch(file.uri)).blob();
            await fetch(uploadData.url, {
                method: 'PUT',
                body: blob,
                headers: { 'Content-Type': file.type }
            });
        }

        return uploadData.url.split('?')[0]; // Return clean URL
    };

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={styles.container}
        >
            <StatusBar barStyle="light-content" backgroundColor={colors.darkBackground || '#000000'} />

            <View style={{ paddingTop: insets.top, backgroundColor: colors.darkBackground || '#000000' }}>
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => navigation.goBack()} style={styles.iconButton}>
                        <ArrowLeft size={24} color={colors.white} />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Setup Evaluation</Text>
                    <View style={{ width: 40 }} />
                </View>
            </View>

            <ScrollView contentContainerStyle={styles.content}>

                {/* Paper Info */}
                {/* Paper Info */}
                <View style={styles.paperInfo}>
                    <Text style={styles.sectionTitle}>Question Paper</Text>
                    <Text style={styles.paperCode}>{paper.subject} ({paper.code})</Text>

                    {selectedFile ? (
                        <View style={styles.uploadBox}>
                            <View style={styles.fileSelected}>
                                <FileText size={32} color={colors.primary} />
                                <Text style={styles.fileName} numberOfLines={1}>{selectedFile.name}</Text>
                                <TouchableOpacity onPress={() => setSelectedFile(null)} style={styles.removeFile}>
                                    <X size={20} color={colors.error} />
                                </TouchableOpacity>
                            </View>
                        </View>
                    ) : paper.questionPaperUrl ? (
                        <View style={styles.existingFileContainer}>
                            <View style={styles.existingFileRow}>
                                <FileText size={24} color={colors.success} />
                                <Text style={styles.fileName}>Current Paper Available</Text>
                            </View>

                            <View style={styles.actionButtons}>
                                <TouchableOpacity
                                    style={styles.actionBtnSecondary}
                                    onPress={() => setShowPdf(true)}
                                >
                                    <Eye size={18} color={colors.white} />
                                    <Text style={styles.actionBtnText}>View PDF</Text>
                                </TouchableOpacity>

                                <TouchableOpacity
                                    style={styles.actionBtnPrimary}
                                    onPress={handleFilePick}
                                >
                                    <RefreshCw size={18} color={colors.white} />
                                    <Text style={styles.actionBtnText}>Replace</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    ) : (
                        <TouchableOpacity
                            style={styles.uploadBox}
                            onPress={handleFilePick}
                        >
                            <View style={styles.uploadPlaceholder}>
                                <Upload size={32} color={colors.darkTextSecondary} />
                                <Text style={styles.uploadText}>Tap to upload PDF</Text>
                            </View>
                        </TouchableOpacity>
                    )}
                </View>

                {/* Rules Input */}
                <View style={styles.rulesSection}>
                    <Text style={styles.sectionTitle}>Strictness Rules</Text>
                    <Text style={styles.rulesHint}>Define existing marking criteria or special instructions for AI.</Text>

                    <TextInput
                        style={styles.rulesInput}
                        multiline
                        textAlignVertical="top"
                        placeholder="- Deduct 1 mark for spelling mistakes&#10;- Ensure key concepts are explained..."
                        placeholderTextColor={colors.darkTextSecondary + '80'}
                        value={rules}
                        onChangeText={setRules}
                    />
                </View>

                {/* Submit */}
                <TouchableOpacity
                    style={[styles.startBtn, isUploading && styles.startBtnDisabled]}
                    onPress={handleUploadAndStart}
                    disabled={isUploading}
                >
                    {isUploading ? (
                        <ActivityIndicator color={colors.white} />
                    ) : (
                        <Text style={styles.startBtnText}>
                            {paper.status === 'pending' ? 'Start Evaluation' : 'Update Configuration'}
                        </Text>
                    )}
                </TouchableOpacity>

            </ScrollView>

            <PdfViewerModal
                visible={showPdf}
                fileUri={paper.questionPaperUrl || ''}
                onClose={() => setShowPdf(false)}
            />
        </KeyboardAvoidingView>
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
    },
    iconButton: {
        padding: 8,
        backgroundColor: colors.iconBackground || '#2C2C2E',
        borderRadius: 20,
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: colors.white,
    },
    content: {
        padding: 24,
    },
    paperInfo: {
        marginBottom: 24,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: colors.white,
        marginBottom: 8,
    },
    paperCode: {
        fontSize: 14,
        color: colors.darkTextSecondary,
        marginBottom: 16,
    },
    uploadBox: {
        backgroundColor: colors.cardBlack || '#1C1C1E',
        borderWidth: 1.5,
        borderColor: '#2C2C2E',
        borderStyle: 'dashed',
        borderRadius: 16,
        padding: 24,
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 160,
    },
    uploadPlaceholder: {
        alignItems: 'center',
        gap: 8,
    },
    uploadText: {
        fontSize: 14,
        color: colors.darkTextSecondary,
    },
    fileSelected: {
        alignItems: 'center',
        gap: 8,
        width: '100%',
    },
    fileExisting: {
        alignItems: 'center',
        gap: 8,
    },
    fileName: {
        fontSize: 14,
        fontWeight: '600',
        color: colors.white,
    },
    uploadHint: {
        fontSize: 12,
        color: colors.primary,
    },
    removeFile: {
        marginTop: 8,
    },
    rulesSection: {
        marginBottom: 32,
    },
    rulesHint: {
        fontSize: 12,
        color: colors.darkTextSecondary,
        marginBottom: 16,
    },
    rulesInput: {
        backgroundColor: colors.cardBlack || '#1C1C1E',
        borderRadius: 16,
        padding: 16,
        height: 200,
        borderWidth: 1,
        borderColor: '#2C2C2E',
        fontSize: 14,
        color: colors.white,
    },
    startBtn: {
        backgroundColor: colors.primary,
        paddingVertical: 16,
        borderRadius: 16,
        alignItems: 'center',
        shadowColor: colors.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 4,
    },
    startBtnDisabled: {
        opacity: 0.7,
    },
    startBtnText: {
        fontWeight: '700',
        color: colors.white,
        fontSize: 16,
    },
    existingFileContainer: {
        backgroundColor: colors.cardBlack,
        borderRadius: 16,
        padding: 20,
        borderWidth: 1,
        borderColor: '#2C2C2E',
        gap: 20
    },
    existingFileRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        justifyContent: 'center'
    },
    actionButtons: {
        flexDirection: 'row',
        gap: 12,
    },
    actionBtnSecondary: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#2C2C2E',
        paddingVertical: 12,
        borderRadius: 12,
        gap: 8,
    },
    actionBtnPrimary: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: colors.primary,
        paddingVertical: 12,
        borderRadius: 12,
        gap: 8,
    },
    actionBtnText: {
        color: colors.white,
        fontWeight: '600',
        fontSize: 14,
    },
});

export default EvaluatorSetupScreen;
