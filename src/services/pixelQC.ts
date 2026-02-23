import { PixelQCScores } from '../types';

const COMPARE_SIZE = 512;

// ── Core: load base64 image into ImageData ───────────────────────────

async function base64ToImageData(
  base64: string,
  mimeType: string,
  targetW: number,
  targetH: number
): Promise<ImageData> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = targetW;
      canvas.height = targetH;
      const ctx = canvas.getContext('2d');
      if (!ctx) { reject(new Error('Canvas context failed')); return; }
      ctx.drawImage(img, 0, 0, targetW, targetH);
      resolve(ctx.getImageData(0, 0, targetW, targetH));
    };
    img.onerror = () => reject(new Error('Image load failed'));
    img.src = `data:${mimeType};base64,${base64}`;
  });
}

// ── Luminance conversion ─────────────────────────────────────────────

function toLuminance(imageData: ImageData): Float32Array {
  const data = imageData.data;
  const pixelCount = imageData.width * imageData.height;
  const lum = new Float32Array(pixelCount);
  for (let i = 0; i < pixelCount; i++) {
    const idx = i * 4;
    lum[i] = 0.299 * data[idx]! + 0.587 * data[idx + 1]! + 0.114 * data[idx + 2]!;
  }
  return lum;
}

// ── 1. SSIM (Structural Similarity Index) ────────────────────────────

function computeSSIM(imgA: ImageData, imgB: ImageData): number {
  const C1 = (0.01 * 255) ** 2;
  const C2 = (0.03 * 255) ** 2;
  const WINDOW = 8;

  const lumA = toLuminance(imgA);
  const lumB = toLuminance(imgB);
  const w = imgA.width;
  const h = imgA.height;

  let ssimSum = 0;
  let count = 0;

  for (let y = 0; y <= h - WINDOW; y += WINDOW) {
    for (let x = 0; x <= w - WINDOW; x += WINDOW) {
      let meanA = 0, meanB = 0;

      for (let wy = 0; wy < WINDOW; wy++) {
        for (let wx = 0; wx < WINDOW; wx++) {
          const idx = (y + wy) * w + (x + wx);
          meanA += lumA[idx]!;
          meanB += lumB[idx]!;
        }
      }
      const n = WINDOW * WINDOW;
      meanA /= n;
      meanB /= n;

      let varA = 0, varB = 0, covar = 0;
      for (let wy = 0; wy < WINDOW; wy++) {
        for (let wx = 0; wx < WINDOW; wx++) {
          const idx = (y + wy) * w + (x + wx);
          const da = lumA[idx]! - meanA;
          const db = lumB[idx]! - meanB;
          varA += da * da;
          varB += db * db;
          covar += da * db;
        }
      }
      varA /= n - 1;
      varB /= n - 1;
      covar /= n - 1;

      const numerator = (2 * meanA * meanB + C1) * (2 * covar + C2);
      const denominator = (meanA * meanA + meanB * meanB + C1) * (varA + varB + C2);
      ssimSum += numerator / denominator;
      count++;
    }
  }

  return count > 0 ? ssimSum / count : 0;
}

// ── 2. CIELAB Color Delta (Delta E) ──────────────────────────────────

function rgbToLab(r: number, g: number, b: number): [number, number, number] {
  // sRGB to linear
  let lr = r / 255;
  let lg = g / 255;
  let lb = b / 255;
  lr = lr > 0.04045 ? ((lr + 0.055) / 1.055) ** 2.4 : lr / 12.92;
  lg = lg > 0.04045 ? ((lg + 0.055) / 1.055) ** 2.4 : lg / 12.92;
  lb = lb > 0.04045 ? ((lb + 0.055) / 1.055) ** 2.4 : lb / 12.92;

  // Linear RGB to XYZ (D65)
  let x = (lr * 0.4124564 + lg * 0.3575761 + lb * 0.1804375) / 0.95047;
  let y = (lr * 0.2126729 + lg * 0.7151522 + lb * 0.0721750) / 1.00000;
  let z = (lr * 0.0193339 + lg * 0.1191920 + lb * 0.9503041) / 1.08883;

  // XYZ to CIELAB
  const f = (t: number) => t > 0.008856 ? t ** (1 / 3) : (7.787 * t) + 16 / 116;
  const fx = f(x);
  const fy = f(y);
  const fz = f(z);

  return [116 * fy - 16, 500 * (fx - fy), 200 * (fy - fz)];
}

