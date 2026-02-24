import { useState, useCallback } from 'react';
import { GenerationRequest, GenerationResult, GenerationState, HistoryEntry } from '../types';
import { generate, getSemanticSuggestions, manualInpaint } from '../services/geminiService';
import { saveGeneration, generateThumbnail } from '../services/telemetry';

async function saveToHistory(result: GenerationResult): Promise<void> {
  const thumb = await generateThumbnail(result.imageBase64, result.mimeType);

  const colorDesc =
    result.request.category === 'apparel' ? result.request.garment.colorDescription :
      result.request.category === 'home' ? result.request.product.colorDescription :
        result.request.product.colorDescription;

  const entry: HistoryEntry = {
    id: result.id,
    timestamp: result.timestamp,
    mode: result.request.mode,
    category: result.request.category,
    thumbnailBase64: thumb.base64,
    thumbnailMime: thumb.mimeType,
    qcScores: result.qcScores,
    pixelQCScores: result.pixelQCScores,
    compositeScore: result.compositeScore,
    pass: result.qcPass,
    issues: result.qcIssues,
    riskProfile: result.riskProfile,
    iterationCount: result.iterationCount ?? 1,
    requestSummary: {
      category: result.request.category,
      mode: result.request.mode,
      colorDescription: colorDesc,
    },
  };

  await saveGeneration(entry);
}

export function useGeneration() {
  const [state, setState] = useState<GenerationState>({ status: 'idle' });

  const generateImage = useCallback(async (req: GenerationRequest) => {
    setState({ status: 'generating', progress: 'Starting...' });

    try {
      const result = await generate(req, (progress) => {
        setState((s) => ({ ...s, progress }));
      });

      setState({ status: 'done', result });

      // Fire-and-forget history save
      saveToHistory(result).catch(console.warn);

      return result;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Generation failed';
      setState({ status: 'error', error: message });
      throw error;
    }
  }, []);

  const applyManualEdit = useCallback(async (maskBase64: string, instruction: string) => {
    if (state.status !== 'done' || !state.result) return;

    // Create the manual edit payload
    const req = {
      originalRequest: state.result.request,
      generatedImageBase64: state.result.imageBase64,
      generatedImageMimeType: state.result.mimeType,
      maskImageBase64: maskBase64,
      instruction
    };

    setState({ status: 'generating', progress: 'Preparing manual edit...' });

    try {
      const result = await manualInpaint(req, (progress) => {
        setState((s) => ({ ...s, progress }));
      });

      setState({ status: 'done', result });

      // Save new variation to history
      saveToHistory(result).catch(console.warn);

      return result;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Modification failed';
      setState({ status: 'error', error: message });
      throw error;
    }
  }, [state]);

  const reset = useCallback(() => {
    setState({ status: 'idle' });
  }, []);

  const getSuggestions = useCallback(async (imageBase64: string, imageMimeType: string) => {
    setState({ status: 'analyzing', progress: 'AI is reading your product details...' });
    try {
      const suggestions = await getSemanticSuggestions(imageBase64, imageMimeType);
      setState(s => ({ ...s, status: 'idle', suggestions }));
      return suggestions;
    } catch (error) {
      console.warn('Failed to get suggestions:', error);
      setState(s => ({ ...s, status: 'idle' }));
    }
  }, []);

  return { state, generateImage, reset, getSuggestions, applyManualEdit };
}
