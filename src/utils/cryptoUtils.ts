/**
 * Simple client-side utility to hash the base64 image strings.
 * Used to avoid sending massive 10MB base64 strings as cache keys,
 * which would overflow sessionStorage instantly.
 */
export async function hashString(message: string): Promise<string> {
    const msgBuffer = new TextEncoder().encode(message);
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}
