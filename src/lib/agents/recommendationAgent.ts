/**
 * Recommendation Agent
 *
 * PROBLEM: Generic learning paths waste developer time.
 * SOLUTION: Analyses assessment scores and generates a PERSONALISED learning path.
 *           Uses decision logic: score < 50 → basics; score 50-75 → intermediate; 75+ → advanced.
 * CONNECTS: Receives scores from Assessment Agent, outputs to Tracker Agent.
 */

import type { SkillScore, LearningModule } from "./types";
import { eventBus } from "./eventBus";

const modulePool: LearningModule[] = [
  {
    id: "m1",
    title: "Advanced Data Structures",
    description: "Master trees, graphs, heaps, and tries with hands-on exercises.",
    difficulty: "intermediate",
    estimatedTime: "8 hours",
    topics: ["Binary Trees", "Graphs", "Heaps", "Hash Maps"],
    priority: "high",
  },
  {
    id: "m2",
    title: "Async JavaScript Mastery",
    description: "Deep dive into promises, generators, async iterators, and concurrent patterns.",
    difficulty: "intermediate",
    estimatedTime: "6 hours",
    topics: ["Promises", "Async/Await", "Generators", "Web Workers"],
    priority: "high",
  },
  {
    id: "m3",
    title: "Algorithm Design Patterns",
    description: "Learn divide & conquer, dynamic programming, greedy algorithms, and backtracking.",
    difficulty: "advanced",
    estimatedTime: "12 hours",
    topics: ["Dynamic Programming", "Greedy", "Backtracking", "Divide & Conquer"],
    priority: "medium",
  },
  {
    id: "m4",
    title: "System Design Fundamentals",
    description: "Understand scalable system architecture, caching, load balancing, and databases.",
    difficulty: "advanced",
    estimatedTime: "10 hours",
    topics: ["Caching", "Load Balancing", "Databases", "Microservices"],
    priority: "medium",
  },
  {
    id: "m5",
    title: "Clean Code & Best Practices",
    description: "Write maintainable, testable, and clean code following industry standards.",
    difficulty: "beginner",
    estimatedTime: "4 hours",
    topics: ["SOLID", "DRY", "Testing", "Code Reviews"],
    priority: "low",
  },
  {
    id: "m6",
    title: "JavaScript Fundamentals Bootcamp",
    description: "Strengthen your core JS knowledge — variables, functions, closures, and prototypes.",
    difficulty: "beginner",
    estimatedTime: "5 hours",
    topics: ["Variables", "Closures", "Prototypes", "ES6+"],
    priority: "high",
  },
];

export const recommendationAgent = {
  /**
   * Generate a personalised learning path.
   *
   * Decision logic incorporating Fusion:
   *   - Resume Beginner + Low Score (< 50) → Basic Learning Path
   *   - Intermediate + Medium Score (50-75) → Moderate Path
   *   - Advanced + High Score (> 75) → Expert Path
   */
  generatePath(scores: SkillScore, resumeLevel?: string): LearningModule[] {
    let modules: LearningModule[];
    const level = resumeLevel?.toLowerCase() || "beginner";

    // FUSION LOGIC combining Resume Level and Assessment Score
    if (level === "beginner" && scores.overall < 50) {
      // Basic Learning Path: emphasize fundamentals
      modules = modulePool.map((m) =>
        m.difficulty === "beginner" ? { ...m, priority: "high" as const } : m
      );
    } else if ((level === "intermediate" || level === "beginner") && scores.overall <= 75) {
      // Moderate Path
      modules = modulePool.filter((m) => m.id !== "m6"); // skip JS basics
    } else if (level === "advanced" || scores.overall > 75) {
      // Expert Path
      modules = modulePool.filter((m) => m.difficulty !== "beginner");
    } else {
      // Fallback
      modules = modulePool.filter((m) => m.difficulty !== "beginner");
    }

    // Sort: high → medium → low
    const priorityOrder = { high: 0, medium: 1, low: 2 };
    modules.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

    eventBus.emit("RecommendationAgent", "TrackerAgent", "path:generated", {
      moduleCount: modules.length,
      overallScore: scores.overall,
    });

    return modules;
  },
};
