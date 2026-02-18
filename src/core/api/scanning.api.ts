import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import axiosInstance from './axios'; // Configured axios with auth interceptors
import axios from 'axios'; // Keep for S3 uploads (no auth needed)
import { Platform } from 'react-native';
import { logout } from '../redux/authSlice';

// ============ Types ============
export interface RNFile {
    uri: string;
    name: string;
    type: string;
    size?: number; // Optional size if available
}

export interface FileToUpload {
    file_name: string;
    file_type: string;
    file: RNFile; // Changed from File to RNFile
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

// Use a config file or process.env in a real app. Hardcoded fallback for demo.
const API_URL = 'https://ai-evaluator.srv1240507.hstgr.cloud';


// Helper for consistent error message extraction
const extractErrorMessage = (error: any): string => {
    if (!error) return 'Something went wrong. Please try again.';

    if (typeof error === 'string') return error;

    if (error.message === 'Network Error') {
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

/**
 * Step 1: Get presigned URLs for file uploads
 */
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
            const response = await axiosInstance.post(`${API_URL}/api/files/presigned-upload`, payload);
            return response.data;
        } catch (error: any) {
            return rejectWithValue(extractErrorMessage(error));
        }
    }
);

/**
 * Step 2: Upload file to S3 using presigned URL
 */
export const uploadToS3 = createAsyncThunk(
    'scanning/uploadToS3',
    async (
        payload: {
            presignedData: PresignedUploadResponse;
            file: RNFile;
        },
        { rejectWithValue }
    ) => {
        try {
            const { presignedData, file } = payload;

            // React Native FormData requires a specific object structure for files:
            // { uri: '...', name: '...', type: '...' }
            const fileData = {
                uri: Platform.OS === 'ios' ? file.uri.replace('file://', '') : file.uri,
                name: file.name,
                type: file.type || 'application/octet-stream', // Fallback type
            };

            // Check if it's an S3 POST (fields provided)
            if (presignedData.fields && presignedData.base_url) {
                const formData = new FormData();
                // 1. Append all presigned fields FIRST (order matters for S3)
                Object.entries(presignedData.fields).forEach(([key, value]) => {
                    formData.append(key, value as string);
                });
                // 2. Append the file LAST
                formData.append('file', fileData as any);

                console.log('⬆️ Attempting POST upload (multipart) to:', presignedData.base_url);
                // Use plain axios for S3 (no auth needed for presigned URLs)
                await axios.post(presignedData.base_url, formData, {
                    headers: {
                        'Content-Type': 'multipart/form-data',
                    },
                });
            } else {
                // Fallback to PUT if just a direct URL is given (Binary upload)
                console.log('⬆️ Attempting PUT upload to:', presignedData.url);

                // Fetch is often more reliable for binary PUT in RN without extra libs
                const response = await fetch(presignedData.url, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': file.type || 'application/pdf',
                    },
                    body: { uri: file.uri, name: file.name, type: file.type } as any
                });

                if (!response.ok) throw new Error('PUT Upload failed');
            }

            console.log('✅ S3 Upload Successful!');

            return {
                file_name: file.name,
                // The final accessible URL is always the 'url' provided in response
                s3_url: presignedData.url,
                file_size: file.size || 0,
                mime_type: file.type,
            };
        } catch (error: any) {
            console.error("Upload error:", error);
            return rejectWithValue(extractErrorMessage(error));
        }
    }
);

/**
 * Step 3: Save file metadata to backend
 */
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
            const response = await axiosInstance.post(`${API_URL}/api/files/file-upload`, payload);
            return response.data;
        } catch (error: any) {
            return rejectWithValue(extractErrorMessage(error));
        }
    }
);

/**
 * Complete upload flow: Get presigned URLs -> Upload to S3 -> Save metadata
 */
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

            // Step 1: Get presigned URLs
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

            // Step 2: Upload all files to S3
            const uploadPromises = presignedResponse.uploads.map(
                (presignedData: PresignedUploadResponse, index: number) => {
                    const file = files[index].file;
                    return dispatch(uploadToS3({ presignedData, file })).unwrap();
                }
            );

            const uploadedMetadata = await Promise.all(uploadPromises);

            // Step 3: Save metadata to backend
            const metadataResponse = await dispatch(
                saveFileMetadata({
                    subject_name,
                    paper_code,
                    files: uploadedMetadata,
                })
            ).unwrap();

            // Refresh file history
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

/**
 * Step 4: Fetch file history
 */
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

            const response = await axiosInstance.get(`${API_URL}/api/file-history?${params.toString()}`);
            return response.data as FileHistoryResponse;
        } catch (error: any) {
            return rejectWithValue(extractErrorMessage(error));
        }
    }
);

// ============ Slice ============
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
        // Get Presigned URLs
        builder
            .addCase(getPresignedUrls.pending, (state) => {
                state.isUploading = true;
                state.uploadError = null;
                state.currentStep = 'uploading';
            })
            .addCase(getPresignedUrls.fulfilled, (state, action) => {
                state.presignedUrls = action.payload.uploads || [];
                state.uploadProgress = 33; // 1/3 complete
            })
            .addCase(getPresignedUrls.rejected, (state, action) => {
                state.isUploading = false;
                state.uploadError = action.payload as string;
                state.currentStep = 'error';
            });

        // Upload to S3
        builder
            .addCase(uploadToS3.pending, () => {
                // Keep uploading state
            })
            .addCase(uploadToS3.fulfilled, (state) => {
                state.uploadProgress = 66; // 2/3 complete
            })
            .addCase(uploadToS3.rejected, (state, action) => {
                state.isUploading = false;
                state.uploadError = action.payload as string;
                state.currentStep = 'error';
            });

        // Save File Metadata
        builder
            .addCase(saveFileMetadata.pending, () => {
                // Keep uploading state
            })
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

        // Complete Upload Flow
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

        // Fetch File History
        builder
            .addCase(fetchFileHistory.pending, () => {
                // Optional loading state
            })
            .addCase(fetchFileHistory.fulfilled, (state, action) => {
                state.fileHistory = action.payload.data;
            })
            .addCase(fetchFileHistory.rejected, (_state, action) => {
                console.error('Failed to fetch file history:', action.payload);
            })
            // Reset scanning state on logout
            .addCase(logout, () => initialState);
    },
});

export const { resetUpload, setUploadProgress } = scanningSlice.actions;
export const scanningReducer = scanningSlice.reducer;
