import { useState, useEffect } from 'react';
import { useGeneration } from './hooks/useGeneration';
import { useUpload } from './hooks/useUpload';
import { Header } from './components/layout/Header';
import { UploadZone } from './components/upload/UploadZone';
import { ModeSelector } from './components/controls/ModeSelector';
import { GarmentForm } from './components/controls/GarmentForm';
import { HomeProductForm } from './components/controls/HomeProductForm';
import { HardlinesProductForm } from './components/controls/HardlinesProductForm';
import { ModelPicker } from './components/controls/ModelPicker';
import { ScenePicker } from './components/controls/ScenePicker';
import { RoomStylePicker } from './components/controls/RoomStylePicker';
import { HardlinesContextPicker } from './components/controls/HardlinesContextPicker';
import { CampaignPicker } from './components/controls/CampaignPicker';
import { FlatlayPicker } from './components/controls/FlatlayPicker';
import { BrandProfilePicker } from './components/controls/BrandProfilePicker';
import { GenerationCanvas } from './components/output/GenerationCanvas';
import { GenerationHistory } from './components/output/GenerationHistory';
import { useHistory } from './hooks/useHistory';
import {
  ProductCategory, GenerationMode, ApparelMode, HomeMode, HardlinesMode,
  GarmentConfig, HomeProductConfig, HardlinesProductConfig,
  ModelConfig, LifestyleScene, HomeRoomStyle, HardlinesContext,
  CampaignStyle, FlatlayStyle, AspectRatio, ImageSize, GenerationRequest, BrandProfile
} from './types';
import { Sparkles, Shirt, Home, Smartphone, Bot } from 'lucide-react';
import { SecretBlueprint } from './components/SecretBlueprint';
import { ProcessSidebar } from './components/output/ProcessSidebar';

