import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../../app/store';
import {
    setScanning,
    setProcessing,
    setDocuments,
    setCurrentDocument,
    setCurrentResult,
    setError,
} from '../redux/scanningSlice';
import { scanningApi } from '../api/scanning.api';

export const useScanning = () => {
    const dispatch = useDispatch();
    const { documents, currentDocument, currentResult, isScanning, isProcessing, error } = useSelector(
        (state: RootState) => state.scanning
    );

    const uploadDocument = async (uri: string, type: 'image' | 'pdf') => {
        dispatch(setScanning(true));
        const response = await scanningApi.uploadDocument(uri, type);

        if (response.success && response.data) {
            dispatch(setCurrentDocument(response.data));
            dispatch(setScanning(false));
            return response.data;
        } else {
            dispatch(setError(response.error || 'Failed to upload document'));
            return null;
        }
    };

    const processDocument = async (documentId: string) => {
        dispatch(setProcessing(true));
        const response = await scanningApi.processDocument(documentId);

        if (response.success && response.data) {
            dispatch(setCurrentResult(response.data));
        } else {
            dispatch(setError(response.error || 'Failed to process document'));
        }
    };

    const fetchDocuments = async () => {
        const response = await scanningApi.getScans();

        if (response.success && response.data) {
            dispatch(setDocuments(response.data));
        } else {
            dispatch(setError(response.error || 'Failed to fetch documents'));
        }
    };

    return {
        documents,
        currentDocument,
        currentResult,
        isScanning,
        isProcessing,
        error,
        uploadDocument,
        processDocument,
        fetchDocuments,
    };
};
