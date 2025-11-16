import { Idea } from '../types';

/**
 * Calculates the Dynamic Opportunity Score v0.1.
 * The formula is: (0.4 * R) + (0.3 * U) + (0.2 * M) + (0.1 * E)
 * R (Reach/Revenue) is boosted based on the day1RevenueTarget.
 * All R.U.M.E. inputs are expected to be on a scale of 1-10.
 * @param scores - An object containing the R.U.M.E. scores and financial metrics.
 * @returns The calculated opportunity score, scaled to 10-100.
 */
export const calculateOpportunityScore = (scores: { 
  rReachScore: number, 
  uUrgencyScore: number, 
  mMoatScore: number, 
  eEffortScore: number, 
  day1RevenueTarget: number 
}): number => {
  const { rReachScore, uUrgencyScore, mMoatScore, eEffortScore, day1RevenueTarget } = scores;

  // Clamp values to be between 1 and 10 to avoid invalid scores
  const clamp = (val: number, max = 10) => Math.max(1, Math.min(max, val));

  // Apply a non-linear boost to the Reach score based on Day 1 Revenue target
  let revenueBoost = 0;
  if (day1RevenueTarget >= 200) {
      revenueBoost = 3;
  } else if (day1RevenueTarget >= 100) {
      revenueBoost = 2;
  } else if (day1RevenueTarget >= 50) {
      revenueBoost = 1;
  }

  const R = clamp(rReachScore + revenueBoost); // R is boosted and clamped to 10
  const U = clamp(uUrgencyScore);
  const M = clamp(mMoatScore);
  const E = clamp(eEffortScore); // 10 is easiest

  const totalScore = (0.4 * R) + (0.3 * U) + (0.2 * M) + (0.1 * E);

  // Scale score from 1-10 range to 10-100 for display
  return parseFloat((totalScore * 10).toFixed(1));
};

/**
 * Filters and sorts ideas to find the top 3 candidates for fastest time to revenue.
 * It prioritizes by the lowest setup time, then by the highest reach score.
 * @param ideas - An array of all extracted ideas.
 * @returns An array containing the top 3 ideas for a quick launch.
 */
export const getSpeedToRevenueCandidates = (ideas: Idea[]): Idea[] => {
  return [...ideas] // Create a shallow copy to avoid mutating the original array
    .sort((a, b) => {
      // Primary sort: lowest initial setup time
      if (a.initialSetupTimeHours !== b.initialSetupTimeHours) {
        return a.initialSetupTimeHours - b.initialSetupTimeHours;
      }
      // Secondary sort: highest reach score
      return b.rReachScore - a.rReachScore;
    })
    .slice(0, 3);
};
