/**
 * Duplicate Detection Module (Perceptual Hash Placeholder)
 * Compares a certificate's perceptual hash against known hashes.
 * Score contribution: +40 for high similarity
 */

export interface DuplicateCheckResult {
  score: number;
  findings: string[];
  isDuplicate: boolean;
  similarityPercent: number;
  matchedCertificateId: string | null;
}

/**
 * Compare an image hash against a list of known hashes.
 * Uses Hamming distance on hex-encoded perceptual hashes.
 */
export function checkDuplicate(
  imageHash: string,
  knownHashes: Array<{ certificateId: string; imageHash: string }>
): DuplicateCheckResult {
  const result: DuplicateCheckResult = {
    score: 0,
    findings: [],
    isDuplicate: false,
    similarityPercent: 0,
    matchedCertificateId: null,
  };

  if (!imageHash || knownHashes.length === 0) {
    result.findings.push("Duplicate check: No perceptual hash data available for comparison");
    return result;
  }

  let bestSimilarity = 0;
  let bestMatchId: string | null = null;

  for (const entry of knownHashes) {
    if (!entry.imageHash || entry.imageHash.length !== imageHash.length) continue;

    const distance = hammingDistanceHex(imageHash, entry.imageHash);
    const maxBits = imageHash.length * 4;
    const similarity = maxBits > 0 ? Math.max(0, 1 - distance / maxBits) : 0;

    if (similarity > bestSimilarity) {
      bestSimilarity = similarity;
      bestMatchId = entry.certificateId;
    }
  }

  result.similarityPercent = Math.round(bestSimilarity * 100);
  result.matchedCertificateId = bestMatchId;

  if (bestSimilarity >= 0.95) {
    result.isDuplicate = true;
    result.score += 40;
    result.findings.push(`Duplicate detection: ${result.similarityPercent}% visual similarity with existing certificate`);
  } else if (bestSimilarity >= 0.85) {
    result.score += 20;
    result.findings.push(`Duplicate detection: ${result.similarityPercent}% visual similarity — near-duplicate suspected`);
  } else if (bestSimilarity >= 0.70) {
    result.findings.push(`Duplicate detection: ${result.similarityPercent}% visual similarity — low concern`);
  }

  return result;
}

function hammingDistanceHex(a: string, b: string): number {
  let distance = 0;
  for (let i = 0; i < a.length; i++) {
    const xor = parseInt(a[i], 16) ^ parseInt(b[i], 16);
    distance += xor.toString(2).split("1").length - 1;
  }
  return distance;
}
