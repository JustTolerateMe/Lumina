/**
 * Combined analysis + risk prompts.
 * Merges the two sequential Gemini TEXT_MODEL calls (analyzeProduct/analyzeGarment + identifyRisks)
 * into a single call, saving one full API round-trip per generation.
 *
 * Returns a single JSON object with two top-level fields:
 *   - "analysis" — same schema as buildProductAnalysisPrompt / buildAnalysisPrompt
 *   - "risks"    — same schema as buildRiskAnalysisPrompt output (flags, descriptions, constraintOverrides)
 */

const RISK_FLAGS_BLOCK = `\
RECOGNIZED RISK FLAGS — after completing the analysis above, check ALL that apply to this specific product:

- reflective_surface: Product has glossy, polished, or mirror-like surfaces that create specular highlights
- many_small_components: Product has more than 5 small discrete parts that could be miscounted or omitted
- micro_text_logo: Product has small text, detailed logos, or fine print that could blur or distort
- symmetry_critical: Product geometry demands bilateral or radial symmetry that must be exact
- repeating_elements: Product has repeating patterns (buttons, cushions, slats, ports) that could be miscounted
- transparent_material: Product involves glass, crystal, mesh, or see-through elements
- complex_pattern: Product has intricate repeating surface patterns (herringbone, plaid, damask)
- high_contrast_branding: Product has prominent branding/logos that must be exactly preserved
- multi_section_config: Product is modular or sectional with a specific configuration (L-shape, U-shape, etc.)
- curved_organic_shape: Product has flowing, organic curves that are easy to flatten or distort
- color_sensitive: Product has subtle, nuanced, or easily-shifted colors (pastels, off-whites, muted tones, complex multicolor gradients) that AI models tend to enhance or shift toward more vivid versions
- decorative_element_placement: Product has decorative structural elements (ribbons, bows, patches, appliques, trim, tassels) with FIXED positions that must not be displaced

For each flagged risk, write a SPECIFIC constraint sentence referencing actual details from the analysis \
(e.g., "Verify exactly 5 back cushions" not "Verify cushion count").

Be conservative — only flag genuine risks for THIS product. Each constraintOverride must reference \
specific details from the analysis above. Return ONLY the JSON object.`;

export function buildProductAnalysisAndRiskPrompt(): string {
  return `You are a senior product photography specialist AND a pre-flight risk analyst for AI image generation. \
Examine the attached product image and perform two tasks in a single pass.

TASK 1 — RISK ANALYSIS:
${RISK_FLAGS_BLOCK}

TASK 2 — PRODUCT ANALYSIS:
Extract every physically verifiable detail into structured JSON. This data will be used as ground truth \
to verify the accuracy of generated product photographs.

ANALYZE THESE DIMENSIONS:

1. PRODUCT TYPE: Specific product name (e.g. "L-shaped modular sectional sofa", \
"Wireless over-ear headphones", "Ceramic table lamp with linen shade").

2. COLOR: Precise color description including tone, saturation, and any \
color variations across the product.

3. MATERIAL: Visible material assessment with texture characteristics.

4. FINISH: Surface treatment and how it interacts with light.

5. CONFIGURATION: The overall shape, layout, and arrangement of the product. \
For multi-component products describe the EXACT configuration — which direction it extends, \
how sections connect, the overall footprint shape.

6. COMPONENT INVENTORY: Count and list every discrete component visible. \
Be precise with numbers.

7. PROPORTIONS: Relative size relationships between components.

8. CONSTRUCTION DETAILS: Visible joints, seams, hardware, stitching, structural elements.

9. BRANDING: Any visible logos, text, labels — exact position and description. \
If none: "None visible."

10. DISTINCTIVE FEATURES: Unique identifying characteristics that distinguish this specific product.

11. STRUCTURAL DECORATIVE ELEMENTS: Any ribbons, bows, patches, appliques, trims, tassels, \
or decorative attachments physically fixed to the product at a specific location. For each element: \
describe it and give its EXACT position as a quadrant plus approximate percentage from the nearest edge. \
If none: return an empty array.

OUTPUT FORMAT (Strict JSON — return ONLY this object, no other text):
{
  "risks": {
    "flags": ["list of applicable risk flag strings from above"],
    "descriptions": {
      "flag_name": "why this is risky for THIS specific product — reference actual product details"
    },
    "constraintOverrides": [
      "exact constraint sentence to inject into the generation prompt — be specific and actionable"
    ]
  },
  "analysis": {
    "productType": "specific product name with configuration",
    "color": "precise color description",
    "material": "material with texture description",
    "finish": "surface finish description",
    "configuration": "exact shape/layout/arrangement description",
    "components": ["list every discrete component with count"],
    "proportions": "relative size relationships",
    "constructionDetails": "joints, seams, hardware, stitching",
    "branding": "logo positions or 'None visible'",
    "distinctiveFeatures": ["unique identifying characteristics"],
    "structuralDecorativeElements": [
      {
        "type": "ribbon | bow | patch | trim | applique | tassel | embroidery | other",
        "description": "exact description of the element",
        "position": "quadrant + percentage — e.g. 'upper-left, ~10% from left edge, ~5% from top'"
      }
    ]
  }
}

Be extremely precise and exhaustive in the analysis. Missing a component means the output will be wrong. \
Return ONLY the JSON object.`;
}