export default function App() {
  const { state, generateImage, reset, getSuggestions, applyManualEdit } = useGeneration();
  const {
    image,
    additionalImages,
    handleFile,
    handleAdditionalFile,
    removeAdditionalImage,
    updateAdditionalImageLabel,
    clear
  } = useUpload();
  const { entries: historyEntries, loading: historyLoading, refresh: refreshHistory, clearHistory } = useHistory();

  const [category, setCategory] = useState<ProductCategory>('apparel');
  const [mode, setMode] = useState<GenerationMode>('studio');
  const [showBlueprint, setShowBlueprint] = useState(false);
  const [showProcessSidebar, setShowProcessSidebar] = useState(false);
  const [, setSecretBuffer] = useState('');

  // Auto-open process sidebar when generating starts
  useEffect(() => {
    if (state.status === 'analyzing' || state.status === 'generating') {
      setShowProcessSidebar(true);
    }
  }, [state.status]);

  // Secret trigger: type 'blueprint' anytime
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const char = e.key.toLowerCase();
      if (!/^[a-z]$/.test(char)) return;

      setSecretBuffer(prev => {
        const newBuffer = (prev + char).slice(-9); // 'blueprint' has 9 chars
        if (newBuffer === 'blueprint') {
          setShowBlueprint(true);
          return '';
        }
        return newBuffer;
      });
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Reset mode when category changes
  useEffect(() => {
    if (category === 'apparel') setMode('studio');
    else if (category === 'home') setMode('home-clean-cut');
    else if (category === 'hardlines') setMode('hardlines-clean-cut');
  }, [category]);

  // Auto-analysis on image upload
  useEffect(() => {
    if (image?.base64 && state.status === 'idle' && !state.suggestions) {
      getSuggestions(image.base64, image.mimeType).then(suggestions => {
        if (suggestions?.category && suggestions.category !== category) {
          setCategory(suggestions.category);
        }
      });
    }
    // Clear suggestions if image is cleared
    if (!image && state.suggestions) {
      reset(); // This resets the whole generation state including suggestions
    }
  }, [image, getSuggestions, category, state.status, state.suggestions, reset]);

  // Apparel State
  const [garment, setGarment] = useState<GarmentConfig>({
    type: 't-shirt',
    colorDescription: '',
    material: 'cotton',
    hasLogo: false,
    fit: 'regular',
  });
  const [modelConfig, setModelConfig] = useState<ModelConfig>({
    ageGroup: 'adult',
    gender: 'female',
    skinTone: 'medium',
    pose: 'standing_straight',
  });
  const [scene, setScene] = useState<LifestyleScene>('minimal_indoor');
  const [campaign, setCampaign] = useState<CampaignStyle>('minimalist_luxury');
  const [flatlayStyle, setFlatlayStyle] = useState<FlatlayStyle>('pure_white');

  // Home State
  const [homeProduct, setHomeProduct] = useState<HomeProductConfig>({
    type: 'furniture',
    colorDescription: '',
    material: 'wood',
    finish: 'matte',
    hasPattern: false,
  });
  const [roomStyle, setRoomStyle] = useState<HomeRoomStyle>('minimalist');

  // Hardlines State
  const [hardlinesProduct, setHardlinesProduct] = useState<HardlinesProductConfig>({
    type: 'electronics',
    colorDescription: '',
    material: 'metal',
    finish: 'matte',
    hasBranding: false,
  });
  const [hardlinesContext, setHardlinesContext] = useState<HardlinesContext>('desk_workspace');

  // Global State
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>('1:1');
  const [imageSize] = useState<ImageSize>('2K');
  const [brandProfile, setBrandProfile] = useState<BrandProfile | null>(null);

  const colorDesc = category === 'apparel' ? garment.colorDescription :
    category === 'home' ? homeProduct.colorDescription :
      hardlinesProduct.colorDescription;

  const canGenerate = image && colorDesc.length > 3;

  async function handleGenerate() {
    if (!image || !canGenerate) return;
    reset();

    let request: GenerationRequest;

    const base = {
      aspectRatio,
      imageSize,
      sourceImageBase64: image.base64,
      sourceImageMimeType: image.mimeType,
      additionalImages: additionalImages.map(img => ({
        base64: img.base64,
        mimeType: img.mimeType,
        label: img.label,
      })),
    };

    if (category === 'apparel') {
      request = {
        ...base,
        category: 'apparel',
        mode: mode as ApparelMode,
        garment,
        model: modelConfig,
        scene,
        campaign,
        flatlay: flatlayStyle,
      };
    } else if (category === 'home') {
      request = {
        ...base,
        category: 'home',
        mode: mode as HomeMode,
        product: homeProduct,
        roomStyle,
      };
    } else {
      request = {
        ...base,
        category: 'hardlines',
        mode: mode as HardlinesMode,
        product: hardlinesProduct,
        context: hardlinesContext,
      };
    }

    await generateImage(request);
    refreshHistory();
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <Header>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowProcessSidebar(!showProcessSidebar)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors border ${showProcessSidebar ? 'bg-zinc-800 border-zinc-700 text-zinc-300' : 'bg-transparent border-transparent text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800'}`}
          >
            <Bot size={16} />
            <span className="hidden sm:inline">AI Process</span>
          </button>
          <div className="w-px h-6 bg-zinc-800 mx-1" />
          <GenerationHistory
            entries={historyEntries}
            loading={historyLoading}
            onClear={clearHistory}
          />
        </div>
      </Header>

      <div className="flex h-[calc(100vh-64px)]">
        {/* LEFT PANEL — Controls */}
        <aside className="w-80 border-r border-zinc-800 overflow-y-auto p-4 flex flex-col gap-4 shrink-0">

          {/* Category Selector */}
          <div>
            <label className="text-xs font-medium text-zinc-400 uppercase tracking-wider">
              Product Category
            </label>
            <div className="grid grid-cols-3 gap-1.5 mt-2">
              {[
                { id: 'apparel', label: 'Apparel', icon: Shirt },
                { id: 'home', label: 'Home', icon: Home },
                { id: 'hardlines', label: 'Hardlines', icon: Smartphone },
              ].map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  onClick={() => setCategory(id as ProductCategory)}
                  className={`flex flex-col items-center gap-1.5 py-2 rounded-lg text-[10px] font-medium transition-all
                    ${category === id
                      ? 'bg-violet-600/20 border border-violet-500/50 text-violet-300'
                      : 'bg-zinc-800 border border-transparent text-zinc-500 hover:bg-zinc-700'}`}
                >
                  <Icon size={16} />
                  {label}
                </button>
              ))}
            </div>
          </div>

          <UploadZone
            image={image}
            additionalImages={additionalImages}
            onFile={handleFile}
            onAdditionalFile={handleAdditionalFile}
            onRemoveAdditional={removeAdditionalImage}
            onUpdateLabel={updateAdditionalImageLabel}
            onClear={clear}
          />

          <ModeSelector category={category} value={mode} onChange={setMode} />

          {/* Category-specific forms */}
          {category === 'apparel' && (
            <>
              <GarmentForm
                value={garment}
                onChange={setGarment}
                suggestions={state.suggestions}
              />
              {mode !== 'flatlay' && <ModelPicker value={modelConfig} onChange={setModelConfig} />}
              {mode === 'lifestyle' && <ScenePicker value={scene} onChange={setScene} />}
              {mode === 'campaign' && <CampaignPicker value={campaign} onChange={setCampaign} />}
              {mode === 'flatlay' && <FlatlayPicker value={flatlayStyle} onChange={setFlatlayStyle} />}
            </>
          )}

          {category === 'home' && (
            <>
              <HomeProductForm
                value={homeProduct}
                onChange={setHomeProduct}
                suggestions={state.suggestions}
              />
              {mode !== 'home-clean-cut' && <RoomStylePicker value={roomStyle} onChange={setRoomStyle} />}
            </>
          )}

          {category === 'hardlines' && (
            <>
              <HardlinesProductForm
                value={hardlinesProduct}
                onChange={setHardlinesProduct}
                suggestions={state.suggestions}
              />
              {mode === 'hardlines-in-context' && <HardlinesContextPicker value={hardlinesContext} onChange={setHardlinesContext} />}
            </>
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

          <BrandProfilePicker value={brandProfile} onChange={setBrandProfile} />

          {/* Generate Button */}
          <button
            onClick={handleGenerate}
            disabled={!canGenerate || state.status === 'generating'}
            className={`w-full py-3 rounded-lg font-semibold text-sm
              flex items-center justify-center gap-2 transition-all mt-auto
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
              Upload a product photo to get started
            </p>
          )}
          {image && !colorDesc && (
            <p className="text-xs text-amber-500 text-center">
              Describe the product color to continue
            </p>
          )}
        </aside>

        <main className="flex-1 overflow-hidden">
          <GenerationCanvas
            state={state}
            onReset={reset}
            onManualEdit={applyManualEdit}
          />
        </main>

        <ProcessSidebar
          state={state}
          isOpen={showProcessSidebar}
          onClose={() => setShowProcessSidebar(false)}
        />
      </div>

      <SecretBlueprint
        isOpen={showBlueprint}
        onClose={() => setShowBlueprint(false)}
      />
    </div>
  );
}
