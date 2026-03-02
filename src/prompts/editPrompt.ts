import { QCResult } from '../types/index.js';

/**
 * Build a targeted edit prompt for refining an already-generated image.
 * Instead of regenerating from scratch, this tells Gemini to fix specific issues
 * in the existing image while keeping everything else intact.
 */
export function buildEditPrompt(
    qcResult: QCResult,
    analysisJson: string,
    originalPrompt: string
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
The subsequent images are the ORIGINAL REFERENCE product(s).

ORIGINAL GENERATION INSTRUCTIONS (Maintain these styling/pose/environmental constraints!):
---
${originalPrompt}
---

ORIGINAL PRODUCT ANALYSIS (ground truth):
${analysisJson}

AREAS THAT ARE CORRECT — DO NOT MODIFY THESE:
${goodAreas.length > 0 ? goodAreas.map(a => `- ${a}: CORRECT, preserve exactly as-is`).join('\n') : '- (none identified as fully correct)'}

AREAS THAT NEED FIXING — MAKE TARGETED EDITS:
${badAreas.map(a => `- ${a}: NEEDS IMPROVEMENT`).join('\n')}

SPECIFIC ISSUES TO FIX:
${issuesList}

EDITING RULES:
1. Make MINIMAL changes — only fix the issues listed above.
2. Maintain the stylistic instructions, lighting, and camera angle from the Original Generation Instructions.
3. Do NOT change areas of the garment/product that scored well.
4. Focus surgical corrections on the failing dimensions only.
5. The original reference image(s) is the source of truth for what the product should look like structurally.

POSITIONAL FIXES — USE ANALYSIS AS GROUND TRUTH:
When fixing any positional issue, use the ORIGINAL PRODUCT ANALYSIS above to determine
the correct position. The analysis contains the exact structural positions as extracted
from the reference. Do not guess — the analysis is the source of truth for WHERE elements belong.

Fix ONLY the listed issues. Everything else must remain identical.`;
}
