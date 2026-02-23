import { HardlinesGenerationRequest } from '../types';
import { PRODUCT_FINISH_DESCRIPTIONS, PRODUCT_MATERIAL_DESCRIPTIONS } from './presets';

export function buildHardlinesCleanCutPrompt(req: HardlinesGenerationRequest): string {
    const { product } = req;
    const materialDesc = (PRODUCT_MATERIAL_DESCRIPTIONS as any)[product.material] || product.material;
    const finishDesc = (PRODUCT_FINISH_DESCRIPTIONS as any)[product.finish] || product.finish;

    return `A professional technical product photograph of the consumer electronics/hardlines item in the reference image.

PRODUCT IDENTIFICATION:
- Type: ${product.type} in ${product.colorDescription}.
- Material: ${product.material} (${materialDesc}).
- Finish: ${product.finish} (${finishDesc}).
- Details: ${product.hasBranding ? `Branding/Logo: ${product.brandingDescription}.` : 'No visible branding.'}
${product.dimensions ? `- Size: ${product.dimensions}.` : ''}

TECHNICAL PHOTOGRAPHY:
- Lighting: Professional specular control. ${product.finish === 'glossy' || product.finish === 'polished'
            ? 'Use white bounce panels and black flags for precise shadow/reflection placement. Sweeping clean highlights on primary surfaces.'
            : 'Even wrap-around lighting using large silk diffusers to eliminate harsh shadows.'}
- Rim Lighting: Subtle rim light for sharp edge separation from background.
- Lens: 100mm macro lens equivalent, zero distortion.
- Composition: 3/4 hero angle (rotate item approx. 30° from front).
- Focus: Focus stacked for 100% sharpness from front to back.

PRODUCT PRESERVATION — NON-NEGOTIABLE:
- Zero tolerance for color shift: ${product.colorDescription}.
- Preserve the EXACT shape, configuration, and silhouette. Do NOT simplify or reinterpret the product.
- Every component visible in the reference must appear — same count, same arrangement, same proportions.
- Exact reproduction of all ports, buttons, labels, construction seams, vents, and hardware.
- Do NOT invent new design details or remove existing ones.
- Do NOT alter proportions, compress, or elongate any dimension.

OUTPUT SPECIFICATION:
Commercial e-commerce quality. Amazon and Best Buy main image compliance: Pure white background (#FFFFFF), ultra-sharp, product occupies 80% of frame.`;
}
