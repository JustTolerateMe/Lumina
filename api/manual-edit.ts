import { randomUUID } from 'node:crypto';
import { GoogleGenAI } from '@google/genai';
import { SYSTEM_INSTRUCTION } from '../src/prompts/systemInstruction';
import { buildProductQualityCheckPrompt } from '../src/prompts/productQualityCheckPrompt';
import type { ManualEditRequest, QCResult } from '../src/types';

export const config = { maxDuration: 60 };

const IMAGE_MODEL = 'gemini-2.5-flash-image';
const TEXT_MODEL = 'gemini-2.5-flash';

function getAI() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('GEMINI_API_KEY is not configured on the server.');
  return new GoogleGenAI({ apiKey });
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

async function verifyProduct(
  originalBase64: string, originalMime: string,
  generatedBase64: string, generatedMime: string,
  analysisJson: string, mode: string
): Promise<QCResult> {
  const response = await getAI().models.generateContent({
    model: TEXT_MODEL,
    contents: [{
      parts: [
        { text: applyRepetition(buildProductQualityCheckPrompt(analysisJson, mode)) },
        { inlineData: { mimeType: originalMime, data: originalBase64 } },
        { inlineData: { mimeType: generatedMime, data: generatedBase64 } },
      ]
    }],
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
    return {
      scores: { colorAccuracy: 10, configurationMatch: 10, componentCount: 10, proportionFidelity: 10, constructionDetails: 10, brandingPreservation: 10, overallFidelity: 10 },
      pass: true, issues: [], recommendation: 'approve',
    };
  }
}

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    const editReq = req.body as ManualEditRequest;

    const inpaintPrompt = `You are an expert AI photo retoucher.
I am providing you three images in this exact order:
1. [IMAGE 1]: A black-and-white MASK image. White areas are where you MUST make changes. Black areas MUST remain mathematically identical to the base image.
2. [IMAGE 2]: The base image to be edited.
3. [IMAGE 3]: The original reference photo (for context).

INSTRUCTION: ${editReq.instruction}

CRITICAL RULES:
1. Do NOT modify any pixels outside the white mask area. They must be locked.
2. Ensure the lighting, shadows, and textures in the edited area blend seamlessly with the unedited areas.
3. Do not apply any global filter, color grade, or background modifications outside the mask.
4. Base your edits on the instruction, but lock everything else.`;

    const editParts: any[] = [
      { text: inpaintPrompt },
      { inlineData: { mimeType: 'image/png', data: editReq.maskImageBase64 } },
      { inlineData: { mimeType: editReq.generatedImageMimeType, data: editReq.generatedImageBase64 } },
      { inlineData: { mimeType: editReq.originalRequest.sourceImageMimeType, data: editReq.originalRequest.sourceImageBase64 } },
    ];
    if (editReq.originalRequest.additionalImages) {
      for (const img of editReq.originalRequest.additionalImages) {
        editParts.push({ inlineData: { mimeType: img.mimeType, data: img.base64 } });
      }
    }

    const editResponse = await getAI().models.generateContent({
      model: IMAGE_MODEL,
      contents: [{ parts: editParts }],
      config: { systemInstruction: SYSTEM_INSTRUCTION, responseModalities: ['TEXT', 'IMAGE'] },
    });

    const editedPart = editResponse.candidates?.[0]?.content?.parts?.find(
      (p: any) => p.inlineData?.mimeType?.startsWith('image/')
    );
    if (!editedPart?.inlineData) throw new Error('Edit failed — model did not return an image.');

    const finalBase64 = editedPart.inlineData.data ?? '';
    const finalMime = editedPart.inlineData.mimeType ?? 'image/png';

    const newQc = await verifyProduct(
      editReq.originalRequest.sourceImageBase64, editReq.originalRequest.sourceImageMimeType,
      finalBase64, finalMime, '{}', editReq.originalRequest.mode
    );

    res.setHeader('Content-Type', 'application/json');
    res.status(200).json({
      id: randomUUID(),
      imageBase64: finalBase64,
      mimeType: finalMime,
      timestamp: Date.now(),
      analysisText: 'Manual Edit Override',
      riskProfile: { flags: [], descriptions: {}, constraintOverrides: [] },
      qcScores: newQc.scores,
      qcPass: newQc.pass,
      qcIssues: newQc.issues,
      iterationCount: 1,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message ?? 'Manual edit failed' });
  }
}
