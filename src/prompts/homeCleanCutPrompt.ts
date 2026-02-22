import { HomeGenerationRequest } from '../types';
import { PRODUCT_FINISH_DESCRIPTIONS, PRODUCT_MATERIAL_DESCRIPTIONS } from './presets';

export function buildHomeCleanCutPrompt(req: HomeGenerationRequest): string {
    const { product } = req;
    const materialDesc = PRODUCT_MATERIAL_DESCRIPTIONS[product.material];
    const finishDesc = PRODUCT_FINISH_DESCRIPTIONS[product.finish];

    return `A professional e-commerce product photograph of the home item shown in the attached reference image.

PRODUCT IDENTIFICATION:
The reference image shows a ${product.type} in ${product.colorDescription}.
Material: ${product.material} (${materialDesc}).
Finish: ${product.finish} (${finishDesc}).
${product.dimensions ? `Dimensions: ${product.dimensions}.` : ''}
${product.hasPattern ? `Pattern Detail: ${product.patternDescription}.` : ''}

PHOTOGRAPHY EXPERTISE:
- Technical Setup: Double strip softbox configuration optimized for product photography to create clean, vertical highlights.
- Lighting: Material-aware illumination. ${product.finish === 'glossy' || product.finish === 'polished'
            ? 'Controlled sharp catchlights with black flags to define edges.'
            : 'Even, wrap-around soft light to emphasize texture and form.'}
- Lens: 100mm macro lens equivalent for zero distortion and high detail.
- Focus: Critical sharpness throughout; use focus stacking if necessary to ensure the entire product is in sharp focus.
- Framing: Centered composition, 65% frame fill.

PRODUCT PRESERVATION — NON-NEGOTIABLE:
- Exact color match to reference: ${product.colorDescription}. No color shift permitted.
- Preserve the EXACT shape, configuration, and silhouette from the reference. Do NOT simplify or reinterpret the product.
- Every component, section, and module visible in the reference must appear — same count, same arrangement, same proportions.
- Maintain all construction details: joints, seams, hardware, legs, cushion count, and structural elements exactly as shown.
- Do NOT invent new design details or remove existing ones.
- Do NOT alter proportions, compress, or elongate any dimension.

OUTPUT SPECIFICATION:
Commercial catalog quality. Amazon and Wayfair main image compliance: pure white background (#FFFFFF), product clearly visible, ultra-premium detail.`;
}
