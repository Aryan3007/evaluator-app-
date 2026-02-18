import React from 'react';
import { View, Modal, StyleSheet, Image, TouchableOpacity, Text, Dimensions, StatusBar, ScrollView } from 'react-native';
import ImagePicker from 'react-native-image-crop-picker';
import { X, Crop, Trash2 } from 'lucide-react-native';
import { colors } from '../../../theme/colors';

const { width } = Dimensions.get('window');

interface Props {
    visible: boolean;
    imageUri: string | null;
    onClose: () => void;
    onDelete: () => void;
    onCropSave: (newUri: string) => void;
}

export const ImageViewerModal: React.FC<Props> = ({ visible, imageUri, onClose, onDelete, onCropSave }) => {
    if (!visible || !imageUri) return null;

    const handleCrop = async () => {
        try {
            const result = await ImagePicker.openCropper({
                path: imageUri,
                freeStyleCropEnabled: true,
                mediaType: 'photo',
                cropping: true,
                cropperToolbarTitle: 'Edit Image',
                cropperToolbarColor: colors.darkBackground || '#000000',
                cropperToolbarWidgetColor: '#FFFFFF',
                cropperActiveWidgetColor: colors.primary || '#6366f1',
            });

            if (result.path) {
                onCropSave(result.path);
            }
        } catch (error) {
            console.log('Crop cancelled or failed', error);
        }
    };

    return (
        <Modal visible={visible} transparent={false} animationType="slide" onRequestClose={onClose}>
            <View style={styles.container}>
                <StatusBar barStyle="light-content" backgroundColor="black" />

                <View style={styles.topBar}>
                    <TouchableOpacity onPress={onClose} style={styles.iconButton}>
                        <X color="#fff" size={24} />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Preview</Text>
                    <View style={{ width: 44 }} />
                </View>

                <View style={styles.imageContainer}>
                    <ScrollView
                        maximumZoomScale={3}
                        minimumZoomScale={1}
                        centerContent={true}
                        contentContainerStyle={styles.scrollContent}
                        showsHorizontalScrollIndicator={false}
                        showsVerticalScrollIndicator={false}
                    >
                        <Image source={{ uri: imageUri }} style={styles.fullImage} resizeMode="contain" />
                    </ScrollView>
                </View>

                <View style={styles.bottomBar}>
                    <TouchableOpacity onPress={onDelete} style={styles.actionButton}>
                        <View style={[styles.iconCircle, { backgroundColor: 'rgba(239, 68, 68, 0.2)' }]}>
                            <Trash2 color="#ef4444" size={24} />
                        </View>
                        <Text style={[styles.actionText, { color: '#ef4444' }]}>Delete</Text>
                    </TouchableOpacity>

                    <TouchableOpacity onPress={handleCrop} style={styles.primaryActionButton}>
                        <Crop color="#fff" size={24} />
                        <Text style={styles.primaryActionText}>Crop & Edit</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#000',
    },
    topBar: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingTop: 50,
        paddingHorizontal: 20,
        paddingBottom: 20,
        backgroundColor: 'rgba(0,0,0,0.5)',
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 10,
    },
    headerTitle: {
        color: '#fff',
        fontSize: 18,
        fontWeight: '600',
    },
    iconButton: {
        padding: 10,
        backgroundColor: 'rgba(255,255,255,0.1)',
        borderRadius: 22,
    },
    imageContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#000',
    },
    fullImage: {
        width: width,
        height: '100%',
    },
    scrollContent: {
        flexGrow: 1,
        justifyContent: 'center',
        alignItems: 'center',
        width: width,
        height: '100%',
    },
    bottomBar: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 30,
        paddingBottom: 50,
        paddingTop: 20,
        backgroundColor: 'rgba(0,0,0,0.8)',
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
    },
    actionButton: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    iconCircle: {
        width: 50,
        height: 50,
        borderRadius: 25,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 8,
    },
    actionText: {
        color: '#fff',
        fontSize: 12,
        fontWeight: '500',
    },
    primaryActionButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#6366f1',
        paddingHorizontal: 24,
        paddingVertical: 14,
        borderRadius: 30,
    },
    primaryActionText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
        marginLeft: 8,
    }
});
