/**
 * Metadata Analysis Module
 * Detects editing software signatures (Photoshop, GIMP, etc.) from file buffers.
 * Score contribution: +15 per flag
 */

const EDITING_SOFTWARE_PATTERNS = [
  { pattern: /adobe\s*photoshop/i, name: "Adobe Photoshop" },
  { pattern: /gimp/i, name: "GIMP" },
  { pattern: /adobe\s*illustrator/i, name: "Adobe Illustrator" },
  { pattern: /paint\.net/i, name: "Paint.NET" },
  { pattern: /canva/i, name: "Canva" },
  { pattern: /pixlr/i, name: "Pixlr" },
  { pattern: /affinity/i, name: "Affinity" },
  { pattern: /corel/i, name: "CorelDRAW" },
];

export interface MetadataAnalysisResult {
  score: number;
  findings: string[];
  softwareDetected: string[];
}

export function analyzeMetadata(fileBuffer: Buffer): MetadataAnalysisResult {
  const result: MetadataAnalysisResult = {
    score: 0,
    findings: [],
    softwareDetected: [],
  };

  // Scan first 64KB for EXIF / XMP / metadata markers
  const searchRange = Math.min(fileBuffer.length, 65536);
  const headerStr = fileBuffer.toString("latin1", 0, searchRange);

  for (const { pattern, name } of EDITING_SOFTWARE_PATTERNS) {
    if (pattern.test(headerStr)) {
      result.softwareDetected.push(name);
      result.score += 15;
      result.findings.push(`Metadata shows editing software: ${name}`);
    }
  }

  // Check for suspicious EXIF modification timestamps
  const exifModifyDate = /ModifyDate|DateTimeOriginal|CreateDate/i;
  if (exifModifyDate.test(headerStr)) {
    const modifyMatch = headerStr.match(/ModifyDate[^0-9]*(\d{4}[:\-]\d{2}[:\-]\d{2})/i);
    const createMatch = headerStr.match(/(?:DateTimeOriginal|CreateDate)[^0-9]*(\d{4}[:\-]\d{2}[:\-]\d{2})/i);
    if (modifyMatch && createMatch && modifyMatch[1] !== createMatch[1]) {
      result.findings.push("Metadata dates suggest file was modified after creation");
    }
  }

  // Cap score contribution
  result.score = Math.min(result.score, 30);

  return result;
}
