import { ApparelGenerationRequest } from '../types';
import { MODEL_POSE_PRESETS, SKIN_TONE_DESCRIPTIONS, AGE_GROUP_PRESETS } from './presets';
import { buildRealismBlock } from './realismDirectives';

export function buildAnalysisPrompt(): string {
  return `Analyze the garment in this image and provide a precise technical \
description for use as a fashion photography direction brief.

Return a JSON object with exactly these fields:

{
  "garmentType": "specific garment type",
  "silhouette": "silhouette description",
  "primaryColor": "precise color description — hue, saturation, tone",
  "secondaryColors": ["any additional colors"],
  "material": "visual material assessment",
  "materialWeight": "lightweight/medium/heavy",
  "fitCategory": "oversized/regular/slim/fitted",
  "collarType": "collar/neckline description",
  "sleeveStyle": "sleeve description and length",
  "hemStyle": "hem description",
  "graphicElements": [
    {
      "type": "logo/text/print/embroidery/none",
      "description": "exact description of graphic",
      "position": "exact position on garment",
      "colors": "colors in the graphic"
    }
  ],
  "constructionDetails": "visible stitching, seams, hardware",
  "overallStyle": "casual/smart-casual/formal/streetwear/athletic"
}

Be extremely precise. This is ground truth that will be used to verify \
accuracy of generated images. Return ONLY the JSON object, no other text.`;
}

export function buildOnFigurePrompt(
  req: ApparelGenerationRequest,
  analysisJson: string
): string {
  const { model } = req;
  let analysis: Record<string, unknown>;

  try {
    analysis = JSON.parse(analysisJson);
  } catch {
    analysis = { raw: analysisJson };
  }

  const graphicWarning = (analysis.graphicElements as Array<{ type: string; description: string; position: string }>)
    ?.filter(g => g.type !== 'none')
    .map(g => `- "${g.description}" at ${g.position}: preserve exactly, zero distortion permitted`)
    .join('\n') ?? '';

  return `You are placing the garment from the reference image onto a professional \
fashion model. This is a controlled commercial fashion photography shoot.

GARMENT ANALYSIS (verified ground truth — do not deviate from this):
${analysisJson}

REFERENCE IMAGE: Attached. Use as primary visual reference throughout. \
The analysis above must match what you see. If any discrepancy, the image wins.

MODEL SPECIFICATIONS:
- Age group: ${AGE_GROUP_PRESETS[model.ageGroup ?? 'adult'].description}
- Gender: ${model.gender}
- Skin tone: ${SKIN_TONE_DESCRIPTIONS[model.skinTone]}
- Pose: ${MODEL_POSE_PRESETS[model.pose]}
- Proportions: ${AGE_GROUP_PRESETS[model.ageGroup ?? 'adult'].proportionNote}

PLACEMENT PHYSICS:
The garment is a ${(analysis.garmentType as string) ?? 'garment'} with \
${(analysis.fitCategory as string) ?? 'regular'} fit.
- Shoulder seams must sit precisely at shoulder points
- Garment hem falls at natural position for this garment type
- Sleeve length matches reference exactly
- Fabric drape follows ${(analysis.materialWeight as string) ?? 'medium'} \
weight ${(analysis.material as string) ?? 'fabric'} physics

PRESERVATION RULES — ABSOLUTE:
- Primary color: ${(analysis.primaryColor as string) ?? 'match reference'} — must match reference exactly
- Silhouette: ${(analysis.silhouette as string) ?? 'match reference'} — preserve exactly
${graphicWarning ? `GRAPHIC ELEMENTS — ZERO TOLERANCE FOR MODIFICATION:\n${graphicWarning}` : '- No graphic elements — preserve clean surface exactly'}
- Construction details: ${(analysis.constructionDetails as string) ?? 'preserve all visible details'}
- Do NOT invent new design elements
- Do NOT alter any existing design element
- Do NOT change any color anywhere on the garment

PHOTOGRAPHY:
Background: Clean white studio backdrop (#FFFFFF)
Lighting: Professional three-point studio — two softboxes 45° left/right, \
soft frontal fill, no harsh shadows, no blown highlights
Camera: 85mm portrait lens, straight-on view, full body head to ankle
Sharp focus throughout. Commercial quality.

${buildRealismBlock('studio', model.ageGroup ?? 'adult')}

Produce a professional commercial on-figure fashion photograph that could \
be published directly on a brand's product detail page.`;
}

export function buildQualityCheckPrompt(analysisJson: string): string {
  return `Compare the two images:
- Image 1: Original garment reference (flatlay)
- Image 2: Generated on-figure result

Using this original garment analysis as ground truth:
${analysisJson}

Check and score each dimension from 0–10:

1. COLOR_ACCURACY: Does the garment color in Image 2 exactly match Image 1?
2. GRAPHIC_PRESERVATION: Are all logos/graphics/prints from Image 1 reproduced \
exactly in Image 2? (Score 10 = exact, 0 = missing or distorted)
3. SILHOUETTE_MATCH: Does the garment shape/silhouette match? \
(sleeve length, hem, neckline)
4. TEXTURE_MATCH: Does the fabric texture/material appearance match?
5. OVERALL_FIDELITY: Overall garment accuracy score

Return JSON only:
{
  "scores": {
    "colorAccuracy": 0-10,
    "graphicPreservation": 0-10,
    "silhouetteMatch": 0-10,
    "textureMatch": 0-10,
    "overallFidelity": 0-10
  },
  "pass": true/false,
  "issues": ["list any specific issues found"],
  "recommendation": "approve/regenerate"
}

PASS threshold: all scores >= 7, recommendation = "approve"
FAIL: any score < 7 OR any graphic modification detected`;
}
