
export interface ConversationSummary {
  rundown: string;
  artifacts: string;
  followUps: string;
}

export interface Idea {
  id: string;
  title: string;
  summary: string;
  tags: string[];
  confidence: number;
  reach: number;
  urgency: number;
  marketSize: number;
  effort: number;
  opportunityScore: number;
}

export type IdeaUpdatePayload = {
  id: string;
  field: 'reach' | 'urgency' | 'marketSize' | 'effort';
  value: number;
};

export interface Task {
  id: string;
  title: string;
  priority: 'High' | 'Medium' | 'Low';
  relatedIdeaTitle: string;
}

// Types for Gemini API responses before processing
export interface RawIdea {
  title: string;
  summary: string;
  tags: string[];
  confidence: number;
}

export interface RawTask {
  title: string;
  priority: 'High' | 'Medium' | 'Low';
  relatedIdeaTitle: string;
}
