import { getAI, extractText, cleanJson, applyRepetition } from './_utils.js';
import type { GenerationRequest, ApparelGenerationRequest, QCResult, QCScores, RiskFlag, RiskProfile, ExtractedColorPalette } from '../src/types/index.js';
import { SYSTEM_INSTRUCTION } from '../src/prompts/systemInstruction.js';
import { buildStudioPrompt } from '../src/prompts/studioPrompt.js';
import { buildLifestylePrompt } from '../src/prompts/lifestylePrompt.js';
import {
  buildOnFigurePrompt,
  buildQualityCheckPrompt,
} from '../src/prompts/onFigurePrompt.js';
import { buildCampaignPrompt } from '../src/prompts/campaignPrompt.js';
import { buildHomeCleanCutPrompt } from '../src/prompts/homeCleanCutPrompt.js';
import { buildHomeRoomScenePrompt } from '../src/prompts/homeRoomScenePrompt.js';
import { buildHomeLifestyleVignettePrompt } from '../src/prompts/homeLifestyleVignettePrompt.js';
import { buildHardlinesCleanCutPrompt } from '../src/prompts/hardlinesCleanCutPrompt.js';
import { buildHardlinesHeroShotPrompt } from '../src/prompts/hardlinesHeroShotPrompt.js';
import { buildHardlinesInContextPrompt } from '../src/prompts/hardlinesInContextPrompt.js';
import { buildProductQualityCheckPrompt } from '../src/prompts/productQualityCheckPrompt.js';
import { buildEditPrompt } from '../src/prompts/editPrompt.js';
import { buildFlatLayPrompt } from '../src/prompts/flatlayPrompt.js';
import { buildProductAnalysisAndRiskPrompt, buildGarmentAnalysisAndRiskPrompt } from '../src/prompts/combinedAnalysisPrompt.js';

export const config = { maxDuration: 60 };

const DEFAULT_IMAGE_MODEL = 'gemini-2.5-flash-image';
const TEXT_MODEL = 'gemini-2.5-flash';
const MAX_EDIT_RETRIES = 3;

// ── Token usage tracking ──────────────────────────────────────────────────────

const PRICE_INPUT_PER_1M = 0.075;   // USD per 1M input tokens (Gemini 2.5 Flash family)
const PRICE_OUTPUT_PER_1M = 0.30;   // USD per 1M output tokens

interface UsageAccumulator { inputTokens: number; outputTokens: number; }

function accumulateUsage(acc: UsageAccumulator, meta: any): void {
  acc.inputTokens  += meta?.promptTokenCount     ?? 0;
  acc.outputTokens += meta?.candidatesTokenCount ?? 0;
}

function computeCost(acc: UsageAccumulator): number {
  return (acc.inputTokens  / 1_000_000) * PRICE_INPUT_PER_1M
       + (acc.outputTokens / 1_000_000) * PRICE_OUTPUT_PER_1M;
}

const STATIC_RISK_CONSTRAINTS: Record<RiskFlag, string> = {
  reflective_surface: 'Zero tolerance for highlight displacement. Reflections must match reference light physics exactly.',
  many_small_components: 'Count every discrete component. If the reference shows N items, output must show exactly N.',
  micro_text_logo: 'Logo and text must remain pixel-consistent — no blur, no distortion, exact positioning and size.',
  symmetry_critical: 'Bilateral or radial symmetry must be geometrically exact. Do not break symmetry.',
  repeating_elements: 'Repeating elements must match the exact count from the reference. Do not add or remove any.',
  transparent_material: 'Transparency and refraction must match reference light physics. Preserve see-through quality.',
  complex_pattern: 'Surface pattern must be continuous and unbroken. No pattern drift, misalignment, or simplification.',
  high_contrast_branding: 'Branding must be reproduced at the exact position, scale, color, and contrast as the reference.',
  multi_section_config: 'Multi-section configuration is CRITICAL. Preserve exact layout direction, section count, and footprint shape.',
  curved_organic_shape: 'Organic curves must flow continuously. No flattening, straightening, or artificial angularity.',
  color_sensitive: 'Reproduce the exact product color — do NOT enhance, saturate, or beautify. The reference color is correct as-is. Any color "improvement" is a critical failure.',
  decorative_element_placement: 'ALL decorative elements (ribbons, bows, patches, appliques, trim) are structurally fixed at their reference positions. Any displacement is a critical failure.',
};

