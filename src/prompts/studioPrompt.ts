import { ApparelGenerationRequest } from '../types';
import { MODEL_POSE_PRESETS, SKIN_TONE_DESCRIPTIONS } from './presets';

export function buildStudioPrompt(req: ApparelGenerationRequest): string {
  const { garment, model } = req;

  return `A professional e-commerce product photograph of the garment shown \
in the attached reference image.

GARMENT IDENTIFICATION:
The reference image shows a ${garment.type} in ${garment.colorDescription}, \
made from ${garment.material} fabric. Fit category: ${garment.fit}.
${garment.hasLogo ? `IMPORTANT: This garment has a logo/graphic: ${garment.logoDescription}. This must be reproduced exactly.` : ''}

MODEL PLACEMENT:
Place this exact garment on a ${model.gender} model with ${SKIN_TONE_DESCRIPTIONS[model.skinTone]}, \
${MODEL_POSE_PRESETS[model.pose]}. \
The model should have natural, professional fashion model proportions and a \
neutral, clean expression.

GARMENT PRESERVATION — NON-NEGOTIABLE:
- The garment color must exactly match the reference image: ${garment.colorDescription}
- All stitching, seams, and construction details must be preserved exactly as visible
- Maintain exact sleeve length, hem length, and neckline shape from reference
- Fabric texture must visually match ${garment.material} as shown in reference
${garment.hasLogo ? `- The logo/graphic (${garment.logoDescription}) must appear EXACTLY as in the reference — same position, same size, same design, no distortion` : ''}
- Do NOT invent new wrinkles, distortions, or design elements
- Do NOT blur, smooth, or alter any surface detail

PHOTOGRAPHY SETUP:
- Background: Pure white (#FFFFFF), seamless studio backdrop, no shadows on background
- Lighting: Three-point studio lighting — two large softboxes at 45° angles \
(left and right), soft fill light from front — eliminating all harsh shadows, \
no blown-out highlights
- Camera: 85mm portrait lens equivalent, straight-on front view
- Framing: Full body visible, from top of head to ankle, centered in frame
- No props, no accessories, no environmental elements
- Ultra-sharp focus throughout, especially on garment surface details

OUTPUT SPECIFICATION:
Commercial retail e-commerce photography quality. \
This image must meet Amazon main image compliance standards: \
white background, product clearly visible, professional quality.`;
}
