'use client';

export const OPEN_PRIVACY_PREFERENCES = 'mp:open-privacy-preferences';

export function PrivacyPreferencesButton() {
  return <button type="button" onClick={() => window.dispatchEvent(new Event(OPEN_PRIVACY_PREFERENCES))} className="text-gray-300 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white">Preferências de privacidade</button>;
}