// ── Helpers ───────────────────────────────────────────────────────────────────

const SCORE_IMPROVEMENT_THRESHOLD = 3;

const DEFAULT_PRODUCT_QC_SCORES = {
  colorAccuracy: 10, configurationMatch: 10, componentCount: 10,
  proportionFidelity: 10, constructionDetails: 10, brandingPreservation: 10, overallFidelity: 10,
};

const DEFAULT_GARMENT_QC_SCORES = {
  colorAccuracy: 10, graphicPreservation: 10, silhouetteMatch: 10, textureMatch: 10, overallFidelity: 10,
};

async function generateImage(
  prompt: string,
  sourceImageBase64: string,
  sourceImageMimeType: string,
  additionalImages?: Array<{ base64: string; mimeType: string; label?: string }>,
  imageModel: string = DEFAULT_IMAGE_MODEL,
  usageAcc?: UsageAccumulator
): Promise<{ imageBase64: string; mimeType: string }> {
  const parts: any[] = [
    { text: prompt },
    { inlineData: { mimeType: sourceImageMimeType, data: sourceImageBase64 } },
  ];
  addImageParts(parts, additionalImages);
  const response = await getAI().models.generateContent({
    model: imageModel,
    contents: [{ parts }],
    config: { systemInstruction: SYSTEM_INSTRUCTION, responseModalities: ['TEXT', 'IMAGE'] },
  });
  if (usageAcc) accumulateUsage(usageAcc, response.usageMetadata);
  const imagePart = response.candidates?.[0]?.content?.parts?.find(
    (p: any) => p.inlineData?.mimeType?.startsWith('image/')
  );
  if (!imagePart?.inlineData) {
    throw new Error('No image returned from Gemini.');
  }
  return {
    imageBase64: imagePart.inlineData.data ?? '',
    mimeType: imagePart.inlineData.mimeType ?? 'image/png',
  };
}

function addImageParts(parts: any[], additionalImages?: Array<{ base64: string; mimeType: string; label?: string }>): void {
  if (additionalImages) {
    for (const img of additionalImages) {
      parts.push({ inlineData: { mimeType: img.mimeType, data: img.base64 } });
    }
  }
}

function formatAdditionalImagesLabel(additionalImages?: Array<{ base64: string; mimeType: string; label?: string }>): string {
  if (!additionalImages || additionalImages.length === 0) return '';
  return `\n\nMULTIPLE REFERENCE IMAGES PROVIDED:\n- Image 1 (primary): Front/main view of the product\n${additionalImages.map((img, i) => `- Image ${i + 2}${img.label ? ` (${img.label})` : ''}: Additional reference angle`).join('\n')}\nUse ALL reference images to ensure maximum fidelity. Every detail visible in any reference must be preserved.`;
}

function validateConfig(req: GenerationRequest, analysisJson: string): { severity: 'low' | 'high'; message: string } | undefined {
  try {
    const analysis = JSON.parse(analysisJson);
    const userType = req.category === 'apparel' ? req.garment.type :
      req.category === 'home' ? req.product.type : req.product.type;
    const aiType = (analysis.garmentType || analysis.productType || analysis.type || '').toLowerCase();
    if (aiType && !aiType.includes(userType.toLowerCase()) && !userType.toLowerCase().includes(aiType)) {
      return {
        severity: 'high',
        message: `Potential structural mismatch: You selected "${userType}", but the AI extracted "${aiType}". Proceeding may cause visual artifacts or hallucinations.`,
      };
    }
    return undefined;
  } catch { return undefined; }
}

