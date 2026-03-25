/**
 * Platform State Management
 *
 * CHANGES:
 *  - submitAssessment/retryAssessment now accept mcqSelections for binary scoring
 *  - After assessment, profile.level is updated based on scored performance
 *  - Results are persisted to backend (/api/users) for admin dashboard and leaderboard
 */
import { create } from "zustand";
import type {
  UserProfile,
  SkillScore,
  LearningModule,
  ProgressStep,
  AgentEvent,
  ResumeAnalysis,
  LeaderboardEntry,
} from "./agents";
import { profileAgent, trackerAgent, orchestrator, eventBus } from "./agents";
import { assessmentAgent } from "./agents/assessmentAgent";

const API = "http://localhost:5000";

/** Save user result to real backend database */
async function saveToBackend(
  profile: UserProfile,
  score: number,
  badge: string,
  assessmentCount: number
): Promise<void> {
  try {
    await fetch(`${API}/api/users`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: profile.name,
        email: profile.email,
        score,
        level: profile.level,
        skills: profile.skills,
        badge,
        assessmentCount,
        evaluatedAt: new Date().toISOString(),
      }),
    });
  } catch {
    // Backend not running — silently ignore in dev
  }
}

interface PlatformState {
  profile: UserProfile | null;
  resumeAnalysis: ResumeAnalysis | null;
  assessment: SkillScore | null;
  recommendations: LearningModule[];
  progress: ProgressStep[];
  leaderboard: LeaderboardEntry[];
  answers: string[];
  eventLog: AgentEvent[];
  assessmentCount: number;
  activeAgent: number;
  stagnationWarning: string | null;
  profileLoading: boolean;

  setProfile: (data: Partial<UserProfile> & { resumeText?: string }) => Promise<void>;
  submitAssessment: (answers: string[], mcqSelections?: Record<number, string>) => Promise<void>;
  retryAssessment: (answers: string[], mcqSelections?: Record<number, string>) => Promise<void>;
  reset: () => void;
}

const initialProgress = trackerAgent.getSteps({
  profileDone: false,
  assessmentDone: false,
  evaluated: false,
  pathGenerated: false,
});

export const usePlatformStore = create<PlatformState>((set, get) => ({
  profile: null,
  resumeAnalysis: null,
  assessment: null,
  recommendations: [],
  leaderboard: [],
  progress: initialProgress,
  answers: [],
  eventLog: [],
  assessmentCount: 0,
  activeAgent: -1,
  stagnationWarning: null,
  profileLoading: false,

  setProfile: async (data) => {
    set({ profileLoading: true });
    try {
      const profile = await profileAgent.createProfile(data);

      // Call generateDynamicQuestions ONCE here — the only place it should be called.
      // The orchestrator's createProfile call does NOT call it (fix for constant-score bug).
      if (profile.resumeAnalysis?.extractedSkillsWeighted) {
        assessmentAgent.generateDynamicQuestions(
          profile.resumeAnalysis.extractedSkillsWeighted,
          profile.resumeAnalysis.experienceLevel
        );
      } else if (profile.resumeAnalysis?.extractedSkills?.length) {
        assessmentAgent.generateDynamicQuestions(
          profile.resumeAnalysis.extractedSkills.map(s => ({ name: s, weight: 1 })),
          profile.resumeAnalysis.experienceLevel
        );
      }

      const progress = trackerAgent.getSteps({
        profileDone: true,
        assessmentDone: false,
        evaluated: false,
        pathGenerated: false,
      });
      set({ profile, resumeAnalysis: profile.resumeAnalysis || null, progress, profileLoading: false });
    } catch (err) {
      console.error("setProfile error:", err);
      set({ profileLoading: false });
    }
  },

  submitAssessment: async (answers, mcqSelections = {}) => {
    const { profile } = get();
    const profileData = profile || { name: "Developer", email: "dev@mavericks.io" };

    set({ activeAgent: 0 });
    try {
      const result = await orchestrator.runPipeline(profileData, answers, mcqSelections);

      // Derive new level from score
      const score = result.assessment.overall;
      const newLevel: UserProfile["level"] =
        score >= 80 ? "advanced" : score >= 50 ? "intermediate" : "beginner";

      // Update profile with new level
      const updatedProfile = result.profile
        ? { ...result.profile, level: newLevel }
        : result.profile;

      // Compute badge
      const badge =
        score >= 90 ? "Gold 🥇" : score >= 70 ? "Silver 🥈" : score >= 50 ? "Bronze 🥉" : "Beginner";

      const newCount = get().assessmentCount + 1;

      // Persist to backend
      if (updatedProfile) {
        await saveToBackend(updatedProfile, score, badge, newCount);
      }

      set({
        profile: updatedProfile,
        resumeAnalysis: result.resumeAnalysis || null,
        answers,
        assessment: result.assessment,
        recommendations: result.recommendations,
        progress: result.progress,
        leaderboard: result.leaderboard,
        eventLog: result.eventLog,
        assessmentCount: newCount,
        activeAgent: -1,
        stagnationWarning: result.stagnationWarning || null,
      });
    } catch (err) {
      console.error("submitAssessment error:", err);
      set({ activeAgent: -1 });
    }
  },

  retryAssessment: async (answers, mcqSelections = {}) => {
    const { profile, assessment } = get();
    if (!profile) return;

    set({ activeAgent: 0 });
    try {
      const previousScore = assessment?.overall;
      const result = await orchestrator.retryAssessment(profile, answers, previousScore, mcqSelections);

      const score = result.assessment.overall;
      const newLevel: UserProfile["level"] =
        score >= 80 ? "advanced" : score >= 50 ? "intermediate" : "beginner";

      const updatedProfile = { ...profile, level: newLevel };
      const badge =
        score >= 90 ? "Gold 🥇" : score >= 70 ? "Silver 🥈" : score >= 50 ? "Bronze 🥉" : "Beginner";
      const newCount = get().assessmentCount + 1;

      await saveToBackend(updatedProfile, score, badge, newCount);

      set({
        profile: updatedProfile,
        answers,
        assessment: result.assessment,
        recommendations: result.recommendations,
        progress: result.progress,
        leaderboard: result.leaderboard,
        eventLog: result.eventLog,
        assessmentCount: newCount,
        activeAgent: -1,
        stagnationWarning: result.stagnationWarning || null,
      });
    } catch (err) {
      console.error("retryAssessment error:", err);
      set({ activeAgent: -1 });
    }
  },

  reset: () => {
    eventBus.clearLog();
    set({
      profile: null,
      resumeAnalysis: null,
      assessment: null,
      recommendations: [],
      leaderboard: [],
      progress: initialProgress,
      answers: [],
      eventLog: [],
      assessmentCount: 0,
      activeAgent: -1,
      stagnationWarning: null,
      profileLoading: false,
    });
  },
}));
