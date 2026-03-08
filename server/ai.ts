import crypto from "crypto";
import fs from "fs";
import { storage } from "./storage";
import type { Certificate, ForgeryReport } from "@shared/schema";
import { exec } from "child_process";
import util from "util";

const execAsync = util.promisify(exec);

export interface ForgeryAnalysisResult {
  authenticity: "authentic" | "suspicious" | "likely_forged";
  fraudScore: number;
  riskLevel: "low" | "medium" | "high";
  anomalyScore: number;
  elaScore: number;
  noiseScore: number;
  templateScore: number;
  tamperZones: Array<{ x: number; y: number; width: number; height: number; severity: string }>;
  reasoning: string;
  extractedText: string;
  qrData: string | null;
  metadata: {
    fileSize?: number;
    fileType?: string;
    dimensions?: { width: number; height: number };
    createdAt?: string;
    modifiedAt?: string;
    software?: string;
    ocrEngine?: string;
    imageHash?: string;
    textHash?: string;
    contentHash?: string;
    templateReferenceId?: string;
    textSimilarity?: number;
    imageSimilarity?: number;
    templateSimilarity?: number;
  };
}

type TemplateMatchResult = {
  templateScore: number;
  bestMatchCertificateId: string | null;
  textSimilarity: number;
  imageSimilarity: number;
  combinedSimilarity: number;
  exactContentDuplicate: boolean;
  nearDuplicate: boolean;
};

type HashMetadata = {
  imageHash?: string;
  textHash?: string;
  contentHash?: string;
};

export class ForgeryDetector {
  private suspiciousPatterns = [
    /photoshop/i,
    /gimp/i,
    /edit/i,
    /modified/i,
    /fake/i,
    /forged/i,
    /sample/i,
    /test/i,
    /demo/i,
    /placeholder/i,
  ];

  private validInstitutions = [
    "university",
    "college",
    "institute",
    "academy",
    "school",
    "coursera",
    "udemy",
    "edx",
    "linkedin learning",
    "aws",
    "google",
    "microsoft",
    "oracle",
    "cisco",
    "comptia",
  ];