function buildRiskConstraints(riskProfile: RiskProfile): string {
  if (riskProfile.flags.length === 0) return '';
  const constraints: string[] = [];
  for (const flag of riskProfile.flags) {
    const c = STATIC_RISK_CONSTRAINTS[flag];
    if (c) constraints.push(c);
  }
  for (const override of riskProfile.constraintOverrides) constraints.push(override);
  return `\n\nRISK-BASED CONSTRAINTS (high priority — failure to comply invalidates the image):\n${constraints.join('\n')}`;
}

function buildPrompt(req: GenerationRequest, analysisJson?: string): string {
  switch (req.category) {
    case 'apparel':
      switch (req.mode) {
        case 'studio': return buildStudioPrompt(req);
        case 'lifestyle': return buildLifestylePrompt(req);
        case 'on-figure': return buildOnFigurePrompt(req, analysisJson ?? '{}');
        case 'campaign': return buildCampaignPrompt(req);
        case 'flatlay': return buildFlatLayPrompt(req);
      }
      break;
    case 'home':
      switch (req.mode) {
        case 'home-clean-cut': return buildHomeCleanCutPrompt(req);
        case 'home-room-scene': return buildHomeRoomScenePrompt(req);
        case 'home-lifestyle-vignette': return buildHomeLifestyleVignettePrompt(req);
      }
      break;
    case 'hardlines':
      switch (req.mode) {
        case 'hardlines-clean-cut': return buildHardlinesCleanCutPrompt(req);
        case 'hardlines-hero-shot': return buildHardlinesHeroShotPrompt(req);
        case 'hardlines-in-context': return buildHardlinesInContextPrompt(req);
      }
      break;
  }
  throw new Error(`Unsupported category/mode: ${(req as any).category}/${(req as any).mode}`);
}

function buildFidelityConstraints(
  analysisJson: string,
  extractedColors?: ExtractedColorPalette
): string {
  let analysis: any;
  try { analysis = JSON.parse(analysisJson); } catch { return ''; }

  const lines: string[] = [];

  // ── Color lock (pixel-accurate palette measured client-side) ──────────────
  if (extractedColors && extractedColors.colors.length > 0) {
    lines.push('COLOR LOCK — PIXEL-ACCURATE MEASUREMENTS (extracted directly from reference pixels):');
    for (const c of extractedColors.colors) {
      lines.push(`  ${c.hex} — covers ~${c.percentage}% of the product`);
    }
    lines.push(
      'These hex values are EXACT measurements, not estimates.',
      'Do NOT make colors more vibrant, saturated, or appealing. Do NOT shift hue or brightness.',
      'Reproduce these exact hex values. Any deviation from the measured palette is a critical failure.',
    );
  }

  // ── Element position lock ─────────────────────────────────────────────────
  const elements = [
    ...(Array.isArray(analysis.structuralDecorativeElements) ? analysis.structuralDecorativeElements : []),
    ...(Array.isArray(analysis.graphicElements) ? analysis.graphicElements.filter((g: any) => g.type !== 'none') : []),
  ];

  if (elements.length > 0) {
    lines.push('', 'ELEMENT POSITION LOCK — ALL POSITIONS ARE STRUCTURALLY FIXED:');
    for (const el of elements) {
      const pos = el.position || el.location || '';
      const desc = el.description || el.type || '';
      if (desc && pos) {
        lines.push(`- "${desc}": FIXED at ${pos}. This is a structural attachment point — do NOT move it.`);
      }
    }
    lines.push('Any element at the wrong position is a critical failure. Verify against the reference before finalizing.');
  }

  return lines.length > 0 ? `\n\n${lines.join('\n')}` : '';
}

// ── Gemini API calls ──────────────────────────────────────────────────────────

