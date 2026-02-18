import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../../app/store';
import {
    setLoading,
    setEvaluations,
    setCurrentEvaluation,
    setCurrentReport,
    setError,
} from '../redux/evaluatorSlice';
import { evaluatorApi } from '../api/evaluator.api';

export const useEvaluator = () => {
    const dispatch = useDispatch();
    const { evaluations, currentEvaluation, currentReport, isLoading, error } = useSelector(
        (state: RootState) => state.evaluator
    );

    const fetchEvaluations = async () => {
        dispatch(setLoading(true));
        const response = await evaluatorApi.getEvaluations();

        if (response.success && response.data) {
            dispatch(setEvaluations(response.data));
        } else {
            dispatch(setError(response.error || 'Failed to fetch evaluations'));
        }
    };

    const fetchEvaluationById = async (id: string) => {
        dispatch(setLoading(true));
        const response = await evaluatorApi.getEvaluationById(id);

        if (response.success && response.data) {
            dispatch(setCurrentEvaluation(response.data));
        } else {
            dispatch(setError(response.error || 'Failed to fetch evaluation'));
        }
    };

    const generateReport = async (evaluationId: string) => {
        dispatch(setLoading(true));
        const response = await evaluatorApi.generateReport(evaluationId);

        if (response.success && response.data) {
            dispatch(setCurrentReport(response.data));
        } else {
            dispatch(setError(response.error || 'Failed to generate report'));
        }
    };

    return {
        evaluations,
        currentEvaluation,
        currentReport,
        isLoading,
        error,
        fetchEvaluations,
        fetchEvaluationById,
        generateReport,
    };
};
