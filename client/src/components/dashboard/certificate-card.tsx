import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { QRCodeDisplay } from "@/components/ui/qr-code";
import { ExternalLink, GraduationCap, Award, Code, Globe, Shield, Hash, ListChecks } from "lucide-react";
import type { Certificate } from "@shared/schema";
import { useState } from "react";

interface CertificateCardProps {
  certificate: Certificate;
  showActions?: boolean;
  onApprove?: (id: string) => void;
  onReject?: (id: string) => void;
  onReview?: (id: string) => void;
}

// Represents the structured AI analysis result from the backend
interface AiAnalysisResult {
  score: number;
  reasoning: string[];
  isSuspicious: boolean;
}

const getStatusColor = (status: string) => {
  switch (status) {
    case 'approved': return 'status-approved';
    case 'rejected': return 'status-rejected';
    default: return 'status-pending';
  }
};

const getCertificateIcon = (title: string) => {
  const lowerTitle = title.toLowerCase();
  if (lowerTitle.includes('bachelor') || lowerTitle.includes('master') || lowerTitle.includes('phd')) {
    return GraduationCap;
  }
  if (lowerTitle.includes('aws') || lowerTitle.includes('certification')) {
    return Award;
  }
  if (lowerTitle.includes('code') || lowerTitle.includes('development')) {
    return Code;
  }
  return Globe;
};

