import { randomUUID } from 'node:crypto';
import { GoogleGenAI } from '@google/genai';
import { GoogleAuth } from 'google-auth-library';
import type { GenerationRequest, ApparelGenerationRequest, QCResult, QCScores, RiskFlag, RiskProfile } from '../src/types';
import { SYSTEM_INSTRUCTION } from '../src/prompts/systemInstruction';
import { buildStudioPrompt } from '../src/prompts/studioPrompt';
import { buildLifestylePrompt } from '../src/prompts/lifestylePrompt';
import {
  buildAnalysisPrompt as buildGarmentAnalysisPrompt,
  buildOnFigurePrompt,
  buildQualityCheckPrompt as buildGarmentQCPrompt,
} from '../src/prompts/onFigurePrompt';
import { buildCampaignPrompt } from '../src/prompts/campaignPrompt';
import { buildHomeCleanCutPrompt } from '../src/prompts/homeCleanCutPrompt';
import { buildHomeRoomScenePrompt } from '../src/prompts/homeRoomScenePrompt';
import { buildHomeLifestyleVignettePrompt } from '../src/prompts/homeLifestyleVignettePrompt';
import { buildHardlinesCleanCutPrompt } from '../src/prompts/hardlinesCleanCutPrompt';
import { buildHardlinesHeroShotPrompt } from '../src/prompts/hardlinesHeroShotPrompt';
import { buildHardlinesInContextPrompt } from '../src/prompts/hardlinesInContextPrompt';
import { buildProductAnalysisPrompt } from '../src/prompts/productAnalysisPrompt';
import { buildProductQualityCheckPrompt } from '../src/prompts/productQualityCheckPrompt';
import { buildRiskAnalysisPrompt } from '../src/prompts/riskAnalysisPrompt';
import { buildEditPrompt } from '../src/prompts/editPrompt';
import { buildFlatLayPrompt } from '../src/prompts/flatlayPrompt';

export const config = { maxDuration: 60 };

const IMAGE_MODEL = 'gemini-2.5-flash-image';
const TEXT_MODEL = 'gemini-2.5-flash';
const MAX_EDIT_RETRIES = 3;

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
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function getAI() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('GEMINI_API_KEY is not configured on the server.');
  return new GoogleGenAI({ apiKey });
}

function mapAspectRatio(ratio: string): string {
  const map: Record<string, string> = {
    '1:1': '1:1', '4:5': '3:4', '2:3': '3:4', '3:4': '3:4', '9:16': '9:16',
  };
  return map[ratio] ?? '1:1';
}

