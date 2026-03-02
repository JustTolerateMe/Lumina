import { ApparelGenerationRequest } from '../types/index.js';
import { LIFESTYLE_SCENE_PRESETS, MODEL_POSE_PRESETS, SKIN_TONE_DESCRIPTIONS, AGE_GROUP_PRESETS } from './presets.js';
import { buildRealismBlock } from './realismDirectives.js';

export function buildLifestylePrompt(req: ApparelGenerationRequest): string {
  const { garment, model, scene } = req;
  const scenePreset = LIFESTYLE_SCENE_PRESETS[scene ?? 'minimal_indoor'];

  return `A professional lifestyle fashion photograph featuring the garment \
from the attached reference image, worn by a model in a real-world setting.

GARMENT (from reference image):
The garment is a ${garment.type} in ${garment.colorDescription}, \
${garment.material} fabric, ${garment.fit} fit.
${garment.hasLogo ? `Logo/graphic present: ${garment.logoDescription} — must be reproduced exactly.` : ''}

MODEL:
${model.gender} model, ${AGE_GROUP_PRESETS[model.ageGroup ?? 'adult'].description}, \
${SKIN_TONE_DESCRIPTIONS[model.skinTone]}.
Pose: ${MODEL_POSE_PRESETS[model.pose]}.
Natural, authentic expression — genuine and approachable, not rigidly posed.
${AGE_GROUP_PRESETS[model.ageGroup ?? 'adult'].proportionNote}.

SCENE: ${scenePreset.label}
Setting: ${scenePreset.sceneDescription}
Time of day: ${scenePreset.timeOfDay}
Lighting: ${scenePreset.lightingMood}
Activity context: ${scenePreset.sceneActivity}

GARMENT PRESERVATION — CRITICAL:
- Color must exactly match reference: ${garment.colorDescription}
- All logos, prints, graphics preserved exactly as in reference image
- Garment geometry unchanged: silhouette, proportions, hem, sleeves, neckline
- Fabric drape natural and appropriate for ${garment.material} — \
${garment.material === 'denim' ? 'structured and holds shape' :
      garment.material === 'silk' ? 'fluid and flowing' :
        garment.material === 'cotton' ? 'soft natural drape' : 'natural drape'}
- The garment is the hero of this image

PHOTOGRAPHY:
Lens: ${scenePreset.lensType}
Shot: ${scenePreset.shotType}
Depth of field: ${scenePreset.dof}
Color grading: ${scenePreset.colorGrade}
Composition: Rule of thirds. Model positioned to showcase garment fully.

${buildRealismBlock('lifestyle', model.ageGroup ?? 'adult')}

Professional commercial lifestyle fashion photography quality.`;
}
