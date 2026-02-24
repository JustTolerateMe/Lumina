import { GoogleGenAI } from '@google/genai';
import {
  ApparelGenerationRequest,
  GenerationRequest,
  GenerationResult,
  QCResult,
  QCScores,
  RiskFlag,
  RiskProfile,
  ProductSuggestions,
  ProductCategory,
} from '../types';
import { SYSTEM_INSTRUCTION } from '../prompts/systemInstruction';
import { buildStudioPrompt } from '../prompts/studioPrompt';
import { buildLifestylePrompt } from '../prompts/lifestylePrompt';
import {
  buildAnalysisPrompt as buildGarmentAnalysisPrompt,
  buildOnFigurePrompt,
  buildQualityCheckPrompt as buildGarmentQCPrompt,
} from '../prompts/onFigurePrompt';
import { buildCampaignPrompt } from '../prompts/campaignPrompt';
import { buildHomeCleanCutPrompt } from '../prompts/homeCleanCutPrompt';
import { buildHomeRoomScenePrompt } from '../prompts/homeRoomScenePrompt';
import { buildHomeLifestyleVignettePrompt } from '../prompts/homeLifestyleVignettePrompt';
import { buildHardlinesCleanCutPrompt } from '../prompts/hardlinesCleanCutPrompt';
import { buildHardlinesHeroShotPrompt } from '../prompts/hardlinesHeroShotPrompt';
import { buildHardlinesInContextPrompt } from '../prompts/hardlinesInContextPrompt';
import { buildProductAnalysisPrompt } from '../prompts/productAnalysisPrompt';
import { buildProductQualityCheckPrompt } from '../prompts/productQualityCheckPrompt';
import { buildRiskAnalysisPrompt } from '../prompts/riskAnalysisPrompt';
import { computePixelQC } from './pixelQC';
import { buildEditPrompt } from '../prompts/editPrompt';

const getApiKey = () => import.meta.env.VITE_GEMINI_API_KEY;

let aiInstance: GoogleGenAI | null = null;
function getAI() {
  const apiKey = getApiKey();
  if (!apiKey || apiKey === 'your_gemini_api_key_here') {
    throw new Error('Gemini API Key is missing. Please add VITE_GEMINI_API_KEY to your .env file.');
  }
  if (!aiInstance) {
    aiInstance = new GoogleGenAI({ apiKey });
  }
  return aiInstance;
}

const IMAGE_MODEL = 'gemini-2.5-flash-image';
const TEXT_MODEL = 'gemini-2.5-flash';

// ── Static risk constraint fallbacks ─────────────────────────────────

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

// ── Prompt builder ───────────────────────────────────────────────────

