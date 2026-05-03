/**
 * Barrel re-export for the Agent System.
 * Import everything from "@/lib/agents" — backwards compatible.
 */

export * from "./types";
export { eventBus } from "./eventBus";
export { profileAgent } from "./profileAgent";
export { assessmentAgent } from "./assessmentAgent";
export { recommendationAgent } from "./recommendationAgent";
export { trackerAgent } from "./trackerAgent";
export { engagementAgent } from "./engagementAgent";
export { orchestrator } from "./orchestrator";
export type { PipelineResult } from "./orchestrator";
