import React, { useState } from 'react';
import { View, StyleSheet, Dimensions, Text, TouchableOpacity, Modal, ActivityIndicator, Image } from 'react-native';
import Pdf from 'react-native-pdf';
import { X, ChevronLeft, ChevronRight } from 'lucide-react-native';
import { colors } from '../../../theme/colors';

const { width } = Dimensions.get('window');

interface Props {
    visible: boolean;
    fileUri: string | null;
    onClose: () => void;
    fileName?: string;
}

export const PdfViewerModal: React.FC<Props> = ({ visible, fileUri, onClose, fileName }) => {
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(0);
    const [error, setError] = useState<string | null>(null);

    // Reset error when file changes
    React.useEffect(() => {
        setError(null);
        setPage(1);
        setTotalPages(0);
    }, [fileUri]);

    if (!visible || !fileUri) return null;

    const isPdf = fileUri.toLowerCase().endsWith('.pdf') || (fileName && fileName.toLowerCase().endsWith('.pdf'));

    // Use source object for react-native-pdf
    const source = { uri: fileUri, cache: true };

    return (
        <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
            <View style={styles.container}>
                {/* Header */}
                <View style={styles.header}>
                    <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                        <X color="#fff" size={24} />
                    </TouchableOpacity>
                    <View style={styles.titleContainer}>
                        <Text style={styles.fileName} numberOfLines={1}>{fileName || 'Document Preview'}</Text>
                        {isPdf && totalPages > 0 && (
                            <Text style={styles.pageIndicator}>
                                Page {page} of {totalPages}
                            </Text>
                        )}
                    </View>
                    <View style={{ width: 40 }} />
                </View>

                {/* Content Viewer */}
                <View style={styles.pdfContainer}>
                    {isPdf ? (
                        <Pdf
                            source={source}
                            onLoadComplete={(numberOfPages) => {
                                setTotalPages(numberOfPages);
                                setError(null);
                            }}
                            onPageChanged={(page) => {
                                setPage(page);
                            }}
                            onError={(error) => {
                                console.log('PDF load error:', error);
                                setError('Failed to load PDF');
                            }}
                            onPressLink={(uri) => {
                                console.log(`Link passed to handler: ${uri}`);
                            }}
                            style={styles.pdf}
                            enablePaging={true}
                            horizontal={false}
                            fitPolicy={0}
                            spacing={10}
                            trustAllCerts={false}
                        />
                    ) : (
                        <Image
                            source={{ uri: fileUri }}
                            style={styles.imagePreview}
                            resizeMode="contain"
                            onError={() => setError('Failed to load image')}
                        />
                    )}

                    {error && (
                        <View style={styles.errorContainer}>
                            <Text style={styles.errorText}>{error}</Text>
                            <TouchableOpacity onPress={onClose} style={styles.errorCloseBtn}>
                                <Text style={styles.errorCloseText}>Close</Text>
                            </TouchableOpacity>
                        </View>
                    )}
                </View>
            </View>
        </Modal>
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
        paddingTop: 50, // Adequate clear space for notch
        paddingHorizontal: 20,
        paddingBottom: 16,
        backgroundColor: colors.cardBlack || '#1C1C1E',
        borderBottomWidth: 1,
        borderBottomColor: '#333',
    },
    closeButton: {
        padding: 8,
        backgroundColor: 'rgba(255,255,255,0.1)',
        borderRadius: 20,
    },
    titleContainer: {
        flex: 1,
        alignItems: 'center',
        marginHorizontal: 10,
    },
    fileName: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 2,
        maxWidth: 200,
    },
    pageIndicator: {
        color: colors.darkTextSecondary || '#8E8E93',
        fontSize: 12,
    },
    pdfContainer: {
        flex: 1,
        justifyContent: 'flex-start',
        alignItems: 'center',
        backgroundColor: '#F2F2F7',
    },
    pdf: {
        flex: 1,
        width: width,
        height: '100%',
        backgroundColor: '#F2F2F7',
    },
    imagePreview: {
        flex: 1,
        width: width,
        height: '100%',
        backgroundColor: '#000',
    },
    errorContainer: {
        ...StyleSheet.absoluteFillObject,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.8)',
        zIndex: 10,
    },
    errorText: {
        color: '#FF3B30',
        marginBottom: 20,
        fontSize: 16,
        fontWeight: '600',
    },
    errorCloseBtn: {
        paddingVertical: 10,
        paddingHorizontal: 20,
        backgroundColor: '#333',
        borderRadius: 8,
    },
    errorCloseText: {
        color: '#fff',
        fontWeight: '600',
    }
});
