export interface PaperCode {
    id: string;
    code: string;
    subject: string;
    date: string;
    totalCopies: number;
    evaluated: number;
    pending: number;
    status: 'completed' | 'in-progress' | 'pending';
    isQuestionPaper: boolean;
    questionPaperUrl?: string;
    strictnessRules: string;
}

export interface ApiPaperCode {
    paper_code_id: string;
    paper_code?: string;
    code?: string;
    subject_name?: string;
    created_at: string;
    total?: number;
    total_evaluated?: number;
    total_copies?: number;
    is_question_paper: boolean;
    question_paper_url?: string;
    strictness_rules?: string;
}

export interface AnswerSheet {
    id: string;
    fileName: string;
    status: string;
    score: number;
    maxScore: number;
    percentage: number;
    remarks: string;
    date: string;
    s3Url: string;
}

export interface ApiAnswerSheet {
    file_id: string;
    file_name: string;
    status: string;
    overall_score?: number;
    max_score?: number;
    percentage?: number;
    created_at: string;
    s3_url: string;
}

export interface ApiEvaluationReport {
    file_id: string;
    file_name: string;
    overall_score: number;
    max_score: number;
    percentage: number;
    questions?: any[];
    summary?: string;
    answers?: ApiEvaluationAnswer[];
    student_name?: string;
    status?: string;
}

export interface ApiEvaluationAnswer {
    answer_id: string;
    question_number: number;
    question_text: string;
    student_answer: string;
    model_answer: string;
    marks_obtained: number;
    max_marks: number;
    strengths: string[];
    improvements: string[];
}
