import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Image,
    ActivityIndicator,
    StatusBar,
    BackHandler,
    FlatList,
    Alert
} from 'react-native';
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native';
import { Trash2, Upload, Plus, ChevronLeft } from 'lucide-react-native';
import { colors } from '../../../theme/colors';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import RNImageToPdf from 'react-native-image-to-pdf';
import ImageResizer from 'react-native-image-resizer';
import { PdfViewerModal } from '../components/PdfViewerModal';
import { FileText } from 'lucide-react-native';
import Toast from 'react-native-toast-message';
import { backgroundUpload } from '../utils/backgroundUpload';

export const PreviewScreen: React.FC = () => {
    const navigation = useNavigation<any>();
    const route = useRoute<any>();
    const {
        initialImages = [],
        subjectName = 'Scanned Document',
        subjectCode = 'SCAN-001',
        onAddMore
    } = route.params || {};

    const [images, setImages] = useState<string[]>(initialImages);

    // Sync images with initialImages when params change (e.g. after upload reset)
    useEffect(() => {
        setImages(initialImages);
    }, [initialImages]);
    const insets = useSafeAreaInsets();

    const [generatedPdf, setGeneratedPdf] = useState<string | null>(null);
    const [isGeneratingPdf, setIsGeneratingPdf] = useState(false); // Specific for View PDF
    const [isPreparingUpload, setIsPreparingUpload] = useState(false); // Specific for Upload generation
    const [showPdfViewer, setShowPdfViewer] = useState(false);

    // Hardware back button support
    useFocusEffect(
        React.useCallback(() => {
            const onBackPress = () => {
                if (onAddMore) {
                    onAddMore(images);
                } else {
                    navigation.navigate('CameraScreen', {
                        subjectName,
                        subjectCode,
                        initialImages: images
                    });
                }
                return true;
            };

            const subscription = BackHandler.addEventListener('hardwareBackPress', onBackPress);

            return () => subscription.remove();
        }, [navigation, subjectName, subjectCode, onAddMore, images])
    );

    React.useEffect(() => {
        if (initialImages && initialImages.length > 0) {
            setImages(initialImages);
        }
    }, [initialImages]);

    const handleRemoveImage = (index: number) => {
        setImages(prev => prev.filter((_, i) => i !== index));
    };

    const processImagesForPdf = async (sourceImages: string[]) => {
        const processed = await Promise.all(sourceImages.map(async (img) => {
            try {
                // Resize to a large dimension to maintain quality but fix orientation.
                // Using a square dimension with 'contain' mode ensures the image fits within these bounds while preserving aspect ratio.
                // Rotation 0 with keepMeta false (default behavior of library usually applies EXIF rotation).
                const result = await ImageResizer.createResizedImage(
                    img,
                    2000,
                    2000,
                    'JPEG',
                    100, // Quality
                    0, // Rotation
                    undefined, // Output path
                    false, // Keep meta
                    { mode: 'contain', onlyScaleDown: false }
                );
                return result.uri;
            } catch (error) {
                console.error("Image processing failed for", img, error);
                return img; // Fallback to original if processing fails
            }
        }));
        return processed;
    };

    const handleSubmit = async () => {
        if (images.length === 0) return;

        setIsPreparingUpload(true);

        try {
            const pdfName = `${subjectCode}_${Date.now()}.pdf`;

            await new Promise<void>((resolve, reject) => {
                backgroundUpload({
                    images,
                    subjectName,
                    subjectCode,
                    pdfName,
                    onSuccess: () => resolve(),
                    onError: (error) => reject(new Error(error)),
                });
            });

            Toast.show({
                type: 'success',
                text1: 'Upload Successful',
                text2: 'The sheet has been uploaded successfully.',
                position: 'bottom',
                visibilityTime: 3000,
            });

            navigation.reset({
                index: 1,
                routes: [
                    { name: 'Scanning' },
                    {
                        name: 'CameraScreen',
                        params: {
                            subjectName,
                            subjectCode,
                            initialImages: []
                        }
                    }
                ],
            });
        } catch (error: unknown) {
            console.error(error);
            const message = error instanceof Error ? error.message : 'Upload failed';
            Alert.alert('Upload Failed', message);
        } finally {
            setIsPreparingUpload(false);
        }
    };

    const handleViewPdf = async () => {
        if (images.length === 0) return;

        if (!RNImageToPdf) {
            Alert.alert('Error', 'PDF Module not linked. Please rebuild the app.');
            return;
        }

        setIsGeneratingPdf(true);
        try {
            const processedImages = await processImagesForPdf(images);
            const options = {
                imagePaths: processedImages.map(img => img.replace('file://', '')),
                name: `${subjectCode}.pdf`,
                // maxSize: { width: 1240, height: 1754 }, // Removed to prevent resizing
                quality: 1.0,
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
            setIsGeneratingPdf(false);
        }
    };

    // Reset PDF when images change
    React.useEffect(() => {
        setGeneratedPdf(null);
    }, [images]);

    // Helper to determine if any action is blocking interaction
    const isBusy = isGeneratingPdf || isPreparingUpload;

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" backgroundColor={colors.darkBackground} />

            {/* Header */}
            <View style={[styles.header, { paddingTop: insets.top }]}>
                <TouchableOpacity onPress={() => {
                    if (onAddMore) {
                        onAddMore(images);
                    } else {
                        navigation.navigate('CameraScreen', {
                            subjectName,
                            subjectCode,
                            initialImages: images
                        });
                    }
                }} style={styles.iconButton}>
                    <ChevronLeft color={colors.white} size={24} />
                </TouchableOpacity>
                <View style={styles.headerTextContainer}>
                    <Text style={styles.headerTitle}>Review & Upload</Text>
                    <Text style={styles.headerSubtitle}>{images.length} pages captured</Text>
                </View>
                {onAddMore ? (
                    <TouchableOpacity onPress={() => onAddMore(images)} disabled={isBusy} style={styles.addButton}>
                        <Plus color={colors.primary} size={24} />
                    </TouchableOpacity>
                ) : (
                    <View style={{ width: 40 }} />
                )}
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
                            disabled={isBusy}
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
                    style={[styles.viewPdfButton, (isGeneratingPdf || images.length === 0) && styles.disabledButton]}
                    onPress={handleViewPdf}
                    disabled={isBusy || images.length === 0}
                >
                    {isGeneratingPdf ? (
                        <ActivityIndicator color={colors.primary} size="small" />
                    ) : (
                        <>
                            <FileText color={images.length > 0 ? colors.primary : colors.darkTextSecondary} size={20} style={{ marginRight: 8 }} />
                            <Text style={[styles.viewPdfText, images.length === 0 && { color: colors.darkTextSecondary }]}>View PDF</Text>
                        </>
                    )}
                </TouchableOpacity>

                <TouchableOpacity
                    style={[styles.submitButton, (isPreparingUpload || images.length === 0) && styles.disabledButton]}
                    onPress={handleSubmit}
                    disabled={isBusy || images.length === 0}
                    activeOpacity={0.8}
                >
                    {isPreparingUpload ? (
                        <View style={styles.btnContent}>
                            <ActivityIndicator color="#fff" style={{ marginRight: 8 }} />
                            <Text style={styles.submitText}>Uploading...</Text>
                        </View>
                    ) : (
                        <View style={styles.btnContent}>
                            <Upload color="#fff" size={20} style={{ marginRight: 8 }} />
                            <Text style={styles.submitText}>Upload ({images.length} Pages)</Text>
                        </View>
                    )}
                </TouchableOpacity>
            </View>

            {/* PDF Viewer for Generated PDF */}
            <PdfViewerModal
                visible={showPdfViewer}
                fileUri={generatedPdf}
                fileName={`${subjectCode}.pdf`}
                onClose={() => {
                    setShowPdfViewer(false);
                }}
            />
        </View>
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
    addButton: {
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

export default PreviewScreen;
