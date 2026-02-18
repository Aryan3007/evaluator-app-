import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import axios from '../api/axios'; // Use centralized axios instance
import axiosOriginal from 'axios'; // Use raw axios for S3 uploads
import { logout } from './authSlice';

// ============ Types ============
export interface FileToUpload {
    file_name: string;
    file_type: string;
    file: any; // React Native file object { uri, type, name }
}

export interface PresignedUploadResponse {
    base_url: string;
    fields: Record<string, any>;
    object_key: string;
    url: string;
    file_name: string;
}

export interface UploadedFileMetadata {
    file_name: string;
    s3_url: string;
    file_size: number;
    mime_type: string;
}

export interface FileRecord {
    file_id: string;
    paper_code_id: string;
    file_name: string;
    s3_url: string;
    file_size: number;
    mime_type: string;
    status: string;
    evaluation_result: Record<string, any> | null;
    evaluation_count: number;
    created_at: string;
    subject_name?: string;
    paper_code?: string;
    code?: string;
}

export interface PaperCode {
    paper_code_id: string;
    subject_name: string;
    paper_code: string;
    code: string;
    description: string | null;
    is_active: boolean;
    created_at: string;
}

export interface ScanningState {
    // Upload state
    isUploading: boolean;
    uploadProgress: number;
    uploadError: string | null;

    // Presigned URLs
    presignedUrls: PresignedUploadResponse[];

    // Uploaded files
    uploadedFiles: FileRecord[];
    paperCode: PaperCode | null;

    // File History
    fileHistory: FileRecord[];

    // UI state
    currentStep: 'input' | 'uploading' | 'success' | 'error';
}

const initialState: ScanningState = {
    isUploading: false,
    uploadProgress: 0,
    uploadError: null,
    presignedUrls: [],
    uploadedFiles: [],
    paperCode: null,
    fileHistory: [],
    currentStep: 'input',
};

// Use base URL from axios instance or environment variable
const API_URL = 'https://ai-evaluator.srv1240507.hstgr.cloud';

// Helper for consistent error message extraction
const extractErrorMessage = (error: any): string => {
    if (!error) return 'Something went wrong. Please try again.';
    if (typeof error === 'string') return error;
    if (error.code === 'ERR_NETWORK' || error.message === 'Network Error') {
        return 'No internet connection. Please check your network.';
    }
    if (error.code === 'ECONNABORTED') {
        return 'Request timed out. Please try again.';
    }
    if (error.response) {
        const serverData = error.response.data;
        if (serverData) {
            if (serverData.error && typeof serverData.error.message === 'string') {
                return serverData.error.message;
            }
            if (typeof serverData.detail === 'string') return serverData.detail;
            if (typeof serverData.message === 'string') return serverData.message;
            if (Array.isArray(serverData.detail)) {
                return serverData.detail[0]?.msg || 'Invalid data provided.';
            }
        }
    }
    return error.message || 'An unexpected error occurred. Please try again.';
};

// ============ Async Thunks ============

export const getPresignedUrls = createAsyncThunk(
    'scanning/getPresignedUrls',
    async (
        payload: {
            subject_name: string;
            paper_code: string;
            files: { file_name: string; file_type: string }[];
        },
        { rejectWithValue }
    ) => {
        try {
            const response = await axios.post('/api/files/presigned-upload', payload);
            return response.data;
        } catch (error: any) {
            return rejectWithValue(extractErrorMessage(error));
        }
    }
);

export const uploadToS3 = createAsyncThunk(
    'scanning/uploadToS3',
    async (
        payload: {
            presignedData: PresignedUploadResponse;
            file: any; // React Native file object
        },
        { rejectWithValue }
    ) => {
        try {
            const { presignedData, file } = payload;

            // React Native fetch needs distinct handling compared to axios for binary uploads sometimes,
            // but let's try axiosOriginal first.
            // For React Native, 'file' is likely an object with uri, type, name.

            if (presignedData.fields && presignedData.base_url) {
                const formData = new FormData();
                Object.entries(presignedData.fields).forEach(([key, value]) => {
                    formData.append(key, value as string);
                });

                // Append file last.
                // In React Native, FormData expects { uri, name, type }
                formData.append('file', {
                    uri: file.uri,
                    name: file.name,
                    type: file.type || 'image/jpeg', // Default or from file
                } as any);

                console.log('⬆️ Attempting POST upload (multipart) to:', presignedData.base_url);
                await axiosOriginal.post(presignedData.base_url, formData, {
                    headers: {
                        'Content-Type': 'multipart/form-data',
                    },
                });
            } else {
                console.log('⬆️ Attempting PUT upload to:', presignedData.url);

                // Fetch blob from URI if needed, or pass file directly if supported
                // For direct PUT with fetch/axios in RN, we often need to read the file as blob or arraybuffer
                // Simplified approach: using fetch with blob
                const response = await fetch(file.uri);
                const blob = await response.blob();

                await axiosOriginal.put(presignedData.url, blob, {
                    headers: {
                        'Content-Type': file.type || 'application/pdf',
                    },
                });
            }

            console.log('✅ S3 Upload Successful!');

            return {
                file_name: file.name,
                s3_url: presignedData.url,
                file_size: file.size || 0, // changes if reading blob
                mime_type: file.type,
            };
        } catch (error: any) {
            console.error("Upload error:", error);
            return rejectWithValue(extractErrorMessage(error));
        }
    }
);

