import type { BugCategory } from './supabase';

export type PredictionInput = {
  title: string;
  description: string;
  category: BugCategory;
  severity: string;
  priority: string;
};

export type PredictionResult = {
  predicted_category: string;
  probable_root_cause: string;
  confidence_score: number;
  model_version: string;
};

/**
 * Deterministic AI prediction module.
 *
 * Generates a pseudo-AI prediction for a bug based on its metadata using a
 * deterministic hashing approach. This is intentionally modular so a real
 * ML model can be swapped in later by replacing the body of `predict()`
 * while keeping the same input/output contract.
 */

const ROOT_CAUSES: Record<BugCategory, string[]> = {
  ui: [
    'Incorrect CSS state handling causing layout mismatch or unresponsive interaction handlers.',
    'Component re-rendering with stale props leading to inconsistent visual state.',
    'Missing or incorrect event listener cleanup on component unmount.',
  ],
  backend: [
    'Unhandled exception in service layer due to null or malformed input payload.',
    'Race condition between concurrent requests mutating shared state without locking.',
    'Incorrect business logic branch caused by an off-by-one or inverted condition.',
  ],
  database: [
    'Missing index on a frequently-joined column causing slow query and lock contention.',
    'Foreign key constraint violation from out-of-order record insertion.',
    'Transaction rollback not triggered due to uncaught nested query failure.',
  ],
  network: [
    'Intermittent timeout from upstream service exceeding retry budget.',
    'Incorrect TLS or CORS configuration rejecting legitimate cross-origin requests.',
    'DNS resolution failure or stale connection pool under load.',
  ],
  security: [
    'Insufficient input validation allowing injection of unauthorized characters.',
    'Broken access control check allowing access to resources outside user scope.',
    'Session token not invalidated after role change, leaving stale permissions.',
  ],
  performance: [
    'N+1 query pattern triggered by unbatched loop over related records.',
    'Large payload serialized synchronously blocking the main render thread.',
    'Missing memoization causing recomputation of expensive derived values.',
  ],
  api: [
    'Contract mismatch between client payload shape and server schema validation.',
    'Missing error envelope on non-2xx response causing silent client failure.',
    'Incorrect HTTP method or content-type header on an integration endpoint.',
  ],
  other: [
    'Unclassified defect requiring manual triage to isolate the root cause.',
    'Environmental or configuration drift between staging and production.',
    'Edge case in input handling not covered by existing test coverage.',
  ],
};

function hashString(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function predict(input: PredictionInput): PredictionResult {
  const seed = hashString(
    `${input.title}|${input.description}|${input.category}`
  );
  const causes = ROOT_CAUSES[input.category] ?? ROOT_CAUSES.other;
  const rootCause = causes[seed % causes.length];

  // Confidence: base by severity, modulated by description length and seed.
  const severityBoost: Record<string, number> = {
    low: 6,
    medium: 10,
    high: 16,
    critical: 22,
  };
  const base = 58 + (severityBoost[input.severity] ?? 10);
  const lengthFactor = Math.min(input.description.length / 12, 14);
  const jitter = (seed % 13) - 6;
  const confidence = Math.max(45, Math.min(96, base + lengthFactor + jitter));

  return {
    predicted_category: input.category,
    probable_root_cause: rootCause,
    confidence_score: Math.round(confidence * 100) / 100,
    model_version: 'deterministic-v1',
  };
}
