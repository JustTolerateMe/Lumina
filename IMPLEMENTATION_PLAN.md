# Multi-Image Input + Edit-Based Retry (Iterative Refinement)

## Context

Two problems to solve:

**Problem 1 — Single-image input limits fidelity.** Currently only one reference image (e.g. a front flatlay) is sent to Gemini. If the garment has back details, logos, or different angles, the model has to guess — leading to hallucinated or missing features.

**Problem 2 — Retry is broken by design.** When QC fails (e.g. score 49), the current retry builds a new prompt and sends it with the **original reference image only** — generating a **brand new image from scratch**. This means it might fix one issue but introduce three new ones, because it has no memory of what it already got right. The QC system *knows* the specific issues ("stripe distortion", "wrong texture") but this knowledge is wasted on a from-scratch regeneration.

**Solution:** Gemini's `generateContent` API supports sending an existing image back with edit instructions (same endpoint, same API — you just include the generated image as input). The retry should send the **failed output image + the original reference + targeted edit instructions**, so Gemini makes **local edits** to the existing image rather than starting over.

---

## Feature A: Multi-Image Upload (up to 3 reference images)

Gemini 2.5 Flash Image accepts up to **3 input images** per `generateContent` call. We'll allow users to upload additional reference angles.

### A1. Expand `UploadedImage` and upload state

**File: `src/hooks/useUpload.ts`**

Currently exports a single `image` state. Change to support multiple images.

**Current code (lines 1-44):**
```typescript
export interface UploadedImage {
  file: File;
  base64: string;
  mimeType: string;
  previewUrl: string;
}

export function useUpload() {
  const [image, setImage] = useState<UploadedImage | null>(null);
  // ...
  return { image, error, loading, handleFile, clear };
}
```

**Change to:**
```typescript
export interface UploadedImage {
  file: File;
  base64: string;
  mimeType: string;
  previewUrl: string;
  label?: string; // 'front' | 'back' | 'detail' — optional, for prompt labeling
}

export function useUpload() {
  const [image, setImage] = useState<UploadedImage | null>(null);             // primary (unchanged)
  const [additionalImages, setAdditionalImages] = useState<UploadedImage[]>([]); // new: up to 2 more

  // New function — adds an additional reference image (max 2 extras = 3 total)
  const handleAdditionalFile = useCallback(async (file: File, label?: string) => {
    if (additionalImages.length >= 2) return; // max 3 total (1 primary + 2 additional)
    const validationError = validateImageFile(file);
    if (validationError) { setError(validationError); return; }
    try {
      const { base64, mimeType } = await fileToBase64(file);
      const previewUrl = URL.createObjectURL(file);
      setAdditionalImages(prev => [...prev, { file, base64, mimeType, previewUrl, label }]);
    } catch { setError('Failed to process image.'); }
  }, [additionalImages.length]);

  // New function — remove additional image by index
  const removeAdditionalImage = useCallback((index: number) => {
    setAdditionalImages(prev => {
      const removed = prev[index];
      if (removed?.previewUrl) URL.revokeObjectURL(removed.previewUrl);
      return prev.filter((_, i) => i !== index);
    });
  }, []);

  // Modify existing clear() to also clear additional images
  const clear = useCallback(() => {
    if (image?.previewUrl) URL.revokeObjectURL(image.previewUrl);
    additionalImages.forEach(img => { if (img.previewUrl) URL.revokeObjectURL(img.previewUrl); });
    setImage(null);
    setAdditionalImages([]);
    setError(null);
  }, [image, additionalImages]);

  return { image, additionalImages, error, loading, handleFile, handleAdditionalFile, removeAdditionalImage, clear };
}
```

### A2. Expand `BaseGenerationRequest` type

**File: `src/types/index.ts`** (lines 100-106)