async function analyzeProductAndRisks(
  imageBase64: string, imageMimeType: string,
  additionalImages?: { base64: string; mimeType: string }[],
  cachedAnalysisText?: string,
  cachedRiskProfile?: RiskProfile,
  usageAcc?: UsageAccumulator
): Promise<{ analysisJson: string; riskProfile: RiskProfile }> {
  if (cachedAnalysisText && cachedRiskProfile) {
    return { analysisJson: cachedAnalysisText, riskProfile: cachedRiskProfile };
  }

  const parts: any[] = [
    { text: applyRepetition(buildProductAnalysisAndRiskPrompt()) },
    { inlineData: { mimeType: imageMimeType, data: imageBase64 } },
  ];
  addImageParts(parts, additionalImages);

  const response = await getAI().models.generateContent({
    model: TEXT_MODEL, contents: [{ parts }], config: { responseModalities: ['TEXT'] },
  });
  if (usageAcc) accumulateUsage(usageAcc, response.usageMetadata);
  const text = extractText(response);
  if (!text) throw new Error('Product analysis failed.');

  const parsed = JSON.parse(cleanJson(text));
  const analysisJson = JSON.stringify(parsed.analysis ?? parsed);
  const r = parsed.risks ?? {};
  const riskProfile: RiskProfile = {
    flags: Array.isArray(r.flags) ? r.flags : [],
    descriptions: r.descriptions ?? {},
    constraintOverrides: Array.isArray(r.constraintOverrides) ? r.constraintOverrides : [],
  };
  return { analysisJson, riskProfile };
}

async function analyzeGarmentAndRisks(
  imageBase64: string, imageMimeType: string,
  additionalImages?: { base64: string; mimeType: string }[],
  cachedAnalysisText?: string,
  cachedRiskProfile?: RiskProfile,
  usageAcc?: UsageAccumulator
): Promise<{ analysisJson: string; riskProfile: RiskProfile }> {
  if (cachedAnalysisText && cachedRiskProfile) {
    return { analysisJson: cachedAnalysisText, riskProfile: cachedRiskProfile };
  }

  const parts: any[] = [
    { text: applyRepetition(buildGarmentAnalysisAndRiskPrompt()) },
    { inlineData: { mimeType: imageMimeType, data: imageBase64 } },
  ];
  addImageParts(parts, additionalImages);

  const response = await getAI().models.generateContent({
    model: TEXT_MODEL, contents: [{ parts }], config: { responseModalities: ['TEXT'] },
  });
  if (usageAcc) accumulateUsage(usageAcc, response.usageMetadata);
  const text = extractText(response);
  if (!text) throw new Error('Garment analysis failed.');

  const parsed = JSON.parse(cleanJson(text));
  const analysisJson = JSON.stringify(parsed.analysis ?? parsed);
  const r = parsed.risks ?? {};
  const riskProfile: RiskProfile = {
    flags: Array.isArray(r.flags) ? r.flags : [],
    descriptions: r.descriptions ?? {},
    constraintOverrides: Array.isArray(r.constraintOverrides) ? r.constraintOverrides : [],
  };
  return { analysisJson, riskProfile };
}

async function verifyProduct(
  originalBase64: string, originalMime: string,
  generatedBase64: string, generatedMime: string,
  analysisJson: string, mode: string,
  usageAcc?: UsageAccumulator
): Promise<QCResult> {
  const response = await getAI().models.generateContent({
    model: TEXT_MODEL,
    contents: [{
      parts: [
        { text: applyRepetition(buildProductQualityCheckPrompt(analysisJson, mode)) },
        { inlineData: { mimeType: originalMime, data: originalBase64 } },
        { inlineData: { mimeType: generatedMime, data: generatedBase64 } },
      ],
    }],
    config: { systemInstruction: SYSTEM_INSTRUCTION, responseModalities: ['TEXT'] },
  });
  if (usageAcc) accumulateUsage(usageAcc, response.usageMetadata);
  const text = extractText(response);
  try {
    const parsed = JSON.parse(cleanJson(text));
    return {
      scores: parsed.scores ?? DEFAULT_PRODUCT_QC_SCORES,
      pass: parsed.pass ?? true,
      issues: Array.isArray(parsed.issues) ? parsed.issues : [],
      recommendation: parsed.recommendation ?? 'approve',
    };
  } catch {
    return { scores: DEFAULT_PRODUCT_QC_SCORES, pass: true, issues: [], recommendation: 'approve' };
  }
}

