import { ModelConfig, Gender, SkinTone, ModelPose } from '../../types';

interface Props {
  value: ModelConfig;
  onChange: (config: ModelConfig) => void;
}

const SKIN_TONES: { key: SkinTone; hex: string }[] = [
  { key: 'fair', hex: '#FDEBD0' },
  { key: 'light', hex: '#F5CBA7' },
  { key: 'medium', hex: '#D4A574' },
  { key: 'tan', hex: '#A0764A' },
  { key: 'deep', hex: '#6B4226' },
];

const POSES: { key: ModelPose; label: string }[] = [
  { key: 'standing_straight', label: 'Standing' },
  { key: 'relaxed', label: 'Relaxed' },
  { key: 'hands_on_hips', label: 'Hands on Hips' },
  { key: 'walking', label: 'Walking' },
  { key: 'editorial', label: 'Editorial' },
];

export function ModelPicker({ value, onChange }: Props) {
  function update(patch: Partial<ModelConfig>) {
    onChange({ ...value, ...patch });
  }

  return (
    <div className="flex flex-col gap-3">
      <label className="text-xs font-medium text-zinc-400 uppercase tracking-wider">
        Model
      </label>

      {/* Gender */}
      <div className="flex gap-1.5">
        {(['female', 'male'] as Gender[]).map((g) => (
          <button
            key={g}
            onClick={() => update({ gender: g })}
            className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              value.gender === g
                ? 'bg-violet-600 text-white'
                : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
            }`}
          >
            {g.charAt(0).toUpperCase() + g.slice(1)}
          </button>
        ))}
      </div>

      {/* Skin Tone */}
      <div>
        <span className="text-xs text-zinc-500 mb-1.5 block">Skin Tone</span>
        <div className="flex gap-2">
          {SKIN_TONES.map(({ key, hex }) => (
            <button
              key={key}
              onClick={() => update({ skinTone: key })}
              title={key}
              className={`w-8 h-8 rounded-full transition-all ${
                value.skinTone === key
                  ? 'ring-2 ring-violet-500 ring-offset-2 ring-offset-zinc-900 scale-110'
                  : 'hover:scale-105'
              }`}
              style={{ backgroundColor: hex }}
            />
          ))}
        </div>
      </div>

      {/* Pose */}
      <select
        value={value.pose}
        onChange={(e) => update({ pose: e.target.value as ModelPose })}
        className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2
          text-sm text-zinc-100 focus:border-violet-500 focus:outline-none transition-colors"
      >
        {POSES.map(({ key, label }) => (
          <option key={key} value={key}>{label}</option>
        ))}
      </select>
    </div>
  );
}
