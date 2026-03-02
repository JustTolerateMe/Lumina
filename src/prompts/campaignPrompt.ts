import { ApparelGenerationRequest } from '../types/index.js';
import { CAMPAIGN_PRESETS, SKIN_TONE_DESCRIPTIONS, AGE_GROUP_PRESETS } from './presets.js';
import { buildRealismBlock } from './realismDirectives.js';

export function buildCampaignPrompt(req: ApparelGenerationRequest): string {
  const { garment, model, campaign } = req;
  const preset = CAMPAIGN_PRESETS[campaign ?? 'minimalist_luxury'];

  return `A high-fashion editorial campaign photograph featuring the garment \
from the reference image. This is a premium brand campaign shot.

CAMPAIGN STYLE: ${preset.label}
${preset.moodDescription}

GARMENT (from reference — must be reproduced exactly):
${garment.type} in ${garment.colorDescription}, ${garment.material}.
${garment.hasLogo ? `Logo/graphic: ${garment.logoDescription} — reproduce with zero modification.` : ''}
Fit: ${garment.fit}.

MODEL:
${model.gender} model, ${AGE_GROUP_PRESETS[model.ageGroup ?? 'adult'].description}, \
${SKIN_TONE_DESCRIPTIONS[model.skinTone]}.
Pose: ${preset.poseDescription}
${AGE_GROUP_PRESETS[model.ageGroup ?? 'adult'].proportionNote}.

PHOTOGRAPHY:
${preset.photographyDescription}

GARMENT PRESERVATION — NON-NEGOTIABLE:
- Exact color match to reference: ${garment.colorDescription}
- All logos, prints, and graphics reproduced exactly — zero distortion permitted
- Silhouette and proportions unchanged from reference
- The garment is the hero despite the dramatic lighting and composition

MOOD: ${preset.moodDescription}

${buildRealismBlock('campaign', model.ageGroup ?? 'adult')}

Premium fashion campaign photography quality. Magazine and advertising ready.`;
}
