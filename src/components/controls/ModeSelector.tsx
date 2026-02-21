import { Camera, MapPin, User, Megaphone } from 'lucide-react';
import { GenerationMode } from '../../types';

interface Props {
  value: GenerationMode;
  onChange: (mode: GenerationMode) => void;
}

const MODES: { key: GenerationMode; label: string; icon: typeof Camera }[] = [
  { key: 'studio', label: 'Studio', icon: Camera },
  { key: 'lifestyle', label: 'Lifestyle', icon: MapPin },
  { key: 'on-figure', label: 'On-Figure', icon: User },
  { key: 'campaign', label: 'Campaign', icon: Megaphone },
];

export function ModeSelector({ value, onChange }: Props) {
  return (
    <div>
      <label className="text-xs font-medium text-zinc-400 uppercase tracking-wider">
        Mode
      </label>
      <div className="grid grid-cols-2 gap-1.5 mt-2">
        {MODES.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => onChange(key)}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium
              transition-colors ${
                value === key
                  ? 'bg-violet-600 text-white'
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
