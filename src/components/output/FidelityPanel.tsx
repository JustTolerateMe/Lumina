import { useState } from 'react';
import { ChevronDown, ChevronUp, Shield, ShieldCheck, ShieldAlert, AlertTriangle } from 'lucide-react';
import { QCScores, PixelQCScores, RiskProfile } from '../../types';

interface Props {
  semanticScores: QCScores;
  pixelScores?: PixelQCScores;
  compositeScore?: number;
  pass?: boolean;
  issues?: string[];
  riskProfile?: RiskProfile;
  iterationCount?: number;
  mode: string;
}

function scoreColor(score: number, max: number): string {
  const pct = (score / max) * 100;
  if (pct >= 80) return 'bg-green-500';
  if (pct >= 60) return 'bg-amber-500';
  return 'bg-red-500';
}

function compositeColor(score: number): string {
  if (score >= 80) return 'text-green-400 ring-green-500/30';
  if (score >= 60) return 'text-amber-400 ring-amber-500/30';
  return 'text-red-400 ring-red-500/30';
}

const SEMANTIC_LABELS: Record<string, string> = {
  colorAccuracy: 'Color Accuracy',
  configurationMatch: 'Configuration',
  componentCount: 'Component Count',
  proportionFidelity: 'Proportions',
  constructionDetails: 'Construction',
  brandingPreservation: 'Branding',
  overallFidelity: 'Overall Fidelity',
  graphicPreservation: 'Graphics',
  silhouetteMatch: 'Silhouette',
  textureMatch: 'Texture',
};

const PIXEL_LABELS: Record<string, string> = {
  ssim: 'Structural (SSIM)',
  colorDelta: 'Color Delta',
  edgeOverlap: 'Edge Overlap',
  histogramMatch: 'Histogram',
};

const RISK_LABELS: Record<string, string> = {
  reflective_surface: 'Reflective',
  many_small_components: 'Many Parts',
  micro_text_logo: 'Micro Text',
  symmetry_critical: 'Symmetry',
  repeating_elements: 'Repeating',
  transparent_material: 'Transparent',
  complex_pattern: 'Pattern',
  high_contrast_branding: 'Branding',
  multi_section_config: 'Multi-Section',
  curved_organic_shape: 'Organic Shape',
};

function ScoreBar({ label, score, max }: { label: string; score: number; max: number }) {
  const pct = Math.min(100, (score / max) * 100);
  return (
    <div className="flex items-center gap-3">
      <span className="text-xs text-zinc-400 w-28 shrink-0 truncate">{label}</span>
      <div className="flex-1 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${scoreColor(score, max)}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-xs text-zinc-300 w-8 text-right font-mono">
        {score}{max === 10 ? '' : '%'}
      </span>
    </div>
  );
}

export function FidelityPanel({
  semanticScores,
  pixelScores,
  compositeScore,
  pass,
  issues,
  riskProfile,
  iterationCount,
}: Props) {
  const [expanded, setExpanded] = useState(false);

  const overall = compositeScore ?? 0;
  const PassIcon = pass ? ShieldCheck : ShieldAlert;

  return (
    <div className="border-t border-zinc-800">
      {/* Collapsed bar */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-zinc-900/50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className={`w-9 h-9 rounded-full ring-2 flex items-center justify-center
            text-sm font-bold ${compositeColor(overall)}`}>
            {overall}
          </div>
          <div className="flex items-center gap-2">
            <PassIcon size={14} className={pass ? 'text-green-400' : 'text-red-400'} />
            <span className={`text-xs font-semibold uppercase tracking-wider ${pass ? 'text-green-400' : 'text-red-400'}`}>
              {pass ? 'Pass' : 'Fail'}
            </span>
          </div>
          {iterationCount && iterationCount > 1 && (
            <span className="text-[10px] text-amber-500 bg-amber-500/10 px-1.5 py-0.5 rounded">
              {iterationCount} iterations
            </span>
          )}
          {riskProfile && riskProfile.flags.length > 0 && (
            <div className="flex items-center gap-1 text-[10px] text-zinc-500">
              <Shield size={10} />
              {riskProfile.flags.length} risks
            </div>
          )}
        </div>
        {expanded ? <ChevronUp size={14} className="text-zinc-500" /> : <ChevronDown size={14} className="text-zinc-500" />}
      </button>

      {/* Expanded detail */}
      {expanded && (
        <div className="px-4 pb-4 space-y-4">
          {/* Semantic Scores */}
          <div>
            <p className="text-[10px] font-medium text-zinc-500 uppercase tracking-wider mb-2">
              AI Quality Check (0-10)
            </p>
            <div className="space-y-1.5">
              {Object.entries(semanticScores).map(([key, value]) => (
                <ScoreBar
                  key={key}
                  label={SEMANTIC_LABELS[key] ?? key}
                  score={value as number}
                  max={10}
                />
              ))}
            </div>
          </div>

          {/* Pixel Scores */}
          {pixelScores && (
            <div>
              <p className="text-[10px] font-medium text-zinc-500 uppercase tracking-wider mb-2">
                Pixel Fidelity (0-100)
              </p>
              <div className="space-y-1.5">
                {Object.entries(pixelScores).map(([key, value]) => (
                  <ScoreBar
                    key={key}
                    label={PIXEL_LABELS[key] ?? key}
                    score={value as number}
                    max={100}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Risk Profile */}
          {riskProfile && riskProfile.flags.length > 0 && (
            <div>
              <p className="text-[10px] font-medium text-zinc-500 uppercase tracking-wider mb-2">
                Risk Profile
              </p>
              <div className="flex flex-wrap gap-1.5">
                {riskProfile.flags.map((flag) => (
                  <span
                    key={flag}
                    className="text-[10px] px-2 py-0.5 rounded bg-zinc-800 text-zinc-300"
                    title={riskProfile.descriptions[flag]}
                  >
                    {RISK_LABELS[flag] ?? flag}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Issues */}
          {issues && issues.length > 0 && (
            <div>
              <p className="text-[10px] font-medium text-zinc-500 uppercase tracking-wider mb-2 flex items-center gap-1">
                <AlertTriangle size={10} />
                Issues ({issues.length})
              </p>
              <ul className="space-y-1">
                {issues.map((issue, idx) => (
                  <li key={idx} className="text-xs text-zinc-400 pl-3 relative before:content-[''] before:absolute before:left-0 before:top-1.5 before:w-1 before:h-1 before:rounded-full before:bg-zinc-600">
                    {issue}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
