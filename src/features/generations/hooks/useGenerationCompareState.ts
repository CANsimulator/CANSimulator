import { useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import type { CompareScenario, GenerationId, GenerationQueryState } from '../types';
import {
  applyGenerationQueryPatch,
  buildGenerationQuery,
  parseGenerationQuery,
} from '../utils/queryState';

export interface GenerationCompareState extends GenerationQueryState {
  setPrimary: (generation: GenerationId) => void;
  setCompare: (generation: GenerationId) => void;
  setScenario: (scenario: CompareScenario['id']) => void;
  setSideBySide: (enabled: boolean) => void;
  swapGenerations: () => void;
}

export function useGenerationCompareState(): GenerationCompareState {
  const [searchParams, setSearchParams] = useSearchParams();

  const state = useMemo(() => parseGenerationQuery(searchParams), [searchParams]);

  const updateState = useCallback(
    (patch: Partial<GenerationQueryState>) => {
      const next = applyGenerationQueryPatch(state, patch);
      setSearchParams(buildGenerationQuery(next), { replace: true });
    },
    [setSearchParams, state]
  );

  const setPrimary = useCallback(
    (generation: GenerationId) => updateState({ primary: generation }),
    [updateState]
  );

  const setCompare = useCallback(
    (generation: GenerationId) => updateState({ compare: generation }),
    [updateState]
  );

  const setScenario = useCallback(
    (scenario: CompareScenario['id']) => updateState({ scenario }),
    [updateState]
  );

  const setSideBySide = useCallback(
    (enabled: boolean) => updateState({ sideBySide: enabled }),
    [updateState]
  );

  const swapGenerations = useCallback(() => {
    updateState({ primary: state.compare, compare: state.primary, sideBySide: true });
  }, [state.compare, state.primary, updateState]);

  return {
    ...state,
    setPrimary,
    setCompare,
    setScenario,
    setSideBySide,
    swapGenerations,
  };
}

