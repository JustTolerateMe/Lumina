export type ProductCategory = 'apparel' | 'home' | 'hardlines';

export type ApparelMode = 'studio' | 'lifestyle' | 'on-figure' | 'campaign' | 'flatlay';
export type HomeMode = 'home-clean-cut' | 'home-room-scene' | 'home-lifestyle-vignette';
export type HardlinesMode = 'hardlines-clean-cut' | 'hardlines-hero-shot' | 'hardlines-in-context';

export type GenerationMode = ApparelMode | HomeMode | HardlinesMode;

export type Gender = 'female' | 'male' | 'unisex';

export type AgeGroup = 'infant' | 'toddler' | 'child' | 'teen' | 'adult';

export type SkinTone =
  | 'porcelain' | 'fair' | 'light' | 'light-medium'
  | 'medium' | 'medium-tan' | 'tan' | 'deep-tan'
  | 'deep' | 'rich-dark';

export type GarmentType =
  | 't-shirt' | 'hoodie' | 'sweatshirt' | 'jacket' | 'coat'
  | 'dress' | 'skirt' | 'pants' | 'shorts' | 'jeans'
  | 'blouse' | 'button-up' | 'polo' | 'vest' | 'cardigan'
  | 'other' | string;

export type HomeProductType =
  | 'furniture' | 'decor' | 'textiles' | 'lighting' | 'kitchenware' | 'tableware'
  | 'other' | string;

export type HardlinesProductType =
  | 'electronics' | 'appliances' | 'tools' | 'gadgets' | 'automotive' | 'sports_equipment'
  | 'other' | string;

export type ProductMaterial =
  | 'cotton' | 'polyester' | 'wool' | 'silk' | 'denim' | 'leather'
  | 'wood' | 'metal' | 'glass' | 'ceramic' | 'plastic' | 'stone' | 'concrete';

export type ProductFinish =
  | 'matte' | 'glossy' | 'satin' | 'brushed' | 'polished' | 'textured' | 'distressed';

export type HomeRoomStyle =
  | 'minimalist' | 'scandinavian' | 'mid-century' | 'industrial'
  | 'bohemian' | 'japandi' | 'coastal' | 'traditional';

export type HardlinesContext =
  | 'desk_workspace' | 'kitchen_counter' | 'outdoor_adventure'
  | 'gym_fitness' | 'commute' | 'bedside_table' | 'living_room_shelf';

export type AspectRatio = '1:1' | '4:5' | '3:4' | '2:3' | '9:16';

export type ImageSize = '1K' | '2K' | '4K';

export type LifestyleScene =
  | 'urban_street' | 'minimal_indoor' | 'outdoor_nature' | 'studio_editorial';

export type CampaignStyle =
  | 'minimalist_luxury' | 'street_energy' | 'neon_tech' | 'organic_natural';

export type FlatlayStyle =
  | 'pure_white' | 'warm_linen' | 'light_wood'
  | 'dark_wood' | 'marble' | 'concrete';

export type ModelPose =
  | 'standing_straight' | 'relaxed' | 'hands_on_hips' | 'walking' | 'editorial'
  | 'sitting' | 'playful' | 'crawling' | 'held_by_parent';

export interface GarmentConfig {
  type: GarmentType;
  colorDescription: string;
  material: string;
  hasLogo: boolean;
  logoDescription?: string;
  fit: 'oversized' | 'regular' | 'slim' | 'fitted';
  customInstructions?: string;
}

export interface HomeProductConfig {
  type: HomeProductType;
  colorDescription: string;
  material: ProductMaterial | string;
  finish: ProductFinish | string;
  dimensions?: string;
  hasPattern: boolean;
  patternDescription?: string;
  customInstructions?: string;
}

export interface HardlinesProductConfig {
  type: HardlinesProductType;
  colorDescription: string;
  material: ProductMaterial | string;
  finish: ProductFinish | string;
  dimensions?: string;
  hasBranding: boolean;
  brandingDescription?: string;
  customInstructions?: string;
}

export interface ModelConfig {
  ageGroup: AgeGroup;
  gender: Gender;
  skinTone: SkinTone;
  pose: ModelPose;
}

export interface AdditionalImage {
  base64: string;
  mimeType: string;
  label?: string; // 'back', 'detail', 'logo_closeup', etc.
}

export interface ExtractedColorPalette {
  colors: Array<{ hex: string; percentage: number }>;
  dominantHex: string;
}