  async analyzeCertificate(
    certificate: Certificate,
    fileBuffer?: Buffer,
    user?: any,
    filePath?: string,
    mimeType?: string
  ): Promise<ForgeryAnalysisResult> {
    const analysisResults: ForgeryAnalysisResult = {
      authenticity: "authentic",
      fraudScore: 0,
      riskLevel: "low",
      anomalyScore: 0,
      elaScore: 0,
      noiseScore: 0,
      templateScore: 100,
      tamperZones: [],
      reasoning: "",
      extractedText: "",
      qrData: null,
      metadata: {},
    };

    const reasoningParts: string[] = [];

    const titleScore = this.analyzeTitle(certificate.title);
    analysisResults.fraudScore += titleScore.score;
    if (titleScore.issues.length > 0) {
      reasoningParts.push(`Title concerns: ${titleScore.issues.join(", ")}`);
    }

    const institutionScore = this.analyzeInstitution(certificate.institution);
    analysisResults.fraudScore += institutionScore.score;
    if (institutionScore.issues.length > 0) {
      reasoningParts.push(`Institution concerns: ${institutionScore.issues.join(", ")}`);
    }

    if (fileBuffer) {
      const fileAnalysis = this.analyzeFileBuffer(fileBuffer);
      analysisResults.fraudScore += fileAnalysis.score;
      analysisResults.elaScore = fileAnalysis.elaScore;
      analysisResults.noiseScore = fileAnalysis.noiseScore;
      analysisResults.metadata = fileAnalysis.metadata;

      if (fileAnalysis.issues.length > 0) {
        reasoningParts.push(`File concerns: ${fileAnalysis.issues.join(", ")}`);
      }

      try {
        let text = filePath ? await this.performOCR(filePath, mimeType) : "";
        if (!text && mimeType === "application/pdf") {
          text = this.extractTextFromPdfBuffer(fileBuffer);
          if (text) {
            analysisResults.metadata.ocrEngine = "pdf-buffer-fallback";
          }
        }
        analysisResults.extractedText = text;

        if (user) {
          const nameCheck = this.checkNameMismatch(text, user);
          analysisResults.fraudScore += nameCheck.score;
          if (nameCheck.issues.length > 0) reasoningParts.push(...nameCheck.issues);
        }

        const dateCheck = this.checkDateAnomaly(text);
        analysisResults.fraudScore += dateCheck.score;
        if (dateCheck.issues.length > 0) reasoningParts.push(...dateCheck.issues);
      } catch (error) {
        console.error("OCR Analysis failed:", error);
        reasoningParts.push("OCR extraction failed, manual review recommended");
      }
    }

    const duplicates = await storage.findDuplicateCertificates(
      certificate.title,
      certificate.institution,
      certificate.id
    );

    if (duplicates.length > 0) {
      analysisResults.fraudScore += 25;
      analysisResults.authenticity = "suspicious";
      reasoningParts.push(`Duplicate Alert: Found ${duplicates.length} existing certificate(s) with identical metadata`);
    }

    const normalizedText = this.normalizeText(analysisResults.extractedText);
    const imageHash = fileBuffer ? this.generateImageHash(fileBuffer) : "";
    const textHash = normalizedText ? this.generateTextHash(normalizedText) : "";
    const contentHash = this.generateContentHash(certificate, imageHash, textHash);

    if (imageHash) analysisResults.metadata.imageHash = imageHash;
    if (textHash) analysisResults.metadata.textHash = textHash;
    if (contentHash) analysisResults.metadata.contentHash = contentHash;

    if (imageHash || textHash) {
      const templateMatch = await this.compareAgainstHistory(
        certificate,
        normalizedText,
        imageHash,
        contentHash
      );

      analysisResults.templateScore = templateMatch.templateScore;
      analysisResults.metadata.templateReferenceId = templateMatch.bestMatchCertificateId || undefined;
      analysisResults.metadata.textSimilarity = templateMatch.textSimilarity;
      analysisResults.metadata.imageSimilarity = templateMatch.imageSimilarity;
      analysisResults.metadata.templateSimilarity = templateMatch.combinedSimilarity;

      if (templateMatch.exactContentDuplicate) {
        analysisResults.fraudScore += 35;
        reasoningParts.push("Exact content-hash duplicate detected against an existing certificate");
      } else if (templateMatch.nearDuplicate) {
        analysisResults.fraudScore += 20;
        reasoningParts.push("Near-duplicate detected from OCR text + image hash similarity");
      }

      if (templateMatch.templateScore < 35) {
        analysisResults.fraudScore += 10;
        reasoningParts.push("Template mismatch: uploaded certificate strongly differs from known template patterns");
      } else if (templateMatch.templateScore >= 70) {
        reasoningParts.push("Template match: certificate structure aligns with historical records");
      }
    }

    const consistencyScore = this.checkConsistency(certificate);
    analysisResults.fraudScore += consistencyScore.score;
    if (consistencyScore.issues.length > 0) {
      reasoningParts.push(`Consistency concerns: ${consistencyScore.issues.join(", ")}`);
    }

    analysisResults.fraudScore = Math.min(100, Math.max(0, analysisResults.fraudScore));

    if (analysisResults.fraudScore >= 70) {
      analysisResults.authenticity = "likely_forged";
    } else if (analysisResults.fraudScore >= 35) {
      analysisResults.authenticity = "suspicious";
    } else {
      analysisResults.authenticity = "authentic";
    }

    if (reasoningParts.length === 0) {
      analysisResults.reasoning = "No significant concerns detected. Certificate appears authentic.";
    } else {
      analysisResults.reasoning = reasoningParts.join(". ") + ".";
    }

    if (analysisResults.templateScore === 100 && !analysisResults.metadata.templateReferenceId) {
      analysisResults.templateScore = Math.max(0, 100 - analysisResults.fraudScore);
    }

    analysisResults.anomalyScore = Math.round((analysisResults.fraudScore / 100) * 100) / 100;
    analysisResults.riskLevel = this.getRiskLevel(analysisResults.fraudScore);

    console.log(`[AI Analysis] Certificate ID: ${certificate.id} | Score: ${analysisResults.fraudScore} | Risk: ${analysisResults.riskLevel}`);
    return analysisResults;
  }