export function buildGarmentAnalysisAndRiskPrompt(): string {
  return `You are a fashion photography specialist AND a pre-flight risk analyst for AI image generation. \
Examine the attached garment image and perform two tasks in a single pass.

TASK 1 — RISK ANALYSIS:
${RISK_FLAGS_BLOCK}

TASK 2 — GARMENT ANALYSIS:
Provide a precise technical description for use as a fashion photography direction brief.

Return this JSON structure for the analysis field:
{
  "garmentType": "specific garment type",
  "silhouette": "silhouette description",
  "primaryColor": "precise color description — hue, saturation, tone",
  "secondaryColors": ["any additional colors"],
  "material": "visual material assessment",
  "materialWeight": "lightweight/medium/heavy",
  "fitCategory": "oversized/regular/slim/fitted",
  "collarType": "collar/neckline description",
  "sleeveStyle": "sleeve description and length",
  "hemStyle": "hem description",
  "graphicElements": [
    {
      "type": "logo/text/print/embroidery/none",
      "description": "exact description of graphic",
      "position": "quadrant + percentage from edge — e.g. 'upper-left, ~12% from left, ~8% from top'",
      "colors": "colors in the graphic"
    }
  ],
  "structuralDecorativeElements": [
    {
      "type": "ribbon | bow | patch | trim | applique | button | zipper-pull | tassel | other",
      "description": "exact description of the element",
      "position": "quadrant + percentage from nearest seam or edge"
    }
  ],
  "constructionDetails": "visible stitching, seams, hardware",
  "overallStyle": "casual/smart-casual/formal/streetwear/athletic"
}

OUTPUT FORMAT (Strict JSON — return ONLY this object, no other text):
{
  "risks": {
    "flags": ["list of applicable risk flag strings from above"],
    "descriptions": {
      "flag_name": "why this is risky for THIS specific garment — reference actual garment details"
    },
    "constraintOverrides": [
      "exact constraint sentence to inject into the generation prompt — be specific and actionable"
    ]
  },
  "analysis": {
    "garmentType": "...",
    "silhouette": "...",
    "primaryColor": "...",
    "secondaryColors": [],
    "material": "...",
    "materialWeight": "...",
    "fitCategory": "...",
    "collarType": "...",
    "sleeveStyle": "...",
    "hemStyle": "...",
    "graphicElements": [],
    "structuralDecorativeElements": [],
    "constructionDetails": "...",
    "overallStyle": "..."
  }
}

Be extremely precise. This is ground truth that will be used to verify accuracy of generated images. \
Return ONLY the JSON object, no other text.`;
}
