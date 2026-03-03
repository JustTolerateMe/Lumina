import { type ComponentType } from 'react';
import { Zap, Shield } from 'lucide-react';
import type { ImageModel } from '../../types';

const MODELS: { key: ImageModel; label: string; icon: ComponentType<{ size?: number }>; desc: string }[] = [
  { key: 'gemini-2.5-flash-image',         label: 'Stable', icon: Shield, desc: 'Flash Image 2.5 (stable)' },
  { key: 'gemini-3.1-flash-image-preview', label: 'NB2',    icon: Zap,    desc: 'Nano Banana 2 (preview)' },
];

export function ImageModelPicker({ value, onChange }: {
  value: ImageModel;
  onChange: (v: ImageModel) => void;
}) {
  return (
    <div>
      <label className="text-xs font-medium text-zinc-400 uppercase tracking-wider">
        Image Model
      </label>
      <div className="grid grid-cols-2 gap-1.5 mt-2">
        {MODELS.map(({ key, label, icon: Icon, desc }) => (
          <button
            key={key}
            onClick={() => onChange(key)}
            title={desc}
            className={`flex items-center gap-2 px-3 py-2.5 rounded-lg text-xs font-medium
              transition-colors ${value === key
                ? 'bg-violet-600 text-white shadow-lg shadow-violet-900/20'
                : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'}`}
          >
            <Icon size={14} />
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}
