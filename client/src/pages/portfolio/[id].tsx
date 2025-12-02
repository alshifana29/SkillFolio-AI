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
  Eye,
  Briefcase,
  Star
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
  portfolio: {
    skills: Array<{ id: string; title: string; institution: string; blockchainHash?: string; qrCode?: string; createdAt: string }>;
    internships: Array<{ id: string; title: string; institution: string; duration?: string; description?: string; blockchainHash?: string; qrCode?: string; createdAt: string }>;
    hackathons: Array<{ id: string; title: string; institution: string; blockchainHash?: string; qrCode?: string; createdAt: string }>;
    workshops: Array<{ id: string; title: string; institution: string; blockchainHash?: string; qrCode?: string; createdAt: string }>;
    projects: Array<{ id: string; title: string; description: string; githubLink: string; createdAt: string }>;
  };
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

  // Safe data access
  const portfolioData = portfolio?.portfolio || { skills: [], internships: [], hackathons: [], workshops: [], projects: [] };
  const totalCredentials = (portfolioData.skills?.length || 0) + (portfolioData.internships?.length || 0) + (portfolioData.hackathons?.length || 0) + (portfolioData.workshops?.length || 0);

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
                <span>{totalCredentials} Verified Credentials</span>
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

        {/* Skills Section (from Course Certificates - displayed as tags) */}
        {portfolioData.skills && portfolioData.skills.length > 0 && (
          <Card className="mb-8">
            <CardContent className="p-6">
              <h2 className="text-xl font-bold text-foreground mb-6 flex items-center gap-2">
                <Award className="h-5 w-5" />
                Skills
              </h2>
              <div className="flex flex-wrap gap-2">
                {portfolioData.skills.map((skill) => (
                  <div key={skill.id} className="flex flex-col gap-1">
                    <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-200 cursor-default">
                      ✓ {skill.title}
                    </Badge>
                    <p className="text-xs text-muted-foreground text-center">{skill.institution}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Internships Section */}
        {portfolioData.internships && portfolioData.internships.length > 0 && (
          <Card className="mb-8">
            <CardContent className="p-6">
              <h2 className="text-xl font-bold text-foreground mb-6 flex items-center gap-2">
                <Briefcase className="h-5 w-5" />
                Internships
              </h2>
              <div className="space-y-4">
                {portfolioData.internships.map((internship) => (
                  <div key={internship.id} className="border rounded-lg p-4 bg-blue-50">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h3 className="font-semibold text-foreground">{internship.title}</h3>
                        <p className="text-sm text-muted-foreground">{internship.institution}</p>
                      </div>
                      <Badge className="bg-green-100 text-green-800">Verified</Badge>
                    </div>
                    {internship.duration && <p className="text-sm text-muted-foreground">📅 Duration: {internship.duration}</p>}
                    {internship.description && <p className="text-sm text-foreground mt-2">{internship.description}</p>}
                    <p className="text-xs text-muted-foreground mt-2">Verified: {new Date(internship.createdAt).toLocaleDateString()}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Projects Section */}
        {portfolioData.projects && portfolioData.projects.length > 0 && (
          <Card className="mb-8">
            <CardContent className="p-6">
              <h2 className="text-xl font-bold text-foreground mb-6 flex items-center gap-2">
                <Code className="h-5 w-5" />
                Projects
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {portfolioData.projects.map((project) => (
                  <div key={project.id} className="border rounded-lg p-4">
                    <h3 className="font-semibold text-foreground mb-2">{project.title}</h3>
                    <p className="text-sm text-muted-foreground mb-3">{project.description}</p>
                    <a href={project.githubLink} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline text-sm flex items-center gap-1">
                      <Github className="h-4 w-4" />
                      View on GitHub
                    </a>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Hackathons & Workshops */}
        {(portfolioData.hackathons?.length || 0) > 0 || (portfolioData.workshops?.length || 0) > 0 ? (
          <Card className="mb-8">
            <CardContent className="p-6">
              <h2 className="text-xl font-bold text-foreground mb-6">Achievements</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {portfolioData.hackathons?.map((h) => (
                  <div key={h.id} className="border rounded-lg p-4 bg-amber-50">
                    <Badge className="mb-2 bg-amber-200 text-amber-900">Hackathon</Badge>
                    <h3 className="font-semibold text-foreground">{h.title}</h3>
                    <p className="text-sm text-muted-foreground">{h.institution}</p>
                  </div>
                ))}
                {portfolioData.workshops?.map((w) => (
                  <div key={w.id} className="border rounded-lg p-4 bg-purple-50">
                    <Badge className="mb-2 bg-purple-200 text-purple-900">Workshop</Badge>
                    <h3 className="font-semibold text-foreground">{w.title}</h3>
                    <p className="text-sm text-muted-foreground">{w.institution}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ) : null}

        {/* Skills & Contact */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Stats */}
          <Card>
            <CardContent className="p-6">
              <h2 className="text-xl font-bold text-foreground mb-4">Portfolio Stats</h2>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Skills</span>
                  <span className="font-bold text-foreground">{portfolioData.skills?.length || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Work Experience</span>
                  <span className="font-bold text-foreground">{portfolioData.internships?.length || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Projects</span>
                  <span className="font-bold text-foreground">{portfolioData.projects?.length || 0}</span>
                </div>
                <div className="flex justify-between pt-3 border-t">
                  <span className="text-muted-foreground">Total Credentials</span>
                  <span className="font-bold text-primary">{totalCredentials}</span>
                </div>
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
                    <p className="text-2xl font-bold text-green-600">{totalCredentials}</p>
                    <p className="text-sm text-muted-foreground">Verified Creds</p>
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
