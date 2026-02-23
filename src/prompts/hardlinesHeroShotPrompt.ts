import { HardlinesGenerationRequest } from '../types';
import { PRODUCT_FINISH_DESCRIPTIONS, PRODUCT_MATERIAL_DESCRIPTIONS } from './presets';

export function buildHardlinesHeroShotPrompt(req: HardlinesGenerationRequest): string {
    const { product } = req;
    const materialDesc = (PRODUCT_MATERIAL_DESCRIPTIONS as any)[product.material] || product.material;
    const finishDesc = (PRODUCT_FINISH_DESCRIPTIONS as any)[product.finish] || product.finish;

    return `A dramatic, high-end editorial hero photograph of the product shown in the reference image. 

AESTHETIC: Apple / Dyson / B&O flagship product reveal style.

PRODUCT:
${product.type} in ${product.colorDescription}, ${product.material} with a ${product.finish} finish.
${product.hasBranding ? `IMPORTANT: Preserve branding: ${product.brandingDescription}.` : ''}

PHOTOGRAPHY EXPERTISE:
- Background: Deep matte black or dark charcoal, creating a low-key atmosphere.
- Lighting: Single dramatic key light. ${product.finish === 'glossy' || product.finish === 'polished'
            ? 'One clean, sweeping white highlight across the primary material surface.'
            : 'Dramatic raking side light to emphasize texture and form.'}
- Contrast: High contrast (8:1 key-to-shadow ratio), sculpting the product with light.
- Angle: Camera positioned slightly below the product (low angle) to create a sense of scale and importance.
- Lens: 85mm prime lens equivalent, shallow depth of field.

PRODUCT PRESERVATION — NON-NEGOTIABLE:
- Absolute fidelity to the product in the reference image. The output must be immediately recognizable as the SAME product.
- Exact color match: ${product.colorDescription}. No color shift permitted.
- Preserve the EXACT shape, configuration, and silhouette. Do NOT simplify or reinterpret.
- Every component visible in the reference must appear — same count, same arrangement, same proportions.
- Maintain all construction details: buttons, ports, labels, seams, vents, and hardware exactly as shown.
- Material physics: ${materialDesc}. Finish interaction: ${finishDesc}.
- Do NOT invent new design details or remove existing ones.
${product.hasBranding ? `- Branding (${product.brandingDescription}) must be reproduced exactly — same position, size, and design.` : ''}

High-end commercial hero photography quality. Cinematic, premium, and impactful.`;
}
