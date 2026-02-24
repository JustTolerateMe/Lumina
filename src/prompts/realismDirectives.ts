import type { AgeGroup } from '../types';

export function buildRealismBlock(
  context: 'studio' | 'lifestyle' | 'campaign',
  ageGroup: AgeGroup = 'adult'
): string {
  const isChild = (['infant', 'toddler', 'child'] as AgeGroup[]).includes(ageGroup);

  const skinRealism = isChild
    ? `SKIN REALISM — CRITICAL:
- Soft, natural child skin texture — smooth but NOT artificially perfect or plastic
- Natural skin folds at wrists, ankles, and neck appropriate for age
- Realistic skin color variation: slightly pinker cheeks, paler palms, natural flush
- Subtle peach fuzz visible on arms and face in close areas
- No CGI smoothness. No plastic doll appearance. Real child skin with natural softness.
- Hands must have age-appropriate proportions — correct finger count, natural spacing`
    : `SKIN REALISM — CRITICAL:
- Natural skin texture: visible pores, subtle blemishes, fine vellus hair on arms
- Subsurface scattering on ears, fingertips, and nose bridge — light passes through thin skin naturally
- Realistic under-eye area: faint natural shadows, not airbrushed smooth
- Natural lip texture with fine vertical lines, slight moisture variation
- Skin specular highlights follow Fresnel falloff — not uniform plastic sheen
- Hands must have visible knuckle creases, nail cuticles, and natural skin folds
- Five fingers per hand — correct anatomy, natural spacing, no merged or extra digits
- No CGI smoothness. No porcelain doll skin. No airbrushed perfection.`;

  const fabricRealism = `FABRIC REALISM — CRITICAL:
- Micro-wrinkles at elbow creases, underarm, and waistband — fabric responds to body tension
- Natural fabric bunching where garment meets body joints (elbows, armpits, hip crease)
- Gravity-responsive hem: fabric weight pulls downward naturally, slight asymmetry permitted
- Thread-level texture visible — individual fiber direction on cotton, twill lines on denim
- Fabric compression shadows where garment contacts body (shoulder seams, waistband, cuffs)
- Organic fold formation: no mathematically perfect symmetrical draping
- Slight natural fabric settling — garment looks worn and lived-in, not freshly placed by CGI`;

  const shadowRealism = context === 'studio'
    ? `SHADOW AND LIGHT REALISM:
- Soft shadow gradients under chin following jaw contour
- Sleeve cast shadows on torso with natural penumbra falloff
- Hem shadow on legs with distance-appropriate softness
- Contact shadows where fabric rests on skin (neckline, cuffs)
- Ambient occlusion in garment folds — darker in deep creases, lighter at fold peaks
- Light wrap around model edges — no hard cutout look against background
- Slight warm bounce light on underside of chin from garment color`
    : context === 'lifestyle'
      ? `SHADOW AND LIGHT REALISM:
- Environment-consistent shadow direction — single dominant light source with natural fill
- Atmospheric perspective: slight haze between model and distant background elements
- Natural light falloff across the body — areas facing away from light are darker but not black
- Contact shadows where feet meet ground surface
- Ambient occlusion in garment folds — darker in deep creases, lighter at fold peaks
- Edge lighting follows scene lighting — no studio rim light in outdoor scenes`
      : `SHADOW AND LIGHT REALISM:
- Dramatic but physically correct lighting — shadows cast in consistent single direction
- Specular highlights on skin follow light position logically
- Ambient occlusion in garment folds — darker in deep creases, lighter at fold peaks
- No impossible light sources — every highlight and shadow traceable to the scene lighting
- Light interaction between garment color and skin — colored bounce light where appropriate`;

  const antiAI = `ANTI-AI ARTIFACTS — ABSOLUTE PROHIBITIONS:
- NO uniform skin smoothing or frequency-domain blur
- NO perfectly symmetrical facial features or body pose
- NO artificial sharp outlines or edge halos around the model
- NO plastic or waxy skin appearance
- NO digital compositing seams between model and background
- NO duplicated or merged clothing seams
- NO floating fabric that defies gravity
- NO inconsistent light direction between face, garment, and background
- NO unnaturally smooth garment surfaces without fiber texture
Shot on medium format digital (Hasselblad X2D equivalent), \
natural color science, subtle film-like tonal rolloff in highlights and shadows.`;

  return `${skinRealism}\n\n${fabricRealism}\n\n${shadowRealism}\n\n${antiAI}`;
}
