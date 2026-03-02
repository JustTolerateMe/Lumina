# Lumina — Technical Overview

> This document covers the full system architecture, every pipeline step, all prompt logic, the QC system, competitive context, and concrete improvement recommendations. Intended for sharing with collaborators.

---

## Table of Contents

1. [What is Lumina](#1-what-is-lumina)
2. [Tech Stack](#2-tech-stack)
3. [Repository Map](#3-repository-map)
4. [The Generation Pipeline — Step by Step](#4-the-generation-pipeline--step-by-step)
5. [The Two Pipelines](#5-the-two-pipelines)
6. [Prompt Architecture](#6-prompt-architecture)
7. [Quality Control System](#7-quality-control-system)
8. [Risk Profiling System](#8-risk-profiling-system)
9. [Manual Editing (Inpainting)](#9-manual-editing-inpainting)
10. [Generation History](#10-generation-history)
11. [Known Failure Modes & Mitigations](#11-known-failure-modes--mitigations)
12. [Competitive Landscape](#12-competitive-landscape)
13. [Concrete Improvement Suggestions](#13-concrete-improvement-suggestions)
14. [Open Questions for the Team](#14-open-questions-for-the-team)

---

## 1. What is Lumina

Lumina is an AI-powered commercial product photography platform. It takes a flat reference image of any product and generates a professional, photorealistic e-commerce photograph — on a model, in a lifestyle scene, on a flatlay surface, in a room setting, or as a clean studio shot.

It supports three product categories:

- **Apparel** — clothing photographed on a human model, in scenes, or laid flat. Five modes: Studio, Lifestyle, On-Figure, Campaign, Flatlay.
- **Home** — furniture, decor, lighting, kitchenware. Three modes: Clean-Cut, Room Scene, Lifestyle Vignette.
- **Hardlines** — electronics, appliances, tools, gadgets, sports equipment. Three modes: Clean-Cut, Hero Shot, In-Context.

**11 generation modes total.** The system is designed around fidelity — the generated image must be recognizable as the same product, with the same colors, construction details, and structure as the reference.

---

## 2. Tech Stack

| Layer | Technology |
|---|---|
| Frontend framework | React 19 with TypeScript (strict mode) |
| Build tool | Vite 6 |
| Styling | Tailwind CSS v4 (JIT) |
| Animations | Framer Motion |
| Backend | Node.js Vercel serverless functions (`/api/`) |
| AI model (generation + editing) | Google Gemini 2.5 Flash Image (`gemini-2.5-flash-image`) |
| AI model (analysis + QC) | Google Gemini 2.5 Flash (`gemini-2.5-flash`) |
| AI SDK | `@google/genai` |
| Image compression | `browser-image-compression` |
| Browser image processing | Canvas API (no external library) |
| Storage | IndexedDB (browser-local, max 50 history entries) |
| Deployment | Vercel (serverless functions + static frontend) |

All image processing (color extraction, pixel QC metrics) runs entirely in the browser via the Canvas API. No image processing server is required.

---

## 3. Repository Map

```
Lumina/
│
├── api/                              # Backend — Vercel serverless functions
│   ├── pipeline.ts                   # Main generation pipeline (24 KB) — the core engine
│   ├── manual-edit.ts                # Inpainting endpoint for manual corrections
│   └── suggestions.ts                # Image analysis → product metadata suggestions
│
├── src/
│   ├── App.tsx                       # Root React component — layout, state, routing
│   ├── main.tsx                      # React entry point
│   │
│   ├── types/
│   │   └── index.ts                  # All TypeScript interfaces and type unions
│   │
│   ├── prompts/                      # All AI instruction templates
│   │   ├── systemInstruction.ts      # 7 absolute rules sent with every Gemini call
│   │   ├── combinedAnalysisPrompt.ts # Combined analysis + risk in one prompt (used by pipeline)
│   │   ├── productAnalysisPrompt.ts  # Product ground truth extraction — used only by suggestions endpoint
│   │   ├── productQualityCheckPrompt.ts  # Scores product QC (7 dimensions)
│   │   ├── onFigurePrompt.ts         # Garment analysis + on-figure generation + garment QC
│   │   ├── studioPrompt.ts           # Apparel: white studio background
│   │   ├── lifestylePrompt.ts        # Apparel: on-figure in scene
│   │   ├── campaignPrompt.ts         # Apparel: editorial campaign style
│   │   ├── flatlayPrompt.ts          # Apparel: top-down flat lay
│   │   ├── homeCleanCutPrompt.ts     # Home: white background product shot
│   │   ├── homeRoomScenePrompt.ts    # Home: product in decorated room
│   │   ├── homeLifestyleVignettePrompt.ts  # Home: styled lifestyle close-up
│   │   ├── hardlinesCleanCutPrompt.ts      # Hardlines: white background technical shot
│   │   ├── hardlinesHeroShotPrompt.ts      # Hardlines: dramatic dark-background hero
│   │   ├── hardlinesInContextPrompt.ts     # Hardlines: product in use scenario
│   │   ├── editPrompt.ts             # Iterative refinement — targeted fix instructions
│   │   ├── realismDirectives.ts      # Photorealism rules for skin, fabric, shadow
│   │   └── presets.ts                # Style/scene/surface/context presets (24 KB)
│   │
│   ├── services/
│   │   ├── geminiService.ts          # Client → server communication, SSE parsing, pixel QC
│   │   ├── pixelQC.ts                # Browser-side pixel QC: SSIM, ΔE, edge, histogram
│   │   ├── colorExtractor.ts         # Browser k-means color palette extraction
│   │   ├── telemetry.ts              # History entry creation and IndexedDB save
│   │   ├── imageUtils.ts             # Image manipulation utilities
│   │   └── brandProfiles.ts          # Per-brand calibration profiles
│   │
│   ├── hooks/
│   │   ├── useGeneration.ts          # Generation orchestration: color extract → generate → QC
│   │   ├── useHistory.ts             # IndexedDB history read/write
│   │   └── useUpload.ts              # Image upload handling and validation
│   │
│   ├── components/
│   │   ├── layout/
│   │   │   └── Header.tsx            # Top bar with history access
│   │   ├── upload/
│   │   │   └── UploadZone.tsx        # Primary + additional image upload
│   │   ├── controls/                 # Left-panel user input components
│   │   │   ├── ModeSelector.tsx      # Generation mode picker
│   │   │   ├── GarmentForm.tsx       # Apparel config (type, color, material, fit, logo)
│   │   │   ├── ModelPicker.tsx       # Model config (age, gender, skin tone, pose)
│   │   │   ├── ScenePicker.tsx       # Lifestyle scene picker
│   │   │   ├── CampaignPicker.tsx    # Campaign style picker
│   │   │   ├── FlatlayPicker.tsx     # Flatlay surface picker
│   │   │   ├── HomeProductForm.tsx   # Home product config
│   │   │   ├── RoomStylePicker.tsx   # Room style picker
│   │   │   ├── HardlinesProductForm.tsx  # Hardlines product config
│   │   │   ├── HardlinesContextPicker.tsx  # In-context environment picker
│   │   │   └── BrandProfilePicker.tsx   # Brand calibration settings
│   │   └── output/                   # Right-panel result display components
│   │       ├── GenerationCanvas.tsx  # Main result display with view modes
│   │       ├── FidelityPanel.tsx     # QC scores display (semantic + pixel)
│   │       ├── BeforeAfterSlider.tsx # Side-by-side reference vs. generated comparison
│   │       ├── InpaintCanvas.tsx     # Mask drawing for manual editing
│   │       ├── EditToolbar.tsx       # Manual editing instruction input
│   │       └── GenerationHistory.tsx # Past generations panel
│   │
│   └── server/
│       └── devApiProxy.ts            # Local dev proxy (injects GEMINI_API_KEY via Vite)
│
├── OVERVIEW.md                       # This document
├── CLAUDE.md                         # AI agent instructions
├── vite.config.ts                    # Vite build + dev proxy configuration
├── tsconfig.json                     # TypeScript config (strict + noUncheckedIndexedAccess)
├── vercel.json                       # Vercel deployment config
└── package.json                      # Dependencies
```

---

## 4. The Generation Pipeline — Step by Step

This is the full lifecycle of a single generation request, from user click to result on screen.

### Step 1 — User uploads a reference image

The user drags or selects a product image (JPG, PNG, or WebP, max 10 MB). Optionally, they add up to 2 additional angle images (back view, detail shot, logo closeup, etc.) with optional labels.

As soon as the primary image is uploaded, an automatic analysis call fires to `/api/suggestions`. This analyzes the image and returns a best-guess category, product type, color description, material, and finish. The user can apply these suggestions with one click to pre-fill the configuration form.

### Step 2 — User configures the generation

The user selects:
- Product category (Apparel / Home / Hardlines)
- Generation mode (Studio, Lifestyle, On-Figure, etc.)
- Product-specific details (type, color description, material, fit, branding)
- Mode-specific settings (model age/gender/skin tone/pose, scene, room style, context)
- Aspect ratio (1:1, 4:5, 3:4, 9:16)
- Optional: Brand Profile (per-brand calibration settings)
- Optional: Custom instructions (free-text styling notes)

### Step 3 — Browser extracts pixel-accurate color palette

Before the request is sent, the browser runs a k-means clustering algorithm on the reference image via the Canvas API (`colorExtractor.ts`). It:

1. Draws the image to an offscreen 200px canvas
2. Reads all pixel RGBA values
3. Filters out near-white (luminance > 240), near-black (luminance < 15), and transparent pixels — these are background, not product
4. Runs k-means with K=6 on the remaining product pixels
5. Merges clusters whose RGB distance is under 20 (consolidates lighting/shadow variants of the same color)
6. Returns the top distinct colors sorted by frequency, each with a pixel-accurate hex value and coverage percentage

This palette is attached to the request as `extractedColors`. It gives the server exact, measured color values to inject into the generation prompt — not AI estimates.

### Step 4 — Request is sent to `/api/pipeline`

A POST request is made with all configuration fields, the source image (base64), any additional images, and the extracted color palette. The server streams progress updates back via Server-Sent Events (SSE), which the client displays as a live progress indicator.

### Step 5 — Server: Combined product analysis and risk assessment

Gemini 2.5 Flash (text model) analyzes the reference image in a single call, performing both tasks simultaneously. The combined prompt returns one JSON response with two top-level sections, saving one full API round-trip (3–7 seconds) compared to running them sequentially.

**Analysis** — extracts structured dimensions that become the ground truth for the rest of the pipeline:

- Product type and configuration
- Precise color description
- Material and texture
- Surface finish
- Exact shape/layout (critical for modular products like sectional sofas)
- Component inventory (every discrete part, counted)
- Proportions between sections
- Construction details (seams, joints, hardware, stitching)
- Branding (logo positions, or "None visible")
- Distinctive features
- Structural decorative elements (ribbons, bows, patches — each with exact quadrant + percentage position)

For on-figure apparel, a garment-specific version extracts: garment type, silhouette, primary/secondary colors, material weight, fit category, collar type, sleeve style, hem style, graphic elements with positions, structural decorative elements, and construction details.

**Risks** — in the same call, the model checks whether any of 12 specific failure modes apply to this product:

- Reflective or glossy surfaces
- More than 5 small discrete components
- Small text or detailed logos
- Products that require exact symmetry
- Repeating elements that could be miscounted
- Transparent or see-through materials
- Complex surface patterns
- High-contrast branding
- Modular or multi-section layouts
- Flowing organic curves
- Subtle colors prone to AI enhancement
- Fixed-position decorative elements

For each applicable flag, it writes a product-specific constraint override (e.g., "Verify exactly 3 back cushions and 1 arm bolster" rather than a generic statement). These constraints are injected directly into the generation prompt.

### Step 6 — Server: Config validation

The server compares the user's selected product type against the AI-extracted type. If they don't match (e.g., user selected "hoodie" but the AI extracted "jacket"), a high-severity warning is attached to the result. Generation proceeds, but the mismatch is surfaced to the user so they can decide whether to regenerate with the correct type.

### Step 7 — Server: Prompt assembly

The full generation prompt is assembled by combining:

1. A mode-specific base prompt (photography setup, lighting, composition, scene context)
2. The product analysis JSON (injected as ground truth the model must not deviate from)
3. Custom styling instructions (user-provided, if any)
4. Risk-based constraints (static constraint strings for each detected flag, plus dynamic product-specific overrides)
5. Fidelity constraints:
   - **COLOR LOCK block** — lists each extracted hex color with its percentage coverage. Explicitly forbids color enhancement, saturation shifts, or hue adjustments.
   - **ELEMENT POSITION LOCK block** — lists each structural decorative element with its exact fixed position. Any displacement is flagged as a critical failure.
6. Multiple reference image instructions (if additional images were uploaded, instructs the model to use all of them)

The system instruction (7 absolute rules) is passed separately as the `systemInstruction` parameter to every Gemini call.

### Step 8 — Server: Image generation

The assembled prompt, the reference image, and any additional images are sent together to `gemini-2.5-flash-image` (a multimodal model that accepts both text and images). The model generates the product photograph and returns it as a base64 image.

### Step 9 — Server: Semantic QC

The generated image is immediately scored by a second Gemini text call (vision — it sees both the original reference and the generated image). It scores against the analysis ground truth:

**For products (home, hardlines, most apparel modes):** 7 dimensions on a 0–10 scale: color accuracy, configuration match, component count, proportion fidelity, construction details, branding preservation, overall fidelity.

**For on-figure apparel:** 5 dimensions: color accuracy, graphic preservation, silhouette match, texture match, overall fidelity.

Each scoring call also returns a list of specific issues ("Left armrest appears missing", "Sofa color appears more saturated than reference") that are used in the refinement step.

### Step 10 — Server: Iterative refinement loop

If any QC dimension scores below 7 (or configurationMatch below 8 for products), the pipeline enters a refinement loop:

1. A targeted edit prompt is built that identifies which dimensions passed (protect these) and which failed (fix these), plus the specific issue descriptions.
2. This edit prompt is sent to Gemini along with the current generated image AND the original reference. The model makes targeted corrections rather than regenerating from scratch.
3. QC is re-run on the result.
4. The loop repeats up to 3 times total.
5. **Stagnation detection:** If the overall fidelity score improves by less than 3 points from the previous iteration, the loop exits early. This prevents wasted calls on diminishing returns.

### Step 11 — Client: Pixel QC

Once the server returns the final image, the browser computes four pixel-level similarity metrics by comparing the original reference to the generated output (both resized to 512×512 via Canvas):

- **SSIM (Structural Similarity Index)** — measures luminance and structural patterns using an 8×8 sliding window. Sensitive to geometric shape changes.
- **CIELAB Color Delta (ΔE)** — converts pixels to CIELAB color space and measures perceptual color distance. More accurate than RGB for how humans perceive color difference.
- **Sobel Edge Overlap** — applies Sobel edge detection on both images and measures how well the edge maps match. Catches shape distortions and missing structural lines.
- **Histogram Match** — compares per-channel RGB histograms. Detects tone and color distribution differences even when structure is correct.

Each metric produces a 0–100 score.

### Step 12 — Client: Composite scoring

The semantic QC scores (from the server) and pixel QC scores (from the browser) are blended into a single composite score:

- **For modes where background changes are expected** (on-figure, lifestyle, campaign, room scene, vignette, in-context): semantic weight = 80%, pixel weight = 20%. Pixel comparison is less meaningful when the background is intentionally different.
- **For clean-cut modes** (studio, clean-cut products, hero shot): semantic weight = 60%, pixel weight = 40%. Background is static so pixel similarity matters more.

The composite score is on a 0–100 scale. The pass threshold is 75.

### Step 13 — Display and history

The result is displayed in the main canvas with the composite score, all individual QC scores (in the expandable Fidelity Panel), the risk profile, and iteration count. The user can:

- Download the image as PNG
- Compare it to the reference using the Before/After Slider
- Draw a mask and submit a manual edit instruction (inpainting)
- Generate a new version

The result is automatically saved to IndexedDB history (max 50 entries, oldest evicted first) with a thumbnail, scores, and request summary.

---

## 5. The Two Pipelines

The server routes every request to one of two pipeline functions:

### `runOnFigurePipeline` — for apparel, mode = on-figure

Specialized for placing a garment on a human model. Differences from the universal pipeline:

- Uses **garment analysis** (extracts garment-specific fields: silhouette, fit, sleeve style, hem, graphics) rather than generic product analysis
- Uses **`buildOnFigurePrompt()`** which includes detailed model placement physics (shoulder seam positioning, hem fall, sleeve length), realism directives (skin texture, micro-wrinkle formation, age-group specific body proportions), and strict garment preservation rules
- Scores **5 QC dimensions** (color accuracy, graphic preservation, silhouette match, texture match, overall fidelity) instead of 7 — configuration matching isn't a dimension because the "configuration" for a garment is the model wearing it correctly

### `runUniversalPipeline` — for all other modes (studio, lifestyle, flatlay, home, hardlines)

Handles the remaining 10 modes. Differences:

- Uses **product analysis** (extracts: product type, configuration, components, proportions, construction, branding, structural elements)
- Routes to the correct mode-specific prompt builder (`buildStudioPrompt`, `buildHomeRoomScenePrompt`, etc.)
- Scores **7 QC dimensions**, with **configurationMatch requiring ≥ 8** (stricter threshold) because getting the layout and component count exactly right is the hardest and most important failure mode for complex products

Both pipelines share: combined analysis + risk in one call, fidelity constraint injection, the iterative refinement loop, and the stagnation detection logic.

---

## 6. Prompt Architecture

Each AI instruction is a separate TypeScript function that returns a string. They are assembled by the pipeline at runtime. This section describes each prompt file.

### `systemInstruction.ts` — Global Rules (7)

Passed as `systemInstruction` to every Gemini API call. Establishes role ("professional commercial product photographer, 20 years e-commerce experience") and 7 absolute rules:

1. **COLOR ACCURACY** — exact color match, no shifting or saturation
2. **GEOMETRY PRESERVATION** — silhouette, proportions, dimensions must match exactly
3. **TEXTURE FIDELITY** — patterns, finishes, logos reproduced with pixel-level accuracy; never invent or modify surface details
4. **NO HALLUCINATION** — never add or remove design elements; never modify text or logos
5. **REALISTIC PHYSICS** — materials interact with light and gravity naturally
6. **PHOTOREALISTIC HUMANS** — skin shows natural texture; fabric has organic micro-wrinkles; no airbrushed or CGI appearance
7. **TAG SUPPRESSION** — never render clothing tags, care labels, size labels, hang tags, or price stickers, even if visible in the reference

### `combinedAnalysisPrompt.ts` — Combined Analysis + Risk (Pipeline)

Used by the main generation pipeline. Two functions — one for products, one for garments — each instruct Gemini to perform both the product analysis and the risk assessment in a single pass, returning one JSON object with two top-level fields: `analysis` and `risks`.

`buildProductAnalysisAndRiskPrompt()` — product version. Extracts the same 11 analysis dimensions as the standalone prompt, then identifies all applicable risk flags and writes product-specific constraint overrides, in one API call.

`buildGarmentAnalysisAndRiskPrompt()` — garment version. Extracts garment-specific fields (garmentType, silhouette, primaryColor, secondaryColors, material, materialWeight, fitCategory, collarType, sleeveStyle, hemStyle, graphicElements, structuralDecorativeElements, constructionDetails, overallStyle), then identifies risks in the same call.

Combining both tasks saves one full Gemini round-trip (3–7 seconds) per generation.

### `productAnalysisPrompt.ts` — Ground Truth Extraction (Suggestions Only)

Extracts 11 dimensions from the reference image into a strict JSON schema. Now used only by the `api/suggestions.ts` endpoint (the quick auto-analysis that fires on image upload). The main pipeline uses `combinedAnalysisPrompt.ts` instead.

Dimensions: productType, color, material, finish, configuration, components (inventory with count), proportions, constructionDetails, branding, distinctiveFeatures, structuralDecorativeElements (each with type, description, and quadrant+percentage position).

### `productQualityCheckPrompt.ts` — Product Semantic QC

Scores the generated image against the reference and the analysis JSON on 7 dimensions (0–10 scale): colorAccuracy, configurationMatch, componentCount, proportionFidelity, constructionDetails, brandingPreservation, overallFidelity. Returns scores, pass/fail, and a list of specific issues found.

### `onFigurePrompt.ts` — Two functions for garments

**`buildOnFigurePrompt(req)`** — Full on-figure generation instruction. Includes model specs (age group, gender, skin tone, pose, body proportions from presets), placement physics (shoulder seam must sit at shoulder points, hem falls at natural position, sleeve length matches reference), preservation rules (primary color exact, silhouette exact, graphics zero-tolerance), photography setup (white studio backdrop, 3-point lighting, 85mm lens, full-body framing), and realism directives for skin, fabric, and shadow behavior.

**`buildQualityCheckPrompt()`** — Garment QC scoring. Returns scores on 5 dimensions: colorAccuracy, graphicPreservation, silhouetteMatch, textureMatch, overallFidelity.

### `studioPrompt.ts`

Apparel studio mode: pure white seamless backdrop, 3-point softbox lighting (45° left/right + frontal fill), 85mm lens, full-body centered. Preservation rules for color, construction, and logos. Amazon-compliant white background output.

### `lifestylePrompt.ts`

Apparel lifestyle mode: on-figure in a scene. Four scene presets (urban_street, minimal_indoor, outdoor_nature, studio_editorial) each defining setting, time of day, lighting mood, lens, shot type, depth of field, and color grade. Fabric drape physics varies by material (denim = structured, silk = fluid, cotton = soft). Rule-of-thirds composition.

### `campaignPrompt.ts`

Apparel campaign mode: editorial branded style. Four campaign presets (minimalist_luxury, street_energy, neon_tech, organic_natural) each defining mood, pose description, and photography style. Dramatic lighting, exact preservation of all logos and graphics, photorealistic skin and fabric.

### `flatlayPrompt.ts`

Apparel flatlay mode: garment laid completely flat, viewed from 90° overhead (bird's eye). Six surface presets (pure_white, warm_linen, light_wood, dark_wood, marble, concrete). Fabric behavior by material type. Centered composition, entire garment in frame with margins. All graphics and embroidery reproduced exactly.

### `homeCleanCutPrompt.ts`

Home products on white background: double strip softbox lighting, 100mm macro lens, focus-stacked for full sharpness, 65% frame fill. Material-aware lighting (glossy gets sharp catchlights with black flags; matte gets even wrap-around). Exact color, shape, components, and construction details. Amazon/Wayfair compliant (#FFFFFF background).

### `homeRoomScenePrompt.ts`

Home products in a decorated room. Eight room style presets (minimalist, scandinavian, mid-century, industrial, bohemian, japandi, coastal, traditional) each defining design aesthetic, color palette, materials, companion props, and surface type. Architectural Digest quality, 50mm/35mm lens, depth layers, style-specific color grade. Exact product fidelity within the scene.

### `homeLifestyleVignettePrompt.ts`

Home products in an intimate styled vignette. 85–100mm macro lens, shallow depth of field, single light source. Instagram/Pinterest editorial aesthetic. Mixed textures, companion props, "moment" styling.

### `hardlinesCleanCutPrompt.ts`

Electronics and tools on white background: specular-controlled lighting (glossy = white bounce cards + black flags for sharp highlights; other = large silk diffusers), subtle rim light, 100mm macro, 3/4 hero angle, focus-stacked. Zero color shift, all ports/buttons/labels/seams/vents exact. Amazon/Best Buy compliant (#FFFFFF, 80% frame coverage).

### `hardlinesHeroShotPrompt.ts`

Electronics dramatic showcase: Apple/Dyson/B&O flagship reveal style. Deep matte black background, single dramatic key light, high contrast (8:1 ratio). Low camera angle (slightly below product). Exact preservation of all components and branding. Cinematic, premium, impactful.

### `hardlinesInContextPrompt.ts`

Electronics in use environment. Seven context presets (desk_workspace, kitchen_counter, outdoor_adventure, gym_fitness, commute, bedside_table, living_room_shelf) each defining environment, placement surface, companion objects, implied activity, lens, lighting, and color grade. Product ultra-sharp, surroundings soft focus. Exact product fidelity within the scene.

### `editPrompt.ts` — Targeted Refinement

Used in the iterative refinement loop. Given the QC scores, it categorizes each dimension as "correct" (score ≥ 7, protect these) or "needs improvement" (score < 7, fix these). Instructs Gemini to make minimal, surgical corrections only to failing dimensions, while preserving everything that scored well. Includes the original generation instructions (to maintain style/pose/angle) and the product analysis JSON (as positional ground truth for any location-based corrections).

### `realismDirectives.ts` — Photorealism Rules

Applied to on-figure and lifestyle modes. Three context variants (studio, lifestyle, campaign). Contains granular rules for:

- **Skin realism** — adults: visible pores, subsurface scattering, natural under-eye shadows, Fresnel specular falloff, knuckle creases. Children: age-appropriate smooth texture without plastic appearance.
- **Fabric realism** — micro-wrinkles at joints, gravity-responsive hem, thread-level texture, compression shadows, organic fold formation (no mathematically perfect symmetry).
- **Shadow and light realism** — context-appropriate shadow direction, atmospheric perspective (lifestyle), dramatic directional lighting (campaign), ambient occlusion in folds.
- **Anti-artifact prohibitions** — explicit list of CGI tells to avoid: uniform skin smoothing, perfectly symmetric faces, plastic/waxy skin, duplicated seams, floating fabric, inconsistent light direction.

---

## 7. Quality Control System

Lumina uses three independent QC layers that run in sequence and are combined into a final composite score.

### Layer 1 — Semantic QC (Server, AI-based)

Gemini 2.5 Flash (text/vision model) sees both the original reference and the generated image, alongside the ground truth analysis JSON. It scores the generated image against the reference.

**Product QC (7 dimensions):**

| Dimension | What it measures | Pass threshold |
|---|---|---|
| colorAccuracy | Exact color match — any shifts, saturation changes, tone differences | ≥ 7 |
| configurationMatch | Shape, layout, arrangement — multi-section direction, overall footprint | ≥ 8 (stricter) |
| componentCount | All components present and counted correctly — 0 if any are missing | ≥ 7 |
| proportionFidelity | Relative size relationships between sections and components | ≥ 7 |
| constructionDetails | Seams, joints, hardware, stitching, structural elements preserved | ≥ 7 |
| brandingPreservation | Logos and text at exact positions, scale, and color (10 if no branding) | ≥ 7 |
| overallFidelity | Generated product immediately recognizable as the same product | ≥ 7 |

**Garment QC (5 dimensions):**

| Dimension | What it measures | Pass threshold |
|---|---|---|
| colorAccuracy | Garment color fidelity — any shifts or saturation changes | ≥ 7 |
| graphicPreservation | Logos, prints, graphics reproduced exactly (0 = missing/distorted, 10 = exact) | ≥ 7 |
| silhouetteMatch | Shape, sleeve length, hem position, neckline match | ≥ 7 |
| textureMatch | Fabric texture and material appearance fidelity | ≥ 7 |
| overallFidelity | Overall garment accuracy | ≥ 7 |

**Pass criteria:**
- Products: ALL dimensions ≥ 7 AND configurationMatch ≥ 8
- Garments: ALL dimensions ≥ 7

The QC call also returns a `issues[]` array with specific human-readable descriptions of failures found. These are used in the edit prompt for the refinement loop.

### Layer 2 — Pixel QC (Browser, Deterministic)

Four metrics computed entirely in the browser using Canvas API, comparing original reference to generated output (both resized to 512×512):

**SSIM (Structural Similarity Index):** Measures luminance, contrast, and structural pattern similarity using 8×8 sliding windows with ITU-R BT.601 luminance weighting. Scores 0–100. Sensitive to geometric changes — missing components, shape distortions, and layout shifts will drop this score.

**CIELAB Color Delta (ΔE):** Converts pixels to CIELAB color space (via sRGB → linear → XYZ D65 → CIELAB) and measures average perceptual color distance. Inverted to 100 − (ΔE × 5), scored 0–100. More accurate than RGB distance for how humans perceive color difference. Catches color drift that looks subtle in RGB but is perceptually significant.

**Sobel Edge Overlap:** Applies a 3×3 Sobel operator to both images to extract edge maps, then computes the intersection-over-union of the two edge maps. Scores 0–100. Catches cases where the model generates the right colors and textures but with wrong structural lines or wrong component positions.

**Histogram Match:** Computes per-channel RGB histogram (256 bins) for both images and measures intersection similarity across all three channels. Scores 0–100. Detects global tone, brightness, and color distribution differences even when local structure appears correct.

### Layer 3 — Composite Scoring (Browser)

Semantic average and pixel average are blended based on the generation mode:

For modes where the background intentionally changes (on-figure, lifestyle, campaign, room scene, lifestyle vignette, in-context): **80% semantic + 20% pixel.** Pixel comparison penalizes correct results because the background is supposed to be different from the reference.

For clean-cut modes (studio, hardlines clean-cut, hardlines hero, home clean-cut): **60% semantic + 40% pixel.** Background is neutral in both reference and output, so pixel similarity is a meaningful signal.

Final composite score is 0–100. Pass threshold: 75.

### Iterative Refinement Logic

The refinement loop runs on the server after the initial generation:

- Maximum 3 edit iterations
- Stops early if the overall fidelity score improves by fewer than 3 points from the previous iteration (stagnation detection — prevents wasting API calls on diminishing returns)
- Each iteration uses the edit prompt to make targeted corrections, not a full regeneration from scratch
- After each edit, QC is re-run and the loop evaluates whether to continue

---

## 8. Risk Profiling System

Before generation, the pipeline identifies which of 12 specific failure modes are likely for this product. Each identified risk flag causes a corresponding constraint string to be injected into the generation prompt, labeled "high priority — failure to comply invalidates the image."

### The 12 Risk Flags

| Flag | Triggers when | Static constraint injected |
|---|---|---|
| `reflective_surface` | Glossy, polished, or mirror-like surfaces | Zero tolerance for highlight displacement. Reflections must match reference light physics exactly. |
| `many_small_components` | More than 5 small discrete parts | Count every discrete component. If the reference shows N items, output must show exactly N. |
| `micro_text_logo` | Small text, detailed logos, or fine print | Logo and text must remain pixel-consistent — no blur, no distortion, exact positioning and size. |
| `symmetry_critical` | Product requires bilateral or radial symmetry | Bilateral or radial symmetry must be geometrically exact. Do not break symmetry. |
| `repeating_elements` | Repeating patterns (buttons, cushions, slats, ports) | Repeating elements must match the exact count from the reference. Do not add or remove any. |
| `transparent_material` | Glass, crystal, mesh, see-through elements | Transparency and refraction must match reference light physics. Preserve see-through quality. |
| `complex_pattern` | Intricate surface patterns (herringbone, plaid, damask) | Surface pattern must be continuous and unbroken. No pattern drift, misalignment, or simplification. |
| `high_contrast_branding` | Prominent logos or branding | Branding must be reproduced at the exact position, scale, color, and contrast as the reference. |
| `multi_section_config` | Modular or sectional layout (L-shape, U-shape) | Multi-section configuration is CRITICAL. Preserve exact layout direction, section count, and footprint shape. |
| `curved_organic_shape` | Flowing organic curves | Organic curves must flow continuously. No flattening, straightening, or artificial angularity. |
| `color_sensitive` | Subtle colors prone to AI enhancement (pastels, off-whites, muted tones) | Reproduce the exact product color — do NOT enhance, saturate, or beautify. The reference color is correct as-is. |
| `decorative_element_placement` | Ribbons, bows, patches, trim with fixed positions | ALL decorative elements are structurally fixed at their reference positions. Any displacement is a critical failure. |

### Fidelity Constraints (Built from Analysis)

In addition to the static risk constraints, two dynamic blocks are injected if the analysis provides the data:

**COLOR LOCK** — Built from the pixel-accurate palette extracted by the browser. Lists each hex color with its percentage coverage. Explicitly states these are measured values, not estimates, and forbids any color enhancement, saturation shift, or hue adjustment.

**ELEMENT POSITION LOCK** — Built from the `structuralDecorativeElements` and `graphicElements` arrays in the analysis JSON. For each element, states its exact fixed position (quadrant + percentage from edge) and labels any displacement a critical failure.

---

## 9. Manual Editing (Inpainting)

After a generation completes, the user can switch to drawing mode. A mask canvas overlays the generated image. The user draws in white over the areas they want modified, leaving the rest black (locked). They type a natural language instruction ("remove the wrinkle on the left sleeve", "darken the logo", "add a shadow under the right edge").

The mask, the instruction, the generated image, and the original reference are sent to `/api/manual-edit`. The server calls Gemini with an inpainting prompt: edit only the white mask regions, ensure seamless blending at the borders, lock everything in the black regions. Gemini returns the modified image.

The result is displayed and saved to history as a new entry linked to the original generation (same parent ID, incremented iteration count). QC scores are re-computed on the edited result.

This pathway bypasses the automated refinement loop entirely — it's for cases where the user sees a specific visual issue they want to address directly.

---

## 10. Generation History

Each completed generation (including manual edits) is automatically saved to IndexedDB in the browser. History is local — it is not synced to any server or shared across devices.

**Each entry stores:**
- Thumbnail (50×50px compressed)
- Mode and category
- QC scores (semantic + pixel)
- Composite score and pass/fail
- Issues list from QC
- Risk profile (flags and descriptions)
- Iteration count
- Request summary (category, mode, color description)
- Timestamp

**Capacity:** 50 entries maximum. Oldest entries are evicted automatically when the limit is reached (FIFO).

**Access:** The History panel is accessible from the header. Clicking any entry loads that result back into the main canvas with all its scores and metadata.

History can be cleared entirely with a confirmation dialog.

---

## 11. Known Failure Modes & Mitigations

| Failure Mode | Status | Mitigation in place |
|---|---|---|
| Color drift — AI "beautifies" muted/subtle colors toward more vivid versions | Resolved | Client-side k-means extracts pixel-accurate hex palette; COLOR LOCK block in prompt forbids enhancement |
| Decorative element positional drift — ribbons, bows, patches appear in wrong location | Resolved | ELEMENT POSITION LOCK with quadrant+percentage coordinates; `decorative_element_placement` risk flag |
| Visible clothing tags rendered in output | Resolved | Rule 7 (TAG SUPPRESSION) in global system instruction |
| Product type config mismatch — user selects wrong category | Mitigated | `validateConfig()` compares user selection against AI-extracted type; high-severity warning shown |
| Component miscounting — AI omits or adds buttons, cushions, ports | Mitigated | `many_small_components` risk flag + constraint; `componentCount` QC dimension with 0 penalty for missing items |
| Endless refinement with no improvement | Mitigated | Score improvement threshold (≥3 points required) + MAX_EDIT_RETRIES hard cap of 3 |
| Text and logo blur or distortion | Mitigated | `micro_text_logo` risk flag; `graphicPreservation` QC dimension |
| Multi-section layout direction flip | Mitigated | `multi_section_config` risk flag; `configurationMatch` QC dimension with stricter ≥8 threshold |
| Color shift on transparent/glass products | Mitigated | `transparent_material` risk flag with refraction physics constraint |
| Complex pattern drift or simplification | Mitigated | `complex_pattern` risk flag with continuity constraint |

---

## 12. Competitive Landscape

### How leading competitors approach similar workflows

**Photoroom**
Dominant in background removal and simple backdrop replacement. The tool excels at one job: isolate the product, place it on a solid or gradient background. Very fast (3–5 seconds), very high volume (designed for 100s of products/day). Does not generate models, scenes, or lifestyle environments from scratch. No fidelity QC. Targets mass-market e-commerce with lower quality ceilings.

**Pebblely**
Three-step flow: upload product → choose scene → download. Minimal configuration, no fidelity guarantees, no iterative refinement. Generates a lifestyle background around the product. 5–10 second output time. Targets non-technical users who need results quickly without understanding the underlying model. Quality ceiling is noticeably lower than generation-from-scratch systems.

**Booth.ai**
The closest conceptual match to Lumina — full scene generation around a product reference image. Similar positioning and similar output goals. No visible QC system, no risk analysis, no iterative refinement loop. The prompting is largely opaque to the user. Less auditable, less structured, but a simpler product experience.

**Flair.ai**
Drag-and-drop scene composition. The user manually places the product image into pre-built scene templates or generates a custom background. High scene quality; product fidelity is not systematically enforced — the product is composited in, not generated with the scene. More user control over placement; less automated quality assurance.

**Claid.ai**
Image enhancement rather than generation. Best-in-class for upscaling, sharpening, background removal, and object enhancement. Not a generation tool. Complements generation tools (you could run Lumina output through Claid for further enhancement) but doesn't compete directly.

**Adobe Firefly (Generative Fill)**
Best raw inpainting quality in the market. General-purpose, not product-photography specialized. Requires entirely manual workflow — the user must select regions, write prompts, and iterate by hand. No automated QC, no fidelity system, no product analysis. Suited for individual creators; not a structured e-commerce workflow.

**Ideogram / Midjourney / DALL-E**
General text-to-image generation. Cannot reliably reproduce a specific product from a reference image — they interpret the description rather than copying the reference. No structured product analysis, no QC, high hallucination rate for complex products. Not suitable for e-commerce fidelity requirements.

### Key Lumina differentiators

No single competitor currently combines all of the following:

- **Pre-flight risk analysis** — detects 12 specific failure modes before generation and injects targeted constraints
- **Structured ground truth extraction** — product analysis JSON extracted before generation, not guessed by the model during generation
- **Iterative refinement with semantic QC** — automatic multi-pass correction with score-stagnation detection
- **Pixel-accurate color extraction** — client-side k-means provides exact hex values, not AI color estimates
- **Structural element position locking** — explicit coordinates for decorative elements prevent displacement
- **Three-layer QC** — server semantic + browser pixel + weighted composite scoring
- **Full auditability** — risk profile, all QC scores, iteration count, and issues list surfaced to users
- **Multi-category depth** — 11 modes covering apparel, home, and hardlines with specialized prompts per mode

---

## 13. Concrete Improvement Suggestions

### Immediate — Low effort, high impact

**1. Prompt caching for system instruction**
Gemini supports context caching for repeated prefix content. The SYSTEM_INSTRUCTION is passed with every API call — analysis, risk analysis, generation, QC, and edit calls. Caching this prefix could reduce per-call input token cost by 50–75%. Across 5–7 Gemini calls per generation, the total cost reduction is approximately 30–40%. Implementation requires creating a cached context at server startup and passing the cache handle to each call instead of the full string.

**2. ~~Combine product analysis + risk into one call~~ — Implemented**
`analyzeProduct()` and `identifyRisks()` have been merged into a single `analyzeProductAndRisks()` call (and equivalently for garments). The combined prompt returns `{ analysis, risks }` in one Gemini response, saving one full API round-trip per generation. Latency reduction: 3–8 seconds.

**3. Tag presence as a QC dimension**
Tag suppression is now instructed during generation (Rule 7 in the system instruction). The QC check should also verify it. Adding a `tagPresence` dimension to the garment QC prompt (score of 10 = tag-free output, 0 = tag visible) closes the loop: the model is instructed to omit tags, and if one appears, the QC fails and the refinement loop automatically attempts to remove it.

**4. Garment QC dimension expansion**
On-figure garments are currently scored on 5 dimensions. Adding `tagPresence` (above) and `foldNaturalness` (does the fabric drape look physically realistic vs. stiff or CGI) would catch two additional recurring failure modes that currently only fail the composite score, not the semantic dimensions.

### Short-term — Medium effort

**5. Vercel timeout risk**
In the worst case, the pipeline makes 7 sequential Gemini API calls: analysis, risk, generation, QC, edit iteration 1, QC, edit iteration 2, QC. Vercel Pro functions have a 60-second timeout. On slow Gemini response days, this pipeline can exceed the timeout, resulting in a silent failure from the user's perspective. The SSE streaming architecture already handles long-running requests well — migrating the pipeline function to Modal, AWS Lambda (with 5-minute timeout), or a Vercel background function would eliminate this ceiling entirely without changing the client code.

**6. Product isolation preprocessing**
Before sending the reference image to Gemini, run a background removal step (rembg, PhotoroomAPI, or similar). Sending an isolated product on a transparent background would improve color extraction accuracy (the k-means luminance filtering is good but not perfect) and prevent the model from inheriting stylistic cues from the reference background. Expected quality improvement: 5–15% for products photographed in-situ (on a table, in a room) rather than already on white.

**7. Cloud-backed history**
Current history is IndexedDB — browser-local, cleared if the user switches devices or browsers, and not shareable with teammates. A server-side history store (a simple database table: user_id, entry_json, created_at, thumbnail_url) would enable team review workflows and cross-device access. This is likely the single highest-requested feature for any team using the tool collaboratively.

**8. Configuration template saving**
Allow saving a full generation configuration (category, mode, garment/product config, model config, aspect ratio, brand profile) as a named template. Repeat product photography (same type and style, different colorways or SKUs) is a primary use case. Currently users re-configure from scratch every session, which introduces inconsistency and friction.

**9. Expand additional images to 4**
Gemini 2.5 Flash supports more images per call than the current 2-additional-image cap. For complex products (large sectional sofas, laptops with multiple ports, apparel with hidden construction details) a third or fourth additional view (bottom, back-detail, tag-detail, texture closeup) measurably improves structural fidelity. The server already handles multiple images in a loop — only the UI cap needs adjustment.

### Medium-term — Significant architectural effort

**10. Batch variation generation**
Generate 2–3 variations of the same request simultaneously using parallel Gemini calls, automatically surface the highest-scoring variation as the primary result, and show the others as selectable alternatives. This replaces the sequential edit-retry loop for many cases — instead of attempting to fix one generation over 3 iterations, you get 3 independent attempts and pick the best. API cost doubles or triples, but latency for the best result is lower, and users avoid the frustrating experience of watching 3 sequential retries.

**11. Brand style reference image**
Allow uploading a secondary "style reference" image — an existing campaign photo that represents the aesthetic the user wants. This is passed to the generation prompt as a visual anchor for composition, color grade, and scene atmosphere (while the product reference anchors the product itself). Flair.ai uses a manual version of this concept; automating it via the existing multi-image pipeline would be differentiating for brand teams with established visual identities.

**12. QC threshold calibration per mode**
The 7/10 pass threshold is uniform across all modes and dimensions. A flatlay with a 6.5 on `constructionDetails` (the surface texture rendered slightly differently) may be commercially acceptable; an on-figure with a 6.5 on `colorAccuracy` is not. Mode-specific and dimension-specific thresholds (stored in a configuration object, potentially overridable per brand profile) would reduce false failures and unnecessary retries by an estimated 15–20%.

**13. Export format options**
Currently PNG only. WebP would reduce file size by 25–35% for web delivery (key for page load speed). TIFF is required for print workflows. A ZIP export of all generated variations from a session would support team review and approval workflows where stakeholders need to compare options.

### Strategic — Long-term

**14. Decouple product isolation from scene generation**
The current architecture generates the final composite in a single Gemini call (product + model/scene together). Higher-fidelity systems decouple this into two steps: Step 1 generates a clean isolated product on white, Step 2 composites it into a generated scene. The two-step approach reduces hallucination (the product is fixed before the scene is generated), allows the same isolated product to be reused across multiple scene variants at low marginal cost, and gives more compositional control. This is the architecture used by the highest-fidelity commercial tools.

**15. Consistent virtual model identity per brand**
Currently, the model (person) in on-figure shots is regenerated from scratch each time. Even with identical model config settings, the resulting person looks different. Brand catalogs require visual consistency — the same "model" appearing across all product pages. Implementing a reusable virtual model identity per brand (via LoRA fine-tuning or IP-Adapter-style conditioning) would produce consistent-looking models across a brand's entire catalog. This requires a fine-tuning infrastructure that doesn't currently exist.

**16. Ghost mannequin mode**
A high-demand specialized apparel format for e-commerce: photograph garment on mannequin, then remove the mannequin via segmentation, leaving the garment appearing to be worn by an invisible figure. This format is standard on Amazon, Shopify, and wholesale platforms. It shows the garment's 3D structure and collar/neck shape more clearly than a flatlay while avoiding model costs. Addressable as a two-step pipeline: on-figure generation followed by mannequin segmentation and removal.

**17. Multi-product lifestyle scenes**
Generate lifestyle shots featuring multiple products in the same scene (lamp + side table + rug; laptop + notebook + coffee cup). Requires coordinated scene generation across multiple product references, which is architecturally more complex but creates a much richer lifestyle output, particularly for home and workspace categories where context storytelling drives purchase decisions.

---

## 14. Open Questions for the Team

These are unresolved design decisions that have architectural or product implications worth discussing before building:

- What are the most common failure modes observed in real production usage that are not covered by the current 12 risk flags?
- Should the QC pass threshold be configurable per brand profile (brands with higher fidelity requirements set it to 8/10), or should it remain global?
- Is there a target cost-per-image ceiling? Analysis/risk call merging is already implemented (saves one round-trip per generation). Prompt caching for the analysis prompt could further reduce per-call input token cost, but requires infrastructure setup (pre-created cache IDs stored as env vars).
- Should cloud history use user accounts (requires authentication infrastructure) or anonymous session tokens (simpler, but no cross-device continuity)?
- What is the acceptable P95 latency ceiling for user experience? Current estimate is 25–40 seconds in the worst case with retries. Background worker migration could reduce this but adds infrastructure complexity.
- Are there additional product categories beyond Apparel, Home, and Hardlines that have been requested? (Automotive, Food/Beverage, Cosmetics/Beauty, Jewelry are natural expansions.)

---

*Last updated: auto-generated from codebase exploration. Reflects the current state of `main` branch.*
