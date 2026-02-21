import { useRef, DragEvent, useState } from 'react';
import { Upload, X } from 'lucide-react';
import { UploadedImage } from '../../hooks/useUpload';

interface Props {
  image: UploadedImage | null;
  onFile: (file: File) => void;
  onClear: () => void;
}

export function UploadZone({ image, onFile, onClear }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);

  function handleDrop(e: DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) onFile(file);
  }

  if (image) {
    return (
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
    );
  }

  return (
    <div
      onClick={() => inputRef.current?.click()}
      onDrop={handleDrop}
      onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
      onDragLeave={() => setDragOver(false)}
      className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer
        transition-colors group ${
          dragOver
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
