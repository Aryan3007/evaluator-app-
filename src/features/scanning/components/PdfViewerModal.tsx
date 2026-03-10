import React, { useEffect, useRef } from 'react';
import { Linking, Alert } from 'react-native';
import RNFS from 'react-native-fs';
import ReactNativeBlobUtil from 'react-native-blob-util';

interface Props {
    visible: boolean;
    fileUri: string | null;
    onClose: () => void;
    fileName?: string;
    /** Called once download starts, before any bytes arrive (only for local files) */
    onStart?: () => void;
    /** Called repeatedly during download; received & total are bytes (only for local files) */
    onProgress?: (received: number, total: number) => void;
}

export const PdfViewerModal: React.FC<Props> = ({ visible, fileUri, onClose, fileName, onStart, onProgress }) => {
    const hasOpened = useRef(false);
    const onStartRef = useRef(onStart);
    const onProgressRef = useRef(onProgress);
    const onCloseRef = useRef(onClose);
    useEffect(() => { onStartRef.current = onStart; }, [onStart]);
    useEffect(() => { onProgressRef.current = onProgress; }, [onProgress]);
    useEffect(() => { onCloseRef.current = onClose; }, [onClose]);

    useEffect(() => {
        if (!visible || !fileUri || hasOpened.current) return;
        hasOpened.current = true;

        const openFile = async () => {
            try {
                if (fileUri.startsWith('http://') || fileUri.startsWith('https://')) {
                    // ── Remote URL ────────────────────────────────────────────────────────
                    // Open directly in the system browser / PDF viewer.
                    // NOTE: We skip canOpenURL() here — on Android 11+ it returns false for
                    // https:// URLs unless QUERY_ALL_PACKAGES is declared in the manifest,
                    // even though every device has a browser that can open the link.
                    // If openURL truly fails the catch block below handles it.
                    await Linking.openURL(fileUri);
                } else {
                    // ── Local file (file:// or content://) ───────────────────────────────
                    // For local files we still download + open with a native viewer
                    const localPath = fileUri.startsWith('file://')
                        ? fileUri.replace('file://', '')
                        : fileUri;

                    const exists = await RNFS.exists(localPath);
                    if (!exists) {
                        // Try to copy content:// to cache first
                        const destName = fileName || `preview_${Date.now()}.pdf`;
                        const destPath = `${ReactNativeBlobUtil.fs.dirs.CacheDir}/${destName}`;
                        await RNFS.copyFile(fileUri, destPath);

                        const mimeType = 'application/pdf';
                        await ReactNativeBlobUtil.android.actionViewIntent(destPath, mimeType);
                    } else {
                        const mimeType = 'application/pdf';
                        await ReactNativeBlobUtil.android.actionViewIntent(localPath, mimeType);
                    }
                }
            } catch (e: any) {
                console.error('[PdfViewerModal] Failed to open file:', e);
                // Last resort — open in browser
                if (fileUri.startsWith('http://') || fileUri.startsWith('https://')) {
                    try { await Linking.openURL(fileUri); } catch {
                        Alert.alert('Cannot Open File', 'Unable to open this file.');
                    }
                } else {
                    Alert.alert(
                        'Cannot Open File',
                        'Please install a PDF viewer app to view this file.',
                    );
                }
            } finally {
                onCloseRef.current();
            }
        };

        openFile();
    }, [visible, fileUri, fileName]);

    useEffect(() => {
        if (!visible) {
            hasOpened.current = false;
        }
    }, [visible]);

    return null;
};
