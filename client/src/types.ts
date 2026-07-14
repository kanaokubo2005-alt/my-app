export type PriorityType = 'high' | 'medium' | 'low';

export interface Task {
  id: string;
  title: string;
  deadline: string; // YYYY-MM-DD
  priority: PriorityType;
  category: string;
  duration: number | null; // in minutes
  completed: boolean;
  description?: string;
}

export interface ChatMessage {
  id: string;
  sender: 'user' | 'ai';
  text: string;
  timestamp: string;
}

export interface AIRecommendation {
  summary: string;
  suggestedTasks: string[]; // Task IDs suggested for today
  reason: string;
  motivation: string;
}