export const saveFileMetadata = createAsyncThunk(
    'scanning/saveFileMetadata',
    async (
        payload: {
            subject_name: string;
            paper_code: string;
            files: UploadedFileMetadata[];
        },
        { rejectWithValue }
    ) => {
        try {
            const response = await axios.post('/api/files/file-upload', payload);
            return response.data;
        } catch (error: any) {
            return rejectWithValue(extractErrorMessage(error));
        }
    }
);

export const uploadFiles = createAsyncThunk(
    'scanning/uploadFiles',
    async (
        payload: {
            subject_name: string;
            paper_code: string;
            files: FileToUpload[];
        },
        { dispatch, rejectWithValue }
    ) => {
        try {
            const { subject_name, paper_code, files } = payload;

            const presignedResponse = await dispatch(
                getPresignedUrls({
                    subject_name,
                    paper_code,
                    files: files.map((f) => ({
                        file_name: f.file_name,
                        file_type: f.file_type,
                    })),
                })
            ).unwrap();

            if (!presignedResponse.success || !presignedResponse.uploads) {
                throw new Error('Failed to get presigned URLs');
            }

            const uploadPromises = presignedResponse.uploads.map(
                (presignedData: PresignedUploadResponse, index: number) => {
                    const file = files[index].file;
                    return dispatch(uploadToS3({ presignedData, file })).unwrap();
                }
            );

            const uploadedMetadata = await Promise.all(uploadPromises);

            const metadataResponse = await dispatch(
                saveFileMetadata({
                    subject_name,
                    paper_code,
                    files: uploadedMetadata,
                })
            ).unwrap();

            await dispatch(fetchFileHistory({ limit: 10 }));

            return metadataResponse;
        } catch (error: any) {
            return rejectWithValue(extractErrorMessage(error));
        }
    }
);

export interface FileHistoryResponse {
    success: boolean;
    data: FileRecord[];
    total: number;
    limit: number;
    offset: number;
}

export const fetchFileHistory = createAsyncThunk(
    'scanning/fetchFileHistory',
    async (
        payload: {
            paper_code_id?: string;
            limit?: number;
            offset?: number;
        } = {},
        { rejectWithValue }
    ) => {
        try {
            const params = new URLSearchParams();
            if (payload.paper_code_id) params.append('paper_code_id', payload.paper_code_id);
            if (payload.limit) params.append('limit', payload.limit.toString());
            if (payload.offset) params.append('offset', payload.offset.toString());

            const response = await axios.get(`/api/file-history?${params.toString()}`);
            return response.data as FileHistoryResponse;
        } catch (error: any) {
            return rejectWithValue(extractErrorMessage(error));
        }
    }
);

const scanningSlice = createSlice({
    name: 'scanning',
    initialState,
    reducers: {
        resetUpload: (state) => {
            state.isUploading = false;
            state.uploadProgress = 0;
            state.uploadError = null;
            state.presignedUrls = [];
            state.uploadedFiles = [];
            state.paperCode = null;
            state.currentStep = 'input';
        },
        setUploadProgress: (state, action: PayloadAction<number>) => {
            state.uploadProgress = action.payload;
        },
    },
    extraReducers: (builder) => {
        builder
            .addCase(getPresignedUrls.pending, (state) => {
                state.isUploading = true;
                state.uploadError = null;
                state.currentStep = 'uploading';
            })
            .addCase(getPresignedUrls.fulfilled, (state, action) => {
                state.presignedUrls = action.payload.uploads || [];
                state.uploadProgress = 33;
            })
            .addCase(getPresignedUrls.rejected, (state, action) => {
                state.isUploading = false;
                state.uploadError = action.payload as string;
                state.currentStep = 'error';
            });

        builder
            .addCase(uploadToS3.pending, () => { })
            .addCase(uploadToS3.fulfilled, (state) => {
                state.uploadProgress = 66;
            })
            .addCase(uploadToS3.rejected, (state, action) => {
                state.isUploading = false;
                state.uploadError = action.payload as string;
                state.currentStep = 'error';
            });

        builder
            .addCase(saveFileMetadata.pending, () => { })
            .addCase(saveFileMetadata.fulfilled, (state, action) => {
                state.uploadedFiles = action.payload.files || [];
                state.paperCode = action.payload.paper_code || null;
                state.uploadProgress = 100;
                state.isUploading = false;
                state.currentStep = 'success';
            })
            .addCase(saveFileMetadata.rejected, (state, action) => {
                state.isUploading = false;
                state.uploadError = action.payload as string;
                state.currentStep = 'error';
            });

        builder
            .addCase(uploadFiles.pending, (state) => {
                state.isUploading = true;
                state.uploadError = null;
                state.uploadProgress = 0;
                state.currentStep = 'uploading';
            })
            .addCase(uploadFiles.fulfilled, (state, action) => {
                state.uploadedFiles = action.payload.files || [];
                state.paperCode = action.payload.paper_code || null;
                state.uploadProgress = 100;
                state.isUploading = false;
                state.currentStep = 'success';
            })
            .addCase(uploadFiles.rejected, (state, action) => {
                state.isUploading = false;
                state.uploadError = action.payload as string;
                state.currentStep = 'error';
            });

        builder
            .addCase(fetchFileHistory.fulfilled, (state, action) => {
                state.fileHistory = action.payload.data;
            })
            .addCase(logout, () => initialState);
    },
});

export const { resetUpload, setUploadProgress } = scanningSlice.actions;
export default scanningSlice.reducer;
