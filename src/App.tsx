import { useState } from 'react';
import { useGeneration } from './hooks/useGeneration';
import { useUpload } from './hooks/useUpload';
import { Header } from './components/layout/Header';
import { UploadZone } from './components/upload/UploadZone';
import { ModeSelector } from './components/controls/ModeSelector';
import { GarmentForm } from './components/controls/GarmentForm';
import { ModelPicker } from './components/controls/ModelPicker';
import { ScenePicker } from './components/controls/ScenePicker';
import { CampaignPicker } from './components/controls/CampaignPicker';
import { GenerationCanvas } from './components/output/GenerationCanvas';
import {
  GenerationMode, GarmentConfig, ModelConfig,
  LifestyleScene, CampaignStyle, AspectRatio, ImageSize,
} from './types';
import { Sparkles } from 'lucide-react';

export default function App() {
  const { state, generateImage, reset } = useGeneration();
  const { image, handleFile, clear } = useUpload();

  const [mode, setMode] = useState<GenerationMode>('studio');
  const [garment, setGarment] = useState<GarmentConfig>({
    type: 't-shirt',
    colorDescription: '',
    material: 'cotton',
    hasLogo: false,
    fit: 'regular',
  });
  const [modelConfig, setModelConfig] = useState<ModelConfig>({
    gender: 'female',
    skinTone: 'medium',
    pose: 'standing_straight',
  });
  const [scene, setScene] = useState<LifestyleScene>('minimal_indoor');
  const [campaign, setCampaign] = useState<CampaignStyle>('minimalist_luxury');
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>('1:1');
  const [imageSize] = useState<ImageSize>('2K');

  const canGenerate = image && garment.colorDescription.length > 3;

  async function handleGenerate() {
    if (!image || !canGenerate) return;
    reset();
    await generateImage({
      mode,
      garment,
      model: modelConfig,
      scene,
      campaign,
      aspectRatio,
      imageSize,
      sourceImageBase64: image.base64,
      sourceImageMimeType: image.mimeType,
    });
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <Header />

      <div className="flex h-[calc(100vh-64px)]">
        {/* LEFT PANEL — Controls */}
        <aside className="w-80 border-r border-zinc-800 overflow-y-auto p-4 flex flex-col gap-4 shrink-0">

          <UploadZone
            image={image}
            onFile={handleFile}
            onClear={clear}
          />

          <ModeSelector value={mode} onChange={setMode} />

          <GarmentForm value={garment} onChange={setGarment} />

          <ModelPicker value={modelConfig} onChange={setModelConfig} />

          {mode === 'lifestyle' && (
            <ScenePicker value={scene} onChange={setScene} />
          )}

          {mode === 'campaign' && (
            <CampaignPicker value={campaign} onChange={setCampaign} />
          )}

          {/* Aspect Ratio */}
          <div>
            <label className="text-xs font-medium text-zinc-400 uppercase tracking-wider">
              Aspect Ratio
            </label>
            <div className="flex gap-2 mt-2">
              {(['1:1', '4:5', '3:4', '9:16'] as AspectRatio[]).map((r) => (
                <button
                  key={r}
                  onClick={() => setAspectRatio(r)}
                  className={`flex-1 py-1 rounded text-xs font-medium transition-colors
                    ${aspectRatio === r
                      ? 'bg-violet-600 text-white'
                      : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
                    }`}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>

          {/* Generate Button */}
          <button
            onClick={handleGenerate}
            disabled={!canGenerate || state.status === 'generating'}
            className={`w-full py-3 rounded-lg font-semibold text-sm
              flex items-center justify-center gap-2 transition-all
              ${canGenerate && state.status !== 'generating'
                ? 'bg-violet-600 hover:bg-violet-500 text-white shadow-lg shadow-violet-900/50'
                : 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
              }`}
          >
            <Sparkles size={16} />
            {state.status === 'generating' ? state.progress ?? 'Generating...' : 'Generate'}
          </button>

          {!image && (
            <p className="text-xs text-zinc-500 text-center">
              Upload a garment photo to get started
            </p>
          )}
          {image && !garment.colorDescription && (
            <p className="text-xs text-amber-500 text-center">
              Describe the garment color to continue
            </p>
          )}
        </aside>

        {/* RIGHT PANEL — Output Canvas */}
        <main className="flex-1 overflow-hidden">
          <GenerationCanvas state={state} onReset={reset} />
        </main>
      </div>
    </div>
  );
}