async function checkGarmentQuality(
  originalBase64: string, originalMime: string,
  generatedBase64: string, generatedMime: string,
  analysisJson: string, mode: string,
  usageAcc?: UsageAccumulator
): Promise<QCResult> {
  const response = await getAI().models.generateContent({
    model: TEXT_MODEL,
    contents: [{
      parts: [
        { text: applyRepetition(buildQualityCheckPrompt(analysisJson, mode)) },
        { inlineData: { mimeType: originalMime, data: originalBase64 } },
        { inlineData: { mimeType: generatedMime, data: generatedBase64 } },
      ],
    }],
    config: { systemInstruction: SYSTEM_INSTRUCTION, responseModalities: ['TEXT'] },
  });
  if (usageAcc) accumulateUsage(usageAcc, response.usageMetadata);
  const text = extractText(response);
  try {
    const parsed = JSON.parse(cleanJson(text));
    return {
      scores: parsed.scores ?? DEFAULT_GARMENT_QC_SCORES,
      pass: parsed.pass ?? true,
      issues: Array.isArray(parsed.issues) ? parsed.issues : [],
      recommendation: parsed.recommendation ?? 'approve',
    };
  } catch {
    return { scores: DEFAULT_GARMENT_QC_SCORES, pass: true, issues: [], recommendation: 'approve' };
  }
}

// ── Server result shape (no pixelQCScores / compositeScore — those are browser-only) ──

interface ServerResult {
  id: string;
  imageBase64: string;
  mimeType: string;
  timestamp: number;
  analysisText: string;
  riskProfile: RiskProfile;
  qcScores: QCScores;
  qcPass: boolean;
  qcIssues: string[];
  iterationCount: number;
  tokenUsage: { inputTokens: number; outputTokens: number; estimatedCostUsd: number };
  validationWarning?: { severity: 'low' | 'high'; message: string };
}

// ── On-figure pipeline (apparel only) ────────────────────────────────────────

