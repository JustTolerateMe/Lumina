import { GoogleGenAI } from '@google/genai';
import {
  ApparelGenerationRequest,
  GenerationRequest,
  GenerationResult,
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

function buildPrompt(req: GenerationRequest, analysisJson?: string): string {
  switch (req.category) {
    case 'apparel':
      switch (req.mode) {
        case 'studio': return buildStudioPrompt(req);
        case 'lifestyle': return buildLifestylePrompt(req);
        case 'on-figure': return buildOnFigurePrompt(req, analysisJson ?? '{}');
        case 'campaign': return buildCampaignPrompt(req);
      }
    case 'home':
      switch (req.mode) {
        case 'home-clean-cut': return buildHomeCleanCutPrompt(req);
        case 'home-room-scene': return buildHomeRoomScenePrompt(req);
        case 'home-lifestyle-vignette': return buildHomeLifestyleVignettePrompt(req);
      }
    case 'hardlines':
      switch (req.mode) {
        case 'hardlines-clean-cut': return buildHardlinesCleanCutPrompt(req);
        case 'hardlines-hero-shot': return buildHardlinesHeroShotPrompt(req);
        case 'hardlines-in-context': return buildHardlinesInContextPrompt(req);
      }
  }
  throw new Error(`Unsupported category / mode: ${(req as any).category}/${(req as any).mode}`);
}


async function analyzeProduct(
  imageBase64: string,
  imageMimeType: string
): Promise<string> {
  const response = await getAI().models.generateContent({
    model: TEXT_MODEL,
    contents: [
      {
        parts: [
          { text: buildProductAnalysisPrompt() },
          { inlineData: { mimeType: imageMimeType, data: imageBase64 } },
        ],
      },
    ],
    config: {
      responseModalities: ['TEXT'],
    },
  });

  const text = response.candidates?.[0]?.content?.parts
    ?.filter((p: any) => p.text)
    .map((p: any) => p.text)
    .join('');

  if (!text) throw new Error('Product analysis failed.');

  return text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
}

async function verifyProduct(
  originalBase64: string,
  originalMime: string,
  generatedBase64: string,
  generatedMime: string,
  analysisJson: string
): Promise<{ pass: boolean; issues: string[] }> {
  const response = await getAI().models.generateContent({
    model: TEXT_MODEL,
    contents: [
      {
        parts: [
          { text: buildProductQualityCheckPrompt(analysisJson) },
          { inlineData: { mimeType: originalMime, data: originalBase64 } },
          { inlineData: { mimeType: generatedMime, data: generatedBase64 } },
        ],
      },
    ],
    config: {
      responseModalities: ['TEXT'],
    },
  });

  const text = response.candidates?.[0]?.content?.parts
    ?.filter((p: any) => p.text)
    .map((p: any) => p.text)
    .join('') ?? '{}';

  try {
    const clean = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    return JSON.parse(clean);
  } catch {
    return { pass: true, issues: [] };
  }
}

// ── Garment-specific analysis (apparel on-figure only) ──────────────

async function analyzeGarment(
  imageBase64: string,
  imageMimeType: string
): Promise<string> {
  const response = await getAI().models.generateContent({
    model: TEXT_MODEL,
    contents: [
      {
        parts: [
          { text: buildGarmentAnalysisPrompt() },
          { inlineData: { mimeType: imageMimeType, data: imageBase64 } },
        ],
      },
    ],
    config: { responseModalities: ['TEXT'] },
  });

  const text = response.candidates?.[0]?.content?.parts
    ?.filter((p: any) => p.text)
    .map((p: any) => p.text)
    .join('');

  if (!text) throw new Error('Garment analysis failed.');
  return text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
}

async function checkGarmentQuality(
  originalBase64: string,
  originalMime: string,
  generatedBase64: string,
  generatedMime: string,
  analysisJson: string
): Promise<{ pass: boolean; issues: string[] }> {
  const response = await getAI().models.generateContent({
    model: TEXT_MODEL,
    contents: [
      {
        parts: [
          { text: buildGarmentQCPrompt(analysisJson) },
          { inlineData: { mimeType: originalMime, data: originalBase64 } },
          { inlineData: { mimeType: generatedMime, data: generatedBase64 } },
        ],
      },
    ],
    config: { responseModalities: ['TEXT'] },
  });

  const text = response.candidates?.[0]?.content?.parts
    ?.filter((p: any) => p.text)
    .map((p: any) => p.text)
    .join('') ?? '{}';

  try {
    const clean = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    return JSON.parse(clean);
  } catch {
    return { pass: true, issues: [] };
  }
}

// ── On-figure pipeline (apparel only — 3-step specialized) ──────────

async function generateOnFigure(
  req: ApparelGenerationRequest,
  onProgress: (step: string) => void
): Promise<GenerationResult> {
  // Step 1: Garment-specific analysis
  onProgress('Analyzing garment details...');
  const analysisJson = await analyzeGarment(
    req.sourceImageBase64,
    req.sourceImageMimeType
  );

  // Step 2: Generate with analysis
  onProgress('Placing garment on model...');
  const prompt = buildOnFigurePrompt(req, analysisJson);

  const generateResponse = await getAI().models.generateContent({
    model: IMAGE_MODEL,
    contents: [
      {
        parts: [
          { text: prompt },
          { inlineData: { mimeType: req.sourceImageMimeType, data: req.sourceImageBase64 } },
        ],
      },
    ],
    config: {
      systemInstruction: SYSTEM_INSTRUCTION,
      responseModalities: ['TEXT', 'IMAGE'],
    },
  });

  const imagePart = generateResponse.candidates?.[0]?.content?.parts?.find(
    (p: any) => p.inlineData?.mimeType?.startsWith('image/')
  );

  if (!imagePart?.inlineData) throw new Error('Generation failed.');

  const generatedBase64 = imagePart.inlineData.data ?? '';
  const generatedMime = imagePart.inlineData.mimeType ?? 'image/png';

  // Step 3: Garment-specific QC
  onProgress('Checking garment accuracy...');
  const qc = await checkGarmentQuality(
    req.sourceImageBase64, req.sourceImageMimeType,
    generatedBase64, generatedMime,
    analysisJson
  );

  if (!qc.pass && qc.issues.length > 0) {
    onProgress(`Refining: fixing ${qc.issues[0]}...`);

    const retryPrompt = `${prompt}\n\nQUALITY CONTROL FEEDBACK — Address these specific issues:\n${qc.issues.join('; ')}\nPay extra attention to resolving these issues while maintaining all other requirements.`;

    const retryResponse = await getAI().models.generateContent({
      model: IMAGE_MODEL,
      contents: [
        {
          parts: [
            { text: retryPrompt },
            { inlineData: { mimeType: req.sourceImageMimeType, data: req.sourceImageBase64 } },
          ],
        },
      ],
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        responseModalities: ['TEXT', 'IMAGE'],
      },
    });

    const retryPart = retryResponse.candidates?.[0]?.content?.parts?.find(
      (p: any) => p.inlineData?.mimeType?.startsWith('image/')
    );

    if (retryPart?.inlineData) {
      return {
        id: crypto.randomUUID(),
        imageBase64: retryPart.inlineData.data ?? '',
        mimeType: retryPart.inlineData.mimeType ?? 'image/png',
        request: req,
        timestamp: Date.now(),
        analysisText: analysisJson,
      };
    }
  }

  return {
    id: crypto.randomUUID(),
    imageBase64: generatedBase64,
    mimeType: generatedMime,
    request: req,
    timestamp: Date.now(),
    analysisText: analysisJson,
  };
}