**Current:**
```typescript
export interface BaseGenerationRequest {
  aspectRatio: AspectRatio;
  imageSize: ImageSize;
  sourceImageBase64: string;
  sourceImageMimeType: string;
  customInstructions?: string;
}
```

**Change to:**
```typescript
export interface AdditionalImage {
  base64: string;
  mimeType: string;
  label?: string; // 'back', 'detail', 'logo_closeup', etc.
}

export interface BaseGenerationRequest {
  aspectRatio: AspectRatio;
  imageSize: ImageSize;
  sourceImageBase64: string;
  sourceImageMimeType: string;
  additionalImages?: AdditionalImage[];  // NEW — up to 2 extra reference images
  customInstructions?: string;
}
```

### A3. Add "Additional Angles" UI below UploadZone

**File: `src/components/upload/UploadZone.tsx`**

After the primary image preview, add a section for additional images. Only show this section when a primary image is already uploaded.

**Add new props to UploadZone:**
```typescript
interface Props {
  image: UploadedImage | null;
  additionalImages: UploadedImage[];       // NEW
  onFile: (file: File) => void;
  onAdditionalFile: (file: File) => void;  // NEW
  onRemoveAdditional: (index: number) => void; // NEW
  onClear: () => void;
}
```

**Add after the primary image preview div (after line 41), inside the `if (image)` block:**

```tsx
{/* Additional References — only show when primary image exists */}
{image && (
  <div className="mt-2">
    <div className="flex items-center justify-between mb-1.5">
      <span className="text-[10px] text-zinc-500 uppercase tracking-wider">
        Additional Angles (optional)
      </span>
      <span className="text-[10px] text-zinc-600">{additionalImages.length}/2</span>
    </div>

    <div className="flex gap-2">
      {/* Show existing additional images as small thumbnails */}
      {additionalImages.map((img, i) => (
        <div key={i} className="relative w-16 h-16 rounded-lg overflow-hidden bg-zinc-900 border border-zinc-700">
          <img src={img.previewUrl} alt={img.label || `Angle ${i + 2}`} className="w-full h-full object-cover" />
          <button
            onClick={() => onRemoveAdditional(i)}
            className="absolute top-0.5 right-0.5 bg-zinc-900/80 rounded-full p-0.5"
          >
            <X size={10} />
          </button>
        </div>
      ))}

      {/* Add button — only if < 2 additional images */}
      {additionalImages.length < 2 && (
        <label className="w-16 h-16 rounded-lg border border-dashed border-zinc-700 flex items-center justify-center cursor-pointer hover:border-violet-500 transition-colors">
          <Plus size={14} className="text-zinc-500" />
          <input type="file" accept="image/jpeg,image/png,image/webp" className="hidden"
            onChange={(e) => e.target.files?.[0] && onAdditionalFile(e.target.files[0])} />
        </label>
      )}
    </div>
  </div>
)}
```

**Import `Plus` from lucide-react** at the top:
```typescript
import { Upload, X, Plus } from 'lucide-react';
```

### A4. Wire additional images in App.tsx

**File: `src/App.tsx`**

1. Destructure new values from `useUpload()`:
```typescript
// Line 30 — currently:
const { image, handleFile, clear } = useUpload();
// Change to:
const { image, additionalImages, handleFile, handleAdditionalFile, removeAdditionalImage, clear } = useUpload();
```

2. Pass new props to `UploadZone` (around line 214):
```tsx
<UploadZone
  image={image}
  additionalImages={additionalImages}
  onFile={handleFile}
  onAdditionalFile={handleAdditionalFile}
  onRemoveAdditional={removeAdditionalImage}
  onClear={clear}
/>
```

3. Include additional images in the generation request `base` object (around line 135):
```typescript
const base = {
  aspectRatio,
  imageSize,
  sourceImageBase64: image.base64,
  sourceImageMimeType: image.mimeType,
  additionalImages: additionalImages.map(img => ({
    base64: img.base64,
    mimeType: img.mimeType,
    label: img.label,
  })),
};
```

