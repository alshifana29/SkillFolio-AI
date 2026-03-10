/**
 * Fraud Score Aggregation Module
 * Combines individual forensic check scores into a final 0-100 score
 * with structured forensic report output.
 */

import type { MetadataAnalysisResult } from "./metadata-analysis";
import type { OcrValidationResult } from "./ocr-analysis";
import type { QrAnalysisResult } from "./qr-analysis";
import type { DuplicateCheckResult } from "./duplicate-check";

export interface ForensicChecks {
  metadata: string[];
  ocr: string[];
  qr: string[];
  duplicate: string[];
}

export interface ForensicReport {
  score: number;
  isSuspicious: boolean;
  reasoning: string[];
  checks: ForensicChecks;
}

export function aggregateForensicScore(
  baseScore: number,
  baseReasoning: string[],
  metadata?: MetadataAnalysisResult,
  ocr?: OcrValidationResult,
  qr?: QrAnalysisResult,
  duplicate?: DuplicateCheckResult
): ForensicReport {
  let totalScore = baseScore;
  const allReasoning: string[] = [...baseReasoning];
  const checks: ForensicChecks = {
    metadata: [],
    ocr: [],
    qr: [],
    duplicate: [],
  };

  if (metadata) {
    totalScore += metadata.score;
    checks.metadata = metadata.findings;
    allReasoning.push(...metadata.findings.filter(f => metadata.score > 0 || f.includes("software")));
  }

  if (ocr) {
    totalScore += ocr.score;
    checks.ocr = ocr.findings;
    allReasoning.push(...ocr.findings.filter(f => ocr.score > 0));
  }

  if (qr) {
    totalScore += qr.score;
    checks.qr = qr.findings;
    allReasoning.push(...qr.findings.filter(f => qr.score > 0));
  }

  if (duplicate) {
    totalScore += duplicate.score;
    checks.duplicate = duplicate.findings;
    allReasoning.push(...duplicate.findings.filter(f => duplicate.score > 0));
  }

  // Clamp to 0-100
  totalScore = Math.min(100, Math.max(0, totalScore));

  return {
    score: totalScore,
    isSuspicious: totalScore > 40,
    reasoning: allReasoning.length > 0
      ? allReasoning
      : ["No significant concerns detected. Certificate appears authentic."],
    checks,
  };
}
