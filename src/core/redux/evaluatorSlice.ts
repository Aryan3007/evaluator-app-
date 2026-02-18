import { createSlice, PayloadAction, createAsyncThunk } from '@reduxjs/toolkit';
import axiosInstance from '../api/axios';
import { AnswerSheet, ApiAnswerSheet, ApiEvaluationReport, ApiPaperCode, PaperCode } from './types';
import { logout } from './authSlice';

interface EvaluatorState {
    papers: PaperCode[];
    answerSheets: AnswerSheet[];
    answerSheetsTotal: number;
    answerSheetsCompleted: number;
    selectedPaperId: string | null;
    loading: boolean;
    error: string | null;
    evaluating: boolean;
    evaluationError: string | null;
    currentReport: ApiEvaluationReport | null;
    reportLoading: boolean;
    reportError: string | null;
    currentAnswerSheetPage: number;
    totalPapers: number;
}

const initialState: EvaluatorState = {
    papers: [],
    answerSheets: [],
    answerSheetsTotal: 0,
    answerSheetsCompleted: 0,
    selectedPaperId: null,
    loading: false,
    error: null,
    evaluating: false,
    evaluationError: null,
    currentReport: null,
    reportLoading: false,
    reportError: null,
    currentAnswerSheetPage: 1,
    totalPapers: 0,
};

export interface FetchPapersParams {
    limit?: number;
    offset?: number;
    search?: string;
}

export const fetchPaperCodes = createAsyncThunk(
    'evaluator/fetchPaperCodes',
    async (params: FetchPapersParams | undefined, { rejectWithValue, getState }) => {
        try {
            const state = getState() as any;
            const token = state.auth?.access_token;

            const API_URL = 'https://ai-evaluator.srv1240507.hstgr.cloud';
            const limit = params?.limit || 50;
            const offset = params?.offset || 0;
            let queryParams = `limit=${limit}&offset=${offset}`;

            if (params?.search) queryParams += `&search=${encodeURIComponent(params.search)}`;

            const response = await axiosInstance.get<{ data: ApiPaperCode[], total: number }>(
                `${API_URL}/api/paper-codes?${queryParams}`,
                {
                    headers: token ? { Authorization: `Bearer ${token}` } : undefined
                }
            );

            // Map API response to UI model
            const mappedPapers: PaperCode[] = response.data.data.map((apiPaper) => ({
                id: apiPaper.paper_code_id,
                code: apiPaper.paper_code || apiPaper.code || "Unknown",
                subject: apiPaper.subject_name ? (apiPaper.subject_name.charAt(0).toUpperCase() + apiPaper.subject_name.slice(1)) : "Unknown Subject",
                date: apiPaper.created_at,
                totalCopies: apiPaper.total || 0,
                evaluated: apiPaper.total_evaluated || 0,
                pending: (apiPaper.total || 0) - (apiPaper.total_evaluated || 0),
                status: (apiPaper.total && apiPaper.total_evaluated === apiPaper.total) ? 'completed' :
                    (apiPaper.total_evaluated && apiPaper.total_evaluated > 0) ? 'in-progress' :
                        apiPaper.is_question_paper ? 'in-progress' : 'pending',
                isQuestionPaper: apiPaper.is_question_paper,
                questionPaperUrl: apiPaper.question_paper_url || undefined,
                strictnessRules: apiPaper.strictness_rules || "none" // Use "none" or empty string as default if you prefer
            }));

            return {
                papers: mappedPapers,
                total: response.data.total,
                offset
            };
        } catch (error: any) {
            return rejectWithValue(error.response?.data?.message || 'Failed to fetch paper codes');
        }
    }
);

export const fetchAnswerSheets = createAsyncThunk(
    'evaluator/fetchAnswerSheets',
    async ({ paperId, limit = 50, offset = 0, status }: { paperId: string; limit?: number; offset?: number; status?: string }, { rejectWithValue, getState }) => {
        try {
            const state = getState() as any;
            const token = state.auth?.access_token;
            const API_URL = 'https://ai-evaluator.srv1240507.hstgr.cloud';

            let queryParams = `paper_code_id=${paperId}&limit=${limit}&offset=${offset}`;
            if (status && status !== 'all') {
                queryParams += `&status=${status}`;
            }

            const response = await axiosInstance.get<{ data: ApiAnswerSheet[], total: number, total_completed: number }>(
                `${API_URL}/api/file-history?${queryParams}`,
                {
                    headers: token ? { Authorization: `Bearer ${token}` } : undefined
                }
            );
            const mappedSheets: AnswerSheet[] = response.data.data.map(sheet => ({
                id: sheet.file_id,
                fileName: sheet.file_name,
                status: sheet.status,
                score: sheet.overall_score || 0,
                maxScore: sheet.max_score || 0,
                percentage: sheet.percentage || 0,
                remarks: "Pending Evaluation", // Not available
                date: sheet.created_at,
                s3Url: sheet.s3_url
            }));

            return {
                data: mappedSheets,
                total: response.data.total || 0,
                totalCompleted: response.data.total_completed || 0,
                offset
            };
        } catch (error: any) {
            return rejectWithValue(error.response?.data?.message || 'Failed to fetch answer sheets');
        }
    }
);

