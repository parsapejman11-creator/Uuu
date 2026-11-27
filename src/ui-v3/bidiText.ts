/**
 * Pure bidi & numeral normalization helpers for UI v3 (Liquid Glass).
 * - Unifies Persian/Arabic-Indic numerals to consistent Latin digits (0-9) across UI v3.
 * - Normalizes mode ratios like 1v1 / 2v2 so they never render as Persian "۱۷۱".
 * - Isolates parenthesized English names (e.g. Desert Outpost, Duel Arena) and inline
 *   Latin/numeric tokens so RTL punctuation/parentheses never flip or swap order.
 */

export interface BidiSegment {
  text: string;
  dir: 'auto' | 'ltr';
  isParen?: boolean;
}

const PERSIAN_DIGIT_BASE = 0x06f0;
const ARABIC_INDIC_DIGIT_BASE = 0x0660;

export function normalizeUiDigits(input: string): string {
  if (!input) return '';
  let out = '';
  for (let i = 0; i < input.length; i++) {
    const code = input.charCodeAt(i);
    if (code >= PERSIAN_DIGIT_BASE && code <= PERSIAN_DIGIT_BASE + 9) {
      out += String(code - PERSIAN_DIGIT_BASE);
    } else if (code >= ARABIC_INDIC_DIGIT_BASE && code <= ARABIC_INDIC_DIGIT_BASE + 9) {
      out += String(code - ARABIC_INDIC_DIGIT_BASE);
    } else {
      out += input[i];
    }
  }
  // Ensure 1V1 / 2V2 stay lowercase Latin 1v1 / 2v2
  return out.replace(/(\d+)[vV](\d+)/g, '$1v$2');
}

/**
 * Matches either:
 * 1) Parenthesized Latin/digit phrases with no RTL chars inside, e.g. "(Desert Outpost)", "(1v1 / 2v2)", "(3/10)"
 * 2) Standalone inline Latin/digit runs, e.g. "1v1", "2v2", "HESCO", "CQB", "AK-47", "FPS Max"
 */
const BIDI_TOKEN_REGEX =
  /\(([A-Za-z0-9][A-Za-z0-9\s._/:+\-×x]*)\)|([A-Za-z0-9](?:[A-Za-z0-9._/:+\-×x ]*[A-Za-z0-9])?)/g;

export function tokenizeBidiText(raw: string): BidiSegment[] {
  const normalized = normalizeUiDigits(raw);
  if (!normalized) return [];

  const segments: BidiSegment[] = [];
  let cursor = 0;

  BIDI_TOKEN_REGEX.lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = BIDI_TOKEN_REGEX.exec(normalized)) !== null) {
    const matchStart = match.index;
    const matchText = match[0];

    if (matchStart > cursor) {
      segments.push({ text: normalized.slice(cursor, matchStart), dir: 'auto' });
    }

    if (match[1] !== undefined) {
      // Keep "(Desert Outpost)" / "(1v1 / 2v2)" as one isolated LTR unit so parens never flip or break across lines
      const inner = match[1].trim();
      segments.push({ text: `(${inner})`, dir: 'ltr', isParen: true });
    } else if (match[2] !== undefined) {
      segments.push({ text: match[2], dir: 'ltr' });
    } else {
      segments.push({ text: matchText, dir: 'auto' });
    }

    cursor = matchStart + matchText.length;
  }

  if (cursor < normalized.length) {
    segments.push({ text: normalized.slice(cursor), dir: 'auto' });
  }

  return segments;
}
