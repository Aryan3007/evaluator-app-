import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Image,
    Modal,
    SafeAreaView,
    FlatList,
    Alert,
    ActivityIndicator,
    StatusBar
} from 'react-native';
import { X, CheckCircle, Trash2, Upload } from 'lucide-react-native';
import { uploadFiles } from '../../../core/api/scanning.api';
import { useAppDispatch, useAppSelector } from '../../../core/hooks/useRedux';
import { colors } from '../../../theme/colors';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import RNImageToPdf from 'react-native-image-to-pdf';
import { PdfViewerModal } from '../components/PdfViewerModal';
import { FileText } from 'lucide-react-native';

interface PreviewModalProps {
    isOpen: boolean;
    initialImages: string[];
    onClose: () => void;
    onBack: () => void;
    subjectName?: string;
    subjectCode?: string;
}

export const PreviewModal: React.FC<PreviewModalProps> = ({
    isOpen,
    initialImages,
    onClose,
    onBack,
    subjectName = 'Scanned Document',
    subjectCode = 'SCAN-001'
}) => {
    const dispatch = useAppDispatch();
    const { isUploading, uploadProgress } = useAppSelector((state) => state.scanning);
    const [images, setImages] = useState<string[]>(initialImages);
    const insets = useSafeAreaInsets();

    // PDF Generation State
    const [generatedPdf, setGeneratedPdf] = useState<string | null>(null);
    const [isConverting, setIsConverting] = useState(false);
    const [showPdfViewer, setShowPdfViewer] = useState(false);

    React.useEffect(() => {
        if (isOpen) {
            setImages(initialImages);
        }
    }, [isOpen, initialImages]);

    const handleRemoveImage = (index: number) => {
        setImages(prev => prev.filter((_, i) => i !== index));
    };

    const handleSubmit = async () => {
        if (images.length === 0) return;

        if (!RNImageToPdf) {
            Alert.alert('Error', 'PDF Module not linked. Please rebuild the app.');
            return;
        }

        setIsConverting(true); // Reuse converting state for PDF generation

        try {
            const pdfName = `${subjectCode}_${Date.now()}.pdf`;
            const options = {
                imagePaths: images.map(img => img.replace('file://', '')),
                name: pdfName,
                maxSize: {
                    width: 1240,
                    height: 1754,
                },
                quality: 0.8,
            };

            const pdf = await RNImageToPdf.createPDFbyImages(options);
            const pdfUri = pdf.filePath;

            // Prepare single PDF file for upload
            const filesToUpload = [{
                file_name: pdfName,
                file_type: 'application/pdf',
                file: {
                    uri: pdfUri,
                    name: pdfName,
                    type: 'application/pdf',
                }
            }];

            await dispatch(uploadFiles({
                subject_name: subjectName,
                paper_code: subjectCode,
                files: filesToUpload
            })).unwrap();

            onClose();
        } catch (error: any) {
            console.error(error);
            Alert.alert('Upload Failed', typeof error === 'string' ? error : 'Failed to generate or upload PDF');
        } finally {
            setIsConverting(false);
        }
    };

    const handleViewPdf = async () => {
        if (images.length === 0) return;

        if (!RNImageToPdf) {
            Alert.alert('Error', 'PDF Module not linked. Please rebuild the app.');
            return;
        }

        // If we already generated a PDF and images haven't changed, just show it
        // Ideally we reset generatedPdf on images change. 
        // For simplicity: regenerate every time for now or simple check.

        setIsConverting(true);
        try {
            const options = {
                imagePaths: images.map(img => img.replace('file://', '')),
                name: `${subjectCode}.pdf`,
                maxSize: { // Optional: resize images
                    width: 1240,
                    height: 1754, // A4 @ 150dpi approx
                },
                quality: 0.8, // Compress a bit
            };

            // Note: react-native-image-to-pdf might need file:// stripped on iOS or not depending on version
            // Usually it handles paths. Let's try direct paths first.

            const pdf = await RNImageToPdf.createPDFbyImages(options);

            setGeneratedPdf(pdf.filePath);
            setShowPdfViewer(true);
        } catch (e) {
            console.error(e);
            Alert.alert('Error', 'Failed to generate PDF');
        } finally {
            setIsConverting(false);
        }
    };

    // Reset PDF when images change
    React.useEffect(() => {
        setGeneratedPdf(null);
    }, [images]);

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
                        <Text style={styles.headerTitle}>Review Scans</Text>
                        <Text style={styles.headerSubtitle}>{images.length} pages captured</Text>
                    </View>
                    <View style={{ width: 40 }} />
                </View>

                {/* Grid of Images */}
                <FlatList
                    data={images}
                    keyExtractor={(item, index) => `${index}`}
                    numColumns={2}
                    contentContainerStyle={styles.gridContent}
                    renderItem={({ item, index }) => (
                        <View style={styles.imageCard}>
                            <Image source={{ uri: item }} style={styles.thumbnail} />
                            <View style={styles.badge}>
                                <Text style={styles.badgeText}>{index + 1}</Text>
                            </View>
                            <TouchableOpacity
                                onPress={() => handleRemoveImage(index)}
                                style={styles.removeButton}
                                disabled={isUploading}
                            >
                                <Trash2 color="#fff" size={16} />
                            </TouchableOpacity>
                        </View>
                    )}
                    ListEmptyComponent={
                        <View style={styles.emptyState}>
                            <Text style={styles.emptyText}>No images to display</Text>
                        </View>
                    }
                />

                {/* Bottom Bar */}
                <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 16 }]}>
                    <TouchableOpacity
                        style={[styles.viewPdfButton, (isConverting || images.length === 0) && styles.disabledButton]}
                        onPress={handleViewPdf}
                        disabled={isConverting || isUploading || images.length === 0}
                    >
                        {isConverting ? (
                            <ActivityIndicator color={colors.primary} size="small" />
                        ) : (
                            <>
                                <FileText color={images.length > 0 ? colors.primary : colors.darkTextSecondary} size={20} style={{ marginRight: 8 }} />
                                <Text style={[styles.viewPdfText, images.length === 0 && { color: colors.darkTextSecondary }]}>View PDF</Text>
                            </>
                        )}
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.submitButton, (isUploading || isConverting || images.length === 0) && styles.disabledButton]}
                        onPress={handleSubmit}
                        disabled={isUploading || isConverting || images.length === 0}
                        activeOpacity={0.8}
                    >
                        {isUploading ? (
                            <View style={styles.btnContent}>
                                <ActivityIndicator color="#fff" style={{ marginRight: 8 }} />
                                <Text style={styles.submitText}>Uploading... {uploadProgress}%</Text>
                            </View>
                        ) : (
                            <View style={styles.btnContent}>
                                <Upload color="#fff" size={20} style={{ marginRight: 8 }} />
                                <Text style={styles.submitText}>Upload PDF ({images.length} Pages)</Text>
                            </View>
                        )}
                    </TouchableOpacity>
                </View>

                {/* PDF Viewer for Generated PDF */}
                <PdfViewerModal
                    visible={showPdfViewer}
                    fileUri={generatedPdf}
                    fileName={`${subjectCode}.pdf`}
                    onClose={() => setShowPdfViewer(false)}
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
    gridContent: {
        padding: 16,
        paddingBottom: 40,
    },
    imageCard: {
        flex: 0.5,
        aspectRatio: 3 / 4,
        margin: 6,
        borderRadius: 12,
        overflow: 'hidden',
        position: 'relative',
        backgroundColor: colors.cardBlack,
        borderWidth: 1,
        borderColor: '#2C2C2E',
    },
    thumbnail: {
        width: '100%',
        height: '100%',
        resizeMode: 'cover',
    },
    badge: {
        position: 'absolute',
        top: 8,
        left: 8,
        backgroundColor: colors.primary,
        width: 28,
        height: 28,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 3,
        elevation: 3,
    },
    badgeText: {
        color: '#fff',
        fontSize: 12,
        fontWeight: '700',
    },
    removeButton: {
        position: 'absolute',
        bottom: 8,
        right: 8,
        backgroundColor: '#ef4444',
        width: 32,
        height: 32,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 2,
        borderColor: colors.cardBlack,
    },
    emptyState: {
        padding: 60,
        alignItems: 'center',
    },
    emptyText: {
        color: colors.darkTextSecondary,
        fontSize: 14,
    },
    bottomBar: {
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
    btnContent: {
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

export default PreviewModal;
