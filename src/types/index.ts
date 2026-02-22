export type ProductCategory = 'apparel' | 'home' | 'hardlines';

export type ApparelMode = 'studio' | 'lifestyle' | 'on-figure' | 'campaign';
export type HomeMode = 'home-clean-cut' | 'home-room-scene' | 'home-lifestyle-vignette';
export type HardlinesMode = 'hardlines-clean-cut' | 'hardlines-hero-shot' | 'hardlines-in-context';

export type GenerationMode = ApparelMode | HomeMode | HardlinesMode;

export type Gender = 'female' | 'male' | 'unisex';

export type SkinTone = 'fair' | 'light' | 'medium' | 'tan' | 'deep';

export type GarmentType =
  | 't-shirt' | 'hoodie' | 'sweatshirt' | 'jacket' | 'coat'
  | 'dress' | 'skirt' | 'pants' | 'shorts' | 'jeans'
  | 'blouse' | 'button-up' | 'polo' | 'vest' | 'cardigan';

export type HomeProductType =
  | 'furniture' | 'decor' | 'textiles' | 'lighting' | 'kitchenware' | 'tableware';

export type HardlinesProductType =
  | 'electronics' | 'appliances' | 'tools' | 'gadgets' | 'automotive' | 'sports_equipment';

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

export type ModelPose =
  | 'standing_straight' | 'relaxed' | 'hands_on_hips' | 'walking' | 'editorial';

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
  material: ProductMaterial;
  finish: ProductFinish;
  dimensions?: string;
  hasPattern: boolean;
  patternDescription?: string;
  customInstructions?: string;
}

export interface HardlinesProductConfig {
  type: HardlinesProductType;
  colorDescription: string;
  material: ProductMaterial;
  finish: ProductFinish;
  dimensions?: string;
  hasBranding: boolean;
  brandingDescription?: string;
  customInstructions?: string;
}

export interface ModelConfig {
  gender: Gender;
  skinTone: SkinTone;
  pose: ModelPose;
}

export interface BaseGenerationRequest {
  aspectRatio: AspectRatio;
  imageSize: ImageSize;
  sourceImageBase64: string;
  sourceImageMimeType: string;
  customInstructions?: string;
}

export interface ApparelGenerationRequest extends BaseGenerationRequest {
  category: 'apparel';
  mode: ApparelMode;
  garment: GarmentConfig;
  model: ModelConfig;
  scene?: LifestyleScene;
  campaign?: CampaignStyle;
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

export interface GenerationResult {
  id: string;
  imageBase64: string;
  mimeType: string;
  request: GenerationRequest;
  timestamp: number;
  analysisText?: string;
}

export interface GenerationState {
  status: 'idle' | 'analyzing' | 'generating' | 'checking' | 'done' | 'error';
  result?: GenerationResult;
  error?: string;
  progress?: string;
}
