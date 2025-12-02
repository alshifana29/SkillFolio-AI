import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { QRCodeDisplay } from "@/components/ui/qr-code";
import { ExternalLink, GraduationCap, Award, Code, Globe } from "lucide-react";
import type { Certificate } from "@shared/schema";

interface CertificateCardProps {
  certificate: Certificate;
  showActions?: boolean;
  onApprove?: (id: string) => void;
  onReject?: (id: string) => void;
  onReview?: (id: string) => void;
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
            {certificate.qrCode && (
              <QRCodeDisplay 
                qrCodeData={certificate.qrCode} 
                title={certificate.title}
              />
            )}
          </div>
        </div>

        {certificate.aiAnalysis && (
          <div className={`rounded-lg p-3 mb-3 ${
            certificate.aiAnalysis.includes('⚠️') ? 'bg-red-50 border border-red-200' : 'bg-muted/30'
          }`}>
            <p className="text-sm text-muted-foreground mb-2">
              {certificate.aiAnalysis.includes('⚠️') ? '⚠️ AI Analysis Flags:' : 'AI Analysis Result:'}
            </p>
            <p className={`text-sm ${
              certificate.aiAnalysis.includes('⚠️') ? 'text-red-800' : 'text-foreground'
            }`} data-testid={`certificate-ai-analysis-${certificate.id}`}>
              {certificate.aiAnalysis}
            </p>
          </div>
        )}

        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Submitted {new Date(certificate.createdAt!).toLocaleDateString()}
          </p>
          {showActions && (
            <div className="flex space-x-2">
              <Button 
                variant="destructive" 
                size="sm" 
                onClick={() => onReject?.(certificate.id)}
                data-testid={`reject-certificate-${certificate.id}`}
              >
                Reject
              </Button>
              <Button 
                variant="default"
                size="sm" 
                onClick={() => onApprove?.(certificate.id)}
                className="bg-green-600 hover:bg-green-700"
                data-testid={`approve-certificate-${certificate.id}`}
              >
                Approve
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => onReview?.(certificate.id)}
                data-testid={`review-certificate-${certificate.id}`}
              >
                Review
              </Button>
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
      </CardContent>
    </Card>
  );
}