export interface BaseGenerationRequest {
  aspectRatio: AspectRatio;
  imageSize: ImageSize;
  sourceImageBase64: string;
  sourceImageMimeType: string;
  additionalImages?: AdditionalImage[];
  customInstructions?: string;
  /** Pixel-accurate color palette extracted client-side before generation. */
  extractedColors?: ExtractedColorPalette;
  /** Cached AI product extraction to skip the first API phase. */
  cachedAnalysisText?: string;
  cachedRiskProfile?: RiskProfile;
}

export interface ApparelGenerationRequest extends BaseGenerationRequest {
  category: 'apparel';
  mode: ApparelMode;
  garment: GarmentConfig;
  model: ModelConfig;
  scene?: LifestyleScene;
  campaign?: CampaignStyle;
  flatlay?: FlatlayStyle;
}

export interface HomeGenerationRequest extends BaseGenerationRequest {
  category: 'home';
  mode: HomeMode;
  product: HomeProductConfig;
  roomStyle?: HomeRoomStyle;
}

export interface HardlinesGenerationRequest extends BaseGenerationRequest {
  category: 'hardlines';
  mode: HardlinesMode;
  product: HardlinesProductConfig;
  context?: HardlinesContext;
}

export type GenerationRequest =
  | ApparelGenerationRequest
  | HomeGenerationRequest
  | HardlinesGenerationRequest;

export interface ManualEditRequest {
  originalRequest: GenerationRequest;
  generatedImageBase64: string;
  generatedImageMimeType: string;
  maskImageBase64: string;
  instruction: string;
}

// ── Risk Analysis ────────────────────────────────────────────────────

export type RiskFlag =
  | 'reflective_surface'
  | 'many_small_components'
  | 'micro_text_logo'
  | 'symmetry_critical'
  | 'repeating_elements'
  | 'transparent_material'
  | 'complex_pattern'
  | 'high_contrast_branding'
  | 'multi_section_config'
  | 'curved_organic_shape'
  | 'color_sensitive'
  | 'decorative_element_placement';

export interface RiskProfile {
  flags: RiskFlag[];
  descriptions: Record<string, string>;
  constraintOverrides: string[];
}

// ── QC Scoring ───────────────────────────────────────────────────────

export interface UniversalQCScores {
  colorAccuracy: number;
  configurationMatch: number;
  componentCount: number;
  proportionFidelity: number;
  constructionDetails: number;
  brandingPreservation: number;
  overallFidelity: number;
}

export interface GarmentQCScores {
  colorAccuracy: number;
  graphicPreservation: number;
  silhouetteMatch: number;
  textureMatch: number;
  overallFidelity: number;
}

export type QCScores = UniversalQCScores | GarmentQCScores;

export interface QCResult {
  scores: QCScores;
  pass: boolean;
  issues: string[];
  recommendation: 'approve' | 'regenerate';
}

// ── Pixel QC ─────────────────────────────────────────────────────────

export interface PixelQCScores {
  ssim: number;
  colorDelta: number;
  edgeOverlap: number;
  histogramMatch: number;
}

// ── Brand Calibration ────────────────────────────────────────────────

export interface BrandProfile {
  id: string;
  name: string;
  maxColorDelta: number;
  minGeometryScore: number;
  logoTolerance: 'zero' | 'low' | 'medium';
  allowedCreativeDeviation: 'none' | 'minimal' | 'moderate';
  customNotes?: string;
}

// ── Generation History ───────────────────────────────────────────────

export interface HistoryEntry {
  id: string;
  timestamp: number;
  mode: GenerationMode;
  category: ProductCategory;
  thumbnailBase64: string;
  thumbnailMime: string;
  qcScores?: QCScores;
  pixelQCScores?: PixelQCScores;
  compositeScore?: number;
  pass?: boolean;
  issues?: string[];
  riskProfile?: RiskProfile;
  iterationCount: number;
  requestSummary: {
    category: ProductCategory;
    mode: GenerationMode;
    colorDescription: string;
  };
}

// ── Generation Result & State ────────────────────────────────────────

export interface GenerationResult {
  id: string;
  imageBase64: string;
  mimeType: string;
  request: GenerationRequest;
  timestamp: number;
  analysisText?: string;
  riskProfile?: RiskProfile;
  qcScores?: QCScores;
  qcPass?: boolean;
  qcIssues?: string[];
  pixelQCScores?: PixelQCScores;
  compositeScore?: number;
  iterationCount?: number;
  validationWarning?: {
    severity: 'low' | 'high';
    message: string;
  };
}

export interface ProductSuggestions {
  category: ProductCategory;
  type?: string;
  colorDescription?: string;
  material?: string;
  finish?: string;
}

export interface GenerationState {
  status: 'idle' | 'analyzing' | 'generating' | 'checking' | 'done' | 'error';
  result?: GenerationResult;
  suggestions?: ProductSuggestions;
  error?: string;
  progress?: string;
}