### A5. Pass additional images to Gemini in the `generateContent` calls

**File: `src/services/geminiService.ts`**

This is the most critical change. Every `generateContent` call that sends images needs to also send additional reference images.

**Create a helper function** (add after the `cleanJson` function, around line 106):

```typescript
/**
 * Build the `parts` array for a generateContent call.
 * Always includes the text prompt + primary image.
 * Optionally includes additional reference images from the request.
 */
function buildContentParts(
  prompt: string,
  req: { sourceImageBase64: string; sourceImageMimeType: string; additionalImages?: { base64: string; mimeType: string; label?: string }[] }
): Array<{ text: string } | { inlineData: { mimeType: string; data: string } }> {
  const parts: Array<{ text: string } | { inlineData: { mimeType: string; data: string } }> = [
    { text: prompt },
    { inlineData: { mimeType: req.sourceImageMimeType, data: req.sourceImageBase64 } },
  ];

  if (req.additionalImages && req.additionalImages.length > 0) {
    for (const img of req.additionalImages) {
      parts.push({ inlineData: { mimeType: img.mimeType, data: img.base64 } });
    }
  }

  return parts;
}
```

**Then replace all `parts:` arrays in image generation calls.**

There are **4 places** where images are sent to `IMAGE_MODEL` (the image generation model):

**Location 1: On-figure initial generation (line 470-482)**
```typescript
// CURRENT:
contents: [{
  parts: [
    { text: prompt },
    { inlineData: { mimeType: req.sourceImageMimeType, data: req.sourceImageBase64 } },
  ],
}],
// CHANGE TO:
contents: [{
  parts: buildContentParts(finalPrompt, req),
}],
```

**Location 2: On-figure retry (line 510-522)**
This will be replaced entirely by the edit-based retry in Feature B.

**Location 3: Universal pipeline initial generation (line 607-619)**
```typescript
// CURRENT:
contents: [{
  parts: [
    { text: prompt },
    { inlineData: { mimeType: req.sourceImageMimeType, data: req.sourceImageBase64 } },
  ],
}],
// CHANGE TO:
contents: [{
  parts: buildContentParts(finalPrompt, req),
}],
```

**Location 4: Universal pipeline retry (line 647-659)**
This will be replaced entirely by the edit-based retry in Feature B.

**Also update the prompt text** to label the images when additional angles are present. In both `generateOnFigure` and `generate`, right before the `generateContent` call, prepend labels if additional images exist:

```typescript
// Add this right before the generateResponse call:
let imageLabel = '';
if (req.additionalImages && req.additionalImages.length > 0) {
  imageLabel = `\n\nMULTIPLE REFERENCE IMAGES PROVIDED:
- Image 1 (primary): Front/main view of the product
${req.additionalImages.map((img, i) => `- Image ${i + 2}${img.label ? ` (${img.label})` : ''}: Additional reference angle`).join('\n')}
Use ALL reference images to ensure maximum fidelity. Every detail visible in any reference must be preserved.`;
}
const finalPrompt = prompt + imageLabel;
```

Then use `finalPrompt` instead of `prompt` in the `buildContentParts` call.

### A6. Also pass additional images to analysis calls

**File: `src/services/geminiService.ts`**

The `analyzeProduct()` function (line 145) and `analyzeGarment()` function (line 288) currently only receive a single image. They need to accept and pass additional images too.

**Change `analyzeProduct` signature** (line 145):
```typescript
async function analyzeProduct(
  imageBase64: string,
  imageMimeType: string,
  additionalImages?: { base64: string; mimeType: string; label?: string }[]
): Promise<string> {
```

**Change its parts array** to also include additional images:
```typescript
parts: [
  { text: applyRepetition(buildProductAnalysisPrompt()) },
  { inlineData: { mimeType: imageMimeType, data: imageBase64 } },
  ...(additionalImages ?? []).map(img => ({ inlineData: { mimeType: img.mimeType, data: img.base64 } })),
],
```

