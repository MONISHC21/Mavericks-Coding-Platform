/**
 * Event Bus — Central nervous system of the agent pipeline.
 *
 * PROBLEM IT SOLVES:
 *   Without a shared communication channel, agents would be tightly coupled.
 *   The event bus enables LOOSE COUPLING and SCALABILITY — new agents can
 *   subscribe to events without modifying existing ones.
 *
 * HOW IT WORKS:
 *   Agents publish events after completing their task.
 *   Other agents (or the orchestrator) subscribe to those events.
 *   Every event is logged for full traceability.
 */

import type { AgentEvent } from "./types";

type Listener = (event: AgentEvent) => void;

class EventBus {
  private listeners: Map<string, Listener[]> = new Map();
  private log: AgentEvent[] = [];

  /** Subscribe to an event type */
  on(type: string, listener: Listener) {
    const existing = this.listeners.get(type) || [];
    existing.push(listener);
    this.listeners.set(type, existing);
  }

  /** Remove a listener */
  off(type: string, listener: Listener) {
    const existing = this.listeners.get(type) || [];
    this.listeners.set(type, existing.filter((l) => l !== listener));
  }

  /** Emit an event — notifies all subscribers and logs the event */
  emit(from: string, to: string, type: string, payload?: unknown) {
    const event: AgentEvent = {
      id: `evt_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      from,
      to,
      type,
      timestamp: new Date().toISOString(),
      payload,
    };

    this.log.push(event);

    const listeners = this.listeners.get(type) || [];
    listeners.forEach((fn) => fn(event));

    return event;
  }

  /** Get the full event log for debugging / analytics */
  getLog(): AgentEvent[] {
    return [...this.log];
  }

  /** Clear the event log */
  clearLog() {
    this.log = [];
  }
}

// Singleton instance shared across the platform
export const eventBus = new EventBus();
