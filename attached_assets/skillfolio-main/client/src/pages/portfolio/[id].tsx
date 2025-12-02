import { useQuery } from "@tanstack/react-query";
import { useParams, Link } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { QRCodeDisplay } from "@/components/ui/qr-code";
import { 
  User, 
  ArrowLeft, 
  GraduationCap, 
  Award, 
  Code, 
  Globe,
  Mail,
  Linkedin,
  Github,
  ExternalLink,
  Shield,
  Tag as CertIcon,
  Eye
} from "lucide-react";

interface PortfolioData {
  user: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    role: string;
    profileImageUrl?: string;
  };
  certificates: Array<{
    id: string;
    title: string;
    institution: string;
    description?: string;
    status: string;
    blockchainHash?: string;
    qrCode?: string;
    createdAt: string;
  }>;
  viewCount: number;
}

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

export default function Portfolio() {
  const { id } = useParams();

  const { data: portfolio, isLoading, error } = useQuery<PortfolioData>({
    queryKey: ["/api/portfolio", id],
    queryFn: async () => {
      const response = await fetch(`/api/portfolio/${id}`);
      if (!response.ok) {
        if (response.status === 404) {
          throw new Error("Portfolio not found");
        }
        throw new Error("Failed to load portfolio");
      }
      return response.json();
    },
    enabled: !!id,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error || !portfolio) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="w-full max-w-md mx-4">
          <CardContent className="pt-6 text-center">
            <User className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-foreground mb-2">Portfolio Not Found</h1>
            <p className="text-muted-foreground mb-4">
              {error?.message || "The portfolio you're looking for doesn't exist or has been removed."}
            </p>
            <Link href="/">
              <Button>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Home
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Portfolio Header */}
        <Card className="mb-8">
          <CardContent className="p-8 text-center">
            {/* Profile Image */}
            <div className="w-24 h-24 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              {portfolio.user.profileImageUrl ? (
                <img 
                  src={portfolio.user.profileImageUrl} 
                  alt="Profile" 
                  className="w-24 h-24 rounded-full object-cover"
                />
              ) : (
                <User className="text-blue-600 text-2xl" />
              )}
            </div>
            
            <h1 className="text-3xl font-bold text-foreground mb-2" data-testid="portfolio-name">
              {portfolio.user.firstName} {portfolio.user.lastName}
            </h1>
            <p className="text-lg text-muted-foreground mb-4">
              {portfolio.user.role === 'student' ? 'Student' : portfolio.user.role}
            </p>
            
            <div className="flex items-center justify-center space-x-6 text-sm text-muted-foreground mb-6">
              <div className="flex items-center space-x-2">
                <GraduationCap className="text-primary" />
                <span>Academic Portfolio</span>
              </div>
              <div className="flex items-center space-x-2">
                <CertIcon className="text-primary" />
                <span>{portfolio.certificates.length} Verified Certificates</span>
              </div>
              <div className="flex items-center space-x-2">
                <Shield className="text-green-600" />
                <span>Blockchain Verified</span>
              </div>
            </div>
            
            <div className="flex items-center justify-center space-x-4">
              <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                <Eye className="h-4 w-4" />
                <span>{portfolio.viewCount} views</span>
              </div>
            </div>
            
            <div className="mt-6">
              <Link href="/">
                <Button data-testid="back-to-platform-button">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Platform
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* Verified Certificates */}
        <Card className="mb-8">
          <CardContent className="p-6">
            <h2 className="text-xl font-bold text-foreground mb-6">Verified Certificates</h2>
            
            {portfolio.certificates.length === 0 ? (
              <div className="text-center py-8">
                <CertIcon className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No verified certificates yet</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {portfolio.certificates.map((certificate) => {
                  const Icon = getCertificateIcon(certificate.title);
                  
                  return (
                    <div 
                      key={certificate.id}
                      className="border border-border rounded-lg p-4 hover:shadow-md transition-shadow"
                      data-testid={`certificate-${certificate.id}`}
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center space-x-3">
                          <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                            <Icon className="text-blue-600" />
                          </div>
                          <div>
                            <h3 className="font-semibold text-foreground">{certificate.title}</h3>
                            <p className="text-sm text-muted-foreground">{certificate.institution}</p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Badge className="bg-green-100 text-green-800">Verified</Badge>
                          {certificate.qrCode && (
                            <QRCodeDisplay 
                              qrCodeData={certificate.qrCode} 
                              title={certificate.title}
                            />
                          )}
                        </div>
                      </div>
                      
                      {certificate.description && (
                        <div className="bg-muted/30 rounded-lg p-3 mb-3">
                          <p className="text-sm text-foreground">{certificate.description}</p>
                        </div>
                      )}
                      
                      <div className="flex items-center justify-between">
                        <p className="text-xs text-muted-foreground">
                          Issued: {new Date(certificate.createdAt).toLocaleDateString()}
                        </p>
                        {certificate.blockchainHash && (
                          <Button 
                            variant="link" 
                            size="sm" 
                            className="text-primary hover:underline"
                            data-testid={`verify-certificate-${certificate.id}`}
                          >
                            Verify on Blockchain
                          </Button>
                        )}
                      </div>
                      
                      {certificate.blockchainHash && (
                        <div className="mt-3 pt-3 border-t border-border">
                          <p className="text-xs text-muted-foreground">
                            Blockchain Hash: {certificate.blockchainHash.substring(0, 10)}...
                          </p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Skills & Contact */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Skills */}
          <Card>
            <CardContent className="p-6">
              <h2 className="text-xl font-bold text-foreground mb-4">Skills & Expertise</h2>
              <div className="space-y-3">
                {/* Skills would be derived from certificates or user profile */}
                <div className="flex flex-wrap gap-2">
                  {portfolio.certificates.map((cert) => (
                    <Badge key={cert.id} variant="outline" className="text-sm">
                      {cert.title.split(' ').slice(0, 2).join(' ')}
                    </Badge>
                  ))}
                </div>
                
                {portfolio.certificates.length === 0 && (
                  <p className="text-muted-foreground text-sm">
                    Skills will be displayed based on verified certificates
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Contact Information */}
          <Card>
            <CardContent className="p-6">
              <h2 className="text-xl font-bold text-foreground mb-4">Contact Information</h2>
              <div className="space-y-3">
                <div className="flex items-center space-x-3">
                  <Mail className="text-primary w-4 h-4" />
                  <span className="text-foreground">{portfolio.user.email}</span>
                </div>
                
                {/* Additional contact info would come from user profile */}
                <div className="flex items-center space-x-3 text-muted-foreground">
                  <Linkedin className="text-primary w-4 h-4" />
                  <span>LinkedIn profile not provided</span>
                </div>
                
                <div className="flex items-center space-x-3 text-muted-foreground">
                  <Github className="text-primary w-4 h-4" />
                  <span>GitHub profile not provided</span>
                </div>
              </div>
              
              <div className="mt-6 pt-6 border-t border-border">
                <h3 className="font-semibold text-foreground mb-3">Portfolio Statistics</h3>
                <div className="grid grid-cols-2 gap-4 text-center">
                  <div>
                    <p className="text-2xl font-bold text-primary">{portfolio.viewCount}</p>
                    <p className="text-sm text-muted-foreground">Profile Views</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-green-600">{portfolio.certificates.length}</p>
                    <p className="text-sm text-muted-foreground">Verified Certs</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
