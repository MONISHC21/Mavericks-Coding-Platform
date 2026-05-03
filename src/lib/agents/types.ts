/**
 * Shared types for the Mavericks Coding Platform Agent System.
 *
 * WHY: Centralised types ensure every agent speaks the same language,
 *      solving INCONSISTENCY across evaluation pipelines.
 */

export interface ResumeAnalysis {
  extractedSkills: string[];
  /** Weighted skills used for dynamic question selection */
  extractedSkillsWeighted?: { name: string; weight: number }[];
  experienceLevel: "Beginner" | "Intermediate" | "Advanced";
  confidenceScore: number;
}

export interface UserProfile {
  name: string;
  email: string;
  skills: string[];
  level: "beginner" | "intermediate" | "advanced";
  resumeAnalysis?: ResumeAnalysis;
  avatar?: string;
  createdAt: string;
}

export interface AssessmentQuestion {
  id: number;
  title: string;
  description: string;
  difficulty: "easy" | "medium" | "hard";
  language: string;
  starterCode: string;
  expectedConcepts: string[];
  /** Question type: "coding" = write code, "mcq" = multiple choice */
  type: "coding" | "mcq";
  /** MCQ only: the answer choices */
  options?: string[];
  /** MCQ only: the exact correct option string */
  correctAnswer?: string;
}

export interface SkillScore {
  overall: number;
  categories: { name: string; score: number }[];
  strengths: string[];
  weaknesses: string[];
  recommendations: string[];
  evaluatedAt: string;
  /** Per-question review for the Assessment Review feature */
  reviewItems?: AssessmentReviewItem[];
}

export interface AssessmentReviewItem {
  questionId: number;
  questionTitle: string;
  type: "mcq" | "coding";
  isCorrect: boolean;
  userAnswer: string;
  correctAnswer?: string;
  explanation: string;
  conceptsDetected?: string[];
  conceptsExpected?: string[];
  conceptsMissed?: string[];
}

export interface LearningModule {
  id: string;
  title: string;
  description: string;
  difficulty: "beginner" | "intermediate" | "advanced";
  estimatedTime: string;
  topics: string[];
  priority: "high" | "medium" | "low";
}

export interface ProgressStep {
  id: string;
  label: string;
  completed: boolean;
  timestamp?: string;
}

export interface LeaderboardEntry {
  rank: number;
  name: string;
  score: number;
  level: string;
  streak: number;
  badge?: string;
}

/** Event log entry for agent-to-agent communication tracing */
export interface AgentEvent {
  id: string;
  from: string;
  to: string;
  type: string;
  timestamp: string;
  payload?: unknown;
}

/** Analytics summary produced by the engagement agent */
export interface PlatformAnalytics {
  totalAssessments: number;
  averageScore: number;
  topSkill: string;
  weakestSkill: string;
  averageCompletionTime?: string;
}
