export function buildRiskAnalysisPrompt(analysisJson: string): string {
  return `You are a pre-flight risk analyst for AI product image generation. \
Given the product analysis below (ground truth extracted from a reference photo), \
identify SPECIFIC risks that are most likely to cause errors when an AI model \
generates a new photograph of this product.

PRODUCT ANALYSIS:
${analysisJson}

RECOGNIZED RISK FLAGS — pick ALL that apply to this specific product:

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

For each flagged risk, write a SPECIFIC constraint sentence that should be added \
to the generation prompt to prevent that exact failure. Reference actual details \
from the product analysis (e.g., "Verify exactly 5 back cushions" not "Verify cushion count").

Return JSON only:
{
  "flags": ["list of applicable risk flag strings from above"],
  "descriptions": {
    "flag_name": "why this is risky for THIS specific product — reference actual product details"
  },
  "constraintOverrides": [
    "exact constraint sentence to inject into the generation prompt — be specific and actionable"
  ]
}

Be conservative — only flag genuine risks for THIS product. Each constraintOverride \
must reference specific details from the analysis. Return ONLY the JSON object.`;
}
