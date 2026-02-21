export const LIFESTYLE_SCENE_PRESETS = {
  urban_street: {
    label: 'Urban Street',
    description: 'City environment, authentic street style',
    sceneDescription: 'busy urban street with soft-focus city background, brick walls, natural street textures, authentic urban environment',
    timeOfDay: 'golden hour afternoon',
    lightingMood: 'warm natural sunlight from the side, soft fill shadows, natural urban ambient light',
    sceneActivity: 'casual walking or standing naturally',
    lensType: '35mm street photography lens equivalent',
    shotType: 'three-quarter body shot',
    dof: 'medium depth of field, background slightly soft',
    colorGrade: 'warm, slightly cinematic, natural street photography tones',
  },
  minimal_indoor: {
    label: 'Clean Interior',
    description: 'Scandinavian minimal, natural light',
    sceneDescription: 'clean Scandinavian interior, white walls, light oak floor, minimal furniture softly visible in background',
    timeOfDay: 'midday natural window light',
    lightingMood: 'soft diffused natural light from left window, minimal controlled shadows, airy feel',
    sceneActivity: 'standing naturally, relaxed posture',
    lensType: '50mm standard lens equivalent',
    shotType: 'full body shot',
    dof: 'medium-shallow depth of field, background subtly blurred',
    colorGrade: 'clean, neutral, slightly airy and fresh',
  },
  outdoor_nature: {
    label: 'Outdoor Nature',
    description: 'Green outdoor setting, golden light',
    sceneDescription: 'lush outdoor setting, green foliage background, natural environment, park or garden, natural textures',
    timeOfDay: 'morning golden hour',
    lightingMood: 'soft dappled natural light filtering through trees, warm and inviting',
    sceneActivity: 'casual outdoor movement or standing',
    lensType: '85mm portrait lens equivalent',
    shotType: 'three-quarter body shot',
    dof: 'shallow depth of field, background softly and beautifully blurred (bokeh)',
    colorGrade: 'fresh, natural, slightly warm, earthy tones',
  },
  studio_editorial: {
    label: 'Studio Editorial',
    description: 'High-fashion studio, dramatic lighting',
    sceneDescription: 'high-fashion editorial studio, seamless backdrop, controlled professional environment',
    timeOfDay: 'controlled studio lighting',
    lightingMood: 'dramatic split lighting, one hard key light at 45°, deep controlled shadows, high contrast',
    sceneActivity: 'editorial fashion pose',
    lensType: '85mm portrait lens equivalent',
    shotType: 'three-quarter body shot',
    dof: 'sharp focus throughout entire frame',
    colorGrade: 'high contrast, editorial, punchy, magazine-quality',
  },
} as const;

export const CAMPAIGN_PRESETS = {
  minimalist_luxury: {
    label: 'Quiet Luxury',
    description: 'Clean, premium, Apple/Bottega aesthetic',
    poseDescription: 'minimal, confident, slightly asymmetric stance, understated elegance',
    photographyDescription: 'Camera: 85mm. Lighting: single large octabox, feathered soft light, long gentle shadows. Background: pure matte white or very light warm grey. Dominant negative space composition. The garment breathes.',
    moodDescription: 'quiet luxury, confident, premium, effortless',
  },
  street_energy: {
    label: 'Street Energy',
    description: 'Urban, dynamic, streetwear aesthetic',
    poseDescription: 'dynamic movement, energy, slight motion blur on extremities, authentic street attitude',
    photographyDescription: 'Camera: 35mm wide angle. Lighting: natural urban overcast light, flat and even. Background: urban environment, architecture or walls soft-focus. Gritty and real.',
    moodDescription: 'energetic, authentic, youthful, bold, street credibility',
  },
  neon_tech: {
    label: 'Neon Tech',
    description: 'Futuristic, neon-lit, editorial',
    poseDescription: 'strong angular editorial pose, commanding presence, facing camera or three-quarter turn',
    photographyDescription: 'Camera: 50mm. Lighting: dramatic neon rim lighting in purple/blue/pink tones, dark near-black background with selective dramatic illumination on subject. High contrast chiaroscuro.',
    moodDescription: 'futuristic, bold, high-fashion editorial, digital age luxury',
  },
  organic_natural: {
    label: 'Organic Natural',
    description: 'Warm, sustainable, earth-toned',
    poseDescription: 'relaxed, natural, authentic human movement, genuine expression',
    photographyDescription: 'Camera: 85mm. Lighting: golden hour natural sunlight, warm and enveloping. Setting: natural outdoor environment, earth tones surrounding, organic textures.',
    moodDescription: 'natural, warm, authentic, sustainable brand energy, human connection',
  },
} as const;

export const MODEL_POSE_PRESETS = {
  standing_straight: 'standing straight, feet shoulder-width apart, neutral natural posture, arms relaxed at sides',
  relaxed: 'relaxed casual stance, slight weight shift to one side, natural and approachable',
  hands_on_hips: 'hands resting on hips, confident posture, shoulders back, slightly forward-facing',
  walking: 'mid-stride walking pose, natural movement, one foot forward, arms in natural swing',
  editorial: 'strong editorial pose, angular and deliberate, fashion-forward body positioning',
} as const;

export const SKIN_TONE_DESCRIPTIONS = {
  fair: 'very fair skin tone, light complexion',
  light: 'light skin tone, slightly warm undertones',
  medium: 'medium skin tone, balanced warm undertones',
  tan: 'tan skin tone, warm golden-brown complexion',
  deep: 'deep rich skin tone, warm dark complexion',
} as const;
