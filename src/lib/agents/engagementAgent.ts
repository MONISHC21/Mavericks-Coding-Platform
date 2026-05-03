/**
 * Engagement Agent
 *
 * PROBLEM: Developers lack motivation to continue learning.
 * SOLUTION: Gamification through leaderboard, streaks, badges, and analytics.
 *           Drives retention and healthy competition.
 * CONNECTS: Final agent in pipeline — consumes scores and generates rankings.
 */

import type { LeaderboardEntry, PlatformAnalytics } from "./types";
import { eventBus } from "./eventBus";

// Base leaderboard data (global mock users)
const baseLeaderboard: LeaderboardEntry[] = [
  { rank: 1, name: "Alex Chen", score: 97, level: "Expert", streak: 42, badge: "Gold 🥇" },
  { rank: 2, name: "Priya Sharma", score: 94, level: "Expert", streak: 38, badge: "Gold 🥇" },
  { rank: 3, name: "Marcus Johnson", score: 91, level: "Advanced", streak: 29, badge: "Gold 🥇" },
  { rank: 4, name: "Yuki Tanaka", score: 88, level: "Advanced", streak: 25, badge: "Silver 🥈" },
  { rank: 5, name: "Sofia Rodriguez", score: 85, level: "Advanced", streak: 21, badge: "Silver 🥈" },
  { rank: 6, name: "James O'Brien", score: 82, level: "Intermediate", streak: 18, badge: "Silver 🥈" },
  { rank: 7, name: "Fatima Al-Hassan", score: 79, level: "Intermediate", streak: 15, badge: "Silver 🥈" },
  { rank: 8, name: "David Kim", score: 76, level: "Intermediate", streak: 12, badge: "Bronze 🥉" },
];

// Mutable leaderboard (updated when user takes assessment)
let leaderboardData: LeaderboardEntry[] = [...baseLeaderboard];

export const engagementAgent = {
  /** Get the current leaderboard */
  getLeaderboard(): LeaderboardEntry[] {
    return leaderboardData;
  },

  /** Reset leaderboard to base data */
  resetLeaderboard(): void {
    leaderboardData = [...baseLeaderboard];
  },

  /**
   * Determine badge based on score and resume confidence.
   * Higher resume confidence adds "Resume Pro" to badge.
   */
  calculateBadge(score: number, resumeConfidence?: number): string {
    let badge = "Beginner";
    if (score >= 90) badge = "Gold 🥇";
    else if (score >= 70) badge = "Silver 🥈";
    else if (score >= 50) badge = "Bronze 🥉";

    if (resumeConfidence && resumeConfidence > 80) {
      badge += " | Resume Pro 📄";
    }

    return badge;
  },

  /**
   * Insert/update user in the leaderboard and return the sorted result.
   * The backend sync is fire-and-forget — never blocks the pipeline.
   */
  async insertUser(
    name: string,
    score: number,
    level: string,
    resumeConfidence?: number
  ): Promise<LeaderboardEntry[]> {
    const badge = this.calculateBadge(score, resumeConfidence);

    // Fire-and-forget backend sync (non-blocking)
    fetch("/api/leaderboard", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, score, level, badge }),
    }).catch(() => {
      // Backend not running in dev — silently ignore
    });

    // Remove any existing entry for this user then reinsert with updated score
    const withoutUser = leaderboardData.filter((e) => e.name !== name);
    const updated = [
      ...withoutUser,
      { rank: 0, name, score, level, streak: 1, badge },
    ]
      .sort((a, b) => b.score - a.score)
      .map((entry, i) => ({ ...entry, rank: i + 1 }));

    leaderboardData = updated;

    eventBus.emit("EngagementAgent", "Dashboard", "agent:engagement:done", {
      newEntry: name,
      rank: updated.find((e) => e.name === name)?.rank,
    });

    return updated;
  },

  /**
   * Platform analytics: aggregates from the live leaderboard.
   */
  getAnalytics(): PlatformAnalytics {
    const scores = leaderboardData.map((e) => e.score);
    return {
      totalAssessments: leaderboardData.length,
      averageScore: scores.length
        ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
        : 0,
      topSkill: "Problem Solving",
      weakestSkill: "System Design",
      averageCompletionTime: "12m 30s",
    };
  },
};
