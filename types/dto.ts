export interface ChatRequest {
  message?: string;
  messages?: Array<{
    id: string;
    sender: 'user' | 'ai';
    text: string;
    timestamp: string;
  }>;
  tasks?: Array<{
    id: string;
    title: string;
    deadline: string;
    priority: string;
    category: string;
    duration: number | null;
    completed: boolean;
    description?: string;
  }>;
}

export interface ChatResponse {
  reply: string;
}

export interface RecommendRequest {
  tasks?: Array<{
    id: string;
    title: string;
    deadline: string;
    priority: string;
    category: string;
    duration: number | null;
    completed: boolean;
    description?: string;
  }>;
}

export interface RecommendResponse {
  recommendations: Array<{
    title: string;
    reason: string;
    priority: number;
  }>;
  suggestedTasks: string[];
  summary: string;
  motivation: string;
}

export interface SplitTaskRequest {
  title?: string;
  description?: string;
  taskTitle?: string;
  category?: string;
}

export interface SplitTaskResponse {
  subtasks: string[];
  steps: string[];
}

export interface ScheduleResponseItem {
  start: string;
  end: string;
  task: string;
  reason: string;
}

export interface AnalyzeResponse {
  score: number;
  strengths: string[];
  weaknesses: string[];
  advice: string[];
}
