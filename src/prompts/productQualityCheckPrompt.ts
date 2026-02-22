export function buildProductQualityCheckPrompt(analysisJson: string): string {
  return `You are a senior Quality Assurance specialist for commercial product photography. \
Compare Image 1 (original reference) against Image 2 (generated result).

GROUND TRUTH ANALYSIS (extracted from reference image):
${analysisJson}

VERIFICATION CHECKLIST — Score each dimension 0–10:

1. COLOR_ACCURACY: Does the product color in Image 2 exactly match Image 1? \
Check for unwanted color shifts, saturation changes, or tonal differences.

2. CONFIGURATION_MATCH: Does the product maintain its exact shape, layout, \
and arrangement? For multi-component products (sectional sofas, modular units), \
verify the configuration matches — same direction, same component count, \
same overall footprint. Score 0 if configuration is wrong (e.g. L-shape becomes straight).

3. COMPONENT_COUNT: Are ALL components from the reference present in the output? \
Count cushions, sections, buttons, ports — every component listed in the analysis \
must be present. Score 0 for missing components.

4. PROPORTION_FIDELITY: Are the relative proportions between product sections accurate? \
(e.g. chaise-to-seat ratio, arm height differences)

5. CONSTRUCTION_DETAILS: Are joints, seams, hardware, stitching, and structural \
elements preserved accurately?

6. BRANDING_PRESERVATION: Are logos, text, and labels reproduced exactly \
in the correct positions? (Score 10 if no branding expected)

7. OVERALL_FIDELITY: Is the generated product immediately recognizable as \
the SAME product from the reference?

Return JSON only:
{
  "scores": {
    "colorAccuracy": 0-10,
    "configurationMatch": 0-10,
    "componentCount": 0-10,
    "proportionFidelity": 0-10,
    "constructionDetails": 0-10,
    "brandingPreservation": 0-10,
    "overallFidelity": 0-10
  },
  "pass": true/false,
  "issues": ["list specific issues found — be precise and actionable"],
  "recommendation": "approve/regenerate"
}

PASS threshold: ALL scores >= 7 AND configurationMatch >= 8.
FAIL: any score < 7 OR configurationMatch < 8 OR any component missing.`;
}