async function generateWithVertexAI(prompt: string, aspectRatio = '1:1'): Promise<{ imageBase64: string; mimeType: string }> {
  const region = 'us-central1';
  const credentialsJson = process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON;

  let auth: GoogleAuth;
  if (credentialsJson) {
    auth = new GoogleAuth({
      credentials: JSON.parse(credentialsJson),
      scopes: 'https://www.googleapis.com/auth/cloud-platform',
    });
  } else {
    auth = new GoogleAuth({ scopes: 'https://www.googleapis.com/auth/cloud-platform' });
  }

  let projectId = await auth.getProjectId().catch(() => null);
  if (!projectId || projectId === 'lumina-app-488718') {
    projectId = 'project-8835c244-6581-4347-820';
  }

  const client = await auth.getClient();
  const tokenResponse = await client.getAccessToken();
  const token = tokenResponse.token;
  if (!token) throw new Error('Failed to get Vertex AI access token.');

  const modelId = 'imagen-3.0-generate-002';
  const endpoint = `https://${region}-aiplatform.googleapis.com/v1/projects/${projectId}/locations/${region}/publishers/google/models/${modelId}:predict`;

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      instances: [{ prompt }],
      parameters: {
        sampleCount: 1,
        aspectRatio: mapAspectRatio(aspectRatio),
        outputOptions: { mimeType: 'image/png' },
      },
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Vertex AI API Error: ${errText}`);
  }

  const data = await response.json();
  if (!data.predictions?.[0]?.bytesBase64Encoded) throw new Error('No image returned from Imagen 3.');
  return { imageBase64: data.predictions[0].bytesBase64Encoded, mimeType: 'image/png' };
}

function extractText(response: any): string {
  return response.candidates?.[0]?.content?.parts
    ?.filter((p: any) => p.text)
    .map((p: any) => p.text)
    .join('') ?? '';
}

function cleanJson(text: string): string {
  return text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
}

function applyRepetition(instruction: string): string {
  return `${instruction}\n\n[REPEATED FOR ACCURACY]:\n${instruction}`;
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

// ── Gemini API calls ──────────────────────────────────────────────────────────

async function analyzeProduct(imageBase64: string, imageMimeType: string, additionalImages?: { base64: string; mimeType: string }[]): Promise<string> {
  const parts: any[] = [
    { text: applyRepetition(buildProductAnalysisPrompt()) },
    { inlineData: { mimeType: imageMimeType, data: imageBase64 } },
  ];
  if (additionalImages) for (const img of additionalImages) parts.push({ inlineData: { mimeType: img.mimeType, data: img.base64 } });

  const response = await getAI().models.generateContent({
    model: TEXT_MODEL, contents: [{ parts }], config: { responseModalities: ['TEXT'] },
  });
  const text = extractText(response);
  if (!text) throw new Error('Product analysis failed.');
  return cleanJson(text);
}

async function analyzeGarment(imageBase64: string, imageMimeType: string, additionalImages?: { base64: string; mimeType: string }[]): Promise<string> {
  const parts: any[] = [
    { text: applyRepetition(buildGarmentAnalysisPrompt()) },
    { inlineData: { mimeType: imageMimeType, data: imageBase64 } },
  ];
  if (additionalImages) for (const img of additionalImages) parts.push({ inlineData: { mimeType: img.mimeType, data: img.base64 } });

  const response = await getAI().models.generateContent({
    model: TEXT_MODEL, contents: [{ parts }], config: { responseModalities: ['TEXT'] },
  });
  const text = extractText(response);
  if (!text) throw new Error('Garment analysis failed.');
  return cleanJson(text);
}

async function identifyRisks(analysisJson: string): Promise<RiskProfile> {
  const response = await getAI().models.generateContent({
    model: TEXT_MODEL,
    contents: [{ parts: [{ text: applyRepetition(buildRiskAnalysisPrompt(analysisJson)) }] }],
    config: { responseModalities: ['TEXT'] },
  });
  const text = extractText(response);
  try {
    const parsed = JSON.parse(cleanJson(text));
    return {
      flags: Array.isArray(parsed.flags) ? parsed.flags : [],
      descriptions: parsed.descriptions ?? {},
      constraintOverrides: Array.isArray(parsed.constraintOverrides) ? parsed.constraintOverrides : [],
    };
  } catch { return { flags: [], descriptions: {}, constraintOverrides: [] }; }
}

async function verifyProduct(
  originalBase64: string, originalMime: string,
  generatedBase64: string, generatedMime: string,
  analysisJson: string
): Promise<QCResult> {
  const response = await getAI().models.generateContent({
    model: TEXT_MODEL,
    contents: [{ parts: [
      { text: applyRepetition(buildProductQualityCheckPrompt(analysisJson)) },
      { inlineData: { mimeType: originalMime, data: originalBase64 } },
      { inlineData: { mimeType: generatedMime, data: generatedBase64 } },
    ]}],
    config: { responseModalities: ['TEXT'] },
  });
  const text = extractText(response);
  try {
    const parsed = JSON.parse(cleanJson(text));
    return {
      scores: parsed.scores ?? { colorAccuracy: 10, configurationMatch: 10, componentCount: 10, proportionFidelity: 10, constructionDetails: 10, brandingPreservation: 10, overallFidelity: 10 },
      pass: parsed.pass ?? true,
      issues: Array.isArray(parsed.issues) ? parsed.issues : [],
      recommendation: parsed.recommendation ?? 'approve',
    };
  } catch {
    return { scores: { colorAccuracy: 10, configurationMatch: 10, componentCount: 10, proportionFidelity: 10, constructionDetails: 10, brandingPreservation: 10, overallFidelity: 10 }, pass: true, issues: [], recommendation: 'approve' };
  }
}

async function checkGarmentQuality(
  originalBase64: string, originalMime: string,
  generatedBase64: string, generatedMime: string,
  analysisJson: string
): Promise<QCResult> {
  const response = await getAI().models.generateContent({
    model: TEXT_MODEL,
    contents: [{ parts: [
      { text: applyRepetition(buildGarmentQCPrompt(analysisJson)) },
      { inlineData: { mimeType: originalMime, data: originalBase64 } },
      { inlineData: { mimeType: generatedMime, data: generatedBase64 } },
    ]}],
    config: { responseModalities: ['TEXT'] },
  });
  const text = extractText(response);
  try {
    const parsed = JSON.parse(cleanJson(text));
    return {
      scores: parsed.scores ?? { colorAccuracy: 10, graphicPreservation: 10, silhouetteMatch: 10, textureMatch: 10, overallFidelity: 10 },
      pass: parsed.pass ?? true,
      issues: Array.isArray(parsed.issues) ? parsed.issues : [],
      recommendation: parsed.recommendation ?? 'approve',
    };
  } catch {
    return { scores: { colorAccuracy: 10, graphicPreservation: 10, silhouetteMatch: 10, textureMatch: 10, overallFidelity: 10 }, pass: true, issues: [], recommendation: 'approve' };
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
  validationWarning?: { severity: 'low' | 'high'; message: string };
}

// ── On-figure pipeline (apparel only) ────────────────────────────────────────

async function runOnFigurePipeline(req: ApparelGenerationRequest, onProgress: (s: string) => void): Promise<ServerResult> {
  let iterationCount = 1;

  onProgress('Analyzing garment details...');
  const analysisJson = await analyzeGarment(req.sourceImageBase64, req.sourceImageMimeType, req.additionalImages);

  onProgress('Assessing generation risks...');
  const riskProfile = await identifyRisks(analysisJson);
  const validationWarning = validateConfig(req, analysisJson);

  onProgress('Placing garment on model...');
  const basePrompt = buildOnFigurePrompt(req, analysisJson);
  let imageLabel = '';
  if (req.additionalImages && req.additionalImages.length > 0) {
    imageLabel = `\n\nMULTIPLE REFERENCE IMAGES PROVIDED:\n- Image 1 (primary): Front/main view of the product\n${req.additionalImages.map((img, i) => `- Image ${i + 2}${img.label ? ` (${img.label})` : ''}: Additional reference angle`).join('\n')}\nUse ALL reference images to ensure maximum fidelity. Every detail visible in any reference must be preserved.`;
  }
  const prompt = basePrompt + buildRiskConstraints(riskProfile) + imageLabel;

  const { imageBase64: genBase64, mimeType: genMime } = await generateWithVertexAI(prompt, req.aspectRatio);
  let generatedBase64 = genBase64;
  let generatedMime = genMime;

  onProgress('Checking garment accuracy...');
  const qc = await checkGarmentQuality(req.sourceImageBase64, req.sourceImageMimeType, generatedBase64, generatedMime, analysisJson);

  let finalQc = qc;
  let previousScore = finalQc.scores.overallFidelity ?? 0;

  while (!finalQc.pass && finalQc.issues.length > 0 && iterationCount <= MAX_EDIT_RETRIES) {
    const currentScore = finalQc.scores.overallFidelity ?? 0;
    if (iterationCount > 1 && currentScore < previousScore + 3) {
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
    if (req.additionalImages) for (const img of req.additionalImages) editParts.push({ inlineData: { mimeType: img.mimeType, data: img.base64 } });

    const retryResponse = await getAI().models.generateContent({
      model: IMAGE_MODEL,
      contents: [{ parts: editParts }],
      config: { systemInstruction: SYSTEM_INSTRUCTION, responseModalities: ['TEXT', 'IMAGE'] },
    });
    const retryPart = retryResponse.candidates?.[0]?.content?.parts?.find((p: any) => p.inlineData?.mimeType?.startsWith('image/'));
    if (!retryPart?.inlineData) break;

    generatedBase64 = retryPart.inlineData.data ?? '';
    generatedMime = retryPart.inlineData.mimeType ?? 'image/png';
    iterationCount++;

    onProgress(`Re-checking after refinement ${iterationCount - 1}...`);
    finalQc = await checkGarmentQuality(req.sourceImageBase64, req.sourceImageMimeType, generatedBase64, generatedMime, analysisJson);
  }

  return {
    id: randomUUID(),
    imageBase64: generatedBase64,
    mimeType: generatedMime,
    timestamp: Date.now(),
    analysisText: analysisJson,
    riskProfile,
    qcScores: finalQc.scores,
    qcPass: finalQc.pass,
    qcIssues: finalQc.issues,
    iterationCount,
    validationWarning,
  };
}

// ── Universal pipeline (all other modes) ─────────────────────────────────────

async function runUniversalPipeline(req: GenerationRequest, onProgress: (s: string) => void): Promise<ServerResult> {
  let iterationCount = 1;

  onProgress('Analyzing product details...');
  const analysisJson = await analyzeProduct(req.sourceImageBase64, req.sourceImageMimeType, req.additionalImages);

  onProgress('Assessing generation risks...');
  const riskProfile = await identifyRisks(analysisJson);
  const validationWarning = validateConfig(req, analysisJson);

  onProgress('Generating high-fidelity product photo...');
  const customInstructions = req.category === 'apparel' ? req.garment.customInstructions :
    req.category === 'home' ? req.product.customInstructions : req.product.customInstructions;

  const modePrompt = buildPrompt(req);
  let imageLabel = '';
  if (req.additionalImages && req.additionalImages.length > 0) {
    imageLabel = `\n\nMULTIPLE REFERENCE IMAGES PROVIDED:\n- Image 1 (primary): Front/main view of the product\n${req.additionalImages.map((img, i) => `- Image ${i + 2}${img.label ? ` (${img.label})` : ''}: Additional reference angle`).join('\n')}\nUse ALL reference images to ensure maximum fidelity. Every detail visible in any reference must be preserved.`;
  }

  const prompt = `${modePrompt}\n\nPRODUCT ANALYSIS (verified ground truth extracted from the reference image — do not deviate from this):\n${analysisJson}\n\n${customInstructions ? `STYLING NOTES / CUSTOM INSTRUCTIONS:\n${customInstructions}\n` : ''}REFERENCE IMAGE: Attached. The analysis above was extracted from this reference.${imageLabel}\nIf any discrepancy between analysis text and the image, the image is the source of truth.\nUse this analysis as a checklist: every detail listed must be preserved in the output.${buildRiskConstraints(riskProfile)}`;

  const { imageBase64: genBase64, mimeType: genMime } = await generateWithVertexAI(prompt, req.aspectRatio);
  let generatedBase64 = genBase64;
  let generatedMime = genMime;

  onProgress('Verifying product accuracy against reference...');
  const qc = await verifyProduct(req.sourceImageBase64, req.sourceImageMimeType, generatedBase64, generatedMime, analysisJson);

  let finalQc = qc;
  let previousScore = finalQc.scores.overallFidelity ?? 0;

  while (!finalQc.pass && finalQc.issues.length > 0 && iterationCount <= MAX_EDIT_RETRIES) {
    const currentScore = finalQc.scores.overallFidelity ?? 0;
    if (iterationCount > 1 && currentScore < previousScore + 3) {
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
    if (req.additionalImages) for (const img of req.additionalImages) editParts.push({ inlineData: { mimeType: img.mimeType, data: img.base64 } });

    const retryResponse = await getAI().models.generateContent({
      model: IMAGE_MODEL,
      contents: [{ parts: editParts }],
      config: { systemInstruction: SYSTEM_INSTRUCTION, responseModalities: ['TEXT', 'IMAGE'] },
    });
    const retryPart = retryResponse.candidates?.[0]?.content?.parts?.find((p: any) => p.inlineData?.mimeType?.startsWith('image/'));
    if (!retryPart?.inlineData) break;

    generatedBase64 = retryPart.inlineData.data ?? '';
    generatedMime = retryPart.inlineData.mimeType ?? 'image/png';
    iterationCount++;

    onProgress(`Re-checking after refinement ${iterationCount - 1}...`);
    finalQc = await verifyProduct(req.sourceImageBase64, req.sourceImageMimeType, generatedBase64, generatedMime, analysisJson);
  }

  return {
    id: randomUUID(),
    imageBase64: generatedBase64,
    mimeType: generatedMime,
    timestamp: Date.now(),
    analysisText: analysisJson,
    riskProfile,
    qcScores: finalQc.scores,
    qcPass: finalQc.pass,
    qcIssues: finalQc.issues,
    iterationCount,
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
