import { useRef, DragEvent, useState } from 'react';
import { Upload, X, Plus } from 'lucide-react';
import { UploadedImage } from '../../hooks/useUpload';

interface Props {
  image: UploadedImage | null;
  additionalImages: UploadedImage[];
  onFile: (file: File) => void;
  onAdditionalFile: (file: File) => void;
  onRemoveAdditional: (index: number) => void;
  onUpdateLabel: (index: number, label: string) => void;
  onClear: () => void;
}

export function UploadZone({
  image,
  additionalImages,
  onFile,
  onAdditionalFile,
  onRemoveAdditional,
  onUpdateLabel,
  onClear
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const addInputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [addDragOver, setAddDragOver] = useState(false);

  function handleDrop(e: DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) onFile(file);
  }

  function handleAddDrop(e: DragEvent) {
    e.preventDefault();
    setAddDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file && additionalImages.length < 2) onAdditionalFile(file);
  }

  if (image) {
    return (
      <div className="space-y-3">
        {/* Primary Image */}
        <div className="relative rounded-xl overflow-hidden bg-zinc-900 border border-zinc-700">
          <img
            src={image.previewUrl}
            alt="Uploaded garment"
            className="w-full h-48 object-contain"
          />
          <button
            onClick={onClear}
            className="absolute top-2 right-2 bg-zinc-900/80 hover:bg-zinc-800
              rounded-full p-1 transition-colors"
          >
            <X size={14} />
          </button>
          <div className="px-3 py-2 border-t border-zinc-700">
            <p className="text-xs text-zinc-400 truncate">{image.file.name}</p>
          </div>
        </div>

        {/* Additional Angles */}
        <div className="bg-zinc-900/50 rounded-xl p-3 border border-zinc-800">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] text-zinc-400 uppercase tracking-wider font-medium">
              Additional Angles <span className="text-zinc-500 lowercase">(optional)</span>
            </span>
            <span className="text-[10px] text-zinc-500">{additionalImages.length}/2</span>
          </div>

          <div className="flex gap-2 overflow-x-auto pb-1">
            {additionalImages.map((img, i) => (
              <div key={i} className="relative w-20 flex-col gap-1 flex shrink-0">
                <div className="relative w-20 h-20 rounded-lg overflow-hidden border border-zinc-700 bg-zinc-800">
                  <img src={img.previewUrl} alt={`Angle ${i + 2}`} className="w-full h-full object-cover" />
                  <button
                    onClick={() => onRemoveAdditional(i)}
                    className="absolute top-1 right-1 bg-zinc-900/80 hover:bg-zinc-800 rounded-full p-0.5 transition-colors shadow-sm"
                  >
                    <X size={12} />
                  </button>
                </div>
                <select
                  value={img.label || ''}
                  onChange={(e) => onUpdateLabel(i, e.target.value)}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded text-[10px] text-zinc-300 p-1 outline-none focus:border-violet-500"
                >
                  <option value="">Label (Opt.)</option>
                  <option value="front">Front</option>
                  <option value="back">Back</option>
                  <option value="side">Side</option>
                  <option value="detail">Detail</option>
                  <option value="logo">Logo / Graphic</option>
                  <option value="texture">Texture</option>
                </select>
              </div>
            ))}

            {additionalImages.length < 2 && (
              <div
                onClick={() => addInputRef.current?.click()}
                onDrop={handleAddDrop}
                onDragOver={(e) => { e.preventDefault(); setAddDragOver(true); }}
                onDragLeave={() => setAddDragOver(false)}
                className={`w-20 h-20 rounded-lg border border-dashed flex items-center justify-center cursor-pointer transition-colors shrink-0 ${addDragOver ? 'border-violet-500 bg-violet-500/10' : 'border-zinc-700 hover:border-violet-500 bg-zinc-900/50 hover:bg-zinc-900'
                  }`}
              >
                <Plus size={16} className="text-zinc-500" />
                <input
                  ref={addInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={(e) => e.target.files?.[0] && onAdditionalFile(e.target.files[0])}
                />
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      onClick={() => inputRef.current?.click()}
      onDrop={handleDrop}
      onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
      onDragLeave={() => setDragOver(false)}
      className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer
        transition-colors group ${dragOver
          ? 'border-violet-500 bg-violet-500/5'
          : 'border-zinc-700 hover:border-violet-500'
        }`}
    >
      <div className="flex flex-col items-center gap-2">
        <div className="w-10 h-10 rounded-full bg-zinc-800 group-hover:bg-violet-900/50
          flex items-center justify-center transition-colors">
          <Upload size={18} className="text-zinc-400 group-hover:text-violet-400" />
        </div>
        <div>
          <p className="text-sm font-medium text-zinc-300">Upload garment photo</p>
          <p className="text-xs text-zinc-500 mt-0.5">PNG, JPG, WebP up to 20MB</p>
        </div>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])}
      />
    </div>
  );
}
