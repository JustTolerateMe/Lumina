import { useState, useCallback } from 'react';
import { GenerationRequest, GenerationState } from '../types';
import { generate } from '../services/geminiService';

export function useGeneration() {
  const [state, setState] = useState<GenerationState>({ status: 'idle' });

  const generateImage = useCallback(async (req: GenerationRequest) => {
    setState({ status: 'generating', progress: 'Starting...' });

    try {
      const result = await generate(req, (progress) => {
        setState((s) => ({ ...s, progress }));
      });

      setState({ status: 'done', result });
      return result;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Generation failed';
      setState({ status: 'error', error: message });
      throw error;
    }
  }, []);

  const reset = useCallback(() => {
    setState({ status: 'idle' });
  }, []);

  return { state, generateImage, reset };
}