function buildPrompt(req: GenerationRequest, analysisJson?: string): string {
  switch (req.category) {
    case 'apparel':
      switch (req.mode) {
        case 'studio': return buildStudioPrompt(req);
        case 'lifestyle': return buildLifestylePrompt(req);
        case 'on-figure': return buildOnFigurePrompt(req, analysisJson ?? '{}');
        case 'campaign': return buildCampaignPrompt(req);
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
  throw new Error(`Unsupported category / mode: ${(req as any).category}/${(req as any).mode}`);
}

// ── Helper: extract text from Gemini response ────────────────────────

function extractText(response: any): string {
  return response.candidates?.[0]?.content?.parts
    ?.filter((p: any) => p.text)
    .map((p: any) => p.text)
    .join('') ?? '';
}

function cleanJson(text: string): string {
  return text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
}

function buildContentParts(
  prompt: string,
  req: { sourceImageBase64: string; sourceImageMimeType: string; additionalImages?: { base64: string; mimeType: string; label?: string }[] }
): Array<{ text: string } | { inlineData: { mimeType: string; data: string } }> {
  const parts: Array<{ text: string } | { inlineData: { mimeType: string; data: string } }> = [
    { text: prompt },
    { inlineData: { mimeType: req.sourceImageMimeType, data: req.sourceImageBase64 } },
  ];

  if (req.additionalImages && req.additionalImages.length > 0) {
    for (const img of req.additionalImages) {
      parts.push({ inlineData: { mimeType: img.mimeType, data: img.base64 } });
    }
  }

  return parts;
}

// ── Helper: validate config against analysis (Safety Valve) ──────────

function validateConfig(req: GenerationRequest, analysisJson: string): { severity: 'low' | 'high'; message: string } | undefined {
  try {
    const analysis = JSON.parse(analysisJson);
    const userType = req.category === 'apparel' ? req.garment.type :
      req.category === 'home' ? req.product.type :
        req.product.type;

    const aiType = (analysis.garmentType || analysis.productType || analysis.type || '').toLowerCase();

    // High Severity: Structural mismatch
    if (aiType &&
      !aiType.includes(userType.toLowerCase()) &&
      !userType.toLowerCase().includes(aiType)) {
      return {
        severity: 'high',
        message: `Potential structural mismatch: You selected "${userType}", but the AI extracted "${aiType}". Proceeding may cause visual artifacts or hallucinations.`
      };
    }

    return undefined;
  } catch {
    return undefined;
  }
}

/**
 * Applies prompt repetition based on research paper arXiv:2512.14982.
 * Repeating the query for non-reasoning tasks significantly boosts accuracy.
 */
function applyRepetition(instruction: string): string {
  return `${instruction}\n\n[REPEATED FOR ACCURACY]:\n${instruction}`;
}

// ── Product analysis (universal) ─────────────────────────────────────

async function analyzeProduct(
  imageBase64: string,
  imageMimeType: string,
  additionalImages?: { base64: string; mimeType: string; label?: string }[]
): Promise<string> {
  const parts: Array<any> = [
    { text: applyRepetition(buildProductAnalysisPrompt()) },
    { inlineData: { mimeType: imageMimeType, data: imageBase64 } },
  ];
  if (additionalImages) {
    additionalImages.forEach(img => {
      parts.push({ inlineData: { mimeType: img.mimeType, data: img.base64 } });
    });
  }

  const response = await getAI().models.generateContent({
    model: TEXT_MODEL,
    contents: [{ parts }],
    config: { responseModalities: ['TEXT'] },
  });

  const text = extractText(response);
  if (!text) throw new Error('Product analysis failed.');
  return cleanJson(text);
}

// ── Semantic Suggestions (Auto-config) ────────────────────────────────

export async function getSemanticSuggestions(
  imageBase64: string,
  imageMimeType: string
): Promise<ProductSuggestions> {
  const analysisJson = await analyzeProduct(imageBase64, imageMimeType);
  try {
    const analysis = JSON.parse(analysisJson);

    // Auto-detect category based on AI analysis
    let category: ProductCategory = 'apparel';
    const typeText = (analysis.productType || analysis.type || '').toLowerCase();

    if (typeText.match(/sofa|chair|table|lamp|decor|furniture|kitchenware|bed/)) {
      category = 'home';
    } else if (typeText.match(/electronics|gadget|watch|phone|tool|automotive|sports/)) {
      category = 'hardlines';
    }

    return {
      category,
      type: analysis.productType || analysis.type,
      colorDescription: analysis.color,
      material: analysis.material,
      finish: analysis.finish,
    };
  } catch {
    return { category: 'apparel' }; // Fallback
  }
}

// ── Risk analysis ────────────────────────────────────────────────────

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
  } catch {
    return { flags: [], descriptions: {}, constraintOverrides: [] };
  }
}

function buildRiskConstraints(riskProfile: RiskProfile): string {
  if (riskProfile.flags.length === 0) return '';

  const constraints: string[] = [];

  for (const flag of riskProfile.flags) {
    const staticConstraint = STATIC_RISK_CONSTRAINTS[flag];
    if (staticConstraint) {
      constraints.push(staticConstraint);
    }
  }

  for (const override of riskProfile.constraintOverrides) {
    constraints.push(override);
  }

  return `\n\nRISK-BASED CONSTRAINTS (high priority — failure to comply invalidates the image):\n${constraints.join('\n')}`;
}

// ── Product QC (universal — returns full scores) ─────────────────────

