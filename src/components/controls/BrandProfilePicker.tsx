import { useState, useEffect } from 'react';
import { X, Plus, Trash2, Tag } from 'lucide-react';
import { BrandProfile } from '../../types';
import { getProfiles, saveProfile, deleteProfile } from '../../services/brandProfiles';

interface Props {
  value: BrandProfile | null;
  onChange: (profile: BrandProfile | null) => void;
}

const EMPTY_PROFILE: Omit<BrandProfile, 'id'> = {
  name: '',
  maxColorDelta: 50,
  minGeometryScore: 7,
  logoTolerance: 'low',
  allowedCreativeDeviation: 'minimal',
};

export function BrandProfilePicker({ value, onChange }: Props) {
  const [profiles, setProfiles] = useState<BrandProfile[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<BrandProfile | null>(null);

  useEffect(() => {
    setProfiles(getProfiles());
  }, []);

  function handleSelect(e: React.ChangeEvent<HTMLSelectElement>) {
    const id = e.target.value;
    if (!id) { onChange(null); return; }
    const found = profiles.find((p) => p.id === id);
    onChange(found ?? null);
  }

  function handleSave(profile: BrandProfile) {
    saveProfile(profile);
    setProfiles(getProfiles());
    setEditing(null);
    onChange(profile);
  }

  function handleDelete(id: string) {
    deleteProfile(id);
    setProfiles(getProfiles());
    if (value?.id === id) onChange(null);
  }

  function openNew() {
    setEditing({ ...EMPTY_PROFILE, id: crypto.randomUUID() });
    setModalOpen(true);
  }

  function openEdit(profile: BrandProfile) {
    setEditing({ ...profile });
    setModalOpen(true);
  }

  return (
    <div>
      <label className="text-xs font-medium text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
        <Tag size={10} />
        Brand Profile
      </label>
      <div className="flex gap-1.5 mt-2">
        <select
          value={value?.id ?? ''}
          onChange={handleSelect}
          className="flex-1 bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-1.5
            text-sm text-zinc-200 focus:outline-none focus:ring-1 focus:ring-violet-500"
        >
          <option value="">None</option>
          {profiles.map((p) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
        <button
          onClick={openNew}
          className="p-1.5 bg-zinc-800 hover:bg-zinc-700 rounded-lg transition-colors"
          title="New Profile"
        >
          <Plus size={14} className="text-zinc-400" />
        </button>
        {value && (
          <button
            onClick={() => openEdit(value)}
            className="px-2 py-1.5 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-[10px] text-zinc-400 transition-colors"
          >
            Edit
          </button>
        )}
      </div>

      {/* Modal */}
      {modalOpen && editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="bg-zinc-900 border border-zinc-700 rounded-xl w-96 shadow-2xl">
            <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800">
              <h3 className="text-sm font-semibold">{editing.name ? 'Edit Profile' : 'New Brand Profile'}</h3>
              <button onClick={() => setModalOpen(false)} className="text-zinc-500 hover:text-zinc-300">
                <X size={16} />
              </button>
            </div>

            <div className="p-4 space-y-3">
              <div>
                <label className="text-[10px] text-zinc-500 uppercase">Brand Name</label>
                <input
                  type="text"
                  value={editing.name}
                  onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-1.5
                    text-sm text-zinc-200 mt-1 focus:outline-none focus:ring-1 focus:ring-violet-500"
                  placeholder="e.g. Nike, IKEA"
                />
              </div>

              <div>
                <label className="text-[10px] text-zinc-500 uppercase">Max Color Delta (0-100, lower = stricter)</label>
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={editing.maxColorDelta}
                  onChange={(e) => setEditing({ ...editing, maxColorDelta: Number(e.target.value) })}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-1.5
                    text-sm text-zinc-200 mt-1 focus:outline-none focus:ring-1 focus:ring-violet-500"
                />
              </div>

              <div>
                <label className="text-[10px] text-zinc-500 uppercase">Min Geometry Score (0-10)</label>
                <input
                  type="number"
                  min={0}
                  max={10}
                  value={editing.minGeometryScore}
                  onChange={(e) => setEditing({ ...editing, minGeometryScore: Number(e.target.value) })}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-1.5
                    text-sm text-zinc-200 mt-1 focus:outline-none focus:ring-1 focus:ring-violet-500"
                />
              </div>

              <div>
                <label className="text-[10px] text-zinc-500 uppercase">Logo Tolerance</label>
                <select
                  value={editing.logoTolerance}
                  onChange={(e) => setEditing({ ...editing, logoTolerance: e.target.value as BrandProfile['logoTolerance'] })}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-1.5
                    text-sm text-zinc-200 mt-1 focus:outline-none focus:ring-1 focus:ring-violet-500"
                >
                  <option value="zero">Zero tolerance</option>
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                </select>
              </div>

              <div>
                <label className="text-[10px] text-zinc-500 uppercase">Allowed Creative Deviation</label>
                <select
                  value={editing.allowedCreativeDeviation}
                  onChange={(e) => setEditing({ ...editing, allowedCreativeDeviation: e.target.value as BrandProfile['allowedCreativeDeviation'] })}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-1.5
                    text-sm text-zinc-200 mt-1 focus:outline-none focus:ring-1 focus:ring-violet-500"
                >
                  <option value="none">None (strictest)</option>
                  <option value="minimal">Minimal</option>
                  <option value="moderate">Moderate</option>
                </select>
              </div>

              <div>
                <label className="text-[10px] text-zinc-500 uppercase">Notes (optional)</label>
                <textarea
                  value={editing.customNotes ?? ''}
                  onChange={(e) => setEditing({ ...editing, customNotes: e.target.value || undefined })}
                  rows={2}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-1.5
                    text-sm text-zinc-200 mt-1 focus:outline-none focus:ring-1 focus:ring-violet-500 resize-none"
                  placeholder="Brand-specific notes..."
                />
              </div>
            </div>

            <div className="flex items-center justify-between px-4 py-3 border-t border-zinc-800">
              <button
                onClick={() => { handleDelete(editing.id); setModalOpen(false); }}
                className="text-xs text-red-400 hover:text-red-300 flex items-center gap-1"
              >
                <Trash2 size={10} />
                Delete
              </button>
              <div className="flex gap-2">
                <button
                  onClick={() => setModalOpen(false)}
                  className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-xs font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => { handleSave(editing); setModalOpen(false); }}
                  disabled={!editing.name}
                  className="px-3 py-1.5 bg-violet-600 hover:bg-violet-500 rounded-lg text-xs font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Save
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