**Same change for `analyzeGarment`** (line 288).

**Update callers** to pass `req.additionalImages`:
- Line 455-458 (`analyzeGarment` call in `generateOnFigure`): add `req.additionalImages` as third argument
- Line 579-582 (`analyzeProduct` call in `generate`): add `req.additionalImages` as third argument

---

## Feature B: Edit-Based Retry (Iterative Refinement)

This is the critical fix. Instead of regenerating from scratch, send the **failed generated image** back to Gemini with targeted edit instructions.

### B1. Create the edit prompt builder

**File: `src/prompts/editPrompt.ts`** (NEW FILE)

```typescript
import { QCResult } from '../types';

/**
 * Build a targeted edit prompt for refining an already-generated image.
 * Instead of regenerating from scratch, this tells Gemini to fix specific issues
 * in the existing image while keeping everything else intact.
 */
export function buildEditPrompt(
  qcResult: QCResult,
  analysisJson: string
): string {
  const issuesList = qcResult.issues.map(i => `- ${i}`).join('\n');

  // Identify what's GOOD (scores >= 7) to explicitly say "don't touch these"
  const scores = qcResult.scores;
  const goodAreas: string[] = [];
  const badAreas: string[] = [];

  for (const [key, value] of Object.entries(scores)) {
    if (key === 'overallFidelity') continue; // skip aggregate
    const label = key
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, s => s.toUpperCase())
      .trim();

    if ((value as number) >= 7) {
      goodAreas.push(label);
    } else {
      badAreas.push(`${label} (score: ${value}/10)`);
    }
  }

  return `You are editing an existing product photograph to fix specific quality issues.
The first image is the GENERATED PHOTO that needs fixes.
The second image is the ORIGINAL REFERENCE product.

ORIGINAL PRODUCT ANALYSIS (ground truth):
${analysisJson}

AREAS THAT ARE CORRECT — DO NOT MODIFY THESE:
${goodAreas.length > 0 ? goodAreas.map(a => `- ${a}: CORRECT, preserve exactly as-is`).join('\n') : '- (none identified as fully correct)'}

AREAS THAT NEED FIXING — MAKE TARGETED EDITS:
${badAreas.map(a => `- ${a}: NEEDS IMPROVEMENT`).join('\n')}

SPECIFIC ISSUES TO FIX:
${issuesList}

EDITING RULES:
1. Make MINIMAL changes — only fix the issues listed above
2. Do NOT change the model's pose, face, skin tone, or body position
3. Do NOT change the background or lighting setup
4. Do NOT change areas of the garment/product that scored well
5. Focus surgical corrections on the failing dimensions only
6. The reference image (second image) is the source of truth for what the product should look like

Fix ONLY the listed issues. Everything else must remain identical.`;
}
```

### B2. Change the retry logic in `generateOnFigure`

**File: `src/services/geminiService.ts`** — `generateOnFigure` function (lines 501-532)

**CURRENT retry logic (lines 501-532):**
```typescript
if (!qc.pass && qc.issues.length > 0) {
  iterationCount = 2;
  const failedDimension = qc.issues[0] ?? 'quality issues';
  onProgress(`Refining: fixing ${failedDimension}...`);

  const targetedConstraints = buildTargetedRetryConstraints(qc);
  const retryPrompt = `${prompt}\n\nQUALITY CONTROL FEEDBACK — TARGETED FIXES REQUIRED:\n${targetedConstraints}`;

  const retryResponse = await getAI().models.generateContent({
    model: IMAGE_MODEL,
    contents: [{
      parts: [
        { text: retryPrompt },
        { inlineData: { mimeType: req.sourceImageMimeType, data: req.sourceImageBase64 } },
      ],
    }],
    config: {
      systemInstruction: SYSTEM_INSTRUCTION,
      responseModalities: ['TEXT', 'IMAGE'],
    },
  });

  const retryPart = retryResponse.candidates?.[0]?.content?.parts?.find(
    (p: any) => p.inlineData?.mimeType?.startsWith('image/')
  );

  if (retryPart?.inlineData) {
    generatedBase64 = retryPart.inlineData.data ?? '';
    generatedMime = retryPart.inlineData.mimeType ?? 'image/png';
  }
}
```

