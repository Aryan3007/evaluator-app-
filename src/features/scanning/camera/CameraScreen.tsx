import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Image,
    FlatList,
    StatusBar,
    Platform,
    ActivityIndicator,
    Linking,
} from 'react-native';
import {
    Camera,
    useCameraDevice,
    useCameraPermission,
    PhotoFile,
} from 'react-native-vision-camera';
import { useNavigation, useRoute } from '@react-navigation/native';
import { X, Trash2, CheckCircle, Zap } from 'lucide-react-native';
import KeyEvent from 'react-native-keyevent';
import { ImageViewerModal } from '../components/ImageViewerModal';
import { ActionPopupModal } from '../components/ActionPopupModal';
import { backgroundUpload } from '../utils/backgroundUpload';
import { fetchFileHistory } from '../../../core/redux/scanningSlice';
import { useAppDispatch } from '../../../core/hooks/useRedux';
import { preloadSounds, playAudio } from '../../../utils/sounds';

const KEYCODE_VOLUME_UP = 24;
const KEYCODE_VOLUME_DOWN = 25;
const LONG_PRESS_DURATION = 1500; // ms — hold volume key for 1.5s to show popup

interface UploadEntry {
    pdfName: string;
    status: 'uploading' | 'success' | 'error';
}

// ── Memoized thumbnail to avoid re-rendering every item on state change ──
const ImageThumbnail = React.memo(({
    uri, index, onPress, onRemove,
}: {
    uri: string; index: number; onPress: (i: number) => void; onRemove: (i: number) => void;
}) => (
    <TouchableOpacity style={styles.gridItem} onPress={() => onPress(index)}>
        <Image source={{ uri }} style={styles.gridImage} />
        <View style={styles.gridBadge}>
            <Text style={styles.gridBadgeText}>{index + 1}</Text>
        </View>
        <TouchableOpacity style={styles.gridDelete} onPress={() => onRemove(index)}>
            <X size={12} color="#fff" />
        </TouchableOpacity>
    </TouchableOpacity>
));

