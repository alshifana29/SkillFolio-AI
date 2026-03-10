/**
 * OCR Validation Module
 * Cross-checks OCR-extracted text against expected student name & institution.
 * Score contribution: +30 for name mismatch
 */

export interface OcrValidationResult {
  score: number;
  findings: string[];
  nameFound: boolean;
  institutionFound: boolean;
}

export function validateOcrText(
  extractedText: string,
  user?: { firstName: string; lastName: string } | null,
  expectedInstitution?: string | null
): OcrValidationResult {
  const result: OcrValidationResult = {
    score: 0,
    findings: [],
    nameFound: false,
    institutionFound: false,
  };

  if (!extractedText || extractedText.trim().length === 0) {
    result.findings.push("No text could be extracted for OCR validation");
    return result;
  }

  const normalizedText = extractedText.toLowerCase();

  // Check student name
  if (user) {
    const firstName = user.firstName.toLowerCase();
    const lastName = user.lastName.toLowerCase();
    const fullName = `${firstName} ${lastName}`;

    if (normalizedText.includes(fullName) || normalizedText.includes(`${lastName} ${firstName}`)) {
      result.nameFound = true;
      result.findings.push("OCR validation: Student full name found in certificate");
    } else if (normalizedText.includes(firstName) || normalizedText.includes(lastName)) {
      result.nameFound = true;
      result.findings.push("OCR validation: Partial name match found in certificate");
    } else {
      result.nameFound = false;
      result.score += 30;
      result.findings.push(`OCR name mismatch: "${user.firstName} ${user.lastName}" not found in extracted text`);
    }
  }

  // Check institution
  if (expectedInstitution) {
    const normalizedInstitution = expectedInstitution.toLowerCase();
    // Check for partial match (at least the main word)
    const institutionWords = normalizedInstitution.split(/\s+/).filter(w => w.length > 3);
    const matched = institutionWords.some(word => normalizedText.includes(word));
    if (matched) {
      result.institutionFound = true;
      result.findings.push("OCR validation: Institution name found in certificate");
    } else {
      result.institutionFound = false;
      result.findings.push("OCR validation: Institution name not found in extracted text");
    }
  }

  return result;
}
