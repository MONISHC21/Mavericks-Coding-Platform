/**
 * Agent Orchestrator — Central coordinator for the multi-agent pipeline.
 *
 * PROBLEM IT SOLVES:
 *   Without an orchestrator, agents run in isolation. The orchestrator
 *   ensures the STRICT workflow order:
 *     User → Profile → Assessment → Recommendation → Tracker → Engagement → Dashboard
 *
 * HOW IT WORKS:
 *   1. Receives user input
 *   2. Calls each agent sequentially, passing outputs forward
 *   3. Logs every event for traceability
 *   4. Supports RETRY / re-assessment flow
 *
 * SCALABILITY:
 *   New agents can be added to the pipeline without modifying existing agents —
 *   just register them in the orchestrator and subscribe via the event bus.
 */

import type { UserProfile, SkillScore, LearningModule, ProgressStep, ResumeAnalysis, LeaderboardEntry } from "./types";
import { eventBus } from "./eventBus";
import { profileAgent } from "./profileAgent";
import { assessmentAgent } from "./assessmentAgent";
import { recommendationAgent } from "./recommendationAgent";
import { trackerAgent } from "./trackerAgent";
import { engagementAgent } from "./engagementAgent";

export interface PipelineResult {
  profile: UserProfile;
  resumeAnalysis?: ResumeAnalysis;
  assessment: SkillScore;
  recommendations: LearningModule[];
  progress: ProgressStep[];
  leaderboard: LeaderboardEntry[];
  eventLog: ReturnType<typeof eventBus.getLog>;
  stagnationWarning?: string;
}

export const orchestrator = {
  /**
   * Run the full agent pipeline for a new user assessment.
   *
   * @param profileData – partial user info
   * @param answers     – code answers from the assessment UI
   * @returns complete pipeline result with event log
   */
  async runPipeline(
    profileData: Partial<UserProfile>,
    answers: string[],
    mcqSelections: Record<number, string> = {}
  ): Promise<PipelineResult> {
    try {
      // Clear previous event log for a clean trace
      eventBus.clearLog();
      eventBus.emit("Orchestrator", "Pipeline", "pipeline:started", { timestamp: new Date().toISOString() });

      // Step 1 → Profile Agent
      const profile = await profileAgent.createProfile(profileData);

      // Step 2 → Assessment Agent
      const assessment = assessmentAgent.evaluate(answers, mcqSelections);

      // Step 3 → Recommendation Agent
      const recommendations = recommendationAgent.generatePath(
        assessment,
        profile.resumeAnalysis?.experienceLevel
      );

      // Step 4 → Tracker Agent (sync)
      const progress = trackerAgent.getSteps({
        profileDone: true,
        assessmentDone: true,
        evaluated: true,
        pathGenerated: true,
      });

      // Step 5 → Engagement Agent (insert user into leaderboard)
      const leaderboard = await engagementAgent.insertUser(
        profile.name,
        assessment.overall,
        profile.level,
        profile.resumeAnalysis?.confidenceScore
      );

      eventBus.emit("Orchestrator", "Dashboard", "pipeline:completed", {
        overallScore: assessment.overall,
        modulesAssigned: recommendations.length,
      });

      return {
        profile,
        resumeAnalysis: profile.resumeAnalysis,
        assessment,
        recommendations,
        progress,
        leaderboard,
        eventLog: eventBus.getLog(),
      };
    } catch (error) {
      console.error("Orchestrator pipeline error:", error);
      eventBus.emit("Orchestrator", "System", "pipeline:failed", { error });
      throw error;
    }
  },

  /**
   * Retry / Re-assessment flow.
   * Allows a user to retake the assessment without losing their profile.
   */
  async retryAssessment(
    existingProfile: UserProfile,
    newAnswers: string[],
    previousScore?: number,
    mcqSelections: Record<number, string> = {}
  ): Promise<PipelineResult> {
    try {
      eventBus.clearLog();
      eventBus.emit("Orchestrator", "Pipeline", "pipeline:retry", {
        user: existingProfile.name,
        timestamp: new Date().toISOString(),
      });

      const assessment = assessmentAgent.evaluate(newAnswers, mcqSelections);
      const recommendations = recommendationAgent.generatePath(
        assessment,
        existingProfile.resumeAnalysis?.experienceLevel
      );
      const progress = trackerAgent.getSteps({
        profileDone: true,
        assessmentDone: true,
        evaluated: true,
        pathGenerated: true,
      });

      const leaderboard = await engagementAgent.insertUser(
        existingProfile.name,
        assessment.overall,
        existingProfile.level,
        existingProfile.resumeAnalysis?.confidenceScore
      );

      eventBus.emit("Orchestrator", "Dashboard", "retry:completed", {
        newScore: assessment.overall,
      });

      const stagnationWarning = previousScore !== undefined
        ? (trackerAgent.detectStagnation(previousScore, assessment.overall) || undefined)
        : undefined;

      return {
        profile: existingProfile,
        resumeAnalysis: existingProfile.resumeAnalysis,
        assessment,
        recommendations,
        progress,
        leaderboard,
        eventLog: eventBus.getLog(),
        stagnationWarning
      };
    } catch (error) {
      console.error("Orchestrator retry error:", error);
      eventBus.emit("Orchestrator", "System", "retry:failed", { error });
      throw error;
    }
  },
};