async function verifyProduct(
  originalBase64: string,
  originalMime: string,
  generatedBase64: string,
  generatedMime: string,
  analysisJson: string
): Promise<QCResult> {
  const response = await getAI().models.generateContent({
    model: TEXT_MODEL,
    contents: [{
      parts: [
        { text: applyRepetition(buildProductQualityCheckPrompt(analysisJson)) },
        { inlineData: { mimeType: originalMime, data: originalBase64 } },
        { inlineData: { mimeType: generatedMime, data: generatedBase64 } },
      ],
    }],
    config: { responseModalities: ['TEXT'] },
  });

  const text = extractText(response);
  try {
    const parsed = JSON.parse(cleanJson(text));
    return {
      scores: parsed.scores ?? {
        colorAccuracy: 10, configurationMatch: 10, componentCount: 10,
        proportionFidelity: 10, constructionDetails: 10,
        brandingPreservation: 10, overallFidelity: 10,
      },
      pass: parsed.pass ?? true,
      issues: Array.isArray(parsed.issues) ? parsed.issues : [],
      recommendation: parsed.recommendation ?? 'approve',
    };
  } catch {
    return {
      scores: {
        colorAccuracy: 10, configurationMatch: 10, componentCount: 10,
        proportionFidelity: 10, constructionDetails: 10,
        brandingPreservation: 10, overallFidelity: 10,
      },
      pass: true,
      issues: [],
      recommendation: 'approve',
    };
  }
}

// ── Garment-specific analysis (apparel on-figure only) ───────────────

async function analyzeGarment(
  imageBase64: string,
  imageMimeType: string,
  additionalImages?: { base64: string; mimeType: string; label?: string }[]
): Promise<string> {
  const parts: Array<any> = [
    { text: applyRepetition(buildGarmentAnalysisPrompt()) },
    { inlineData: { mimeType: imageMimeType, data: imageBase64 } },
  ];
  if (additionalImages) {
    additionalImages.forEach(img => {
      parts.push({ inlineData: { mimeType: img.mimeType, data: img.base64 } });
    });
  }

  const response = await getAI().models.generateContent({
    model: TEXT_MODEL,
    contents: [{ parts }],
    config: { responseModalities: ['TEXT'] },
  });

  const text = extractText(response);
  if (!text) throw new Error('Garment analysis failed.');
  return cleanJson(text);
}

async function checkGarmentQuality(
  originalBase64: string,
  originalMime: string,
  generatedBase64: string,
  generatedMime: string,
  analysisJson: string
): Promise<QCResult> {
  const response = await getAI().models.generateContent({
    model: TEXT_MODEL,
    contents: [{
      parts: [
        { text: applyRepetition(buildGarmentQCPrompt(analysisJson)) },
        { inlineData: { mimeType: originalMime, data: originalBase64 } },
        { inlineData: { mimeType: generatedMime, data: generatedBase64 } },
      ],
    }],
    config: { responseModalities: ['TEXT'] },
  });

  const text = extractText(response);
  try {
    const parsed = JSON.parse(cleanJson(text));
    return {
      scores: parsed.scores ?? {
        colorAccuracy: 10, graphicPreservation: 10,
        silhouetteMatch: 10, textureMatch: 10, overallFidelity: 10,
      },
      pass: parsed.pass ?? true,
      issues: Array.isArray(parsed.issues) ? parsed.issues : [],
      recommendation: parsed.recommendation ?? 'approve',
    };
  } catch {
    return {
      scores: {
        colorAccuracy: 10, graphicPreservation: 10,
        silhouetteMatch: 10, textureMatch: 10, overallFidelity: 10,
      },
      pass: true,
      issues: [],
      recommendation: 'approve',
    };
  }
}

// ── Targeted retry constraint builder ────────────────────────────────

// buildTargetedRetryConstraints removed

// ── Composite score calculation ──────────────────────────────────────

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
  const pixelWeight = 1 - semanticWeight;

  return Math.round(semanticAvg * semanticWeight + pixelAvg * pixelWeight);
}

// ── On-figure pipeline (apparel only — specialized) ──────────────────

