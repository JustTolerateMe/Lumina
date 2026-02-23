import { BrandProfile } from '../types';

const STORAGE_KEY = 'lumina-brand-profiles';

export function getProfiles(): BrandProfile[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]');
  } catch {
    return [];
  }
}

export function saveProfile(profile: BrandProfile): void {
  const profiles = getProfiles();
  const idx = profiles.findIndex((p) => p.id === profile.id);
  if (idx >= 0) {
    profiles[idx] = profile;
  } else {
    profiles.push(profile);
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(profiles));
}

export function deleteProfile(id: string): void {
  const profiles = getProfiles().filter((p) => p.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(profiles));
}
