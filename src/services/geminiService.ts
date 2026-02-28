import type { GenerationRequest, GenerationResult, ProductSuggestions, ManualEditRequest, QCScores } from '../types';
import { computePixelQC } from './pixelQC';

// ── Composite score (browser-only — requires Canvas API via computePixelQC) ───

function computeCompositeScore(
  semanticScores: QCScores,
  pixelScores: { ssim: number; colorDelta: number; edgeOverlap: number; histogramMatch: number },
  mode: string
): number {
  const semanticValues = Object.values(semanticScores) as number[];
  const semanticAvg = semanticValues.length > 0
    ? (semanticValues.reduce((a, b) => a + b, 0) / semanticValues.length) * 10
    : 70;

  const pixelAvg = (pixelScores.ssim + pixelScores.colorDelta + pixelScores.edgeOverlap + pixelScores.histogramMatch) / 4;

  const bgChangesModes = [
    'on-figure', 'lifestyle', 'campaign',
    'home-room-scene', 'home-lifestyle-vignette',
    'hardlines-in-context',
  ];
  const semanticWeight = bgChangesModes.includes(mode) ? 0.8 : 0.6;
  return Math.round(semanticAvg * semanticWeight + pixelAvg * (1 - semanticWeight));
}

// ── SSE reader (fetch-based, works with POST unlike EventSource) ───────────

async function* readSSE(response: Response): AsyncGenerator<any> {
  const reader = response.body!.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const parts = buffer.split('\n\n');
    buffer = parts.pop() ?? '';
    for (const part of parts) {
      if (!part.startsWith('data: ')) continue;
      try { yield JSON.parse(part.slice(6)); } catch { /* skip malformed event */ }
    }
  }
}

// ── Generate ───────────────────────────────────────────────────────────────

export async function generate(
  req: GenerationRequest,
  onProgress: (step: string) => void = () => {}
): Promise<GenerationResult> {
  const response = await fetch('/api/pipeline', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(req),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Pipeline error (${response.status}): ${text}`);
  }

  let serverResult: any = null;

  for await (const event of readSSE(response)) {
    if (event.type === 'progress') onProgress(event.step);
    else if (event.type === 'result') serverResult = event.payload;
    else if (event.type === 'error') throw new Error(event.message);
  }

  if (!serverResult) throw new Error('No result received from pipeline.');

  onProgress('Computing pixel-level fidelity...');
  const pixelQCScores = await computePixelQC(
    req.sourceImageBase64, req.sourceImageMimeType,
    serverResult.imageBase64, serverResult.mimeType
  );
  const compositeScore = computeCompositeScore(serverResult.qcScores, pixelQCScores, req.mode);

  return { ...serverResult, request: req, pixelQCScores, compositeScore };
}

// ── Suggestions ────────────────────────────────────────────────────────────

export async function getSemanticSuggestions(
  imageBase64: string,
  imageMimeType: string
): Promise<ProductSuggestions> {
  const response = await fetch('/api/suggestions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ imageBase64, imageMimeType }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Suggestions error (${response.status}): ${text}`);
  }

  return response.json();
}

// ── Manual inpaint ─────────────────────────────────────────────────────────

export async function manualInpaint(
  req: ManualEditRequest,
  onProgress: (step: string) => void = () => {}
): Promise<GenerationResult> {
  onProgress('Applying manual edit...');

  const response = await fetch('/api/manual-edit', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(req),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Manual edit failed (${response.status}): ${text}`);
  }

  const serverResult = await response.json();
  if (serverResult.error) throw new Error(serverResult.error);

  onProgress('Computing pixel-level fidelity...');
  const pixelQCScores = await computePixelQC(
    req.originalRequest.sourceImageBase64, req.originalRequest.sourceImageMimeType,
    serverResult.imageBase64, serverResult.mimeType
  );
  const compositeScore = computeCompositeScore(serverResult.qcScores, pixelQCScores, req.originalRequest.mode);

  return { ...serverResult, request: req.originalRequest, pixelQCScores, compositeScore };
}