**REPLACE WITH:**
```typescript
if (!qc.pass && qc.issues.length > 0) {
  iterationCount = 2;
  const failedDimension = qc.issues[0] ?? 'quality issues';
  onProgress(`Refining: fixing ${failedDimension}...`);

  const editPrompt = buildEditPrompt(qc, analysisJson);

  // Send: edit prompt + GENERATED image (to edit) + ORIGINAL reference (for comparison)
  const editParts: Array<{ text: string } | { inlineData: { mimeType: string; data: string } }> = [
    { text: editPrompt },
    { inlineData: { mimeType: generatedMime, data: generatedBase64 } },       // the image TO EDIT
    { inlineData: { mimeType: req.sourceImageMimeType, data: req.sourceImageBase64 } }, // the reference
  ];

  const retryResponse = await getAI().models.generateContent({
    model: IMAGE_MODEL,
    contents: [{ parts: editParts }],
    config: {
      systemInstruction: SYSTEM_INSTRUCTION,
      responseModalities: ['TEXT', 'IMAGE'],
    },
  });

  const retryPart = retryResponse.candidates?.[0]?.content?.parts?.find(
    (p: any) => p.inlineData?.mimeType?.startsWith('image/')
  );

  if (retryPart?.inlineData) {
    generatedBase64 = retryPart.inlineData.data ?? '';
    generatedMime = retryPart.inlineData.mimeType ?? 'image/png';
  }
}
```

