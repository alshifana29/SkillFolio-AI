/**
 * QR Code Analysis Module
 * Detects QR code presence in certificate file buffers.
 * Score contribution: +10 if expected but missing
 */

// Common QR code byte patterns found in images
const QR_INDICATORS = [
  Buffer.from("qr", "ascii"),
  Buffer.from("QR", "ascii"),
  Buffer.from([0x00, 0x00, 0x00, 0x00, 0xfe]), // QR finder pattern start
];

export interface QrAnalysisResult {
  score: number;
  findings: string[];
  qrDetected: boolean;
}

export function analyzeQrPresence(fileBuffer: Buffer): QrAnalysisResult {
  const result: QrAnalysisResult = {
    score: 0,
    findings: [],
    qrDetected: false,
  };

  // Search file content for QR-related markers
  const searchStr = fileBuffer.toString("latin1", 0, Math.min(fileBuffer.length, fileBuffer.length));
  
  // Check for QR-related strings in metadata/content
  if (/qr[\s_-]?code/i.test(searchStr) || /barcode/i.test(searchStr)) {
    result.qrDetected = true;
    result.findings.push("QR code reference detected in file content");
    return result;
  }

  // For images: look for characteristic high-contrast block patterns
  // This is a heuristic — real QR detection would use a library like jsQR
  const bufferLength = fileBuffer.length;
  if (bufferLength > 1000) {
    // Look for finder pattern signatures (alternating dark/light blocks)
    let contrastBlocks = 0;
    const sampleSize = Math.min(bufferLength, 50000);
    const step = Math.max(1, Math.floor(sampleSize / 1000));
    
    for (let i = 0; i < sampleSize - step; i += step) {
      const diff = Math.abs(fileBuffer[i] - fileBuffer[i + step]);
      if (diff > 200) contrastBlocks++;
    }
    
    // High contrast ratio suggests possible QR/barcode presence
    if (contrastBlocks > 50) {
      result.qrDetected = true;
      result.findings.push("High-contrast patterns detected (possible QR code)");
      return result;
    }
  }

  // If no QR detected, flag it as a minor concern
  result.score += 10;
  result.findings.push("No QR code detected in certificate — verification may be limited");

  return result;
}
