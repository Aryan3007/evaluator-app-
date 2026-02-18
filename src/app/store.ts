import { configureStore } from '@reduxjs/toolkit';
import authReducer from '../core/redux/authSlice';
import evaluatorReducer from '../core/redux/evaluatorSlice';
import scanningReducer from '../core/redux/scanningSlice';

export const store = configureStore({
    reducer: {
        auth: authReducer,
        evaluator: evaluatorReducer,
        scanning: scanningReducer,
    },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