export const startEvaluation = createAsyncThunk(
    'evaluator/startEvaluation',
    async ({ paperId, fileUrl, rules }: { paperId: string; fileUrl: string; rules: string }, { rejectWithValue }) => {
        try {
            const API_URL = 'https://ai-evaluator.srv1240507.hstgr.cloud';
            const response = await axiosInstance.post(`${API_URL}/api/evaluation/upload-question-paper`, {
                paper_code_id: paperId,
                question_paper_url: fileUrl,
                strictness_rules: rules || "none"
            });
            return response.data;
        } catch (error: any) {
            return rejectWithValue(error.response?.data?.message || 'Failed to start evaluation');
        }
    }
);

export const evaluateAnswerCopies = createAsyncThunk(
    'evaluator/evaluateAnswerCopies',
    async ({ paperCodeId, fileIds }: { paperCodeId: string; fileIds: string[] }, { rejectWithValue }) => {
        try {
            const API_URL = 'https://ai-evaluator.srv1240507.hstgr.cloud';
            const response = await axiosInstance.post(`${API_URL}/api/evaluation/evaluate-answer-copy`, {
                paper_code_id: paperCodeId,
                file_ids: fileIds
            });
            return response.data;
        } catch (error: any) {
            return rejectWithValue(error.response?.data?.message || 'Failed to start evaluation');
        }
    }
);

export const fetchEvaluationStatus = createAsyncThunk(
    'evaluator/fetchEvaluationStatus',
    async (paperId: string, { rejectWithValue }) => {
        try {
            const response = await axiosInstance.get<{ success: boolean; evaluation_pending: boolean }>(
                `/api/evaluation/status/${paperId}`
            );
            return response.data;
        } catch (error: any) {
            return rejectWithValue(error.response?.data?.message || 'Failed to fetch evaluation status');
        }
    }
);

export const updateStrictnessRules = createAsyncThunk(
    'evaluator/updateStrictnessRules',
    async ({ paperId, rules }: { paperId: string; rules: string }, { rejectWithValue }) => {
        try {
            const API_URL = 'https://ai-evaluator.srv1240507.hstgr.cloud';
            const response = await axiosInstance.put(`${API_URL}/api/evaluation/update-strictness/${paperId}`, {
                strictness_rules: rules
            });
            return response.data;
        } catch (error: any) {
            return rejectWithValue(error.response?.data?.message || 'Failed to update rules');
        }
    }
);

export const fetchEvaluationReport = createAsyncThunk(
    'evaluator/fetchEvaluationReport',
    async (fileId: string, { rejectWithValue, getState }) => {
        try {
            const state = getState() as any;
            const token = state.auth?.access_token;
            const API_URL = 'https://ai-evaluator.srv1240507.hstgr.cloud';

            const response = await axiosInstance.get<ApiEvaluationReport>(
                `${API_URL}/api/evaluation/file/${fileId}`,
                {
                    headers: token ? { Authorization: `Bearer ${token}` } : undefined
                }
            );
            return response.data;
        } catch (error: any) {
            return rejectWithValue(error.response?.data?.message || 'Failed to fetch evaluation report');
        }
    }
);

