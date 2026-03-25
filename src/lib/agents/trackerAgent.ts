/**
 * Tracker Agent
 *
 * PROBLEM: Users and managers have no visibility into learning progress.
 * SOLUTION: Maintains a timestamped progress state, providing real-time
 *           step-by-step tracking of the user's journey.
 * CONNECTS: Receives events from all upstream agents, outputs progress to dashboard.
 */

import type { ProgressStep } from "./types";
import { eventBus } from "./eventBus";

interface TrackerState {
  profileDone: boolean;
  assessmentDone: boolean;
  evaluated: boolean;
  pathGenerated: boolean;
}

export const trackerAgent = {
  /** Build the current progress steps with timestamps */
  getSteps(state: TrackerState): ProgressStep[] {
    const now = new Date().toLocaleTimeString();

    const steps: ProgressStep[] = [
      {
        id: "profile",
        label: "Profile Created",
        completed: state.profileDone,
        timestamp: state.profileDone ? now : undefined,
      },
      {
        id: "assessment",
        label: "Assessment Completed",
        completed: state.assessmentDone,
        timestamp: state.assessmentDone ? now : undefined,
      },
      {
        id: "evaluated",
        label: "Skills Evaluated",
        completed: state.evaluated,
        timestamp: state.evaluated ? now : undefined,
      },
      {
        id: "path",
        label: "Learning Path Generated",
        completed: state.pathGenerated,
        timestamp: state.pathGenerated ? now : undefined,
      },
    ];

    try {
      eventBus.emit("TrackerAgent", "Dashboard", "agent:tracker:done", {
        completedCount: steps.filter((s) => s.completed).length,
        totalSteps: steps.length,
        steps,
      });
    } catch (error) {
      console.error("TrackerAgent event emit error:", error);
    }

    return steps;
  },

  detectStagnation(previousScore: number, newScore: number): string | null {
    if (previousScore > 0 && newScore <= previousScore + 2 && newScore < 80) {
      const warning = `Stagnation Detected: Your score did not strictly improve (${previousScore} → ${newScore}). We recommend taking a step back to review the fundamentals.`;
      eventBus.emit("TrackerAgent", "Dashboard", "stagnation:detected", { warning });
      return warning;
    }
    return null;
  }
};
