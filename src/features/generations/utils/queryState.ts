import { GENERATION_ORDER, SCENARIOS } from '../data';
import type { CompareScenario, GenerationId, GenerationQueryState } from '../types';

const DEFAULT_PRIMARY: GenerationId = 'Classic';
const DEFAULT_COMPARE: GenerationId = 'FD';
const DEFAULT_SCENARIO: CompareScenario['id'] = 'diagnostics';

function parseGeneration(value: string | null): GenerationId | null {
  if (!value) return null;
  const match = GENERATION_ORDER.find((id) => id.toLowerCase() === value.toLowerCase());
  return match ?? null;
}

function parseScenario(value: string | null): CompareScenario['id'] | null {
  if (!value) return null;
  const match = SCENARIOS.find((scenario) => scenario.id === value);
  return match ? match.id : null;
}

function ensureDifferent(primary: GenerationId, compare: GenerationId): GenerationId {
  if (primary !== compare) return compare;
  const fallback = GENERATION_ORDER.find((id) => id !== primary);
  return fallback ?? DEFAULT_COMPARE;
}

export function parseGenerationQuery(search: URLSearchParams): GenerationQueryState {
  const primary = parseGeneration(search.get('primary')) ?? DEFAULT_PRIMARY;
  const compareRaw = parseGeneration(search.get('compare')) ?? DEFAULT_COMPARE;
  const scenario = parseScenario(search.get('scenario')) ?? DEFAULT_SCENARIO;
  const sideBySide = (search.get('view') ?? '').toLowerCase() === 'side';

  return {
    primary,
    compare: ensureDifferent(primary, compareRaw),
    scenario,
    sideBySide,
  };
}

export function buildGenerationQuery(state: GenerationQueryState): URLSearchParams {
  const params = new URLSearchParams();
  params.set('primary', state.primary);
  params.set('compare', ensureDifferent(state.primary, state.compare));
  params.set('scenario', state.scenario);
  if (state.sideBySide) {
    params.set('view', 'side');
  }
  return params;
}

export function applyGenerationQueryPatch(
  current: GenerationQueryState,
  patch: Partial<GenerationQueryState>
): GenerationQueryState {
  const merged: GenerationQueryState = {
    primary: patch.primary ?? current.primary,
    compare: patch.compare ?? current.compare,
    scenario: patch.scenario ?? current.scenario,
    sideBySide: patch.sideBySide ?? current.sideBySide,
  };

  return {
    ...merged,
    compare: ensureDifferent(merged.primary, merged.compare),
  };
}

