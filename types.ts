export interface ConversationSummary {
  rundown: string[];
  artifacts: {
    ideas: string[];
    tasks: string[];
    decisions: string[];
  };
  followups: string[];
}

export interface MarketAnalysis {
  targetAudience: string;
  competitors: string[];
  uniqueSellingProposition: string;
}

export interface Idea {
  id: string;
  title: string;
  summary: string;
  tags: string[];
  day1RevenueTarget: number;
  initialSetupTimeHours: number;
  rReachScore: number;
  uUrgencyScore: number;
  mMoatScore: number;
  eEffortScore: number;
  confidence: number;
  opportunityScore: number;
  marketAnalysis: MarketAnalysis;
}

export type IdeaUpdatePayload = {
  id: string;
  field: 'rReachScore' | 'uUrgencyScore' | 'mMoatScore' | 'eEffortScore';
  value: number;
};

export interface Task {
  id: string;
  ideaIdLink: string;
  relatedIdeaTitle: string; // Added for UI convenience
  title: string;
  steps: string[];
  priority: 'H' | 'M' | 'L';
  prerequisites: string[];
  owner: 'Founder' | 'Dev Partner' | 'AI Agent';
  completed: boolean;
  order: number;
}

export interface ConversationListItem {
    id: string;
    title: string;
    created_at: string;
}

export interface RawMarketAnalysis {
    target_audience: string;
    competitors: string[];
    unique_selling_proposition: string;
}

// Types for Gemini API responses before processing
export interface RawIdea {
  title: string;
  summary: string;
  tags: string[];
  day_1_revenue_target: number;
  initial_setup_time_hours: number;
  r_reach_score: number;
  u_urgency_score: number;
  m_moat_score: number;
  e_effort_score: number;
  confidence: number;
  market_analysis: RawMarketAnalysis;
}

export interface RawTask {
  task_id: string;
  idea_id_link: string;
  title: string;
  steps: string[];
  priority: 'H' | 'M' | 'L';
  prerequisites?: string[];
  owner?: 'Founder' | 'Dev Partner' | 'AI Agent';
}