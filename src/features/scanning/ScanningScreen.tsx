import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    ScrollView,
    SafeAreaView,
    StatusBar,
    ActivityIndicator,
    Modal,
    Platform,
    Alert
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Camera, FileText, Menu, ChevronRight, X, CheckCircle, BookOpen, Hash, ArrowLeft, HelpCircle } from 'lucide-react-native';
import { resetUpload } from '../../core/api/scanning.api';
import ScanningSidebar from './ScanningSidebar';
import DocumentPicker from 'react-native-document-picker';
import { PreviewModal } from './preview/PreviewModal'; // We'll implement this later
import { PdfPreviewModal } from './preview/PdfPreviewScreen'; // We'll implement this later
import { useAppDispatch, useAppSelector } from '../../core/hooks/useRedux';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const ScanningScreen = () => {
    const dispatch = useAppDispatch();
    const navigation = useNavigation<any>();
    const insets = useSafeAreaInsets();
    const { isUploading, uploadProgress, uploadError, currentStep } = useAppSelector(
        (state) => state.scanning
    );

    const [subjectName, setSubjectName] = useState('');
    const [subjectCode, setSubjectCode] = useState('');
    const [subjectNameError, setSubjectNameError] = useState('');
    const [subjectCodeError, setSubjectCodeError] = useState('');
    const [error, setError] = useState('');
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    // File/Image State
    const [capturedImages, setCapturedImages] = useState<string[]>([]);
    const [selectedFiles, setSelectedFiles] = useState<any[]>([]);
    const [showPreview, setShowPreview] = useState(false);
    const [showPdfPreview, setShowPdfPreview] = useState(false);

    // Validation
    const validateInputs = () => {
        let isValid = true;
        if (!subjectName.trim()) {
            setSubjectNameError('Required');
            isValid = false;
        }
        if (!subjectCode.trim()) {
            setSubjectCodeError('Required');
            isValid = false;
        }
        if (subjectNameError || subjectCodeError) {
            isValid = false;
        }

        if (!isValid) {
            setError('Please fix errors above');
        } else {
            setError('');
        }
        return isValid;
    };

    const handleSubjectNameChange = (value: string) => {
        setSubjectName(value);

        if (value.length > 100) {
            setSubjectNameError('Max 100 chars');
        } else if (!/^[a-zA-Z0-9\s]*$/.test(value)) {
            setSubjectNameError('No special chars');
        } else {
            setSubjectNameError('');
            if (!subjectCodeError) setError('');
        }
    };

    const handleSubjectCodeChange = (value: string) => {
        setSubjectCode(value);

        if (value.length > 15) {
            setSubjectCodeError('Max 15 chars');
        } else if (!/^[a-zA-Z0-9]*$/.test(value)) {
            setSubjectCodeError('Alphanumeric only');
        } else {
            setSubjectCodeError('');
            if (!subjectNameError) setError('');
        }
    };

    const handleCameraStart = () => {
        if (!validateInputs()) return;

        navigation.navigate('CameraScreen', {
            subjectName,
            subjectCode,
            onCaptureComplete: (images: string[]) => {
                setCapturedImages(images);
                setShowPreview(true);
            }
        });
    };

    const handleFileUpload = async () => {
        if (!validateInputs()) return;

        try {
            const results = await DocumentPicker.pick({
                type: [DocumentPicker.types.pdf, DocumentPicker.types.ppt, DocumentPicker.types.pptx],
                allowMultiSelection: true,
            });

            const formattedFiles = results.map(file => ({
                uri: file.uri,
                name: file.name || 'document.pdf',
                type: file.type || 'application/pdf',
                size: file.size,
            }));

            setSelectedFiles(formattedFiles);
            setShowPdfPreview(true);
        } catch (err) {
            if (DocumentPicker.isCancel(err)) {
                // User cancelled
            } else {
                console.error('Unknown Error: ', err);
                Alert.alert('Error', 'Failed to pick document');
            }
        }
    };

    const handleSuccessClose = () => {
        dispatch(resetUpload());
        setCapturedImages([]);
        setSelectedFiles([]);
        setShowPdfPreview(false);
        setShowPreview(false);
    };

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" backgroundColor={colors.darkBackground} />

            {/* Header */}
            <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.iconButton}>
                    <ArrowLeft color={colors.white} size={24} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Scan Answer Sheet</Text>
                <TouchableOpacity onPress={() => setIsSidebarOpen(true)} style={styles.iconButton}>
                    <Menu color={colors.white} size={24} />
                </TouchableOpacity>
            </View>

            <View style={styles.content}>

                {/* Inputs Section - Row */}
                <View style={styles.inputRow}>
                    <View style={[styles.inputContainer, { flex: 1, marginRight: 8 }]}>
                        <Text style={styles.label}>Subject</Text>
                        <View style={[
                            styles.inputWrapper,
                            !!subjectNameError && { borderColor: colors.error }
                        ]}>
                            <BookOpen color={!!subjectNameError ? colors.error : colors.darkTextSecondary} size={18} style={styles.inputIcon} />
                            <TextInput
                                style={styles.input}
                                placeholder="Physics"
                                placeholderTextColor={colors.darkTextSecondary}
                                value={subjectName}
                                onChangeText={handleSubjectNameChange}
                            />
                        </View>
                        {!!subjectNameError && <Text style={styles.fieldErrorText}>{subjectNameError}</Text>}
                    </View>

                    <View style={[styles.inputContainer, { flex: 1, marginLeft: 8 }]}>
                        <Text style={styles.label}>Code</Text>
                        <View style={[
                            styles.inputWrapper,
                            !!subjectCodeError && { borderColor: colors.error }
                        ]}>
                            <Hash color={!!subjectCodeError ? colors.error : colors.darkTextSecondary} size={18} style={styles.inputIcon} />
                            <TextInput
                                style={styles.input}
                                placeholder="GS001"
                                placeholderTextColor={colors.darkTextSecondary}
                                value={subjectCode}
                                onChangeText={handleSubjectCodeChange}
                            />
                        </View>
                        {!!subjectCodeError && <Text style={styles.fieldErrorText}>{subjectCodeError}</Text>}
                    </View>
                </View>

                {/* Error Message */}
                {error ? <Text style={styles.errorText}>{error}</Text> : null}

                {/* Upload Progress */}
                {isUploading && (
                    <View style={styles.uploadingCard}>
                        <View style={styles.uploadingHeader}>
                            <ActivityIndicator color={colors.primary} size="small" />
                            <View style={{ flex: 1, marginLeft: 12 }}>
                                <Text style={styles.uploadingTitle}>Uploading...</Text>
                                <View style={styles.progressBarBg}>
                                    <View style={[styles.progressBarFill, { width: `${uploadProgress}%` }]} />
                                </View>
                            </View>
                            <Text style={styles.uploadingPercent}>{uploadProgress}%</Text>
                        </View>
                    </View>
                )}

                {/* Action Buttons - Compact */}
                <View style={styles.actionsContainer}>
                    <TouchableOpacity
                        style={styles.compactActionCard}
                        onPress={handleCameraStart}
                        activeOpacity={0.7}
                    >
                        <View style={[styles.compactIconCircle, { backgroundColor: 'rgba(255, 107, 53, 0.1)' }]}>
                            <Camera color={colors.primary} size={24} />
                        </View>
                        <View style={styles.compactActionContent}>
                            <Text style={styles.compactActionTitle}>Camera Scan</Text>
                            <Text style={styles.compactActionDesc}>Take photos of sheets</Text>
                        </View>
                        <ChevronRight color={colors.darkTextSecondary} size={20} />
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.compactActionCard}
                        onPress={handleFileUpload}
                        activeOpacity={0.7}
                    >
                        <View style={[styles.compactIconCircle, { backgroundColor: 'rgba(239, 68, 68, 0.1)' }]}>
                            <FileText color={colors.error} size={24} />
                        </View>
                        <View style={styles.compactActionContent}>
                            <Text style={styles.compactActionTitle}>Upload PDF</Text>
                            <Text style={styles.compactActionDesc}>Select from device</Text>
                        </View>
                        <ChevronRight color={colors.darkTextSecondary} size={20} />
                    </TouchableOpacity>
                </View>
            </View>

            {/* Sidebar Modal */}
            <Modal
                animationType="none"
                transparent={true}
                visible={isSidebarOpen}
                onRequestClose={() => setIsSidebarOpen(false)}
            >
                <ScanningSidebar onClose={() => setIsSidebarOpen(false)} />
            </Modal>

            {/* Success Modal */}
            <Modal
                animationType="fade"
                transparent={true}
                visible={currentStep === 'success'}
                onRequestClose={handleSuccessClose}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.successCard}>
                        <TouchableOpacity style={styles.closeModalButton} onPress={handleSuccessClose}>
                            <X color={colors.white} size={20} />
                        </TouchableOpacity>
                        <View style={styles.successIconCircle}>
                            <CheckCircle color={colors.success} size={40} />
                        </View>
                        <Text style={styles.successTitle}>Upload Successful!</Text>
                        <Text style={styles.successDesc}>Your answer sheet has been securely uploaded.</Text>

                        <TouchableOpacity style={styles.successButtonMain} onPress={handleSuccessClose}>
                            <Camera color="#fff" size={20} />
                            <Text style={styles.successButtonText}>Scan Next Copy</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.successButtonSecondary}
                            onPress={() => {
                                handleSuccessClose();
                                navigation.navigate('Dashboard');
                            }}
                        >
                            <Text style={styles.successButtonTextSec}>Start Evaluate</Text>
                            <ChevronRight color={colors.primary} size={20} />
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

            {/* Preview Modals */}
            <PreviewModal
                isOpen={showPreview}
                initialImages={capturedImages}
                onClose={() => setShowPreview(false)}
                onBack={() => setShowPreview(false)}
                subjectName={subjectName}
                subjectCode={subjectCode}
            />

            <PdfPreviewModal
                isOpen={showPdfPreview}
                files={selectedFiles}
                onClose={() => setShowPdfPreview(false)}
                onBack={() => setShowPdfPreview(false)}
                subjectName={subjectName}
                subjectCode={subjectCode}
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
    },
    headerTitle: {
        color: colors.white,
        fontSize: 24,
        fontWeight: '700',
        letterSpacing: -0.5,
    },
    iconButton: {
        padding: 8,
        backgroundColor: colors.iconBackground || '#1C1C1E',
        borderRadius: 20,
    },
    content: {
        padding: 20,
    },
    inputRow: {
        flexDirection: 'row',
        marginBottom: 20,
    },
    inputContainer: {
        marginBottom: 0,
    },
    label: {
        color: colors.darkTextSecondary,
        fontSize: 13,
        fontWeight: '600',
        marginBottom: 6,
        marginLeft: 4,
    },
    inputWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.cardBlack || '#1C1C1E',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#2C2C2E',
        paddingHorizontal: 12,
        height: 48,
    },
    inputIcon: {
        marginRight: 8,
    },
    input: {
        flex: 1,
        color: colors.white,
        fontSize: 15,
        fontWeight: '500',
    },
    fieldErrorText: {
        color: colors.error,
        fontSize: 12,
        marginTop: 4,
        marginLeft: 4,
    },
    errorText: {
        color: colors.error,
        fontSize: 14,
        marginBottom: 16,
        textAlign: 'center',
        fontWeight: '500',
    },
    uploadingCard: {
        backgroundColor: colors.cardBlack,
        borderRadius: 16,
        padding: 16,
        marginBottom: 20,
        borderWidth: 1,
        borderColor: '#2C2C2E',
    },
    uploadingHeader: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    uploadingTitle: {
        color: colors.white,
        fontWeight: '600',
        fontSize: 14,
        marginBottom: 4,
    },
    uploadingPercent: {
        color: colors.primary,
        fontWeight: '700',
        fontSize: 12,
    },
    progressBarBg: {
        height: 4,
        backgroundColor: '#2C2C2E',
        borderRadius: 2,
        overflow: 'hidden',
        marginTop: 4,
        width: '100%',
    },
    progressBarFill: {
        height: '100%',
        backgroundColor: colors.primary,
        borderRadius: 2,
    },
    actionsContainer: {
        gap: 12,
    },
    compactActionCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.cardBlack || '#1C1C1E',
        padding: 16,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: '#2C2C2E',
    },
    compactIconCircle: {
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 16,
    },
    compactActionContent: {
        flex: 1,
    },
    compactActionTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: colors.white,
        marginBottom: 2,
    },
    compactActionDesc: {
        fontSize: 12,
        color: colors.darkTextSecondary,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.85)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    successCard: {
        backgroundColor: colors.cardBlack,
        width: '100%',
        maxWidth: 340,
        borderRadius: 24,
        padding: 32,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#2C2C2E',
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.4,
        shadowRadius: 16,
        elevation: 8,
    },
    closeModalButton: {
        position: 'absolute',
        top: 16,
        right: 16,
        padding: 8,
        backgroundColor: colors.iconBackground,
        borderRadius: 20,
    },
    successIconCircle: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: 'rgba(76, 175, 80, 0.15)',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 24,
        borderWidth: 2,
        borderColor: 'rgba(76, 175, 80, 0.3)',
    },
    successTitle: {
        fontSize: 24,
        fontWeight: '700',
        color: colors.white,
        marginBottom: 8,
        textAlign: 'center',
    },
    successDesc: {
        fontSize: 14,
        color: colors.darkTextSecondary,
        textAlign: 'center',
        marginBottom: 32,
        lineHeight: 20,
    },
    successButtonMain: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.primary,
        width: '100%',
        paddingVertical: 16,
        borderRadius: 16,
        justifyContent: 'center',
        gap: 8,
        marginBottom: 12,
        shadowColor: colors.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 4,
    },
    successButtonSecondary: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'transparent',
        width: '100%',
        paddingVertical: 16,
        borderRadius: 16,
        justifyContent: 'center',
        gap: 8,
        borderWidth: 1,
        borderColor: '#2C2C2E',
    },
    successButtonText: {
        color: '#fff',
        fontWeight: '700',
        fontSize: 16,
    },
    successButtonTextSec: {
        color: colors.primary,
        fontWeight: '700',
        fontSize: 16,
    },
});

export default ScanningScreen;