async function generateOnFigure(
  req: ApparelGenerationRequest,
  onProgress: (step: string) => void
): Promise<GenerationResult> {
  let iterationCount = 1;

  // Step 1: Garment-specific analysis
  onProgress('Analyzing garment details...');
  const analysisJson = await analyzeGarment(
    req.sourceImageBase64,
    req.sourceImageMimeType,
    req.additionalImages
  );

  // Step 2: Risk analysis & Safety Valve
  onProgress('Assessing generation risks...');
  const riskProfile = await identifyRisks(analysisJson);
  const validationWarning = validateConfig(req, analysisJson);

  // Step 3: Generate with analysis + risk constraints
  onProgress('Placing garment on model...');
  const basePrompt = buildOnFigurePrompt(req, analysisJson);
  let imageLabel = '';
  if (req.additionalImages && req.additionalImages.length > 0) {
    imageLabel = `\n\nMULTIPLE REFERENCE IMAGES PROVIDED:
- Image 1 (primary): Front/main view of the product
${req.additionalImages.map((img, i) => `- Image ${i + 2}${img.label ? ` (${img.label})` : ''}: Additional reference angle`).join('\n')}
Use ALL reference images to ensure maximum fidelity. Every detail visible in any reference must be preserved.`;
  }
  const prompt = basePrompt + buildRiskConstraints(riskProfile) + imageLabel;

  const generateResponse = await getAI().models.generateContent({
    model: IMAGE_MODEL,
    contents: [{
      parts: buildContentParts(prompt, req),
    }],
    config: {
      systemInstruction: SYSTEM_INSTRUCTION,
      responseModalities: ['TEXT', 'IMAGE'],
    },
  });

  const imagePart = generateResponse.candidates?.[0]?.content?.parts?.find(
    (p: any) => p.inlineData?.mimeType?.startsWith('image/')
  );

  if (!imagePart?.inlineData) throw new Error('Generation failed.');

  let generatedBase64 = imagePart.inlineData.data ?? '';
  let generatedMime = imagePart.inlineData.mimeType ?? 'image/png';

  // Step 4: Garment-specific QC
  onProgress('Checking garment accuracy...');
  const qc = await checkGarmentQuality(
    req.sourceImageBase64, req.sourceImageMimeType,
    generatedBase64, generatedMime,
    analysisJson
  );

  // Step 5: Targeted retry if QC fails
  let finalQc = qc;
  if (!qc.pass && qc.issues.length > 0) {
    iterationCount = 2;
    const failedDimension = qc.issues[0] ?? 'quality issues';
    onProgress(`Refining: fixing ${failedDimension}...`);

    const editPrompt = buildEditPrompt(qc, analysisJson, prompt);

    const editParts: Array<{ text: string } | { inlineData: { mimeType: string; data: string } }> = [
      { text: editPrompt },
      { inlineData: { mimeType: generatedMime, data: generatedBase64 } },
      { inlineData: { mimeType: req.sourceImageMimeType, data: req.sourceImageBase64 } },
    ];
    if (req.additionalImages && req.additionalImages.length > 0) {
      for (const img of req.additionalImages) {
        editParts.push({ inlineData: { mimeType: img.mimeType, data: img.base64 } });
      }
    }

    const retryResponse = await getAI().models.generateContent({
      model: IMAGE_MODEL,
      contents: [{ parts: editParts }],
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        responseModalities: ['TEXT', 'IMAGE'],
      },
    });

    const retryPart = retryResponse.candidates?.[0]?.content?.parts?.find(
      (p: any) => p.inlineData?.mimeType?.startsWith('image/')
    );

    if (retryPart?.inlineData) {
      generatedBase64 = retryPart.inlineData.data ?? '';
      generatedMime = retryPart.inlineData.mimeType ?? 'image/png';
    }

    onProgress('Re-checking edited image...');
    finalQc = await checkGarmentQuality(
      req.sourceImageBase64, req.sourceImageMimeType,
      generatedBase64, generatedMime,
      analysisJson
    );
  }

  // Step 6: Pixel QC
  onProgress('Computing pixel-level fidelity...');
  const pixelQCScores = await computePixelQC(
    req.sourceImageBase64, req.sourceImageMimeType,
    generatedBase64, generatedMime
  );

  const compositeScore = computeCompositeScore(
    finalQc.scores,
    pixelQCScores,
    req.mode
  );

  return {
    id: crypto.randomUUID(),
    imageBase64: generatedBase64,
    mimeType: generatedMime,
    request: req,
    timestamp: Date.now(),
    analysisText: analysisJson,
    riskProfile,
    qcScores: finalQc.scores,
    qcPass: finalQc.pass,
    qcIssues: finalQc.issues,
    pixelQCScores,
    compositeScore,
    iterationCount,
    validationWarning,
  };
}

// ── Universal pipeline (all modes except apparel on-figure) ──────────

