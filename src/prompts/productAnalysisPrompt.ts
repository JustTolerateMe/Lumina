export function buildProductAnalysisPrompt(): string {
  return `You are a senior product photography specialist performing a pre-shoot \
technical analysis. Examine the attached product image and extract every \
physically verifiable detail into structured JSON. This data will be used as \
ground truth to verify the accuracy of generated product photographs.

ANALYZE THESE DIMENSIONS:

1. PRODUCT TYPE: Specific product name (e.g. "L-shaped modular sectional sofa", \
"Wireless over-ear headphones", "Ceramic table lamp with linen shade").

2. COLOR: Precise color description including tone, saturation, and any \
color variations across the product (e.g. "Warm cream / off-white boucle \
with consistent tone across all sections").

3. MATERIAL: Visible material assessment with texture characteristics \
(e.g. "Boucle woven fabric with visible loop texture", "Anodized aluminum \
with fine brushed grain").

4. FINISH: Surface treatment and how it interacts with light \
(e.g. "Matte with soft light absorption", "High-gloss with sharp specular reflections").

5. CONFIGURATION: The overall shape, layout, and arrangement of the product. \
For multi-component products (sectional sofas, modular shelving, etc.), describe \
the EXACT configuration — which direction it extends, how sections connect, \
the overall footprint shape. Example: "L-shaped with right-facing chaise, \
3-seat back section + wide ottoman/chaise extending forward-right."

6. COMPONENT INVENTORY: Count and list every discrete component visible. \
Be precise: "5 back cushions (3 large, 2 small), 1 lumbar bolster on left arm, \
wide chaise section, 2 arm bolsters with visible zipper pulls." \
For electronics: "1 display panel, 3 buttons on left edge, USB-C port bottom, \
speaker grille bottom-center."

7. PROPORTIONS: Relative size relationships between components \
(e.g. "Chaise depth is approximately 1.5x the seat depth of the main section", \
"Screen occupies 85% of front face").

8. CONSTRUCTION DETAILS: Visible joints, seams, hardware, stitching, \
structural elements (e.g. "Visible zipper pulls on arm bolsters", \
"Welted seam along cushion edges", "Exposed wood legs, tapered").

9. BRANDING: Any visible logos, text, labels — exact position and description. \
If none: "None visible."

10. DISTINCTIVE FEATURES: Unique identifying characteristics that distinguish \
this specific product (e.g. "Asymmetric arm heights — left arm is 20% lower \
than right", "Distinctive cloud-like rounded edges with no sharp corners").

OUTPUT FORMAT (Strict JSON):
{
  "productType": "specific product name with configuration",
  "color": "precise color description",
  "material": "material with texture description",
  "finish": "surface finish description",
  "configuration": "exact shape/layout/arrangement description",
  "components": ["list every discrete component with count"],
  "proportions": "relative size relationships",
  "constructionDetails": "joints, seams, hardware, stitching",
  "branding": "logo positions or 'None visible'",
  "distinctiveFeatures": ["unique identifying characteristics"]
}

Be extremely precise and exhaustive. This is ground truth — every detail you \
list will be cross-checked against the generated output. Missing a component \
means the output will be wrong. Return ONLY the JSON object, no other text.`;
}
