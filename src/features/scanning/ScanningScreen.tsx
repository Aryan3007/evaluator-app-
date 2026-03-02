import React, { useState } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    StatusBar,
    ActivityIndicator,
    Modal,
    Alert
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Camera, FileText, Menu, ChevronRight, BookOpen, Hash, Home } from 'lucide-react-native';
import ScanningSidebar from './ScanningSidebar';
import DocumentPicker from 'react-native-document-picker';
import RNFS from 'react-native-fs';
import { useAppSelector } from '../../core/hooks/useRedux';
import { colors } from '../../theme/colors';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const ScanningScreen = () => {
    const navigation = useNavigation<any>();
    const insets = useSafeAreaInsets();
    const { isUploading, uploadProgress } = useAppSelector(
        (state) => state.scanning
    );

    const [subjectName, setSubjectName] = useState('');
    const [subjectCode, setSubjectCode] = useState('');
    const [subjectNameError, setSubjectNameError] = useState('');
    const [subjectCodeError, setSubjectCodeError] = useState('');
    const [error, setError] = useState('');
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    // File/Image State

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
            setError('Please enter subject name and code');
        } else {
            setError('');
        }
        return isValid;
    };

    const handleSubjectNameChange = (value: string) => {
        setSubjectName(value);

        if (value.length > 100) {
            setSubjectNameError('Max 100 characters allowed');
        } else if (!/^[a-zA-Z0-9\s]*$/.test(value)) {
            setSubjectNameError('Special characters not allowed');
        } else {
            setSubjectNameError('');
            if (!subjectCodeError) setError('');
        }
    };

    const handleSubjectCodeChange = (value: string) => {
        setSubjectCode(value);

        if (value.length > 15) {
            setSubjectCodeError('Max 15 characters allowed');
        } else if (!/^[a-zA-Z0-9]*$/.test(value)) {
            setSubjectCodeError('Only alphanumeric characters (A-Z, 0-9) allowed');
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
                // Instead of showing local modal, navigate to ImagePreview screen
                navigation.navigate('ImagePreview', {
                    subjectName,
                    subjectCode,
                    initialImages: images
                });
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

            // Copy files to local cache so content:// URI permissions don't expire
            const formattedFiles = await Promise.all(
                results.map(async (file) => {
                    const fileName = file.name || `document_${Date.now()}.pdf`;
                    const destPath = `${RNFS.CachesDirectoryPath}/${fileName}`;
                    await RNFS.copyFile(file.uri, destPath);
                    return {
                        uri: `file://${destPath}`,
                        name: fileName,
                        type: file.type || 'application/pdf',
                        size: file.size,
                    };
                })
            );

            navigation.navigate('PdfPreview', {
                subjectName,
                subjectCode,
                files: formattedFiles
            });
        } catch (err) {
            if (DocumentPicker.isCancel(err)) {
                // User cancelled
            } else {
                console.error('Unknown Error: ', err);
                Alert.alert('Error', 'Failed to pick document');
            }
        }
    };

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" backgroundColor={colors.darkBackground} />

            {/* Header */}
            <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
                <TouchableOpacity onPress={() => navigation.reset({
                    index: 0,
                    routes: [{ name: 'Home' }]
                })} style={styles.iconButton}>
                    <Home color={colors.white} size={24} />
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
                        <Text style={[
                            styles.fieldHelperText,
                            !!subjectNameError && { color: colors.error, fontWeight: '500' as const }
                        ]}>
                            {subjectNameError || 'Only characters allowed'}
                        </Text>
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
                        <Text style={[
                            styles.fieldHelperText,
                            !!subjectCodeError && { color: colors.error, fontWeight: '500' as const }
                        ]}>
                            {subjectCodeError || 'Alphanumeric only, no spaces'}
                        </Text>
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

                {/* Action Buttons - Unified Flow */}
                <View style={styles.actionsContainer}>
                    {/* Primary Action */}
                    <TouchableOpacity
                        style={styles.primaryActionCard}
                        onPress={handleCameraStart}
                        activeOpacity={0.8}
                    >
                        <View style={styles.primaryIconWrapper}>
                            <Camera color={colors.white} size={32} />
                        </View>
                        <View style={styles.primaryActionContent}>
                            <Text style={styles.primaryActionTitle}>Scan Answer Sheets</Text>
                            <Text style={styles.primaryActionDesc}>Open camera to capture pages</Text>
                        </View>
                        <ChevronRight color={colors.white} size={24} style={{ opacity: 0.8 }} />
                    </TouchableOpacity>

                    {/* Divider */}
                    <View style={styles.dividerRow}>
                        <View style={styles.dividerLine} />
                        <Text style={styles.dividerText}>OR</Text>
                        <View style={styles.dividerLine} />
                    </View>

                    {/* Secondary Action */}
                    <TouchableOpacity
                        style={styles.secondaryActionCard}
                        onPress={handleFileUpload}
                        activeOpacity={0.7}
                    >
                        <FileText color={colors.darkTextSecondary} size={20} />
                        <Text style={styles.secondaryActionText}>Upload existing PDF</Text>
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
    fieldHelperText: {
        color: colors.darkTextSecondary,
        fontSize: 11,
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
    primaryActionCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.primary,
        padding: 20,
        borderRadius: 20,
        shadowColor: colors.primary,
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.3,
        shadowRadius: 16,
        elevation: 8,
    },
    primaryIconWrapper: {
        width: 56,
        height: 56,
        borderRadius: 16,
        backgroundColor: 'rgba(255,255,255,0.2)',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 16,
    },
    primaryActionContent: {
        flex: 1,
    },
    primaryActionTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: colors.white,
        marginBottom: 4,
    },
    primaryActionDesc: {
        fontSize: 13,
        color: 'rgba(255,255,255,0.8)',
    },
    dividerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginVertical: 12,
        paddingHorizontal: 20,
    },
    dividerLine: {
        flex: 1,
        height: 1,
        backgroundColor: '#2C2C2E',
    },
    dividerText: {
        color: colors.darkTextSecondary,
        paddingHorizontal: 16,
        fontSize: 12,
        fontWeight: '600',
    },
    secondaryActionCard: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: colors.cardBlack || '#1C1C1E',
        padding: 16,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: '#2C2C2E',
        gap: 8,
    },
    secondaryActionText: {
        fontSize: 15,
        fontWeight: '600',
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