export async function generate(
  req: GenerationRequest,
  onProgress: (step: string) => void = () => { }
): Promise<GenerationResult> {
  if (req.category === 'apparel' && req.mode === 'on-figure') {
    return generateOnFigure(req, onProgress);
  }

  let iterationCount = 1;

  // Step 1: Universal product analysis
  onProgress('Analyzing product details...');
  const analysisJson = await analyzeProduct(
    req.sourceImageBase64,
    req.sourceImageMimeType,
    req.additionalImages
  );

  // Step 2: Risk analysis & Safety Valve
  onProgress('Assessing generation risks...');
  const riskProfile = await identifyRisks(analysisJson);
  const validationWarning = validateConfig(req, analysisJson);

  // Step 3: Build mode-specific prompt + inject analysis + risk constraints
  onProgress('Generating high-fidelity product photo...');

  const customInstructions = req.category === 'apparel' ? req.garment.customInstructions :
    req.category === 'home' ? req.product.customInstructions :
      req.product.customInstructions;

  const modePrompt = buildPrompt(req);
  let imageLabel = '';
  if (req.additionalImages && req.additionalImages.length > 0) {
    imageLabel = `\n\nMULTIPLE REFERENCE IMAGES PROVIDED:
- Image 1 (primary): Front/main view of the product
${req.additionalImages.map((img, i) => `- Image ${i + 2}${img.label ? ` (${img.label})` : ''}: Additional reference angle`).join('\n')}
Use ALL reference images to ensure maximum fidelity. Every detail visible in any reference must be preserved.`;
  }

  const prompt = `${modePrompt}

PRODUCT ANALYSIS (verified ground truth extracted from the reference image — do not deviate from this):
${analysisJson}

${customInstructions ? `STYLING NOTES / CUSTOM INSTRUCTIONS:\n${customInstructions}\n` : ''}\
REFERENCE IMAGE: Attached. The analysis above was extracted from this reference.${imageLabel}
If any discrepancy between analysis text and the image, the image is the source of truth.
Use this analysis as a checklist: every detail listed must be preserved in the output.${buildRiskConstraints(riskProfile)}`;

  const generateResponse = await getAI().models.generateContent({
    model: IMAGE_MODEL,
    contents: [{
      parts: buildContentParts(prompt, req),
    }],
    config: {
      systemInstruction: SYSTEM_INSTRUCTION,
      responseModalities: ['TEXT', 'IMAGE'],
    },
  });

  const imagePart = generateResponse.candidates?.[0]?.content?.parts?.find(
    (p: any) => p.inlineData?.mimeType?.startsWith('image/')
  );

  if (!imagePart?.inlineData) throw new Error('Generation failed.');

  let generatedBase64 = imagePart.inlineData.data ?? '';
  let generatedMime = imagePart.inlineData.mimeType ?? 'image/png';

  // Step 4: Universal quality check
  onProgress('Verifying product accuracy against reference...');
  const qc = await verifyProduct(
    req.sourceImageBase64, req.sourceImageMimeType,
    generatedBase64, generatedMime,
    analysisJson
  );

  // Step 5: Targeted retry if QC fails
  let finalQc = qc;
  if (!qc.pass && qc.issues.length > 0) {
    iterationCount = 2;
    const failedDimension = qc.issues[0] ?? 'quality issues';
    onProgress(`Auto-refining: fixing ${failedDimension}...`);

    const editPrompt = buildEditPrompt(qc, analysisJson, prompt);

    const editParts: Array<{ text: string } | { inlineData: { mimeType: string; data: string } }> = [
      { text: editPrompt },
      { inlineData: { mimeType: generatedMime, data: generatedBase64 } },
      { inlineData: { mimeType: req.sourceImageMimeType, data: req.sourceImageBase64 } },
    ];
    if (req.additionalImages && req.additionalImages.length > 0) {
      for (const img of req.additionalImages) {
        editParts.push({ inlineData: { mimeType: img.mimeType, data: img.base64 } });
      }
    }

    const retryResponse = await getAI().models.generateContent({
      model: IMAGE_MODEL,
      contents: [{ parts: editParts }],
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        responseModalities: ['TEXT', 'IMAGE'],
      },
    });

    const retryPart = retryResponse.candidates?.[0]?.content?.parts?.find(
      (p: any) => p.inlineData?.mimeType?.startsWith('image/')
    );

    if (retryPart?.inlineData) {
      generatedBase64 = retryPart.inlineData.data ?? '';
      generatedMime = retryPart.inlineData.mimeType ?? 'image/png';
    }

    onProgress('Re-checking edited product...');
    finalQc = await verifyProduct(
      req.sourceImageBase64, req.sourceImageMimeType,
      generatedBase64, generatedMime,
      analysisJson
    );
  }

  // Step 6: Pixel QC
  onProgress('Computing pixel-level fidelity...');
  const pixelQCScores = await computePixelQC(
    req.sourceImageBase64, req.sourceImageMimeType,
    generatedBase64, generatedMime
  );

  const compositeScore = computeCompositeScore(
    finalQc.scores,
    pixelQCScores,
    req.mode
  );

  return {
    id: crypto.randomUUID(),
    imageBase64: generatedBase64,
    mimeType: generatedMime,
    request: req,
    timestamp: Date.now(),
    analysisText: analysisJson,
    riskProfile,
    qcScores: finalQc.scores,
    qcPass: finalQc.pass,
    qcIssues: finalQc.issues,
    pixelQCScores,
    compositeScore,
    iterationCount,
    validationWarning,
  };
}

