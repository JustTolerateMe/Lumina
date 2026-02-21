import { GoogleGenAI } from '@google/genai';
import { GenerationRequest, GenerationResult } from '../types';
import { SYSTEM_INSTRUCTION } from '../prompts/systemInstruction';
import { buildStudioPrompt } from '../prompts/studioPrompt';
import { buildLifestylePrompt } from '../prompts/lifestylePrompt';
import {
  buildAnalysisPrompt,
  buildOnFigurePrompt,
  buildQualityCheckPrompt,
} from '../prompts/onFigurePrompt';
import { buildCampaignPrompt } from '../prompts/campaignPrompt';

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
  switch (req.mode) {
    case 'studio': return buildStudioPrompt(req);
    case 'lifestyle': return buildLifestylePrompt(req);
    case 'on-figure': return buildOnFigurePrompt(req, analysisJson ?? '{}');
    case 'campaign': return buildCampaignPrompt(req);
  }
}

async function generateSingle(req: GenerationRequest): Promise<GenerationResult> {
  const prompt = buildPrompt(req);

  const response = await getAI().models.generateContent({
    model: IMAGE_MODEL,
    contents: [
      {
        parts: [
          { text: prompt },
          {
            inlineData: {
              mimeType: req.sourceImageMimeType,
              data: req.sourceImageBase64,
            },
          },
        ],
      },
    ],
    config: {
      systemInstruction: SYSTEM_INSTRUCTION,
      responseModalities: ['TEXT', 'IMAGE'],
    },
  });

  const imagePart = response.candidates?.[0]?.content?.parts?.find(
    (p) => p.inlineData?.mimeType?.startsWith('image/')
  );

  if (!imagePart?.inlineData) {
    throw new Error('No image returned from Gemini. Try again.');
  }

  return {
    id: crypto.randomUUID(),
    imageBase64: imagePart.inlineData.data ?? '',
    mimeType: imagePart.inlineData.mimeType ?? 'image/png',
    request: req,
    timestamp: Date.now(),
  };
}

async function analyzeGarment(
  imageBase64: string,
  imageMimeType: string
): Promise<string> {
  const response = await getAI().models.generateContent({
    model: TEXT_MODEL,
    contents: [
      {
        parts: [
          { text: buildAnalysisPrompt() },
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

  if (!text) throw new Error('Garment analysis failed.');

  return text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
}

async function checkQuality(
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
          { text: buildQualityCheckPrompt(analysisJson) },
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

async function generateOnFigure(
  req: GenerationRequest,
  onProgress: (step: string) => void
): Promise<GenerationResult> {
  // Step 1: Analyze
  onProgress('Analyzing garment details...');
  const analysisJson = await analyzeGarment(
    req.sourceImageBase64,
    req.sourceImageMimeType
  );

  // Step 2: Generate
  onProgress('Placing garment on model...');
  const promptWithAnalysis = buildOnFigurePrompt(req, analysisJson);

  const generateResponse = await getAI().models.generateContent({
    model: IMAGE_MODEL,
    contents: [
      {
        parts: [
          { text: promptWithAnalysis },
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

  // Step 3: Quality check
  onProgress('Checking garment accuracy...');
  const qc = await checkQuality(
    req.sourceImageBase64, req.sourceImageMimeType,
    generatedBase64, generatedMime,
    analysisJson
  );

  if (!qc.pass && qc.issues.length > 0) {
    onProgress(`Refining: fixing ${qc.issues[0]}...`);

    const retryIssues = qc.issues.join('; ');
    const retryPrompt = `${promptWithAnalysis}

QUALITY CONTROL FEEDBACK — Address these specific issues in this generation:
${retryIssues}
Pay extra attention to resolving these issues while maintaining all other requirements.`;

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

export async function generate(
  req: GenerationRequest,
  onProgress: (step: string) => void = () => { }
): Promise<GenerationResult> {
  if (req.mode === 'on-figure') {
    return generateOnFigure(req, onProgress);
  }
  onProgress('Generating your image...');
  return generateSingle(req);
}