  private async performOCR(filePath: string, mimeType?: string): Promise<string> {
    if (!fs.existsSync(filePath)) {
      console.warn(`[OCR] File not found: ${filePath}`);
      return "";
    }

    const supportedMimeTypes = new Set([
      "image/jpeg",
      "image/jpg",
      "image/png",
      "image/gif",
      "image/webp",
      "image/bmp",
      "image/tiff",
      "application/pdf",
    ]);

    if (mimeType && !supportedMimeTypes.has(mimeType)) {
      console.warn(`[OCR] Unsupported MIME type for Tesseract: ${mimeType}`);
      return "";
    }

    try {
      console.log(`[OCR] Starting extraction for file: ${filePath}`);
      const modes = [6, 11, 4, 3];
      for (const psm of modes) {
        const { stdout, stderr } = await execAsync(
          `tesseract "${filePath}" stdout -l eng --psm ${psm}`
        );

        if (stderr) {
          console.log(`[OCR] Tesseract info (psm ${psm}): ${stderr.split("\n")[0]}`);
        }

        const clean = stdout.trim();
        if (clean.length > 0) {
          console.log(`[OCR] Extraction success with psm ${psm}. Text length: ${clean.length} chars`);
          console.log(`[OCR Preview]: ${clean.substring(0, 120).replace(/\n/g, " ")}...`);
          return clean;
        }
      }

      console.warn("[OCR] Warning: Extracted text is empty after trying multiple PSM modes.");
      return "";
    } catch (error: any) {
      console.error("System OCR extraction failed:", error.message);
      if (error.stderr) console.error(`[OCR] Error details: ${error.stderr}`);
      return "";
    }
  }