function computeAverageColorDelta(imgA: ImageData, imgB: ImageData): number {
  const dataA = imgA.data;
  const dataB = imgB.data;
  const pixelCount = imgA.width * imgA.height;
  const SAMPLE_STEP = 4;
  let totalDelta = 0;
  let samples = 0;

  for (let i = 0; i < pixelCount; i += SAMPLE_STEP) {
    const idx = i * 4;
    const [L1, a1, b1] = rgbToLab(dataA[idx]!, dataA[idx + 1]!, dataA[idx + 2]!);
    const [L2, a2, b2] = rgbToLab(dataB[idx]!, dataB[idx + 1]!, dataB[idx + 2]!);
    totalDelta += Math.sqrt((L1 - L2) ** 2 + (a1 - a2) ** 2 + (b1 - b2) ** 2);
    samples++;
  }

  return samples > 0 ? totalDelta / samples : 0;
}

// ── 3. Sobel Edge Overlap ────────────────────────────────────────────

function sobelEdgeMap(imageData: ImageData): Uint8Array {
  const lum = toLuminance(imageData);
  const w = imageData.width;
  const h = imageData.height;
  const edges = new Uint8Array(w * h);

  const gx = [-1, 0, 1, -2, 0, 2, -1, 0, 1];
  const gy = [-1, -2, -1, 0, 0, 0, 1, 2, 1];

  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      let sumX = 0, sumY = 0;
      for (let ky = -1; ky <= 1; ky++) {
        for (let kx = -1; kx <= 1; kx++) {
          const pixel = lum[(y + ky) * w + (x + kx)]!;
          const ki = (ky + 1) * 3 + (kx + 1);
          sumX += pixel * gx[ki]!;
          sumY += pixel * gy[ki]!;
        }
      }
      const magnitude = Math.sqrt(sumX * sumX + sumY * sumY);
      edges[y * w + x] = magnitude > 50 ? 1 : 0;
    }
  }
  return edges;
}

function computeEdgeOverlap(imgA: ImageData, imgB: ImageData): number {
  const edgesA = sobelEdgeMap(imgA);
  const edgesB = sobelEdgeMap(imgB);
  let intersection = 0;
  let union = 0;

  for (let i = 0; i < edgesA.length; i++) {
    const a = edgesA[i]!;
    const b = edgesB[i]!;
    if (a || b) union++;
    if (a && b) intersection++;
  }

  return union === 0 ? 1.0 : intersection / union;
}

// ── 4. Histogram Intersection ────────────────────────────────────────

function computeHistogram(imageData: ImageData): { r: number[]; g: number[]; b: number[] } {
  const data = imageData.data;
  const r = new Array<number>(256).fill(0);
  const g = new Array<number>(256).fill(0);
  const b = new Array<number>(256).fill(0);
  for (let i = 0; i < data.length; i += 4) {
    r[data[i]!]!++;
    g[data[i + 1]!]!++;
    b[data[i + 2]!]!++;
  }
  return { r, g, b };
}

function histogramIntersection(h1: number[], h2: number[]): number {
  const total1 = h1.reduce((a, b) => a + b, 0);
  const total2 = h2.reduce((a, b) => a + b, 0);
  if (total1 === 0 || total2 === 0) return 0;
  let intersect = 0;
  for (let i = 0; i < 256; i++) {
    intersect += Math.min(h1[i]! / total1, h2[i]! / total2);
  }
  return intersect;
}

function computeHistogramSimilarity(imgA: ImageData, imgB: ImageData): number {
  const hA = computeHistogram(imgA);
  const hB = computeHistogram(imgB);
  return (
    histogramIntersection(hA.r, hB.r) +
    histogramIntersection(hA.g, hB.g) +
    histogramIntersection(hA.b, hB.b)
  ) / 3;
}

// ── Public API ───────────────────────────────────────────────────────

export async function computePixelQC(
  referenceBase64: string,
  referenceMime: string,
  generatedBase64: string,
  generatedMime: string
): Promise<PixelQCScores> {
  const refData = await base64ToImageData(referenceBase64, referenceMime, COMPARE_SIZE, COMPARE_SIZE);
  const genData = await base64ToImageData(generatedBase64, generatedMime, COMPARE_SIZE, COMPARE_SIZE);

  const ssimRaw = computeSSIM(refData, genData);
  const deltaERaw = computeAverageColorDelta(refData, genData);
  const edgeRaw = computeEdgeOverlap(refData, genData);
  const histRaw = computeHistogramSimilarity(refData, genData);

  return {
    ssim: Math.round(ssimRaw * 100),
    colorDelta: Math.round(Math.max(0, 100 - deltaERaw * 5)),
    edgeOverlap: Math.round(edgeRaw * 100),
    histogramMatch: Math.round(histRaw * 100),
  };
}