const evaluatorSlice = createSlice({
    name: 'evaluator',
    initialState,
    reducers: {
        setPapers: (state, action: PayloadAction<PaperCode[]>) => {
            state.papers = action.payload;
        },
        updatePaperStatus: (state, action: PayloadAction<{ id: string; status: PaperCode['status'] }>) => {
            const paper = state.papers.find(p => p.id === action.payload.id);
            if (paper) {
                paper.status = action.payload.status;
            }
        },
        setSelectedPaperId: (state, action: PayloadAction<string | null>) => {
            if (state.selectedPaperId !== action.payload) {
                state.selectedPaperId = action.payload;
                state.currentAnswerSheetPage = 1;
            }
        },
        setCurrentAnswerSheetPage: (state, action: PayloadAction<number>) => {
            state.currentAnswerSheetPage = action.payload;
        },
    },
    extraReducers: (builder) => {
        builder
            .addCase(fetchPaperCodes.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(fetchPaperCodes.fulfilled, (state, action) => {
                state.loading = false;
                if (action.payload.offset === 0) {
                    state.papers = action.payload.papers;
                } else {
                    // Filter out duplicates just in case
                    const newPapers = action.payload.papers.filter(
                        newP => !state.papers.some(existingP => existingP.id === newP.id)
                    );
                    state.papers = [...state.papers, ...newPapers];
                }
                state.totalPapers = action.payload.total;
            })
            .addCase(fetchPaperCodes.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload as string;
            })
            // Fetch Answer Sheets Cases
            .addCase(fetchAnswerSheets.pending, (state, action) => {
                state.loading = true;
                state.error = null;
                if (action.meta.arg.offset === 0) {
                    state.answerSheets = [];
                }
            })
            .addCase(fetchAnswerSheets.fulfilled, (state, action) => {
                state.loading = false;
                if (action.payload.offset === 0) {
                    state.answerSheets = action.payload.data;
                } else {
                    const newSheets = action.payload.data.filter(
                        newS => !state.answerSheets.some(existingS => existingS.id === newS.id)
                    );
                    state.answerSheets = [...state.answerSheets, ...newSheets];
                }
                state.answerSheetsTotal = action.payload.total;
                state.answerSheetsCompleted = action.payload.totalCompleted;

                // Update paper stats
                const paper = state.papers.find(p => p.id === action.meta.arg.paperId);
                if (paper) {
                    paper.totalCopies = action.payload.total;
                    paper.evaluated = action.payload.totalCompleted;
                    paper.pending = paper.totalCopies - paper.evaluated;
                }
            })
            .addCase(fetchAnswerSheets.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload as string;
            })
            // Start Evaluation Cases
            .addCase(startEvaluation.pending, (state: any) => {
                state.evaluating = true;
                state.evaluationError = null;
            })
            .addCase(startEvaluation.fulfilled, (state: any, action) => {
                state.evaluating = false;
                const paper = state.papers.find((p: any) => p.id === action.meta.arg.paperId);
                if (paper) {
                    paper.status = 'in-progress';
                    paper.isQuestionPaper = true;
                    if (action.meta.arg.fileUrl) paper.questionPaperUrl = action.meta.arg.fileUrl;
                    if (action.meta.arg.rules) paper.strictnessRules = action.meta.arg.rules;
                }
            })
            .addCase(startEvaluation.rejected, (state: any, action) => {
                state.evaluating = false;
                state.evaluationError = action.payload as string;
            })
            // Bulk Evaluation Cases
            .addCase(evaluateAnswerCopies.pending, (state: any) => {
                state.evaluating = true;
                state.evaluationError = null;
            })
            .addCase(evaluateAnswerCopies.fulfilled, (state: any) => {
                state.evaluating = false;
            })
            .addCase(evaluateAnswerCopies.rejected, (state: any, action) => {
                state.evaluating = false;
                state.evaluationError = action.payload as string;
            })
            // Update Strictness Cases
            .addCase(updateStrictnessRules.pending, (state: any) => {
                state.evaluating = true;
                state.evaluationError = null;
            })
            .addCase(updateStrictnessRules.fulfilled, (state: any, action) => {
                state.evaluating = false;
                const paper = state.papers.find((p: any) => p.id === action.meta.arg.paperId);
                if (paper) {
                    paper.strictnessRules = action.meta.arg.rules;
                }
            })
            .addCase(updateStrictnessRules.rejected, (state: any, action) => {
                state.evaluating = false;
                state.evaluationError = action.payload as string;
            })
            // Fetch Evaluation Report Cases
            .addCase(fetchEvaluationReport.pending, (state: any) => {
                state.reportLoading = true;
                state.reportError = null;
                state.currentReport = null;
            })
            .addCase(fetchEvaluationReport.fulfilled, (state: any, action) => {
                state.reportLoading = false;
                state.currentReport = action.payload;
            })
            .addCase(fetchEvaluationReport.rejected, (state: any, action) => {
                state.reportLoading = false;
                state.reportError = action.payload as string;
            })
            // Reset evaluator state on logout
            .addCase(logout, () => initialState);
    }
});

export const { setPapers, updatePaperStatus, setSelectedPaperId, setCurrentAnswerSheetPage } = evaluatorSlice.actions;
export default evaluatorSlice.reducer;