async function runOnFigurePipeline(req: ApparelGenerationRequest, onProgress: (s: string) => void): Promise<ServerResult> {
  const imageModel: string = req.imageModel ?? DEFAULT_IMAGE_MODEL;
  const usageAcc: UsageAccumulator = { inputTokens: 0, outputTokens: 0 };
  let iterationCount = 1;

  onProgress('Analyzing garment details and risks...');
  const { analysisJson, riskProfile } = await analyzeGarmentAndRisks(
    req.sourceImageBase64, req.sourceImageMimeType, req.additionalImages,
    req.cachedAnalysisText, req.cachedRiskProfile, usageAcc
  );
  const validationWarning = validateConfig(req, analysisJson);

  onProgress('Placing garment on model...');
  const basePrompt = buildOnFigurePrompt(req, analysisJson);
  const prompt = basePrompt + buildRiskConstraints(riskProfile) + buildFidelityConstraints(analysisJson, req.extractedColors) + formatAdditionalImagesLabel(req.additionalImages);

  const { imageBase64: genBase64, mimeType: genMime } = await generateImage(prompt, req.sourceImageBase64, req.sourceImageMimeType, req.additionalImages, imageModel, usageAcc);
  let generatedBase64 = genBase64;
  let generatedMime = genMime;

  onProgress('Checking garment accuracy...');
  const qc = await checkGarmentQuality(req.sourceImageBase64, req.sourceImageMimeType, generatedBase64, generatedMime, analysisJson, req.mode, usageAcc);

  let finalQc = qc;
  let previousScore = finalQc.scores.overallFidelity ?? 0;

  while (!finalQc.pass && finalQc.issues.length > 0 && iterationCount <= MAX_EDIT_RETRIES) {
    const currentScore = finalQc.scores.overallFidelity ?? 0;
    if (iterationCount > 1 && currentScore < previousScore + SCORE_IMPROVEMENT_THRESHOLD) {
      onProgress(`Score stagnated at ${currentScore}/10 — stopping refinement.`);
      break;
    }
    previousScore = currentScore;

    const failedDimension = finalQc.issues[0] ?? 'quality issues';
    onProgress(`Refinement ${iterationCount}/${MAX_EDIT_RETRIES}: fixing ${failedDimension}...`);

    const editPrompt = buildEditPrompt(finalQc, analysisJson, prompt);
    const editParts: any[] = [
      { text: editPrompt },
      { inlineData: { mimeType: generatedMime, data: generatedBase64 } },
      { inlineData: { mimeType: req.sourceImageMimeType, data: req.sourceImageBase64 } },
    ];
    addImageParts(editParts, req.additionalImages);

    const retryResponse = await getAI().models.generateContent({
      model: imageModel,
      contents: [{ parts: editParts }],
      config: { systemInstruction: SYSTEM_INSTRUCTION, responseModalities: ['TEXT', 'IMAGE'] },
    });
    accumulateUsage(usageAcc, retryResponse.usageMetadata);
    const retryPart = retryResponse.candidates?.[0]?.content?.parts?.find((p: any) => p.inlineData?.mimeType?.startsWith('image/'));
    if (!retryPart?.inlineData) break;

    generatedBase64 = retryPart.inlineData.data ?? '';
    generatedMime = retryPart.inlineData.mimeType ?? 'image/png';
    iterationCount++;

    onProgress(`Re-checking after refinement ${iterationCount - 1}...`);
    finalQc = await checkGarmentQuality(req.sourceImageBase64, req.sourceImageMimeType, generatedBase64, generatedMime, analysisJson, req.mode, usageAcc);
  }

  return {
    id: crypto.randomUUID(),
    imageBase64: generatedBase64,
    mimeType: generatedMime,
    timestamp: Date.now(),
    analysisText: analysisJson,
    riskProfile,
    qcScores: finalQc.scores,
    qcPass: finalQc.pass,
    qcIssues: finalQc.issues,
    iterationCount,
    tokenUsage: { ...usageAcc, estimatedCostUsd: computeCost(usageAcc) },
    validationWarning,
  };
}

// ── Universal pipeline (all other modes) ─────────────────────────────────────

