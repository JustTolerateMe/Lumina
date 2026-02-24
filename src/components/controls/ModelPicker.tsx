import { ModelConfig, Gender, SkinTone, ModelPose, AgeGroup } from '../../types';
import { AGE_GROUP_PRESETS } from '../../prompts/presets';

interface Props {
  value: ModelConfig;
  onChange: (config: ModelConfig) => void;
}

const AGE_GROUPS: { key: AgeGroup; label: string }[] = [
  { key: 'infant', label: 'Infant' },
  { key: 'toddler', label: 'Toddler' },
  { key: 'child', label: 'Child' },
  { key: 'teen', label: 'Teen' },
  { key: 'adult', label: 'Adult' },
];

const SKIN_TONES: { key: SkinTone; hex: string; label: string }[] = [
  { key: 'porcelain', hex: '#FFF0EC', label: 'Porcelain' },
  { key: 'fair', hex: '#FDEBD0', label: 'Fair' },
  { key: 'light', hex: '#F5CBA7', label: 'Light' },
  { key: 'light-medium', hex: '#E8B887', label: 'Light Med' },
  { key: 'medium', hex: '#D4A574', label: 'Medium' },
  { key: 'medium-tan', hex: '#BC8B5E', label: 'Med Tan' },
  { key: 'tan', hex: '#A0764A', label: 'Tan' },
  { key: 'deep-tan', hex: '#8B5E3C', label: 'Deep Tan' },
  { key: 'deep', hex: '#6B4226', label: 'Deep' },
  { key: 'rich-dark', hex: '#4A2C17', label: 'Rich Dark' },
];

const ALL_POSES: { key: ModelPose; label: string }[] = [
  { key: 'standing_straight', label: 'Standing' },
  { key: 'relaxed', label: 'Relaxed' },
  { key: 'hands_on_hips', label: 'Hands on Hips' },
  { key: 'walking', label: 'Walking' },
  { key: 'editorial', label: 'Editorial' },
  { key: 'sitting', label: 'Sitting' },
  { key: 'playful', label: 'Playful' },
  { key: 'crawling', label: 'Crawling' },
  { key: 'held_by_parent', label: 'Held by Parent' },
];

export function ModelPicker({ value, onChange }: Props) {
  const agePreset = AGE_GROUP_PRESETS[value.ageGroup ?? 'adult'];
  const allowedPoses = agePreset.allowedPoses as readonly ModelPose[];
  const allowedGenders = agePreset.allowedGenders as readonly Gender[];
  const filteredPoses = ALL_POSES.filter((p) => allowedPoses.includes(p.key));

  function update(patch: Partial<ModelConfig>) {
    const next = { ...value, ...patch };

    // Cascade-validate when age group changes
    if (patch.ageGroup) {
      const preset = AGE_GROUP_PRESETS[patch.ageGroup];
      const poses = preset.allowedPoses as readonly ModelPose[];
      const genders = preset.allowedGenders as readonly Gender[];

      if (!poses.includes(next.pose)) {
        next.pose = preset.defaultPose as ModelPose;
      }
      if (!genders.includes(next.gender)) {
        next.gender = genders[0] as Gender;
      }
    }

    onChange(next);
  }

  return (
    <div className="flex flex-col gap-3">
      <label className="text-xs font-medium text-zinc-400 uppercase tracking-wider">
        Model
      </label>

      {/* Age Group */}
      <div>
        <span className="text-xs text-zinc-500 mb-1.5 block">Age Group</span>
        <div className="grid grid-cols-5 gap-1">
          {AGE_GROUPS.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => update({ ageGroup: key })}
              className={`py-1.5 rounded-lg text-[10px] font-medium transition-colors ${
                (value.ageGroup ?? 'adult') === key
                  ? 'bg-violet-600 text-white'
                  : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Gender */}
      <div className="flex gap-1.5">
        {allowedGenders.map((g) => (
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
        <span className="text-xs text-zinc-500 mb-1.5 block">
          Skin Tone
          <span className="text-zinc-600 ml-1.5 capitalize">
            — {SKIN_TONES.find((s) => s.key === value.skinTone)?.label ?? value.skinTone}
          </span>
        </span>
        <div className="grid grid-cols-5 gap-2">
          {SKIN_TONES.map(({ key, hex, label }) => (
            <button
              key={key}
              onClick={() => update({ skinTone: key })}
              title={label}
              className={`w-7 h-7 rounded-full transition-all mx-auto ${
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
      <div>
        <span className="text-xs text-zinc-500 mb-1.5 block">Pose</span>
        <select
          value={value.pose}
          onChange={(e) => update({ pose: e.target.value as ModelPose })}
          className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2
            text-sm text-zinc-100 focus:border-violet-500 focus:outline-none transition-colors"
        >
          {filteredPoses.map(({ key, label }) => (
            <option key={key} value={key}>{label}</option>
          ))}
        </select>
      </div>
    </div>
  );
}