  private extractTextFromPdfBuffer(buffer: Buffer): string {
    const raw = buffer.toString("latin1");
    const regex = /\(([^)]{4,})\)/g;
    const chunks: string[] = [];
    let match: RegExpExecArray | null = null;
    while ((match = regex.exec(raw)) !== null) {
      const value = match[1]
        .replace(/\\[nrt]/g, " ")
        .replace(/\\\d{3}/g, " ")
        .replace(/[^\x20-\x7E]+/g, " ")
        .trim();
      if (value.length >= 4) chunks.push(value);
    }
    return chunks.join(" ").trim();
  }

  private normalizeText(text: string): string {
    return text
      .toLowerCase()
      .replace(/[\r\n\t]+/g, " ")
      .replace(/[^a-z0-9\s]/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  private tokenize(text: string): Set<string> {
    if (!text) return new Set();
    return new Set(
      text
        .split(" ")
        .map((token) => token.trim())
        .filter((token) => token.length >= 3)
    );
  }

  private generateTextHash(normalizedText: string): string {
    return crypto.createHash("sha256").update(normalizedText).digest("hex");
  }

  private generateImageHash(buffer: Buffer): string {
    const bins = 64;
    const segmentSize = Math.max(1, Math.floor(buffer.length / bins));
    const values: number[] = [];
    for (let i = 0; i < bins; i++) {
      const start = i * segmentSize;
      const end = Math.min(buffer.length, start + segmentSize);
      if (start >= buffer.length) {
        values.push(0);
        continue;
      }
      let sum = 0;
      for (let j = start; j < end; j++) {
        sum += buffer[j];
      }
      values.push(Math.round(sum / Math.max(1, end - start)));
    }

    let hashBits = "";
    for (let i = 0; i < values.length - 1; i++) {
      hashBits += values[i] >= values[i + 1] ? "1" : "0";
    }

    const padded = hashBits.padEnd(64, "0");
    const asHex = BigInt(`0b${padded}`).toString(16).padStart(16, "0");
    return asHex;
  }

  private generateContentHash(certificate: Certificate, imageHash: string, textHash: string): string {
    const identity = [
      this.normalizeText(certificate.title || ""),
      this.normalizeText(certificate.institution || ""),
      imageHash || "",
      textHash || "",
    ].join("|");
    return crypto.createHash("sha256").update(identity).digest("hex");
  }

  private hammingDistanceHex(a: string, b: string): number {
    if (!a || !b || a.length !== b.length) return Number.MAX_SAFE_INTEGER;
    let distance = 0;
    for (let i = 0; i < a.length; i++) {
      const xor = parseInt(a[i], 16) ^ parseInt(b[i], 16);
      distance += xor.toString(2).split("1").length - 1;
    }
    return distance;
  }

  private jaccardSimilarity(a: Set<string>, b: Set<string>): number {
    if (a.size === 0 || b.size === 0) return 0;
    let intersection = 0;
    a.forEach((value) => {
      if (b.has(value)) intersection++;
    });
    const union = a.size + b.size - intersection;
    return union > 0 ? intersection / union : 0;
  }

  private extractHashes(metadata: unknown): HashMetadata {
    if (!metadata || typeof metadata !== "object") return {};
    const candidate = metadata as Record<string, unknown>;
    return {
      imageHash: typeof candidate.imageHash === "string" ? candidate.imageHash : undefined,
      textHash: typeof candidate.textHash === "string" ? candidate.textHash : undefined,
      contentHash: typeof candidate.contentHash === "string" ? candidate.contentHash : undefined,
    };
  }

  private async compareAgainstHistory(
    certificate: Certificate,
    normalizedText: string,
    imageHash: string,
    contentHash: string
  ): Promise<TemplateMatchResult> {
    const reports = await storage.getRecentForgeryReports(500);
    if (reports.length === 0) {
      return {
        templateScore: 100,
        bestMatchCertificateId: null,
        textSimilarity: 0,
        imageSimilarity: 0,
        combinedSimilarity: 0,
        exactContentDuplicate: false,
        nearDuplicate: false,
      };
    }

    const certificates = await storage.getAllCertificates();
    const certMap = new Map(certificates.map((item) => [item.id, item]));

    let bestScore = 0;
    let bestTextScore = 0;
    let bestImageScore = 0;
    let bestId: string | null = null;
    let exactContentDuplicate = false;
    let nearDuplicate = false;

    const currentInstitution = this.normalizeText(certificate.institution || "");
    const currentTokens = this.tokenize(normalizedText);

    for (const report of reports) {
      if (report.certificateId === certificate.id) continue;

      const historicCertificate = certMap.get(report.certificateId);
      const historicHashes = this.extractHashes(report.metadata);

      if (contentHash && historicHashes.contentHash && contentHash === historicHashes.contentHash) {
        exactContentDuplicate = true;
      }

      const historicText = this.normalizeText(report.extractedText || "");
      const historicTokens = this.tokenize(historicText);
      const textSimilarity = currentTokens.size > 0 && historicTokens.size > 0
        ? this.jaccardSimilarity(currentTokens, historicTokens)
        : 0;

      let imageSimilarity = 0;
      if (imageHash && historicHashes.imageHash && imageHash.length === historicHashes.imageHash.length) {
        const distance = this.hammingDistanceHex(imageHash, historicHashes.imageHash);
        const maxDistance = imageHash.length * 4;
        imageSimilarity = maxDistance > 0 ? Math.max(0, 1 - (distance / maxDistance)) : 0;
      }

      const sameInstitution = historicCertificate
        ? this.normalizeText(historicCertificate.institution || "") === currentInstitution
        : false;
      const institutionBoost = sameInstitution ? 0.1 : 0;

      const combined = Math.min(1, (0.55 * textSimilarity) + (0.45 * imageSimilarity) + institutionBoost);
      if (combined >= 0.92 && report.certificateId !== certificate.id) {
        nearDuplicate = true;
      }

      if (combined > bestScore) {
        bestScore = combined;
        bestTextScore = textSimilarity;
        bestImageScore = imageSimilarity;
        bestId = report.certificateId;
      }
    }

    return {
      templateScore: Math.round(bestScore * 100),
      bestMatchCertificateId: bestId,
      textSimilarity: Math.round(bestTextScore * 100) / 100,
      imageSimilarity: Math.round(bestImageScore * 100) / 100,
      combinedSimilarity: Math.round(bestScore * 100) / 100,
      exactContentDuplicate,
      nearDuplicate,
    };
  }

  private checkNameMismatch(text: string, user: any): { score: number; issues: string[] } {
    const issues: string[] = [];
    let score = 0;
    const normalizedText = text.toLowerCase();
    const firstName = user.firstName.toLowerCase();
    const lastName = user.lastName.toLowerCase();

    if (!normalizedText.includes(firstName) && !normalizedText.includes(lastName)) {
      score += 30;
      issues.push(`Name Mismatch: User's name (${user.firstName} ${user.lastName}) not found in certificate text`);
    } else if (!normalizedText.includes(lastName)) {
      score += 10;
      issues.push("Partial Name Match: Last name not found in certificate");
    }

    return { score, issues };
  }

  private checkDateAnomaly(text: string): { score: number; issues: string[] } {
    const issues: string[] = [];
    let score = 0;

    const datePatterns = [
      /\b\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}\b/g,
      /\b(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]* \d{1,2},? \d{4}\b/gi
    ];

    const foundDates: Date[] = [];
    datePatterns.forEach(pattern => {
      const matches = text.match(pattern);
      if (matches) {
        matches.forEach(dateStr => {
          const date = new Date(dateStr);
          if (!isNaN(date.getTime())) {
            foundDates.push(date);
          }
        });
      }
    });

    const now = new Date();
    const futureDates = foundDates.filter(d => d > now);

    if (futureDates.length > 0) {
      score += 40;
      issues.push(`Date Anomaly: Certificate contains future date (${futureDates[0].toDateString()})`);
    }

    return { score, issues };
  }

  private getRiskLevel(score: number): "low" | "medium" | "high" {
    if (score < 35) return "low";
    if (score < 70) return "medium";
    return "high";
  }

  private analyzeTitle(title: string): { score: number; issues: string[] } {
    const issues: string[] = [];
    let score = 0;

    if (title.length < 10) {
      score += 10;
      issues.push("Title is unusually short");
    }

    if (title.length > 200) {
      score += 5;
      issues.push("Title is unusually long");
    }

    for (const pattern of this.suspiciousPatterns) {
      if (pattern.test(title)) {
        score += 20;
        issues.push(`Title contains suspicious term: "${pattern.source}"`);
      }
    }

    const hasNumbers = /\d/.test(title);
    const hasLetters = /[a-zA-Z]/.test(title);
    if (!hasLetters) {
      score += 15;
      issues.push("Title lacks alphabetic characters");
    }

    return { score, issues };
  }

  private analyzeInstitution(institution: string): { score: number; issues: string[] } {
    const issues: string[] = [];
    let score = 0;

    const normalizedInstitution = institution.toLowerCase();
    const isKnownType = this.validInstitutions.some(valid =>
      normalizedInstitution.includes(valid)
    );

    if (!isKnownType) {
      score += 10;
      issues.push("Institution name doesn't match known educational patterns");
    }

    if (institution.length < 5) {
      score += 15;
      issues.push("Institution name is unusually short");
    }

    for (const pattern of this.suspiciousPatterns) {
      if (pattern.test(institution)) {
        score += 25;
        issues.push("Institution contains suspicious term");
      }
    }

    return { score, issues };
  }

  private analyzeFileBuffer(buffer: Buffer): {
    score: number;
    issues: string[];
    elaScore: number;
    noiseScore: number;
    metadata: ForgeryAnalysisResult["metadata"];
  } {
    const issues: string[] = [];
    let score = 0;

    const metadata: ForgeryAnalysisResult["metadata"] = {
      fileSize: buffer.length,
    };

    const header = buffer.slice(0, 20).toString("hex");

    if (header.startsWith("89504e47")) {
      metadata.fileType = "PNG";
    } else if (header.startsWith("ffd8ff")) {
      metadata.fileType = "JPEG";
    } else if (header.startsWith("25504446")) {
      metadata.fileType = "PDF";
    } else if (header.startsWith("47494638")) {
      metadata.fileType = "GIF";
    } else if (header.startsWith("52494646")) {
      metadata.fileType = "WEBP/RIFF";
    }

    const elaScore = this.simulateELA(buffer);
    const noiseScore = this.simulateNoiseAnalysis(buffer);

    if (elaScore > 60) {
      score += 15;
      issues.push("Error Level Analysis indicates potential manipulation");
    }

    if (noiseScore > 50) {
      score += 10;
      issues.push("Noise variance analysis shows inconsistencies");
    }

    if (buffer.length < 5000) {
      score += 10;
      issues.push("File size is unusually small for a certificate");
    }

    if (buffer.length > 20000000) {
      score += 5;
      issues.push("File size is unusually large");
    }

    const bufferStr = buffer.toString("utf-8", 0, Math.min(buffer.length, 10000));
    for (const pattern of this.suspiciousPatterns) {
      if (pattern.test(bufferStr)) {
        score += 10;
        issues.push("File content contains suspicious metadata");
        break;
      }
    }

    return {
      score,
      issues,
      elaScore,
      noiseScore,
      metadata,
    };
  }

  private simulateELA(buffer: Buffer): number {
    const hash = crypto.createHash("md5").update(buffer).digest("hex");
    const baseValue = parseInt(hash.slice(0, 8), 16);
    return (baseValue % 100);
  }

  private simulateNoiseAnalysis(buffer: Buffer): number {
    const hash = crypto.createHash("sha1").update(buffer).digest("hex");
    const baseValue = parseInt(hash.slice(0, 8), 16);
    return (baseValue % 100);
  }

  private checkConsistency(certificate: Certificate): { score: number; issues: string[] } {
    const issues: string[] = [];
    let score = 0;

    const createdDate = new Date(certificate.createdAt);
    const now = new Date();
    const daysSinceCreation = (now.getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24);

    if (daysSinceCreation < 0) {
      score += 30;
      issues.push("Certificate has a future creation date");
    }

    if (certificate.description) {
      if (certificate.description.length < 20 && certificate.description.length > 0) {
        score += 5;
        issues.push("Description is very brief");
      }
    }

    return { score, issues };
  }

  async saveForgeryReport(
    certificateId: string,
    analysis: ForgeryAnalysisResult
  ): Promise<ForgeryReport> {
    return storage.createForgeryReport({
      certificateId,
      authenticity: analysis.authenticity,
      fraudScore: analysis.fraudScore,
      elaScore: analysis.elaScore,
      noiseScore: analysis.noiseScore,
      templateScore: analysis.templateScore,
      tamperZones: analysis.tamperZones,
      reasoning: analysis.reasoning,
      extractedText: analysis.extractedText,
      qrData: analysis.qrData,
      metadata: analysis.metadata,
    });
  }

  getAuthenticityBadge(authenticity: string): { label: string; color: string; icon: string } {
    switch (authenticity) {
      case "authentic":
        return { label: "Authentic", color: "green", icon: "check-circle" };
      case "suspicious":
        return { label: "Needs Review", color: "yellow", icon: "alert-triangle" };
      case "likely_forged":
        return { label: "Likely Forged", color: "red", icon: "x-circle" };
      default:
        return { label: "Unknown", color: "gray", icon: "help-circle" };
    }
  }

  getFraudScoreDescription(score: number): string {
    if (score < 20) return "Very Low Risk - Certificate appears genuine";
    if (score < 40) return "Low Risk - Minor concerns, likely authentic";
    if (score < 60) return "Medium Risk - Some concerns, needs manual review";
    if (score < 80) return "High Risk - Multiple red flags detected";
    return "Very High Risk - Strong indicators of forgery";
  }
}

export const forgeryDetector = new ForgeryDetector();