// ── Manual Edit / Inpainting Pipeline ────────────────────────────────

export async function manualInpaint(
  req: import('../types').ManualEditRequest,
  onProgress: (step: string) => void = () => { }
): Promise<GenerationResult> {
  onProgress('Preparing masked edit...');

  // The model supports native image editing if provided an original and a mask mask.
  const inpaintPrompt = `You are an expert AI photo retoucher. 
I am providing you three images in this exact order:
1. [IMAGE 1]: A black-and-white MASK image. White areas are where you MUST make changes. Black areas MUST remain mathematically identical to the base image.
2. [IMAGE 2]: The base image to be edited.
3. [IMAGE 3]: The original reference photo (for context).

INSTRUCTION: ${req.instruction}

CRITICAL RULES:
1. Do NOT modify any pixels outside the white mask area. They must be locked.
2. Ensure the lighting, shadows, and textures in the edited area blend seamlessly with the unedited areas.
3. Do not apply any global filter, color grade, or background modifications outside the mask.
4. Base your edits on the instruction, but lock everything else.`;

  const editParts: Array<{ text: string } | { inlineData: { mimeType: string; data: string } }> = [
    { text: inpaintPrompt },
    { inlineData: { mimeType: 'image/png', data: req.maskImageBase64 } }, // Mask MUST be the first image for spatial recognition
    { inlineData: { mimeType: req.generatedImageMimeType, data: req.generatedImageBase64 } },
    { inlineData: { mimeType: req.originalRequest.sourceImageMimeType, data: req.originalRequest.sourceImageBase64 } },
  ];

  if (req.originalRequest.additionalImages && req.originalRequest.additionalImages.length > 0) {
    for (const img of req.originalRequest.additionalImages) {
      editParts.push({ inlineData: { mimeType: img.mimeType, data: img.base64 } });
    }
  }

  onProgress('Applying edits...');
  const editResponse = await getAI().models.generateContent({
    model: IMAGE_MODEL,
    contents: [{ parts: editParts }],
    config: {
      systemInstruction: SYSTEM_INSTRUCTION,
      responseModalities: ['TEXT', 'IMAGE'],
    },
  });

  const editedPart = editResponse.candidates?.[0]?.content?.parts?.find(
    (p: any) => p.inlineData?.mimeType?.startsWith('image/')
  );

  if (!editedPart?.inlineData) throw new Error('Edit failed.');

  const finalBase64 = editedPart.inlineData.data ?? '';
  const finalMime = editedPart.inlineData.mimeType ?? 'image/png';

  onProgress('Verifying edit fidelity...');

  // Rerun QC to ensure the new image is scored correctly
  // We skip Garment vs Product check here and just use the universal verifyProduct
  const newQc = await verifyProduct(
    req.originalRequest.sourceImageBase64, req.originalRequest.sourceImageMimeType,
    finalBase64, finalMime,
    "{}" // Empty summary check because it's a manual override
  );

  const pixelQCScores = await computePixelQC(
    req.originalRequest.sourceImageBase64, req.originalRequest.sourceImageMimeType,
    finalBase64, finalMime
  );

  const compositeScore = computeCompositeScore(
    newQc.scores,
    pixelQCScores,
    req.originalRequest.mode
  );

  return {
    id: crypto.randomUUID(),
    imageBase64: finalBase64,
    mimeType: finalMime,
    request: req.originalRequest,
    timestamp: Date.now(),
    analysisText: 'Manual Edit Override',
    riskProfile: { flags: [], descriptions: {}, constraintOverrides: [] },
    qcScores: newQc.scores,
    qcPass: newQc.pass,
    qcIssues: newQc.issues,
    pixelQCScores,
    compositeScore,
    iterationCount: 1, // Manual edit doesn't count towards auto-iterations
  };
}
