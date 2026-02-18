// Auth Types
export interface User {
    id: string;
    email: string;
    name: string;
    token: string;
}

export interface LoginCredentials {
    email: string;
    password: string;
}

// Evaluator Types
export interface Evaluation {
    id: string;
    title: string;
    description: string;
    status: 'pending' | 'in-progress' | 'completed';
    score?: number;
    createdAt: string;
    updatedAt: string;
}

export interface EvaluationReport {
    id: string;
    evaluationId: string;
    content: string;
    generatedAt: string;
}

// Scanning Types
export interface ScanDocument {
    id: string;
    uri: string;
    type: 'image' | 'pdf';
    createdAt: string;
}

export interface ScanResult {
    id: string;
    documentId: string;
    extractedText: string;
    confidence: number;
}

// API Response Types
export interface ApiResponse<T> {
    success: boolean;
    data?: T;
    error?: string;
    message?: string;
}