const CameraScreen = () => {
    const navigation = useNavigation<any>();
    const route = useRoute<any>();
    const dispatch = useAppDispatch();
    const { subjectName, subjectCode, initialImages = [] } = route.params || {};

    const camera = useRef<Camera>(null);
    const flatListRef = useRef<FlatList>(null);
    const isCapturing = useRef(false);
    const captureQueue = useRef(0);

    // ── Vision Camera hooks ──
    const device = useCameraDevice('back');
    const { hasPermission, requestPermission } = useCameraPermission();

    // ── State ──
    const [images, setImages] = useState<string[]>(initialImages);
    const [flash, setFlash] = useState<'on' | 'off'>('off');
    const [selectedImageIndex, setSelectedImageIndex] = useState<number | null>(null);
    const [popupVisible, setPopupVisible] = useState(false);
    const [copyNumber, setCopyNumber] = useState(1);
    const [activeUploads, setActiveUploads] = useState<UploadEntry[]>([]);
    const [finishUploading, setFinishUploading] = useState(false);

    // ── Refs (mirrors for use in key event listeners to avoid stale closures) ──
    const imagesRef = useRef<string[]>(initialImages);
    const popupVisibleRef = useRef(false);
    const copyNumberRef = useRef(1);

    // Long-press detection refs
    const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const isHolding = useRef(false);

    // Cooldown: timestamp when popup was shown — ignore volume keys for 1s after
    const popupShownAt = useRef(0);

    // Sync refs with state
    useEffect(() => { imagesRef.current = images; }, [images]);
    useEffect(() => { popupVisibleRef.current = popupVisible; }, [popupVisible]);
    useEffect(() => { copyNumberRef.current = copyNumber; }, [copyNumber]);

    // Sync images with initialImages when params change
    const initialImagesJson = JSON.stringify(initialImages);
    useEffect(() => {
        setImages(initialImages);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [initialImagesJson]);

    // Auto-dismiss popup after 10s
    useEffect(() => {
        if (popupVisible) {
            const timeout = setTimeout(() => {
                popupVisibleRef.current = false;
                setPopupVisible(false);
            }, 10000);
            return () => clearTimeout(timeout);
        }
    }, [popupVisible]);

    // Request permission on mount
    useEffect(() => {
        if (!hasPermission) {
            requestPermission();
        }
        preloadSounds();
    }, [hasPermission, requestPermission]);

    // ── Sound helpers ──
    const playSound = useCallback((type: 'shutter' | 'popup' | 'confirm' | 'success' | 'error') => {
        switch (type) {
            case 'shutter':
                playAudio('shutter');
                break;
            case 'popup':
                playAudio('popup');
                break;
            case 'confirm':
                playAudio('confirm');
                break;
            case 'success':
                playAudio('success');
                break;
            case 'error':
                playAudio('error');
                break;
        }
    }, []);

    // ── Capture ──
    // takePhoto() for full-resolution sharpness — no crop, captures full sensor output
    const handleCapture = useCallback(async () => {
        if (!camera.current) return;

        if (isCapturing.current) {
            captureQueue.current++;
            return;
        }

        isCapturing.current = true;

        try {
            const photo: PhotoFile = await camera.current.takePhoto({
                flash: flash,
                enableShutterSound: false,
            });
            if (photo?.path) {
                playSound('shutter');
                const uri = `file://${photo.path}`;
                setImages(prev => [...prev, uri]);
                requestAnimationFrame(() => {
                    flatListRef.current?.scrollToEnd({ animated: true });
                });
            }
        } catch (error) {
            console.error('Capture failed:', error);
        } finally {
            isCapturing.current = false;
            if (captureQueue.current > 0) {
                captureQueue.current--;
                handleCapture();
            }
        }
    }, [playSound, flash]);

    // ── Next Copy (background PDF + upload) ──
    const handleNextCopy = useCallback(() => {
        playSound('confirm');
        popupVisibleRef.current = false; // sync immediately
        setPopupVisible(false);

        const currentImages = [...imagesRef.current];
        const currentCopy = copyNumberRef.current;

        // Reset camera for next copy immediately
        setImages([]);
        setCopyNumber(prev => prev + 1);

        if (currentImages.length === 0) return;

        const pdfName = `${subjectCode}_copy${currentCopy}_${Date.now()}.pdf`;
        setActiveUploads(prev => [...prev, { pdfName, status: 'uploading' }]);

        backgroundUpload({
            images: currentImages,
            subjectName,
            subjectCode,
            pdfName,
            onSuccess: (name) => {
                playSound('success');
                dispatch(fetchFileHistory({ limit: 10 }));
                setActiveUploads(prev =>
                    prev.map(u => (u.pdfName === name ? { ...u, status: 'success' } : u)),
                );
                setTimeout(() => {
                    setActiveUploads(prev => prev.filter(u => u.pdfName !== name));
                }, 3000);
            },
            onError: (_error, name) => {
                playSound('error');
                setActiveUploads(prev =>
                    prev.map(u => (u.pdfName === name ? { ...u, status: 'error' } : u)),
                );
            },
        });
    }, [playSound, subjectName, subjectCode, dispatch]);

    // ── Finish Subject ──
    const handleFinishSubject = useCallback(() => {
        playSound('confirm');
        popupVisibleRef.current = false;
        setPopupVisible(false);

        const currentImages = [...imagesRef.current];
        const currentCopy = copyNumberRef.current;

        if (currentImages.length > 0) {
            const pdfName = `${subjectCode}_copy${currentCopy}_${Date.now()}.pdf`;
            setFinishUploading(true);

            // Upload PDF then navigate to home
            backgroundUpload({
                images: currentImages,
                subjectName,
                subjectCode,
                pdfName,
                onSuccess: () => {
                    playSound('success');
                    dispatch(fetchFileHistory({ limit: 10 }));
                    setFinishUploading(false);
                    navigation.reset({ index: 0, routes: [{ name: 'Home' }] });
                },
                onError: () => {
                    playSound('error');
                    setFinishUploading(false);
                    navigation.reset({ index: 0, routes: [{ name: 'Home' }] });
                },
            });
        } else {
            // No images — just go home
            navigation.reset({ index: 0, routes: [{ name: 'Home' }] });
        }
    }, [playSound, subjectName, subjectCode, dispatch, navigation]);

    // ── Volume Key Event Handling (long-press = popup, short-press = capture/confirm) ──
    useEffect(() => {
        if (Platform.OS === 'android') {
            KeyEvent.onKeyDownListener((keyEvent: any) => {
                if (keyEvent.keyCode !== KEYCODE_VOLUME_UP && keyEvent.keyCode !== KEYCODE_VOLUME_DOWN) return;
                if (isHolding.current) return; // guard against Android repeated KEY_DOWN
                isHolding.current = true;

                // Start 3s long-press timer — if held long enough, show popup
                longPressTimer.current = setTimeout(() => {
                    longPressTimer.current = null;
                    if (!popupVisibleRef.current && imagesRef.current.length > 0) {
                        playSound('popup');
                        popupVisibleRef.current = true;
                        popupShownAt.current = Date.now();
                        setPopupVisible(true);
                    }
                }, LONG_PRESS_DURATION);
            });
        }

        KeyEvent.onKeyUpListener((keyEvent: any) => {
            if (keyEvent.keyCode !== KEYCODE_VOLUME_UP && keyEvent.keyCode !== KEYCODE_VOLUME_DOWN) return;
            isHolding.current = false;

            // Cancel long-press timer (short press)
            let wasLongPress = false;

            if (Platform.OS === 'android') {
                wasLongPress = !longPressTimer.current; // timer already fired = long press
                if (longPressTimer.current) {
                    clearTimeout(longPressTimer.current);
                    longPressTimer.current = null;
                }
            }

            if (popupVisibleRef.current) {
                // Ignore the key-up from the hold that just opened the popup (1s cooldown)
                if (Date.now() - popupShownAt.current < 1000) return;
                // Short press while popup visible → confirm "Next Copy"
                handleNextCopy();
            } else if (!wasLongPress) {
                // Short press, no popup → capture
                handleCapture();
            }
        });

        return () => {
            if (Platform.OS === 'android') {
                KeyEvent.removeKeyDownListener();
            }
            KeyEvent.removeKeyUpListener();
            if (longPressTimer.current) clearTimeout(longPressTimer.current);
        };
    }, [handleCapture, handleNextCopy, playSound]);

    // ── UI Handlers ──
    const toggleFlash = () => {
        setFlash(prev => (prev === 'on' ? 'off' : 'on'));
    };

    const handleSubmit = () => {
        if (images.length === 0) return;
        navigation.navigate('ImagePreview', {
            subjectName,
            subjectCode,
            initialImages: images,
        });
    };

    const handleRemoveImage = useCallback((index: number) => {
        setImages(prev => prev.filter((_, i) => i !== index));
    }, []);

    const handleDeleteFromPreview = () => {
        if (selectedImageIndex !== null) {
            handleRemoveImage(selectedImageIndex);
            setSelectedImageIndex(null);
        }
    };

    // ── FlatList helpers (stable references to avoid re-renders) ──
    const THUMB_WIDTH = 60;
    const THUMB_GAP = 12;
    const keyExtractor = useCallback((_: string, index: number) => `thumb-${index}`, []);
    const getItemLayout = useCallback((_: any, index: number) => ({
        length: THUMB_WIDTH + THUMB_GAP,
        offset: (THUMB_WIDTH + THUMB_GAP) * index,
        index,
    }), []);
    const renderThumbnail = useCallback(({ item, index }: { item: string; index: number }) => (
        <ImageThumbnail
            uri={item}
            index={index}
            onPress={setSelectedImageIndex}
            onRemove={handleRemoveImage}
        />
    ), [handleRemoveImage]);

    const handleCropSave = (newUri: string) => {
        if (selectedImageIndex !== null) {
            setImages(prev => {
                const newImages = [...prev];
                newImages[selectedImageIndex] = newUri;
                return newImages;
            });
        }
    };

    // ── No device available ──
    if (!device) {
        return (
            <View style={styles.container}>
                <View style={styles.centerContent}>
                    <Text style={styles.permissionText}>No camera device found.</Text>
                </View>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <StatusBar hidden />

            {/* Permission: not granted */}
            {!hasPermission && (
                <View style={styles.centerContent}>
                    <Text style={styles.permissionText}>Camera permission is required.</Text>
                    <TouchableOpacity
                        style={styles.permButton}
                        onPress={() => {
                            Linking.openSettings();
                        }}
                    >
                        <Text style={styles.permButtonText}>Open Settings</Text>
                    </TouchableOpacity>
                </View>
            )}

            {/* Main Content */}
            {hasPermission && (
                <View style={styles.contentContainer}>
                    <Camera
                        ref={camera}
                        style={StyleSheet.absoluteFill}
                        device={device}
                        isActive={true}
                        photo={true}
                        enableZoomGesture={true}
                        torch={flash}
                        resizeMode="contain"
                    />

                    {/* Top Bar */}
                    <View style={styles.topBar}>
                        <TouchableOpacity onPress={() => navigation.navigate('Scanning')} style={styles.iconButton}>
                            <X color="#fff" size={28} />
                        </TouchableOpacity>
                        <Text style={styles.headerTitle}>
                            {images.length > 0
                                ? `Copy ${copyNumber} \u2022 ${images.length} Captured`
                                : `Copy ${copyNumber} \u2022 Scan Document`}
                        </Text>
                        <TouchableOpacity onPress={toggleFlash} style={styles.iconButton}>
                            <Zap
                                color={flash === 'on' ? '#fbbf24' : '#fff'}
                                fill={flash === 'on' ? '#fbbf24' : 'none'}
                                size={28}
                            />
                        </TouchableOpacity>
                    </View>

                    {/* Background Upload Status Badges */}
                    {activeUploads.length > 0 && (
                        <View style={styles.uploadStatusContainer}>
                            {activeUploads.map((upload) => (
                                <View
                                    key={upload.pdfName}
                                    style={[
                                        styles.uploadBadge,
                                        upload.status === 'uploading' && styles.uploadBadgeActive,
                                        upload.status === 'success' && styles.uploadBadgeSuccess,
                                        upload.status === 'error' && styles.uploadBadgeError,
                                    ]}
                                >
                                    {upload.status === 'uploading' && (
                                        <ActivityIndicator size="small" color="#fff" />
                                    )}
                                    <Text style={styles.uploadBadgeText}>
                                        {upload.status === 'uploading'
                                            ? 'Uploading...'
                                            : upload.status === 'success'
                                                ? 'Uploaded'
                                                : 'Failed'}
                                    </Text>
                                </View>
                            ))}
                        </View>
                    )}

                    {/* Center Placeholder */}
                    <View style={styles.centerActionContainer} />

                    {/* Floating Images Grid Overlay */}
                    {images.length > 0 && (
                        <View style={styles.imagesGridOverlay}>
                            <FlatList
                                ref={flatListRef}
                                data={images}
                                horizontal
                                keyExtractor={keyExtractor}
                                renderItem={renderThumbnail}
                                contentContainerStyle={styles.gridContent}
                                showsHorizontalScrollIndicator={false}
                                getItemLayout={getItemLayout}
                                initialNumToRender={8}
                                maxToRenderPerBatch={5}
                                windowSize={5}
                                removeClippedSubviews={true}
                            />
                        </View>
                    )}

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

                            <TouchableOpacity
                                style={styles.captureBtn}
                                onPress={handleCapture}
                                onLongPress={() => {
                                    if (!popupVisibleRef.current && imagesRef.current.length > 0) {
                                        playSound('popup');
                                        popupVisibleRef.current = true;
                                        popupShownAt.current = Date.now();
                                        setPopupVisible(true);
                                    }
                                }}
                                delayLongPress={800} // standard UI long press duration
                            >
                                <View style={styles.captureInner} />
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={[styles.secondaryBtn, images.length > 0 && styles.secondaryBtnActive]}
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

            <ActionPopupModal
                visible={popupVisible}
                copyNumber={copyNumber}
                imageCount={images.length}
                onNextCopy={handleNextCopy}
                onFinish={handleFinishSubject}
                onCancel={() => {
                    popupVisibleRef.current = false;
                    setPopupVisible(false);
                }}
            />

            {/* Full-screen uploading overlay for Finish Subject */}
            {finishUploading && (
                <View style={styles.finishOverlay}>
                    <ActivityIndicator size="large" color="#fff" />
                    <Text style={styles.finishOverlayText}>Uploading images...</Text>
                    <Text style={styles.finishOverlayText}>Redirecting to Home in few seconds...</Text>
                </View>
            )}
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
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 10,
    },
    headerTitle: { color: '#fff', fontSize: 18, fontWeight: '600', textShadowColor: 'rgba(0,0,0,0.5)', textShadowRadius: 4 },
    iconButton: { padding: 10, backgroundColor: 'rgba(0,0,0,0.3)', borderRadius: 25 },

    // Upload status badges
    uploadStatusContainer: {
        position: 'absolute',
        top: Platform.OS === 'ios' ? 100 : 70,
        right: 16,
        zIndex: 10,
        gap: 6,
    },
    uploadBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
        backgroundColor: 'rgba(0,0,0,0.6)',
    },
    uploadBadgeActive: { backgroundColor: 'rgba(33,150,243,0.8)' },
    uploadBadgeSuccess: { backgroundColor: 'rgba(76,175,80,0.8)' },
    uploadBadgeError: { backgroundColor: 'rgba(244,67,54,0.8)' },
    uploadBadgeText: { color: '#fff', fontSize: 12, fontWeight: '600' },

    centerActionContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },

    imagesGridOverlay: {
        position: 'absolute',
        bottom: 140,
        width: '100%',
        height: 100,
    },
    gridContent: {
        paddingVertical: 10,
        paddingHorizontal: 20,
    },
    gridItem: { width: 60, height: 80, marginRight: 12, borderRadius: 8, overflow: 'hidden', backgroundColor: '#333', position: 'relative', borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)' },
    gridImage: { width: '100%', height: '100%' },
    gridBadge: { position: 'absolute', bottom: 2, right: 2, backgroundColor: 'rgba(0,0,0,0.6)', paddingHorizontal: 4, borderRadius: 3 },
    gridBadgeText: { color: '#fff', fontSize: 8, fontWeight: '700' },
    gridDelete: { position: 'absolute', top: 2, right: 2, backgroundColor: '#ef4444', width: 16, height: 16, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },

    bottomControls: {
        paddingBottom: 40,
        paddingHorizontal: 20,
        paddingTop: 20,
        backgroundColor: 'rgba(0,0,0,0.5)',
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
    },
    actionRow: { flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center' },
    captureBtn: { width: 80, height: 80, borderRadius: 40, borderWidth: 4, borderColor: '#fff', alignItems: 'center', justifyContent: 'center' },
    captureInner: { width: 64, height: 64, borderRadius: 32, backgroundColor: '#fff' },
    secondaryBtn: { width: 50, height: 50, borderRadius: 25, backgroundColor: '#27272a', alignItems: 'center', justifyContent: 'center', position: 'relative' },
    secondaryBtnActive: { backgroundColor: '#fff' },
    badge: {
        position: 'absolute', top: -5, right: -5,
        backgroundColor: '#6366f1', borderRadius: 10,
        width: 20, height: 20, alignItems: 'center', justifyContent: 'center',
        borderWidth: 2, borderColor: '#000',
    },
    badgeText: { color: '#fff', fontSize: 10, fontWeight: 'bold' },

    finishOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.85)',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 200,
    },
    finishOverlayText: {
        color: '#fff',
        fontSize: 18,
        fontWeight: '600',
        marginTop: 16,
    },
});

export default CameraScreen;