**Key difference:** Instead of sending `(new full prompt + original reference)`, we now send `(edit prompt + generated image + original reference)`. The edit prompt tells Gemini which areas are correct (don't touch) and which areas need fixing (targeted edits only).

### B3. Same change for universal pipeline retry

**File: `src/services/geminiService.ts`** — `generate` function (lines 638-669)

**REPLACE the retry block (lines 638-669) with the same edit-based pattern:**

```typescript
if (!qc.pass && qc.issues.length > 0) {
  iterationCount = 2;
  const failedDimension = qc.issues[0] ?? 'quality issues';
  onProgress(`Auto-refining: fixing ${failedDimension}...`);

  const editPrompt = buildEditPrompt(qc, analysisJson);

  const editParts: Array<{ text: string } | { inlineData: { mimeType: string; data: string } }> = [
    { text: editPrompt },
    { inlineData: { mimeType: generatedMime, data: generatedBase64 } },
    { inlineData: { mimeType: req.sourceImageMimeType, data: req.sourceImageBase64 } },
  ];

  const retryResponse = await getAI().models.generateContent({
    model: IMAGE_MODEL,
    contents: [{ parts: editParts }],
    config: {
      systemInstruction: SYSTEM_INSTRUCTION,
      responseModalities: ['TEXT', 'IMAGE'],
    },
  });

  const retryPart = retryResponse.candidates?.[0]?.content?.parts?.find(
    (p: any) => p.inlineData?.mimeType?.startsWith('image/')
  );

  if (retryPart?.inlineData) {
    generatedBase64 = retryPart.inlineData.data ?? '';
    generatedMime = retryPart.inlineData.mimeType ?? 'image/png';
  }
}
```

### B4. Import `buildEditPrompt` in geminiService.ts

**File: `src/services/geminiService.ts`** — Add to imports (around line 21):

```typescript
import { buildEditPrompt } from '../prompts/editPrompt';
```

### B5. Re-run QC after edit-based retry (optional but recommended)

Currently, after the retry, the code jumps straight to pixel QC. The QC scores shown to the user are from the **first** (failed) attempt. For better UX, re-run the semantic QC after the edit to get updated scores.

**In `generateOnFigure`, after the edit retry block and before pixel QC (after line ~532), add:**

```typescript
// Re-run QC on the edited image to get updated scores
let finalQc = qc;
if (iterationCount === 2) {
  onProgress('Re-checking edited image...');
  finalQc = await checkGarmentQuality(
    req.sourceImageBase64, req.sourceImageMimeType,
    generatedBase64, generatedMime,
    analysisJson
  );
}
```

Then use `finalQc` instead of `qc` for the rest of the function (pixel QC composite, return object).

**Same pattern in the universal `generate` function** — use `verifyProduct` instead of `checkGarmentQuality`.

---

## Files Summary

| File | Action | What changes |
|------|--------|-------------|
| `src/types/index.ts` | EDIT | Add `AdditionalImage` interface, add `additionalImages?` to `BaseGenerationRequest` |
| `src/hooks/useUpload.ts` | EDIT | Add `additionalImages` state, `handleAdditionalFile`, `removeAdditionalImage` functions |
| `src/components/upload/UploadZone.tsx` | EDIT | Add additional image thumbnails + add button below primary upload, new props |
| `src/App.tsx` | EDIT | Destructure new upload values, pass to UploadZone, include in request base |
| `src/prompts/editPrompt.ts` | NEW | `buildEditPrompt(qcResult, analysisJson)` — targeted edit instructions |
| `src/services/geminiService.ts` | EDIT | Add `buildContentParts` helper, update all 4 generation calls to use it, replace both retry blocks with edit-based retry, add `buildEditPrompt` import, pass additional images to analysis calls, optionally re-run QC after edit |

## Build Order

| Step | Task | Depends on |
|------|------|-----------|
| 1 | Add `AdditionalImage` type + expand `BaseGenerationRequest` in `src/types/index.ts` | — |
| 2 | Expand `useUpload.ts` with additional images state/functions | Step 1 |
| 3 | Update `UploadZone.tsx` with additional image UI | Step 2 |
| 4 | Wire everything in `App.tsx` | Steps 2, 3 |
| 5 | Create `src/prompts/editPrompt.ts` | Step 1 (needs QCResult type) |
| 6 | Update `geminiService.ts` — add `buildContentParts` helper, update generation calls to pass all images | Steps 1, 5 |
| 7 | Update `geminiService.ts` — replace both retry blocks with edit-based retry | Step 6 |
| 8 | (Optional) Add post-edit QC re-check in both pipelines | Step 7 |
| 9 | `npx tsc --noEmit` — final compile check | All |

## Verification

1. `npx tsc --noEmit` compiles clean
2. Dev server loads, primary upload still works as before
3. After uploading primary image, "Additional Angles" section appears with add button
4. Can add up to 2 additional images (3 total), remove them individually
5. Clearing primary image also clears additional images
6. Generate with multiple images — check network/console that all images are in the API request
7. When QC fails, retry sends the generated image + reference (not just reference) — verify via console logs or network tab
8. After retry, QC scores should improve (the edit targeted the specific issues rather than regenerating from scratch)

## API Notes for the Implementing Agent

- The Gemini API model used is `gemini-2.5-flash-image` (defined as `IMAGE_MODEL` constant in geminiService.ts line 47)
- Max 3 input images per request for this model
- The `generateContent` API accepts multiple `inlineData` parts — no special endpoint needed
- Image editing and generation use the **exact same API call** — the model detects editing intent from the prompt + presence of an existing image
- The `@google/genai` SDK is already installed and configured via `GoogleGenAI` class
- All API calls go through the `getAI()` helper which manages the singleton instance
- The project uses TypeScript strict mode, Vite, React 19, Tailwind CSS v4
- The `UploadedImage` type is defined in `useUpload.ts` and imported by `UploadZone.tsx`
