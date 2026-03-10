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
  Star,
  Calendar,
  CheckCircle,
  Trophy,
  BookOpen,
  MapPin,
  Clock
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

function getInitials(firstName: string, lastName: string) {
  return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
}

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
      <div className="min-h-screen bg-linear-to-br from-slate-50 via-blue-50/30 to-indigo-50/20 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <div className="w-16 h-16 rounded-full border-4 border-blue-200 border-t-blue-600 animate-spin" />
          </div>
          <p className="text-sm text-muted-foreground animate-pulse">Loading portfolio...</p>
        </div>
      </div>
    );
  }

  if (error || !portfolio) {
    return (
      <div className="min-h-screen bg-linear-to-br from-slate-50 via-blue-50/30 to-indigo-50/20 flex items-center justify-center">
        <Card className="w-full max-w-md mx-4 border-0 shadow-xl">
          <CardContent className="pt-10 pb-8 text-center">
            <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-6">
              <User className="h-10 w-10 text-red-400" />
            </div>
            <h1 className="text-2xl font-bold text-foreground mb-2">Portfolio Not Found</h1>
            <p className="text-muted-foreground mb-6">
              {error?.message || "The portfolio you're looking for doesn't exist or has been removed."}
            </p>
            <Link href="/">
              <Button size="lg" className="rounded-full px-8">
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
    <div className="min-h-screen bg-linear-to-br from-slate-50 via-blue-50/30 to-indigo-50/20">
      {/* Hero Header with gradient */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-linear-to-br from-blue-600 via-indigo-600 to-violet-700" />
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PGNpcmNsZSBjeD0iMzAiIGN5PSIzMCIgcj0iMiIvPjwvZz48L2c+PC9zdmc+')] opacity-40" />
        
        <div className="relative max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-12 pb-28">
          {/* Top bar */}
          <div className="flex items-center justify-between mb-12">
            <Link href="/">
              <Button variant="ghost" className="text-white/80 hover:text-white hover:bg-white/10 rounded-full" data-testid="back-to-platform-button">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
            </Link>
            <div className="flex items-center gap-2 text-white/70 text-sm">
              <Eye className="h-4 w-4" />
              <span>{portfolio.viewCount} views</span>
            </div>
          </div>

          {/* Profile section */}
          <div className="flex flex-col items-center text-center">
            <div className="relative mb-6">
              {portfolio.user.profileImageUrl ? (
                <img 
                  src={portfolio.user.profileImageUrl} 
                  alt="Profile" 
                  className="w-28 h-28 rounded-full object-cover ring-4 ring-white/30 shadow-2xl"
                />
              ) : (
                <div className="w-28 h-28 rounded-full bg-white/20 backdrop-blur-sm ring-4 ring-white/30 shadow-2xl flex items-center justify-center">
                  <span className="text-3xl font-bold text-white">
                    {getInitials(portfolio.user.firstName, portfolio.user.lastName)}
                  </span>
                </div>
              )}
              <div className="absolute -bottom-1 -right-1 w-8 h-8 bg-green-500 rounded-full border-3 border-white flex items-center justify-center shadow-lg">
                <CheckCircle className="h-4 w-4 text-white" />
              </div>
            </div>
            
            <h1 className="text-4xl font-bold text-white mb-2 tracking-tight" data-testid="portfolio-name">
              {portfolio.user.firstName} {portfolio.user.lastName}
            </h1>
            <p className="text-lg text-blue-100 mb-6 capitalize">
              {portfolio.user.role === 'student' ? 'Student' : portfolio.user.role}
            </p>
          </div>
        </div>
      </div>

      {/* Stats cards floating over hero */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 -mt-16 relative z-10 mb-12">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow bg-white/90 backdrop-blur-sm">
            <CardContent className="p-5 text-center">
              <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center mx-auto mb-3">
                <Award className="h-5 w-5 text-blue-600" />
              </div>
              <p className="text-2xl font-bold text-foreground">{portfolioData.skills?.length || 0}</p>
              <p className="text-xs text-muted-foreground mt-1">Skills</p>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow bg-white/90 backdrop-blur-sm">
            <CardContent className="p-5 text-center">
              <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center mx-auto mb-3">
                <Briefcase className="h-5 w-5 text-emerald-600" />
              </div>
              <p className="text-2xl font-bold text-foreground">{portfolioData.internships?.length || 0}</p>
              <p className="text-xs text-muted-foreground mt-1">Experience</p>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow bg-white/90 backdrop-blur-sm">
            <CardContent className="p-5 text-center">
              <div className="w-10 h-10 bg-violet-100 rounded-xl flex items-center justify-center mx-auto mb-3">
                <Code className="h-5 w-5 text-violet-600" />
              </div>
              <p className="text-2xl font-bold text-foreground">{portfolioData.projects?.length || 0}</p>
              <p className="text-xs text-muted-foreground mt-1">Projects</p>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow bg-white/90 backdrop-blur-sm">
            <CardContent className="p-5 text-center">
              <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center mx-auto mb-3">
                <Shield className="h-5 w-5 text-amber-600" />
              </div>
              <p className="text-2xl font-bold text-foreground">{totalCredentials}</p>
              <p className="text-xs text-muted-foreground mt-1">Verified</p>
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pb-16 space-y-10">

        {/* Skills Section */}
        {portfolioData.skills && portfolioData.skills.length > 0 && (
          <section>
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                <Award className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-foreground">Skills & Certifications</h2>
                <p className="text-sm text-muted-foreground">Verified competencies and course completions</p>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {portfolioData.skills.map((skill) => (
                <Card key={skill.id} className="border-0 shadow-sm hover:shadow-md transition-all group">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 bg-linear-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center shrink-0 shadow-sm">
                        <CheckCircle className="h-5 w-5 text-white" />
                      </div>
                      <div className="min-w-0">
                        <h3 className="font-semibold text-foreground text-sm leading-tight group-hover:text-blue-600 transition-colors">
                          {skill.title}
                        </h3>
                        <p className="text-xs text-muted-foreground mt-1">{skill.institution}</p>
                        <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {new Date(skill.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>
        )}

        {/* Internships Section */}
        <section>
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center">
              <Briefcase className="h-5 w-5 text-emerald-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-foreground">Work Experience</h2>
              <p className="text-sm text-muted-foreground">Internships and professional experience</p>
            </div>
          </div>
          {portfolioData.internships && portfolioData.internships.length > 0 ? (
            <div className="space-y-4">
              {portfolioData.internships.map((internship, index) => (
                <Card key={internship.id} className="border-0 shadow-sm hover:shadow-md transition-all overflow-hidden">
                  <CardContent className="p-0">
                    <div className="flex">
                      <div className="w-1.5 bg-linear-to-b from-emerald-500 to-teal-500 shrink-0" />
                      <div className="p-5 flex-1">
                        <div className="flex justify-between items-start mb-3">
                          <div>
                            <h3 className="font-semibold text-foreground text-lg">{internship.title}</h3>
                            <div className="flex items-center gap-2 mt-1">
                              <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                              <p className="text-sm text-muted-foreground">{internship.institution}</p>
                            </div>
                          </div>
                          <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 rounded-full px-3">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Verified
                          </Badge>
                        </div>
                        {internship.duration && (
                          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                            <Clock className="h-3.5 w-3.5" />
                            <span>{internship.duration}</span>
                          </div>
                        )}
                        {internship.description && (
                          <p className="text-sm text-foreground/80 leading-relaxed mt-2">{internship.description}</p>
                        )}
                        <p className="text-xs text-muted-foreground mt-3 flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          Verified: {new Date(internship.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card className="border-0 shadow-sm border-dashed">
              <CardContent className="py-12 text-center">
                <div className="w-14 h-14 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                  <Briefcase className="h-7 w-7 text-muted-foreground" />
                </div>
                <p className="text-muted-foreground">No internships added yet</p>
                <p className="text-xs text-muted-foreground mt-1">Upload and get approved internship certificates to see them here.</p>
              </CardContent>
            </Card>
          )}
        </section>

        {/* Projects Section */}
        {portfolioData.projects && portfolioData.projects.length > 0 && (
          <section>
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-violet-100 rounded-xl flex items-center justify-center">
                <Code className="h-5 w-5 text-violet-600" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-foreground">Projects</h2>
                <p className="text-sm text-muted-foreground">Personal and academic projects</p>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {portfolioData.projects.map((project) => (
                <Card key={project.id} className="border-0 shadow-sm hover:shadow-md transition-all group overflow-hidden">
                  <CardContent className="p-0">
                    <div className="h-2 bg-linear-to-r from-violet-500 via-purple-500 to-fuchsia-500" />
                    <div className="p-5">
                      <h3 className="font-semibold text-foreground mb-2 group-hover:text-violet-600 transition-colors">{project.title}</h3>
                      <p className="text-sm text-muted-foreground mb-4 leading-relaxed line-clamp-3">{project.description}</p>
                      <a 
                        href={project.githubLink} 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className="inline-flex items-center gap-2 text-sm font-medium text-violet-600 hover:text-violet-800 transition-colors"
                      >
                        <Github className="h-4 w-4" />
                        View on GitHub
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>
        )}

        {/* Hackathons & Workshops */}
        {((portfolioData.hackathons?.length || 0) > 0 || (portfolioData.workshops?.length || 0) > 0) && (
          <section>
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center">
                <Trophy className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-foreground">Achievements</h2>
                <p className="text-sm text-muted-foreground">Hackathons, workshops and events</p>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {portfolioData.hackathons?.map((h) => (
                <Card key={h.id} className="border-0 shadow-sm hover:shadow-md transition-all overflow-hidden">
                  <CardContent className="p-0">
                    <div className="h-1.5 bg-linear-to-r from-amber-400 to-orange-500" />
                    <div className="p-5">
                      <Badge className="mb-3 bg-amber-50 text-amber-700 border-amber-200 rounded-full">
                        <Trophy className="h-3 w-3 mr-1" />
                        Hackathon
                      </Badge>
                      <h3 className="font-semibold text-foreground">{h.title}</h3>
                      <p className="text-sm text-muted-foreground mt-1">{h.institution}</p>
                      <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {new Date(h.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              ))}
              {portfolioData.workshops?.map((w) => (
                <Card key={w.id} className="border-0 shadow-sm hover:shadow-md transition-all overflow-hidden">
                  <CardContent className="p-0">
                    <div className="h-1.5 bg-linear-to-r from-purple-400 to-pink-500" />
                    <div className="p-5">
                      <Badge className="mb-3 bg-purple-50 text-purple-700 border-purple-200 rounded-full">
                        <BookOpen className="h-3 w-3 mr-1" />
                        Workshop
                      </Badge>
                      <h3 className="font-semibold text-foreground">{w.title}</h3>
                      <p className="text-sm text-muted-foreground mt-1">{w.institution}</p>
                      <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {new Date(w.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>
        )}

        {/* Contact & Footer */}
        <section>
          <Card className="border-0 shadow-sm overflow-hidden">
            <CardContent className="p-0">
              <div className="bg-linear-to-r from-slate-800 to-slate-900 p-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div>
                    <h2 className="text-lg font-bold text-white mb-4">Get in Touch</h2>
                    <div className="space-y-3">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-white/10 rounded-lg flex items-center justify-center">
                          <Mail className="text-blue-300 w-4 h-4" />
                        </div>
                        <span className="text-slate-300 text-sm">{portfolio.user.email}</span>
                      </div>
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-white/10 rounded-lg flex items-center justify-center">
                          <Linkedin className="text-blue-300 w-4 h-4" />
                        </div>
                        <span className="text-slate-400 text-sm">LinkedIn not provided</span>
                      </div>
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-white/10 rounded-lg flex items-center justify-center">
                          <Github className="text-blue-300 w-4 h-4" />
                        </div>
                        <span className="text-slate-400 text-sm">GitHub not provided</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-col items-center justify-center">
                    <div className="grid grid-cols-2 gap-6 text-center">
                      <div>
                        <p className="text-3xl font-bold text-white">{portfolio.viewCount}</p>
                        <p className="text-xs text-slate-400 mt-1">Profile Views</p>
                      </div>
                      <div>
                        <p className="text-3xl font-bold text-emerald-400">{totalCredentials}</p>
                        <p className="text-xs text-slate-400 mt-1">Verified Credentials</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 mt-6 text-xs text-slate-500">
                      <Shield className="h-3.5 w-3.5" />
                      <span>Blockchain Verified Portfolio</span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Footer */}
        <div className="text-center pt-4 pb-8">
          <p className="text-xs text-muted-foreground">
            Powered by <span className="font-semibold text-primary">SkillFolioAI</span> &middot; Blockchain Verified Academic Portfolio
          </p>
        </div>
      </div>
    </div>
  );
}
