import { HomeGenerationRequest } from '../types';
import { HOME_ROOM_STYLE_PRESETS, PRODUCT_FINISH_DESCRIPTIONS, PRODUCT_MATERIAL_DESCRIPTIONS } from './presets';

export function buildHomeLifestyleVignettePrompt(req: HomeGenerationRequest): string {
    const { product, roomStyle } = req;
    const style = HOME_ROOM_STYLE_PRESETS[roomStyle ?? 'minimalist'];
    const finishDesc = (PRODUCT_FINISH_DESCRIPTIONS as any)[product.finish] || product.finish;
    const materialDesc = (PRODUCT_MATERIAL_DESCRIPTIONS as any)[product.material] || product.material;

    return `A close-up, styled lifestyle vignette photograph of the product shown in the reference image.

PRODUCT DETAIL:
A ${product.type} featuring ${product.colorDescription}.
Material: ${product.material} (${materialDesc}).
Finish: ${product.finish} (${finishDesc}).

VIGNETTE STYLING:
- Style: ${style.label} aesthetic.
- Setup: Create an intimate "moment" on ${style.vignetteSurface}.
- Composition: Mixed texture play using ${style.keyMaterials}.
- Props: Incorporate ${style.vignetteProps} in a cohesive arrangement. Hero product is the dominant element.

PHOTOGRAPHY EXPERTISE:
- Lens: 85mm or 100mm macro lens for intimate detail.
- Depth of Field: Extremely shallow DoF, focusing sharply on a key detail of the hero product.
- Lighting: Single window light source or soft-box to create high-quality organic light.
- Mood: ${style.vignetteMood}.
- Color Grade: ${style.colorGrade}.

PRODUCT PRESERVATION — NON-NEGOTIABLE:
- Absolute color accuracy to reference image: ${product.colorDescription}. No color shift.
- Preserve the EXACT shape, configuration, and silhouette. Do NOT simplify or reinterpret the product's form.
- Every component visible in the reference must appear — same count, same arrangement, same proportions.
- Maintain all construction details, joints, seams, and structural elements exactly as shown.
- Do NOT invent new design details or remove existing ones.

PRODUCTION QUALITY:
- High-fidelity reproduction of material grain and finish.
- Instagram and Pinterest-ready editorial aesthetic.`;
}
