import { buildProductAnalysisPrompt } from '../src/prompts/productAnalysisPrompt.js';
import type { ProductSuggestions, ProductCategory } from '../src/types/index.js';
import { getAI, extractText, cleanJson, applyRepetition } from './_utils.js';

const TEXT_MODEL = 'gemini-2.5-flash';

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    const { imageBase64, imageMimeType } = req.body as { imageBase64: string; imageMimeType: string };

    const parts: any[] = [
      { text: applyRepetition(buildProductAnalysisPrompt()) },
      { inlineData: { mimeType: imageMimeType, data: imageBase64 } },
    ];

    const response = await getAI().models.generateContent({
      model: TEXT_MODEL,
      contents: [{ parts }],
      config: { responseModalities: ['TEXT'] },
    });

    const text = extractText(response);
    if (!text) throw new Error('Analysis returned empty response.');

    const analysis = JSON.parse(cleanJson(text));

    let category: ProductCategory = 'apparel';
    const typeText = (analysis.productType || analysis.type || '').toLowerCase();
    if (typeText.match(/sofa|chair|table|lamp|decor|furniture|kitchenware|bed/)) category = 'home';
    else if (typeText.match(/electronics|gadget|watch|phone|tool|automotive|sports/)) category = 'hardlines';

    const result: ProductSuggestions = {
      category,
      type: analysis.productType || analysis.type,
      colorDescription: analysis.color,
      material: analysis.material,
      finish: analysis.finish,
    };

    res.setHeader('Content-Type', 'application/json');
    res.status(200).json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message ?? 'Suggestions failed' });
  }
}
