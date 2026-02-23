import { HardlinesGenerationRequest } from '../types';
import { HARDLINES_CONTEXT_PRESETS, PRODUCT_MATERIAL_DESCRIPTIONS, PRODUCT_FINISH_DESCRIPTIONS } from './presets';

export function buildHardlinesInContextPrompt(req: HardlinesGenerationRequest): string {
    const { product, context } = req;
    const ctx = HARDLINES_CONTEXT_PRESETS[context as keyof typeof HARDLINES_CONTEXT_PRESETS] || HARDLINES_CONTEXT_PRESETS.desk_workspace;
    const materialDesc = (PRODUCT_MATERIAL_DESCRIPTIONS as any)[product.material] || product.material;
    const finishDesc = (PRODUCT_FINISH_DESCRIPTIONS as any)[product.finish] || product.finish;

    return `A professional commercial photograph of the product from the reference image in a real-world usage scenario.

PRODUCT (HERO):
The item is a ${product.type} in ${product.colorDescription}, ${product.material} (${materialDesc}) with a ${product.finish} (${finishDesc}) finish.
The product is the central hero of the story, placed naturally within the environment.

CONTEXT: ${ctx.label}
- Environment: ${ctx.environmentDescription}.
- Placement: The product sits on ${ctx.placementSurface}.
- Storytelling: ${ctx.companionObjects} are visible in the scene as secondary elements.
- Implied Activity: ${ctx.impliedActivity}.

PHOTOGRAPHY:
- Perspective: Lifestyle product photography.
- Lens: ${ctx.lensRecommendation} equivalent.
- Time of Day: ${ctx.timeOfDay}.
- Lighting: ${ctx.lightingSetup}.
- Depth of Field: Medium-shallow; the product is ultra-sharp while surroundings have a natural soft focus.
- Color Grade: ${ctx.colorGrade}. White Balance: ${ctx.whiteBalance}.

PRODUCT PRESERVATION — NON-NEGOTIABLE:
- Exact color match to reference: ${product.colorDescription}. No color shift permitted.
- Preserve the EXACT shape, configuration, and silhouette. Do NOT simplify or reinterpret the product.
- Every component visible in the reference must appear — same count, same arrangement, same proportions.
- Maintain all construction details: buttons, ports, labels, seams, vents, and hardware exactly as shown.
- Do NOT invent new design details or remove existing ones.
- The product's scale relative to itself must be accurate — do NOT compress or elongate any dimension.
${product.hasBranding ? `- Branding (${product.brandingDescription}) must be reproduced exactly — same position, size, and design.` : ''}

Professional brand photography quality, suitable for website banners and marketing material.`;
}
