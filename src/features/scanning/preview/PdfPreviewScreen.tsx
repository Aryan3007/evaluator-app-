import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    FlatList,
    Modal,
    SafeAreaView,
    ActivityIndicator,
    Alert,
    StatusBar
} from 'react-native';
import { FileText, X, Plus, Trash2, Upload } from 'lucide-react-native';
import DocumentPicker from 'react-native-document-picker';
import { uploadFiles } from '../../../core/api/scanning.api';
import { useAppDispatch, useAppSelector } from '../../../core/hooks/useRedux';
import { colors } from '../../../theme/colors';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PdfViewerModal } from '../components/PdfViewerModal';

interface PdfPreviewModalProps {
    isOpen: boolean;
    files: any[];
    onClose: () => void;
    onBack: () => void;
    subjectName?: string;
    subjectCode?: string;
}

export const PdfPreviewModal: React.FC<PdfPreviewModalProps> = ({
    isOpen,
    files,
    onClose,
    onBack,
    subjectName = 'Scanned Document',
    subjectCode = 'SCAN-001'
}) => {
    const dispatch = useAppDispatch();
    const { isUploading, uploadProgress } = useAppSelector((state) => state.scanning);
    const [selectedFiles, setSelectedFiles] = useState<any[]>(files);

    // PDF Viewer State
    const [previewFile, setPreviewFile] = useState<any | null>(null);

    const insets = useSafeAreaInsets();

    // Sync state with props
    React.useEffect(() => {
        if (isOpen) {
            setSelectedFiles(files);
        }
    }, [isOpen, files]);

    const handleAddMore = async () => {
        try {
            const results = await DocumentPicker.pick({
                type: [DocumentPicker.types.pdf, DocumentPicker.types.ppt, DocumentPicker.types.pptx],
                allowMultiSelection: true,
            });

            const newFiles = results.map(file => ({
                uri: file.uri,
                name: file.name || 'document.pdf',
                type: file.type || 'application/pdf',
                size: file.size,
            }));

            setSelectedFiles(prev => [...prev, ...newFiles]);
        } catch (err) {
            if (!DocumentPicker.isCancel(err)) {
                Alert.alert('Error', 'Failed to pick document');
            }
        }
    };

    const handleRemoveFile = (index: number) => {
        setSelectedFiles(prev => prev.filter((_, i) => i !== index));
    };

    const handleSubmit = async () => {
        if (selectedFiles.length === 0) return;

        try {
            // Convert to format expected by API
            const filesToUpload = selectedFiles.map(file => ({
                file_name: file.name,
                file_type: file.type,
                file: {
                    uri: file.uri,
                    name: file.name,
                    type: file.type,
                    size: file.size
                }
            }));

            await dispatch(uploadFiles({
                subject_name: subjectName,
                paper_code: subjectCode,
                files: filesToUpload
            })).unwrap();

            onClose(); // Parent will handle Success Modal showing via Redux state
        } catch (error: any) {
            Alert.alert('Upload Failed', typeof error === 'string' ? error : 'Unknown error');
        }
    };

    if (!isOpen) return null;

    return (
        <Modal animationType="slide" visible={isOpen} onRequestClose={onBack}>
            <View style={styles.container}>
                <StatusBar barStyle="light-content" backgroundColor={colors.darkBackground} />

                {/* Header */}
                <View style={[styles.header, { paddingTop: insets.top }]}>
                    <TouchableOpacity onPress={onBack} style={styles.iconButton}>
                        <X color={colors.white} size={24} />
                    </TouchableOpacity>
                    <View style={styles.headerTextContainer}>
                        <Text style={styles.headerTitle}>Review Files</Text>
                        <Text style={styles.headerSubtitle}>{selectedFiles.length} files selected</Text>
                    </View>
                    <TouchableOpacity onPress={handleAddMore} disabled={isUploading} style={styles.addButton}>
                        <Plus color={colors.primary} size={24} />
                    </TouchableOpacity>
                </View>

                {/* List */}
                <FlatList
                    data={selectedFiles}
                    keyExtractor={(item, index) => `${item.uri}-${index}`}
                    contentContainerStyle={styles.listContent}
                    renderItem={({ item, index }) => (
                        <View style={styles.fileItem}>
                            <TouchableOpacity
                                style={{ flexDirection: 'row', flex: 1, alignItems: 'center' }}
                                onPress={() => setPreviewFile(item)}
                            >
                                <View style={styles.fileIconBox}>
                                    <FileText color={colors.primary} size={24} />
                                </View>
                                <View style={styles.fileInfo}>
                                    <Text style={styles.fileName} numberOfLines={1}>{item.name}</Text>
                                    <Text style={styles.fileSize}>
                                        {item.size ? `${(item.size / 1024 / 1024).toFixed(2)} MB` : 'Unknown Size'}
                                    </Text>
                                </View>
                            </TouchableOpacity>
                            <TouchableOpacity
                                onPress={() => handleRemoveFile(index)}
                                style={styles.removeButton}
                                disabled={isUploading}
                            >
                                <Trash2 color={colors.darkTextSecondary} size={20} />
                            </TouchableOpacity>
                        </View>
                    )}
                    ListEmptyComponent={
                        <View style={styles.emptyState}>
                            <Text style={styles.emptyText}>No files selected</Text>
                            <TouchableOpacity onPress={handleAddMore} style={styles.addMoreBtn}>
                                <Text style={styles.addMoreText}>Select Files</Text>
                            </TouchableOpacity>
                        </View>
                    }
                />

                {/* Footer */}
                <View style={[styles.footer, { paddingBottom: insets.bottom + 16 }]}>
                    <TouchableOpacity
                        style={[styles.viewPdfButton, selectedFiles.length === 0 && styles.disabledButton]}
                        onPress={() => {
                            if (selectedFiles.length > 0) {
                                setPreviewFile(selectedFiles[0]);
                            }
                        }}
                        disabled={selectedFiles.length === 0}
                    >
                        <FileText color={selectedFiles.length > 0 ? colors.primary : colors.darkTextSecondary} size={20} style={{ marginRight: 8 }} />
                        <Text style={[styles.viewPdfText, selectedFiles.length === 0 && { color: colors.darkTextSecondary }]}>View PDF</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.submitButton, (isUploading || selectedFiles.length === 0) && styles.disabledButton]}
                        onPress={handleSubmit}
                        disabled={isUploading || selectedFiles.length === 0}
                        activeOpacity={0.8}
                    >
                        {isUploading ? (
                            <View style={styles.uploadingRow}>
                                <ActivityIndicator color="#fff" style={{ marginRight: 8 }} />
                                <Text style={styles.submitText}>Uploading... {uploadProgress}%</Text>
                            </View>
                        ) : (
                            <View style={styles.uploadingRow}>
                                <Upload color="#fff" size={20} style={{ marginRight: 8 }} />
                                <Text style={styles.submitText}>Upload {selectedFiles.length} Files</Text>
                            </View>
                        )}
                    </TouchableOpacity>
                </View>
                {/* PDF Viewer Modal */}
                <PdfViewerModal
                    visible={!!previewFile}
                    fileUri={previewFile?.uri || null}
                    fileName={previewFile?.name}
                    onClose={() => setPreviewFile(null)}
                />
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.darkBackground,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingBottom: 20,
        backgroundColor: colors.darkBackground,
    },
    iconButton: {
        padding: 8,
        backgroundColor: colors.iconBackground,
        borderRadius: 20,
    },
    headerTextContainer: {
        flex: 1,
        marginLeft: 16,
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: colors.white,
    },
    headerSubtitle: {
        fontSize: 13,
        color: colors.darkTextSecondary,
        marginTop: 2,
    },
    addButton: {
        padding: 8,
        backgroundColor: colors.iconBackground,
        borderRadius: 20,
    },
    listContent: {
        padding: 16,
    },
    fileItem: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.cardBlack,
        padding: 16,
        borderRadius: 12,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: '#2C2C2E',
    },
    fileIconBox: {
        width: 48,
        height: 48,
        backgroundColor: 'rgba(255, 107, 53, 0.15)',
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
    },
    fileInfo: {
        flex: 1,
    },
    fileName: {
        fontSize: 14,
        fontWeight: '600',
        color: colors.white,
        marginBottom: 4,
    },
    fileSize: {
        fontSize: 12,
        color: colors.darkTextSecondary,
    },
    removeButton: {
        padding: 8,
    },
    emptyState: {
        alignItems: 'center',
        marginTop: 60,
    },
    emptyText: {
        color: colors.darkTextSecondary,
        marginBottom: 16,
        fontSize: 14,
    },
    addMoreBtn: {
        paddingVertical: 12,
        paddingHorizontal: 24,
        backgroundColor: 'rgba(255, 107, 53, 0.15)',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: colors.primary,
    },
    addMoreText: {
        color: colors.primary,
        fontWeight: '600',
        fontSize: 14,
    },
    footer: {
        paddingHorizontal: 16,
        paddingTop: 16,
        borderTopWidth: 1,
        borderTopColor: '#2C2C2E',
        backgroundColor: colors.darkBackground,
    },
    submitButton: {
        backgroundColor: colors.primary,
        paddingVertical: 16,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: colors.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 4,
    },
    disabledButton: {
        opacity: 0.5,
        backgroundColor: '#2C2C2E',
    },
    uploadingRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    submitText: {
        color: '#fff',
        fontWeight: '700',
        fontSize: 16,
    },
    viewPdfButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: colors.cardBlack,
        paddingVertical: 16,
        borderRadius: 16,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: '#2C2C2E',
    },
    viewPdfText: {
        color: colors.primary,
        fontWeight: '600',
        fontSize: 16,
    },
});

export default PdfPreviewModal;
