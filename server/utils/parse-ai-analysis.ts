/**
 * Safe parser for the aiAnalysis field on certificates.
 *
 * Supports two formats:
 *   OLD: aiAnalysis is a plain string (legacy)
 *   NEW: aiAnalysis is a JSON-serialised ForensicReport
 *
 * Always returns a normalised object so consumers don't need format checks.
 */

export interface ParsedAiAnalysis {
  score: number;
  isSuspicious: boolean;
  reasoning: string[];
  checks?: {
    metadata: string[];
    ocr: string[];
    qr: string[];
    duplicate: string[];
  };
}

/**
 * Parse aiAnalysis from a certificate row.
 *
 * @param aiAnalysis  The raw `aiAnalysis` column value (string or null)
 * @param fraudScore  The raw `fraudScore` column value (number or null)
 */
export function parseAiAnalysis(
  aiAnalysis: string | null | undefined,
  fraudScore: number | null | undefined
): ParsedAiAnalysis | null {
  if (!aiAnalysis && (fraudScore === null || fraudScore === undefined)) {
    return null;
  }

  // Try JSON parse first (new format)
  if (aiAnalysis) {
    const trimmed = aiAnalysis.trim();
    if (trimmed.startsWith("{")) {
      try {
        const parsed = JSON.parse(trimmed);
        if (typeof parsed.score === "number" && Array.isArray(parsed.reasoning)) {
          return {
            score: parsed.score,
            isSuspicious: parsed.isSuspicious ?? parsed.score > 40,
            reasoning: parsed.reasoning,
            checks: parsed.checks ?? undefined,
          };
        }
      } catch {
        // Fall through to legacy format
      }
    }
  }

  // Legacy string format
  const score = fraudScore ?? 0;
  return {
    score,
    isSuspicious: score > 40,
    reasoning: aiAnalysis ? [aiAnalysis] : ["Legacy analysis format."],
  };
}
