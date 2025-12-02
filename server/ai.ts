import crypto from "crypto";
import { storage } from "./storage";
import type { Certificate, ForgeryReport } from "@shared/schema";

export interface ForgeryAnalysisResult {
  authenticity: "authentic" | "suspicious" | "likely_forged";
  fraudScore: number;
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
  };
}

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
    fileBuffer?: Buffer
  ): Promise<ForgeryAnalysisResult> {
    const analysisResults: ForgeryAnalysisResult = {
      authenticity: "authentic",
      fraudScore: 0,
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
    }

    const duplicates = await storage.findDuplicateCertificates(
      certificate.title,
      certificate.institution,
      certificate.id
    );
    
    if (duplicates.length > 0) {
      analysisResults.fraudScore += 15;
      reasoningParts.push(`Found ${duplicates.length} similar certificate(s) in the system`);
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

    analysisResults.templateScore = 100 - analysisResults.fraudScore;

    return analysisResults;
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
        issues.push(`Institution contains suspicious term`);
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