// ── Universal pipeline (all modes except apparel on-figure) ─────────

export async function generate(
  req: GenerationRequest,
  onProgress: (step: string) => void = () => { }
): Promise<GenerationResult> {
  // Apparel on-figure uses specialized garment pipeline
  if (req.category === 'apparel' && req.mode === 'on-figure') {
    return generateOnFigure(req, onProgress);
  }

  // Step 1: Universal product analysis
  onProgress('Analyzing product details...');
  const analysisJson = await analyzeProduct(
    req.sourceImageBase64,
    req.sourceImageMimeType
  );

  // Step 2: Build mode-specific prompt + inject analysis as ground truth
  onProgress('Generating high-fidelity product photo...');

  const customInstructions = req.category === 'apparel' ? req.garment.customInstructions :
    req.category === 'home' ? req.product.customInstructions :
      req.product.customInstructions;

  const modePrompt = buildPrompt(req);
  const prompt = `${modePrompt}

PRODUCT ANALYSIS (verified ground truth extracted from the reference image — do not deviate from this):
${analysisJson}

${customInstructions ? `STYLING NOTES / CUSTOM INSTRUCTIONS:
${customInstructions}
` : ''}

REFERENCE IMAGE: Attached. The analysis above was extracted from this reference.
If any discrepancy between analysis text and the image, the image is the source of truth.
Use this analysis as a checklist: every detail listed must be preserved in the output.`;

  const generateResponse = await getAI().models.generateContent({
    model: IMAGE_MODEL,
    contents: [
      {
        parts: [
          { text: prompt },
          { inlineData: { mimeType: req.sourceImageMimeType, data: req.sourceImageBase64 } },
        ],
      },
    ],
    config: {
      systemInstruction: SYSTEM_INSTRUCTION,
      responseModalities: ['TEXT', 'IMAGE'],
    },
  });

  const imagePart = generateResponse.candidates?.[0]?.content?.parts?.find(
    (p: any) => p.inlineData?.mimeType?.startsWith('image/')
  );

  if (!imagePart?.inlineData) throw new Error('Generation failed.');

  const generatedBase64 = imagePart.inlineData.data ?? '';
  const generatedMime = imagePart.inlineData.mimeType ?? 'image/png';

  // Step 3: Universal quality check
  onProgress('Verifying product accuracy against reference...');
  const qc = await verifyProduct(
    req.sourceImageBase64, req.sourceImageMimeType,
    generatedBase64, generatedMime,
    analysisJson
  );

  // Step 4: Auto-retry if QC fails
  if (!qc.pass && qc.issues.length > 0) {
    onProgress(`Auto-refining: fixing ${qc.issues[0]}...`);

    const retryPrompt = `${prompt}\n\nQUALITY CONTROL FEEDBACK — Address these specific accuracy issues:\n${qc.issues.join('; ')}\nMaintain 100% fidelity to the reference image while resolving these points.`;

    const retryResponse = await getAI().models.generateContent({
      model: IMAGE_MODEL,
      contents: [
        {
          parts: [
            { text: retryPrompt },
            { inlineData: { mimeType: req.sourceImageMimeType, data: req.sourceImageBase64 } },
          ],
        },
      ],
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        responseModalities: ['TEXT', 'IMAGE'],
      },
    });

    const retryPart = retryResponse.candidates?.[0]?.content?.parts?.find(
      (p: any) => p.inlineData?.mimeType?.startsWith('image/')
    );

    if (retryPart?.inlineData) {
      return {
        id: crypto.randomUUID(),
        imageBase64: retryPart.inlineData.data ?? '',
        mimeType: retryPart.inlineData.mimeType ?? 'image/png',
        request: req,
        timestamp: Date.now(),
        analysisText: analysisJson,
      };
    }
  }

  return {
    id: crypto.randomUUID(),
    imageBase64: generatedBase64,
    mimeType: generatedMime,
    request: req,
    timestamp: Date.now(),
    analysisText: analysisJson,
  };
}
