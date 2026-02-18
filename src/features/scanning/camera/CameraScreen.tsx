import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Image,
    ScrollView,
    Alert,
    Dimensions,
    StatusBar,
    Platform,
    PermissionsAndroid,
} from 'react-native';
import DocumentScanner from 'react-native-document-scanner-plugin';
import { useNavigation, useRoute } from '@react-navigation/native';
import { X, Trash2, CheckCircle, Camera as CameraIcon, Image as ImageIcon } from 'lucide-react-native';
import { ImageViewerModal } from '../components/ImageViewerModal';
import { colors } from '../../../theme/colors';
import Sound from 'react-native-sound';

// Enable playback in silence mode
Sound.setCategory('Playback');

const { width, height } = Dimensions.get('window');

const KEYCODE_VOLUME_UP = 24;
const KEYCODE_VOLUME_DOWN = 25;

const CameraScreen = () => {
    const navigation = useNavigation();
    const route = useRoute<any>();
    const { onCaptureComplete, initialImages = [] } = route.params || {};



    // ── ALL hooks must be declared before any conditional return ──────────────
    const [images, setImages] = useState<string[]>(initialImages);
    const [hasPermission, setHasPermission] = useState<boolean | null>(null);
    const [selectedImageIndex, setSelectedImageIndex] = useState<number | null>(null);

    // Permissions
    useEffect(() => {
        const requestPermission = async () => {
            if (Platform.OS === 'android') {
                const granted = await PermissionsAndroid.request(
                    PermissionsAndroid.PERMISSIONS.CAMERA
                );
                setHasPermission(granted === PermissionsAndroid.RESULTS.GRANTED);
            } else {
                setHasPermission(true);
            }
        };
        requestPermission();
    }, []);

    const scanDocument = async () => {
        if (!hasPermission) {
            Alert.alert('Permission Required', 'Please grant camera permission to scan documents.');
            return;
        }

        try {
            const { scannedImages, status } = await DocumentScanner.scanDocument({
                maxNumDocuments: 24,
                croppedImageQuality: 100 // optional
            });

            if (status === 'cancel') {
                // User cancelled, do nothing or go back if no images
            }

            if (scannedImages && scannedImages.length > 0) {
                // Play shutter sound
                const shutterSound = new Sound('https://www.soundjay.com/mechanical/sounds/camera-shutter-click-08.mp3', undefined, (error) => {
                    if (error) {
                        console.log('Failed to load sound', error);
                        return;
                    }
                    shutterSound.play((success) => {
                        if (!success) {
                            console.log('Sound playback failed');
                        }
                        shutterSound.release();
                    });
                });

                setImages(prev => [...prev, ...scannedImages]);
            }
        } catch (e) {
            console.error('Scanner failed:', e);
            Alert.alert('Error', 'Failed to scan document');
        }
    };

    useEffect(() => {
        // Auto-launch scanner on first load if no images
        if (hasPermission && images.length === 0) {
            scanDocument();
        }
    }, [hasPermission]); // Only run when permission is determined
    // ─────────────────────────────────────────────────────────────────────────

    const handleSubmit = () => {
        if (images.length === 0) return;
        if (onCaptureComplete) onCaptureComplete(images);
        navigation.goBack();
    };

    const handleRemoveImage = (index: number) => {
        setImages(prev => prev.filter((_, i) => i !== index));
    };

    const handleDeleteFromPreview = () => {
        if (selectedImageIndex !== null) {
            handleRemoveImage(selectedImageIndex);
            setSelectedImageIndex(null);
        }
    };

    const handleCropSave = (newUri: string) => {
        if (selectedImageIndex !== null) {
            setImages(prev => {
                const newImages = [...prev];
                newImages[selectedImageIndex] = newUri;
                return newImages;
            });
            // We can choose to close or keep open. Let's keep open to see result.
            // Actually usually better to close or just let user see it. 
            // The modal uses imageUri from props which will update.
        }
    };

    // ── Single return — permission states rendered conditionally inside ────────
    return (
        <View style={styles.container}>
            <StatusBar hidden />

            {/* Permission: loading */}
            {hasPermission === null && (
                <View style={styles.centerContent}>
                    <Text style={styles.permissionText}>Requesting camera permission...</Text>
                </View>
            )}

            {/* Permission: denied */}
            {hasPermission === false && (
                <View style={styles.centerContent}>
                    <Text style={styles.permissionText}>Camera permission is required.</Text>
                    <TouchableOpacity
                        style={styles.permButton}
                        onPress={async () => {
                            const granted = await PermissionsAndroid.request(
                                PermissionsAndroid.PERMISSIONS.CAMERA
                            );
                            setHasPermission(granted === PermissionsAndroid.RESULTS.GRANTED);
                        }}
                    >
                        <Text style={styles.permButtonText}>Grant Permission</Text>
                    </TouchableOpacity>
                </View>
            )}

            {/* Main Content — only rendered when permission granted */}
            {hasPermission === true && (
                <View style={styles.contentContainer}>
                    {/* Top Bar */}
                    <View style={styles.topBar}>
                        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.iconButton}>
                            <X color="#fff" size={28} />
                        </TouchableOpacity>
                        <Text style={styles.headerTitle}>
                            {images.length > 0 ? `${images.length} Pages Scanned` : 'Scan Document'}
                        </Text>
                        <View style={{ width: 48 }} />
                    </View>

                    {/* Center Placeholder / Start Button */}
                    <View style={styles.centerActionContainer}>
                        {images.length === 0 ? (
                            <View style={styles.emptyState}>
                                <View style={styles.emptyIconCircle}>
                                    <CameraIcon size={48} color={colors.primary || '#6366f1'} />
                                </View>
                                <Text style={styles.emptyTitle}>No pages scanned</Text>
                                <Text style={styles.emptyDesc}>Tap the button below to start scanning document pages.</Text>
                            </View>
                        ) : (
                            <View style={styles.imagesGrid}>
                                <ScrollView contentContainerStyle={styles.gridContent}>
                                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12, justifyContent: 'center' }}>
                                        {images.map((img, idx) => (
                                            <TouchableOpacity
                                                key={idx}
                                                style={styles.gridItem}
                                                onPress={() => setSelectedImageIndex(idx)}
                                            >
                                                <Image source={{ uri: img }} style={styles.gridImage} />
                                                <View style={styles.gridBadge}>
                                                    <Text style={styles.gridBadgeText}>{idx + 1}</Text>
                                                </View>
                                                <TouchableOpacity
                                                    style={styles.gridDelete}
                                                    onPress={() => handleRemoveImage(idx)}
                                                >
                                                    <X size={12} color="#fff" />
                                                </TouchableOpacity>
                                            </TouchableOpacity>
                                        ))}
                                    </View>
                                </ScrollView>
                            </View>
                        )}
                    </View>

                    {/* Bottom Controls */}
                    <View style={styles.bottomControls}>
                        <View style={styles.actionRow}>
                            <TouchableOpacity
                                style={styles.secondaryBtn}
                                onPress={() => setImages([])}
                                disabled={images.length === 0}
                            >
                                <Trash2 color={images.length > 0 ? '#ef4444' : '#52525b'} size={24} />
                            </TouchableOpacity>

                            <TouchableOpacity style={styles.captureBtn} onPress={scanDocument}>
                                <View style={styles.captureInner}>
                                    <CameraIcon color="#000" size={32} />
                                </View>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={[styles.secondaryBtn, { backgroundColor: images.length > 0 ? '#fff' : '#27272a' }]}
                                onPress={handleSubmit}
                                disabled={images.length === 0}
                            >
                                <CheckCircle color={images.length > 0 ? '#000' : '#52525b'} size={24} />
                                {images.length > 0 && (
                                    <View style={styles.badge}>
                                        <Text style={styles.badgeText}>{images.length}</Text>
                                    </View>
                                )}
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            )}

            <ImageViewerModal
                visible={selectedImageIndex !== null}
                imageUri={selectedImageIndex !== null ? images[selectedImageIndex] : null}
                onClose={() => setSelectedImageIndex(null)}
                onDelete={handleDeleteFromPreview}
                onCropSave={handleCropSave}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#000' },
    contentContainer: { flex: 1, justifyContent: 'space-between' },
    centerContent: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 30 },
    permissionText: { color: '#fff', fontSize: 16, marginBottom: 20, textAlign: 'center' },
    permButton: { backgroundColor: '#6366f1', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 8 },
    permButtonText: { color: '#fff', fontWeight: 'bold' },
    topBar: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingTop: Platform.OS === 'ios' ? 50 : 20,
        paddingHorizontal: 20,
    },
    headerTitle: { color: '#fff', fontSize: 18, fontWeight: '600' },
    iconButton: { padding: 10, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 25 },

    centerActionContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    emptyState: { alignItems: 'center', justifyContent: 'center' },
    emptyIconCircle: { width: 80, height: 80, borderRadius: 40, backgroundColor: 'rgba(99, 102, 241, 0.1)', alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
    emptyTitle: { color: '#fff', fontSize: 20, fontWeight: 'bold', marginBottom: 8 },
    emptyDesc: { color: '#999', textAlign: 'center', maxWidth: 240 },

    imagesGrid: { flex: 1, width: '100%' },
    gridContent: { paddingVertical: 20 },
    gridItem: { width: 100, height: 140, borderRadius: 8, overflow: 'hidden', backgroundColor: '#333', position: 'relative' },
    gridImage: { width: '100%', height: '100%' },
    gridBadge: { position: 'absolute', bottom: 4, right: 4, backgroundColor: 'rgba(0,0,0,0.6)', paddingHorizontal: 6, borderRadius: 4 },
    gridBadgeText: { color: '#fff', fontSize: 10, fontWeight: '700' },
    gridDelete: { position: 'absolute', top: 4, right: 4, backgroundColor: '#ef4444', width: 20, height: 20, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },

    bottomControls: { paddingBottom: 40, paddingHorizontal: 20, backgroundColor: '#000' },
    actionRow: { flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center' },
    captureBtn: { width: 80, height: 80, borderRadius: 40, borderWidth: 4, borderColor: '#fff', alignItems: 'center', justifyContent: 'center' },
    captureInner: { width: 64, height: 64, borderRadius: 32, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
    secondaryBtn: { width: 50, height: 50, borderRadius: 25, backgroundColor: '#27272a', alignItems: 'center', justifyContent: 'center', position: 'relative' },
    badge: {
        position: 'absolute', top: -5, right: -5,
        backgroundColor: '#6366f1', borderRadius: 10,
        width: 20, height: 20, alignItems: 'center', justifyContent: 'center',
        borderWidth: 2, borderColor: '#000',
    },
    badgeText: { color: '#fff', fontSize: 10, fontWeight: 'bold' },
});


export default CameraScreen;