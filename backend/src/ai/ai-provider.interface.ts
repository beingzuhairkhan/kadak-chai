export const AI_DECISIONS = ['approved', 'rejected'] as const;
export const AI_CATEGORIES = [
  'funny',
  'nostalgic',
  'wholesome',
  'other',
] as const;

export type AiDecision = (typeof AI_DECISIONS)[number];
export type AiCategory = (typeof AI_CATEGORIES)[number];

export interface AIAnalysisResult {
  decision: AiDecision;
  reason: string | null;
  category: AiCategory;
  caption: string;
}

export interface AIProvider {
  name: string;
  analyzeStory(story: string): Promise<AIAnalysisResult>;
}
