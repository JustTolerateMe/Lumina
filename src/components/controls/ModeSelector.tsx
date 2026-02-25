import { Camera, MapPin, User, Megaphone, Layout, Image, Box, Layers } from 'lucide-react';
import { ProductCategory, GenerationMode } from '../../types';

interface Props {
  category: ProductCategory;
  value: GenerationMode;
  onChange: (mode: any) => void;
}

const APPAREL_MODES = [
  { key: 'studio', label: 'Studio', icon: Camera },
  { key: 'lifestyle', label: 'Lifestyle', icon: MapPin },
  { key: 'on-figure', label: 'On-Figure', icon: User },
  { key: 'campaign', label: 'Campaign', icon: Megaphone },
  { key: 'flatlay', label: 'Flatlay', icon: Layers },
];

const HOME_MODES = [
  { key: 'home-clean-cut', label: 'Clean Cut', icon: Camera },
  { key: 'home-room-scene', label: 'Room Scene', icon: Layout },
  { key: 'home-lifestyle-vignette', label: 'Vignette', icon: Image },
];

const HARDLINES_MODES = [
  { key: 'hardlines-clean-cut', label: 'Clean Cut', icon: Camera },
  { key: 'hardlines-hero-shot', label: 'Hero Shot', icon: Megaphone },
  { key: 'hardlines-in-context', label: 'In-Context', icon: Box },
];

export function ModeSelector({ category, value, onChange }: Props) {
  const modes = category === 'apparel' ? APPAREL_MODES :
    category === 'home' ? HOME_MODES : HARDLINES_MODES;

  return (
    <div>
      <label className="text-xs font-medium text-zinc-400 uppercase tracking-wider">
        Generation Mode
      </label>
      <div className="grid grid-cols-2 gap-1.5 mt-2">
        {modes.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => onChange(key)}
            className={`flex items-center gap-2 px-3 py-2.5 rounded-lg text-xs font-medium
              transition-colors ${value === key
                ? 'bg-violet-600 text-white shadow-lg shadow-violet-900/20'
                : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
              }`}
          >
            <Icon size={14} />
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}
