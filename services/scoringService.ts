
import { Idea } from '../types';

/**
 * Calculates the Opportunity Score v0 for a given idea.
 * The formula is: (Reach * 0.4) + (Urgency * 0.3) + (MarketSize * 0.2) + ((100 - Effort) * 0.1)
 * All inputs (R, U, M, E) are expected to be on a scale of 1-100.
 * Effort is inverted, as lower effort is better.
 * @param idea - The idea object containing reach, urgency, marketSize, and effort.
 * @returns The calculated opportunity score, rounded to one decimal place.
 */
export const calculateOpportunityScore = (idea: Omit<Idea, 'opportunityScore' | 'id' | 'title' | 'summary' | 'tags' | 'confidence'>): number => {
  const { reach, urgency, marketSize, effort } = idea;

  // Clamp values to be between 1 and 100 to avoid invalid scores
  const clamp = (val: number) => Math.max(1, Math.min(100, val));

  const reachScore = clamp(reach) * 0.4;
  const urgencyScore = clamp(urgency) * 0.3;
  const marketSizeScore = clamp(marketSize) * 0.2;
  const effortScore = (100 - clamp(effort)) * 0.1; // Lower effort = higher score

  const totalScore = reachScore + urgencyScore + marketSizeScore + effortScore;

  return Math.round(totalScore * 10) / 10;
};