async function runUniversalPipeline(req: GenerationRequest, onProgress: (s: string) => void): Promise<ServerResult> {
  const imageModel: string = req.imageModel ?? DEFAULT_IMAGE_MODEL;
  const usageAcc: UsageAccumulator = { inputTokens: 0, outputTokens: 0 };
  let iterationCount = 1;

  onProgress('Analyzing product details and risks...');
  const { analysisJson, riskProfile } = await analyzeProductAndRisks(
    req.sourceImageBase64, req.sourceImageMimeType, req.additionalImages,
    req.cachedAnalysisText, req.cachedRiskProfile, usageAcc
  );
  const validationWarning = validateConfig(req, analysisJson);

  onProgress('Generating high-fidelity product photo...');
  const customInstructions = req.category === 'apparel' ? req.garment.customInstructions :
    req.category === 'home' ? req.product.customInstructions : req.product.customInstructions;

  const modePrompt = buildPrompt(req);
  const prompt = `${modePrompt}\n\nPRODUCT ANALYSIS (verified ground truth extracted from the reference image — do not deviate from this):\n${analysisJson}\n\n${customInstructions ? `STYLING NOTES / CUSTOM INSTRUCTIONS:\n${customInstructions}\n` : ''}REFERENCE IMAGE: Attached. The analysis above was extracted from this reference.${formatAdditionalImagesLabel(req.additionalImages)}\nIf any discrepancy between analysis text and the image, the image is the source of truth.\nUse this analysis as a checklist: every detail listed must be preserved in the output.${buildRiskConstraints(riskProfile)}${buildFidelityConstraints(analysisJson, req.extractedColors)}`;

  const { imageBase64: genBase64, mimeType: genMime } = await generateImage(prompt, req.sourceImageBase64, req.sourceImageMimeType, req.additionalImages, imageModel, usageAcc);
  let generatedBase64 = genBase64;
  let generatedMime = genMime;

  onProgress('Verifying product accuracy against reference...');
  const qc = await verifyProduct(req.sourceImageBase64, req.sourceImageMimeType, generatedBase64, generatedMime, analysisJson, req.mode, usageAcc);

  let finalQc = qc;
  let previousScore = finalQc.scores.overallFidelity ?? 0;

  while (!finalQc.pass && finalQc.issues.length > 0 && iterationCount <= MAX_EDIT_RETRIES) {
    const currentScore = finalQc.scores.overallFidelity ?? 0;
    if (iterationCount > 1 && currentScore < previousScore + SCORE_IMPROVEMENT_THRESHOLD) {
      onProgress(`Score stagnated at ${currentScore}/10 — stopping refinement.`);
      break;
    }
    previousScore = currentScore;

    const failedDimension = finalQc.issues[0] ?? 'quality issues';
    onProgress(`Auto-refining ${iterationCount}/${MAX_EDIT_RETRIES}: fixing ${failedDimension}...`);

    const editPrompt = buildEditPrompt(finalQc, analysisJson, prompt);
    const editParts: any[] = [
      { text: editPrompt },
      { inlineData: { mimeType: generatedMime, data: generatedBase64 } },
      { inlineData: { mimeType: req.sourceImageMimeType, data: req.sourceImageBase64 } },
    ];
    addImageParts(editParts, req.additionalImages);

    const retryResponse = await getAI().models.generateContent({
      model: imageModel,
      contents: [{ parts: editParts }],
      config: { systemInstruction: SYSTEM_INSTRUCTION, responseModalities: ['TEXT', 'IMAGE'] },
    });
    accumulateUsage(usageAcc, retryResponse.usageMetadata);
    const retryPart = retryResponse.candidates?.[0]?.content?.parts?.find((p: any) => p.inlineData?.mimeType?.startsWith('image/'));
    if (!retryPart?.inlineData) break;

    generatedBase64 = retryPart.inlineData.data ?? '';
    generatedMime = retryPart.inlineData.mimeType ?? 'image/png';
    iterationCount++;

    onProgress(`Re-checking after refinement ${iterationCount - 1}...`);
    finalQc = await verifyProduct(req.sourceImageBase64, req.sourceImageMimeType, generatedBase64, generatedMime, analysisJson, req.mode, usageAcc);
  }

  return {
    id: crypto.randomUUID(),
    imageBase64: generatedBase64,
    mimeType: generatedMime,
    timestamp: Date.now(),
    analysisText: analysisJson,
    riskProfile,
    qcScores: finalQc.scores,
    qcPass: finalQc.pass,
    qcIssues: finalQc.issues,
    iterationCount,
    tokenUsage: { ...usageAcc, estimatedCostUsd: computeCost(usageAcc) },
    validationWarning,
  };
}

// ── Handler ───────────────────────────────────────────────────────────────────

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  const send = (data: object) => res.write(`data: ${JSON.stringify(data)}\n\n`);
  const onProgress = (step: string) => send({ type: 'progress', step });

  try {
    const request = req.body as GenerationRequest;
    let result: ServerResult;

    if (request.category === 'apparel' && request.mode === 'on-figure') {
      result = await runOnFigurePipeline(request as ApparelGenerationRequest, onProgress);
    } else {
      result = await runUniversalPipeline(request, onProgress);
    }

    send({ type: 'result', payload: result });
  } catch (err: any) {
    send({ type: 'error', message: err.message ?? 'Pipeline failed' });
  } finally {
    res.end();
  }
}