export function CertificateCard({ 
  certificate, 
  showActions = false, 
  onApprove, 
  onReject, 
  onReview 
}: CertificateCardProps) {
  const Icon = getCertificateIcon(certificate.title);
  const status = certificate.status ?? 'pending';
  const [showHashes, setShowHashes] = useState(false);
  const [showAnalysis, setShowAnalysis] = useState(false);
  
  // This function now processes the structured AI analysis object
  const getFraudInfo = (analysis: AiAnalysisResult | string | null) => {
    // Backwards compatibility for old string-based analysis
    if (!analysis || typeof analysis === 'string') {
      const score = certificate.fraudScore;
      if (score === null || score === undefined) return null;
      const reasoning = analysis ? [analysis] : ["Legacy analysis format."];
      if (score < 40) return { label: `Score: ${score}`, className: "bg-green-100 text-green-800", isSuspicious: false, reasoning };
      if (score < 60) return { label: `Score: ${score}`, className: "bg-yellow-100 text-yellow-800", isSuspicious: true, reasoning };
      return { label: `Score: ${score}`, className: "bg-red-100 text-red-800", isSuspicious: true, reasoning };
    }

    const score = analysis.score;
    if (score === null || score === undefined) return null;
    if (score < 40) return { label: `Score: ${score}`, className: "bg-green-100 text-green-800", ...analysis };
    if (score < 60) return { label: `Score: ${score}`, className: "bg-yellow-100 text-yellow-800", ...analysis };
    return { label: `Score: ${score}`, className: "bg-red-100 text-red-800", ...analysis };
  };

  // The `as any` is a temporary bridge while the backend schema is updated
  const fraudInfo = getFraudInfo(certificate.aiAnalysis as any);
  
  return (
    <Card className="certificate-card">
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <Icon className="text-blue-600" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground" data-testid={`certificate-title-${certificate.id}`}>
                {certificate.title}
              </h3>
              <p className="text-sm text-muted-foreground" data-testid={`certificate-institution-${certificate.id}`}>
                {certificate.institution}
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Badge className={getStatusColor(status)} data-testid={`certificate-status-${certificate.id}`}>
              {status.charAt(0).toUpperCase() + status.slice(1)}
            </Badge>
            {fraudInfo && (
              <Badge className={fraudInfo.className} variant="outline">
                <Shield className="h-3 w-3 mr-1" />
                {fraudInfo.label}
              </Badge>
            )}
            {certificate.qrCode && (
              <QRCodeDisplay 
                qrCodeData={certificate.qrCode} 
                title={certificate.title}
              />
            )}
          </div>
        </div>

        {fraudInfo && (
          <div className={`rounded-lg p-3 mb-3 ${
            fraudInfo.isSuspicious ? 'bg-red-50 border border-red-200' : 'bg-muted/30'
          }`}>
            <div className="flex justify-between items-center">
              <p className="text-sm font-medium text-muted-foreground">
                {fraudInfo.isSuspicious ? '⚠️ AI Analysis Flags:' : 'AI Analysis Summary:'}
              </p>
              <Button
                variant="ghost"
                size="sm"
                className="text-xs px-2 h-6"
                onClick={() => setShowAnalysis(!showAnalysis)}
              >
                <ListChecks className="h-3 w-3 mr-1" />
                {showAnalysis ? "Hide" : "Show"} Details
              </Button>
            </div>
            {showAnalysis && (
              <ul className="mt-2 text-sm list-disc list-inside space-y-1" data-testid={`certificate-ai-analysis-${certificate.id}`}>
                {fraudInfo.reasoning.map((reason, index) => (
                  <li key={index} className={fraudInfo.isSuspicious ? 'text-red-800' : 'text-foreground'}>
                    {reason}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Submitted {new Date(certificate.createdAt!).toLocaleDateString()}
          </p>
          {showActions && (
            <div className="flex space-x-2">
              {onReject && (
                <Button 
                  variant="destructive" 
                  size="sm" 
                  onClick={() => onReject(certificate.id)}
                  data-testid={`reject-certificate-${certificate.id}`}
                >
                  Reject
                </Button>
              )}
              {onApprove && (
                <Button 
                  variant="default"
                  size="sm" 
                  onClick={() => onApprove(certificate.id)}
                  className="bg-green-600 hover:bg-green-700"
                  data-testid={`approve-certificate-${certificate.id}`}
                >
                  Approve
                </Button>
              )}
              {onReview && (
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => onReview(certificate.id)}
                  data-testid={`review-certificate-${certificate.id}`}
                >
                  Review
                </Button>
              )}
            </div>
          )}
          {!showActions && certificate.status === 'approved' && (
            <Button variant="link" size="sm" data-testid={`view-certificate-${certificate.id}`}>
              <ExternalLink className="h-4 w-4" />
            </Button>
          )}
        </div>

        {certificate.blockchainHash && (
          <div className="mt-3 pt-3 border-t border-border" data-testid={`certificate-blockchain-hash-${certificate.id}`}>
            <p className="text-xs text-muted-foreground">
              Blockchain Hash: {certificate.blockchainHash.substring(0, 10)}...
            </p>
          </div>
        )}

        {/* Hash Verification Info */}
        {(certificate.fileHash || certificate.contentHash || certificate.imageHash) && (
          <div className="mt-2">
            <Button
              variant="ghost"
              size="sm"
              className="text-xs px-2 h-6"
              onClick={() => setShowHashes(!showHashes)}
            >
              <Hash className="h-3 w-3 mr-1" />
              {showHashes ? "Hide" : "View"} Verification Hashes
            </Button>
            {showHashes && (
              <div className="mt-2 p-3 bg-muted/30 rounded-lg text-xs space-y-1.5 font-mono">
                {certificate.fileHash && (
                  <div>
                    <span className="text-muted-foreground">File Hash: </span>
                    <span className="text-foreground break-all">{certificate.fileHash.substring(0, 16)}...</span>
                  </div>
                )}
                {certificate.contentHash && (
                  <div>
                    <span className="text-muted-foreground">Content Hash: </span>
                    <span className="text-foreground break-all">{certificate.contentHash.substring(0, 16)}...</span>
                  </div>
                )}
                {certificate.imageHash && (
                  <div>
                    <span className="text-muted-foreground">Image Hash: </span>
                    <span className="text-foreground break-all">{certificate.imageHash}</span>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
