import axios from './axios';
import { Evaluation, EvaluationReport, ApiResponse } from '../types';

export const evaluatorApi = {
    getEvaluations: async (): Promise<ApiResponse<Evaluation[]>> => {
        try {
            const response = await axios.get('/evaluations');
            return response.data;
        } catch (error: any) {
            return {
                success: false,
                error: error.response?.data?.message || 'Failed to fetch evaluations',
            };
        }
    },

    getEvaluationById: async (id: string): Promise<ApiResponse<Evaluation>> => {
        try {
            const response = await axios.get(`/evaluations/${id}`);
            return response.data;
        } catch (error: any) {
            return {
                success: false,
                error: error.response?.data?.message || 'Failed to fetch evaluation',
            };
        }
    },

    createEvaluation: async (data: Partial<Evaluation>): Promise<ApiResponse<Evaluation>> => {
        try {
            const response = await axios.post('/evaluations', data);
            return response.data;
        } catch (error: any) {
            return {
                success: false,
                error: error.response?.data?.message || 'Failed to create evaluation',
            };
        }
    },

    generateReport: async (evaluationId: string): Promise<ApiResponse<EvaluationReport>> => {
        try {
            const response = await axios.post(`/evaluations/${evaluationId}/report`);
            return response.data;
        } catch (error: any) {
            return {
                success: false,
                error: error.response?.data?.message || 'Failed to generate report',
            };
        }
    },
};
