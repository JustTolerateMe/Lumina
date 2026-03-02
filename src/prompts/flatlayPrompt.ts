import { ApparelGenerationRequest } from '../types/index.js';
import { FLATLAY_SURFACE_PRESETS } from './presets.js';

export function buildFlatLayPrompt(req: ApparelGenerationRequest): string {
  const { garment } = req;
  const surface = FLATLAY_SURFACE_PRESETS[req.flatlay ?? 'pure_white'] ?? FLATLAY_SURFACE_PRESETS['pure_white']!;

  return `A professional top-down flatlay product photograph of the garment \
from the attached reference image, laid flat on a styled surface.

GARMENT (from reference — must be reproduced exactly):
${garment.type} in ${garment.colorDescription}, ${garment.material} fabric, ${garment.fit} fit.
${garment.hasLogo ? `Logo/graphic: ${garment.logoDescription} — reproduce with zero modification, exact position and scale.` : ''}

FLATLAY ARRANGEMENT:
- The garment is laid FLAT on the surface — not on a hanger, not on a mannequin, not on a person
- Spread open naturally to show the full silhouette: front of garment fully visible
- Sleeves (if applicable) positioned symmetrically, slightly angled outward
- Collar/neckline naturally shaped as it would rest when laid flat
- Hem visible and straight
- Natural fabric relaxation — gentle, realistic creases where the material would \
naturally settle when laid down, NOT artificially pressed or wrinkled
- ${garment.material === 'denim' ? 'Denim holds structure — minimal creasing, stiff flatlay with natural body' :
    garment.material === 'silk' ? 'Silk pools softly — gentle flowing folds at edges, luxurious drape even when flat' :
    garment.material === 'wool' ? 'Wool has body — slight natural loft and texture visible from above' :
    garment.material === 'leather' ? 'Leather lies flat with weight — smooth with natural grain visible, minimal folds' :
    'Natural fabric behavior when laid on a flat surface — realistic settling, no artificial stiffness'}

SURFACE: ${surface.label}
${surface.surfaceDescription}

CAMERA:
- Angle: Perfectly top-down (bird's eye / 90° overhead) — camera pointing straight down
- Lens: 50mm equivalent, minimal distortion
- The entire garment must fit within the frame with comfortable margins
- Centered composition

LIGHTING:
${surface.lightingMood}

COLOR GRADING: ${surface.colorGrade}

GARMENT PRESERVATION — NON-NEGOTIABLE:
- Color must exactly match reference: ${garment.colorDescription}
- All logos, prints, graphics, embroidery reproduced exactly as in reference image
- Garment geometry preserved: proportions, sleeve length, hem, neckline, pocket placement
- Fabric texture must visually match ${garment.material} as shown in reference
- Do NOT invent design elements, additional wrinkles, stains, or modifications
- Do NOT remove or alter any visible construction details (stitching, buttons, zippers)

WHAT THIS IS NOT:
- NOT a ghost mannequin shot (no invisible mannequin shape)
- NOT a hanging shot (no hanger)
- NOT on a model (no human body)
- The garment is simply LAID FLAT on the surface, photographed from directly above

Professional e-commerce flatlay photography quality. \
Clean, aspirational, ready for product listing or social media.`;
}
