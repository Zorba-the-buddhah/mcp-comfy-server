// Workflow registry - Phase 1: static imports to enable resources + submit-by-URI
// Follow Cloudflare Workers constraints: no runtime fs reads; bundle JSON statically

import w1 from "./workflow.json";
import w2 from "./workflow2.json";
import w3 from "./workflows3.json";

export type WorkflowEntry = {
  id: string;
  json: Record<string, unknown>;
};

export const workflows: WorkflowEntry[] = [
  { id: "w1", json: w1 as Record<string, unknown> },
  { id: "w2", json: w2 as Record<string, unknown> },
  { id: "w3", json: w3 as Record<string, unknown> },
];

export function getWorkflowById(id: string): WorkflowEntry | undefined {
  return workflows.find((w) => w.id === id);
}

export function parseWorkflowUri(uri: string): string | null {
  // Expected form: workflow://{id}
  if (!uri.startsWith("workflow://")) return null;
  const id = uri.slice("workflow://".length);
  return id || null;
}


