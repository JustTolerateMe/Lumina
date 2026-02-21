export type GenerationMode = 'studio' | 'lifestyle' | 'on-figure' | 'campaign';

export type Gender = 'female' | 'male' | 'unisex';

export type SkinTone = 'fair' | 'light' | 'medium' | 'tan' | 'deep';

export type GarmentType =
  | 't-shirt' | 'hoodie' | 'sweatshirt' | 'jacket' | 'coat'
  | 'dress' | 'skirt' | 'pants' | 'shorts' | 'jeans'
  | 'blouse' | 'button-up' | 'polo' | 'vest' | 'cardigan';

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
}

export interface ModelConfig {
  gender: Gender;
  skinTone: SkinTone;
  pose: ModelPose;
}

export interface GenerationRequest {
  mode: GenerationMode;
  garment: GarmentConfig;
  model: ModelConfig;
  scene?: LifestyleScene;
  campaign?: CampaignStyle;
  aspectRatio: AspectRatio;
  imageSize: ImageSize;
  sourceImageBase64: string;
  sourceImageMimeType: string;
}

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
