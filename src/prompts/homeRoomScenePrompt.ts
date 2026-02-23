import { HomeGenerationRequest } from '../types';
import { HOME_ROOM_STYLE_PRESETS, PRODUCT_MATERIAL_DESCRIPTIONS } from './presets';

export function buildHomeRoomScenePrompt(req: HomeGenerationRequest): string {
    const { product, roomStyle } = req;
    const style = HOME_ROOM_STYLE_PRESETS[roomStyle ?? 'minimalist'];
    const materialDesc = (PRODUCT_MATERIAL_DESCRIPTIONS as any)[product.material] || product.material;

    return `A professional interior design photograph featuring the home product from the reference image, styled in a ${style.label} environment.

PRODUCT (HERO):
The item is a ${product.type} in ${product.colorDescription}, ${product.material} (${materialDesc}) with a ${product.finish} finish.
${product.hasPattern ? `Note the pattern: ${product.patternDescription}.` : ''}
The product must be the clear focal point of the image.

ENVIRONMENT: ${style.label}
- Design Aesthetic: ${style.designDescription}.
- Color Palette: ${style.colorPalette}.
- Key Materials in Scene: ${style.keyMaterials}.
- Styling: ${style.stylingNotes}. ${style.companionProps} as subtle companion elements that do not compete with the hero product.
- Surface: The product is placed on ${style.surfaceType}.

PHOTOGRAPHY:
- Perspective: Architectural Digest quality composition.
- Lens: 50mm or 35mm lens equivalent for natural room context.
- Depth Layers: Softly blurred foreground -> sharp hero product -> softly blurred background elements.
- Lighting: ${style.lightingSetup}. Color grade: ${style.colorGrade}. White balance: ${style.whiteBalance}.

PRODUCT PRESERVATION — NON-NEGOTIABLE:
- The product's color (${product.colorDescription}) must exactly match the reference image. No color shift.
- Preserve the EXACT shape, configuration, and silhouette from the reference. Do NOT simplify, shrink, or reinterpret the product's form.
- Every component, section, and module visible in the reference must appear in the output — same count, same arrangement, same proportions.
- Maintain all construction details: joints, seams, hardware, legs, cushion count, and structural elements exactly as shown.
- The product's scale relative to itself must be accurate — do NOT compress, elongate, or alter any dimension.
${product.dimensions ? `- Respect provided dimensions: ${product.dimensions}.` : ''}
- Do NOT invent new design details or remove existing ones.
- The product in the scene must be immediately recognizable as the SAME product from the reference image.

High-end commercial interior photography quality, suitable for luxury brand magazines and catalogs.`;
}
