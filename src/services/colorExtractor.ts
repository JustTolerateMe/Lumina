/**
 * Client-side dominant color extraction using Canvas API + k-means clustering.
 * Browser-only — uses HTMLCanvasElement.
 *
 * Runs before generation to give the pipeline pixel-accurate hex values for
 * the COLOR LOCK block, instead of relying on AI estimation.
 */

export interface ColorPalette {
  /** Top colors sorted by frequency (highest first), with percentage coverage. */
  colors: Array<{ hex: string; percentage: number }>;
  /** Hex of the single most frequent color. */
  dominantHex: string;
}

// ── Utilities ──────────────────────────────────────────────────────────────────

function toHex(r: number, g: number, b: number): string {
  return '#' + [r, g, b].map(v => Math.round(v).toString(16).padStart(2, '0')).join('');
}

function luminance(r: number, g: number, b: number): number {
  // Perceived luminance (ITU-R BT.601)
  return 0.299 * r + 0.587 * g + 0.114 * b;
}

function distance(a: [number, number, number], b: [number, number, number]): number {
  return Math.sqrt((a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2 + (a[2] - b[2]) ** 2);
}

// ── K-means ────────────────────────────────────────────────────────────────────

function kmeans(
  pixels: Array<[number, number, number]>,
  k: number,
  iterations = 12
): Array<{ centroid: [number, number, number]; count: number }> {
  if (pixels.length === 0) return [];

  // Random initialisation — pick k distinct pixels as starting centroids
  const centroids: Array<[number, number, number]> = [];
  const used = new Set<number>();
  while (centroids.length < k && centroids.length < pixels.length) {
    const idx = Math.floor(Math.random() * pixels.length);
    if (!used.has(idx)) {
      used.add(idx);
      const p = pixels[idx]!;
      centroids.push([p[0], p[1], p[2]]);
    }
  }

  const assignments = new Int32Array(pixels.length);

  for (let iter = 0; iter < iterations; iter++) {
    // Assign each pixel to nearest centroid
    let changed = false;
    for (let i = 0; i < pixels.length; i++) {
      let best = 0;
      let bestDist = Infinity;
      const px = pixels[i]!;
      for (let c = 0; c < centroids.length; c++) {
        const d = distance(px, centroids[c]!);
        if (d < bestDist) { bestDist = d; best = c; }
      }
      if (assignments[i] !== best) { assignments[i] = best; changed = true; }
    }
    if (!changed) break;

    // Recompute centroids
    const sums: Array<[number, number, number, number]> = centroids.map(() => [0, 0, 0, 0]);
    for (let i = 0; i < pixels.length; i++) {
      const c = assignments[i] ?? 0;
      const sum = sums[c]!;
      const px = pixels[i]!;
      sum[0] += px[0];
      sum[1] += px[1];
      sum[2] += px[2];
      sum[3]++;
    }
    for (let c = 0; c < centroids.length; c++) {
      const sum = sums[c]!;
      if (sum[3] > 0) {
        centroids[c] = [sum[0] / sum[3], sum[1] / sum[3], sum[2] / sum[3]];
      }
    }
  }

  // Count assignments
  const counts: number[] = new Array(centroids.length).fill(0) as number[];
  for (let i = 0; i < pixels.length; i++) {
    const idx = assignments[i] ?? 0;
    counts[idx] = (counts[idx] ?? 0) + 1;
  }

  return centroids.map((centroid, i) => ({ centroid, count: counts[i] ?? 0 }));
}

// ── Main export ────────────────────────────────────────────────────────────────

/**
 * Extract the dominant color palette from a product reference image.
 * Filters out background (near-white, near-black, fully transparent) pixels
 * then clusters the remaining garment/product pixels into up to 6 colors.
 *
 * Works for solid, striped, and complex multicolor products.
 */
export async function extractColorPalette(
  imageBase64: string,
  _mimeType: string
): Promise<ColorPalette> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        // Downsample for performance — 200px captures enough color info
        const scale = Math.min(1, 200 / Math.max(img.width, img.height));
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);

        const ctx = canvas.getContext('2d');
        if (!ctx) { reject(new Error('Canvas 2D not available')); return; }
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

        const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const pixels: Array<[number, number, number]> = [];

        for (let i = 0; i < data.length; i += 4) {
          const r = data[i] ?? 0, g = data[i + 1] ?? 0, b = data[i + 2] ?? 0, a = data[i + 3] ?? 0;
          if (a < 128) continue; // transparent — skip
          const lum = luminance(r, g, b);
          if (lum > 240) continue; // near-white background — skip
          if (lum < 15) continue; // near-black shadow — skip
          pixels.push([r, g, b]);
        }

        if (pixels.length < 10) {
          // Fallback: image is mostly background (e.g. white product on white)
          resolve({ colors: [{ hex: '#ffffff', percentage: 100 }], dominantHex: '#ffffff' });
          return;
        }

        const K = Math.min(8, Math.ceil(pixels.length / 50));
        const clusters = kmeans(pixels, K);

        // Filter empty clusters, sort by count descending
        const sorted = clusters
          .filter(c => c.count > 0)
          .sort((a, b) => b.count - a.count);

        const total = sorted.reduce((s, c) => s + c.count, 0);

        // Merge clusters that are very similar (RGB distance < 30)
        const merged: typeof sorted = [];
        for (const cluster of sorted) {
          const existing = merged.find(m => distance(m.centroid, cluster.centroid) < 30);
          if (existing) {
            // Merge into the larger cluster
            existing.count += cluster.count;
          } else {
            merged.push({ centroid: [...cluster.centroid] as [number, number, number], count: cluster.count });
          }
        }

        // Re-sort after merging, and filter to only significant solid colors (>5% coverage)
        merged.sort((a, b) => b.count - a.count);

        const colors = merged
          .map(c => ({
            hex: toHex(c.centroid[0], c.centroid[1], c.centroid[2]),
            percentage: Math.round((c.count / total) * 100),
          }))
          .filter(c => c.percentage >= 5);

        resolve({
          colors,
          dominantHex: colors[0]?.hex ?? '#000000',
        });
      } catch (err) {
        reject(err);
      }
    };
    img.onerror = () => reject(new Error('Failed to load image for color extraction'));
    img.src = `data:image/png;base64,${imageBase64}`;
  });
}
