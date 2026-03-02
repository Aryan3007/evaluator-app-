import React from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
} from 'react-native';
import { ChevronRight, Square, X } from 'lucide-react-native';
import { colors } from '../../../theme/colors';

interface ActionPopupModalProps {
    visible: boolean;
    copyNumber: number;
    imageCount: number;
    onNextCopy: () => void;
    onFinish: () => void;
    onCancel: () => void;
}

export const ActionPopupModal: React.FC<ActionPopupModalProps> = ({
    visible,
    copyNumber,
    imageCount,
    onNextCopy,
    onFinish,
    onCancel,
}) => {
    if (!visible) return null;

    return (
        <View style={styles.overlay}>
            <View style={styles.card}>
                <Text style={styles.title}>Copy #{copyNumber} Complete</Text>
                <Text style={styles.subtitle}>{imageCount} pages captured</Text>

                <TouchableOpacity style={styles.primaryButton} onPress={onNextCopy} activeOpacity={0.8}>
                    <Text style={styles.primaryButtonText}>Next Copy</Text>
                    <ChevronRight size={20} color={colors.white} />
                </TouchableOpacity>

                <TouchableOpacity style={styles.secondaryButton} onPress={onFinish} activeOpacity={0.8}>
                    <Square size={16} color={colors.primary} />
                    <Text style={styles.secondaryButtonText}>Finish Subject</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.cancelButton} onPress={onCancel} activeOpacity={0.8}>
                    <X size={16} color={colors.darkTextSecondary} />
                    <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>

                <Text style={styles.hint}>Press volume button to confirm Next Copy</Text>
            </View>
        </View>
    );
};
const styles = StyleSheet.create({
    overlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.85)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 32,
        zIndex: 100,
    },
    card: {
        width: '100%',
        backgroundColor: colors.cardBlack,
        borderRadius: 24,
        padding: 28,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#2C2C2E',
    },
    title: {
        fontSize: 22,
        fontWeight: '700',
        color: colors.white,
        marginBottom: 4,
    },
    subtitle: {
        fontSize: 14,
        color: colors.darkTextSecondary,
        marginBottom: 28,
    },
    primaryButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: colors.primary,
        width: '100%',
        paddingVertical: 16,
        borderRadius: 16,
        gap: 8,
        marginBottom: 12,
    },
    primaryButtonText: {
        color: colors.white,
        fontSize: 18,
        fontWeight: '700',
    },
    secondaryButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        width: '100%',
        paddingVertical: 14,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: colors.primary,
        gap: 8,
        marginBottom: 12,
    },
    secondaryButtonText: {
        color: colors.primary,
        fontSize: 16,
        fontWeight: '600',
    },
    cancelButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 12,
        gap: 6,
    },
    cancelButtonText: {
        color: colors.darkTextSecondary,
        fontSize: 14,
        fontWeight: '500',
    },
    hint: {
        fontSize: 11,
        color: '#555',
        marginTop: 16,
        textAlign: 'center',
    },
});
