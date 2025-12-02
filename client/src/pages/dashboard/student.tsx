import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { FileUpload } from "@/components/ui/file-upload";
import { StatsCard } from "@/components/dashboard/stats-card";
import { CertificateCard } from "@/components/dashboard/certificate-card";
import { getAuthHeaders } from "@/lib/auth";
import { insertCertificateSchema, insertProjectSchema, type InsertCertificate, type Certificate, type Project, type InsertProject } from "@shared/schema";
import * as QRCode from "qrcode";
import { 
  GraduationCap, 
  Tag as CertIcon, 
  CheckCircle, 
  Clock, 
  Eye,
  QrCode as QRCodeIcon,
  Download,
  BarChart3,
  Bell,
  LogOut,
  User,
  Copy,
  Check,
  Github,
  Plus,
  Edit2,
  Trash2,
  ExternalLink
} from "lucide-react";

let pdfMakeLoaded = false;
let pdfMake: any = null;

const initPdfMake = async () => {
  if (pdfMakeLoaded) return;
  try {
    const pdfMakeModule = await import("pdfmake/build/pdfmake");
    const pdfFontsModule = await import("pdfmake/build/vfs_fonts");
    pdfMake = pdfMakeModule.default;
    pdfMake.vfs = pdfFontsModule.default;
    pdfMakeLoaded = true;
  } catch (err) {
    console.error("Failed to load pdfMake:", err);
  }
};

export default function StudentDashboard() {
  const { user, logout } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showQRModal, setShowQRModal] = useState(false);
  const [showAnalyticsModal, setShowAnalyticsModal] = useState(false);
  const [qrCode, setQrCode] = useState<string>("");
  const [copied, setCopied] = useState(false);
  const [showProjectModal, setShowProjectModal] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    control,
    watch,
    formState: { errors },
  } = useForm<InsertCertificate>({
    resolver: zodResolver(insertCertificateSchema),
    defaultValues: {
      certificateType: "course",
    },
  });

  const watchCertificateType = watch("certificateType");

  const {
    register: registerProject,
    handleSubmit: handleSubmitProject,
    reset: resetProject,
    formState: { errors: projectErrors },
  } = useForm<InsertProject>({
    resolver: zodResolver(insertProjectSchema),
    values: editingProject ? { title: editingProject.title, description: editingProject.description, githubLink: editingProject.githubLink } : undefined,
  });

  // Fetch user's certificates
  const { data: certificates = [], isLoading: certificatesLoading } = useQuery({
    queryKey: ["/api/certificates"],
    queryFn: async () => {
      const response = await fetch("/api/certificates", {
        headers: getAuthHeaders(),
      });
      if (!response.ok) throw new Error("Failed to fetch certificates");
      return response.json();
    },
  });

  // Fetch user's projects
  const { data: projects = [], isLoading: projectsLoading } = useQuery({
    queryKey: ["/api/projects"],
    queryFn: async () => {
      const response = await fetch("/api/projects", {
        headers: getAuthHeaders(),
      });
      if (!response.ok) throw new Error("Failed to fetch projects");
      return response.json();
    },
  });

  // Tag upload mutation
  const uploadMutation = useMutation({
    mutationFn: async (data: { certificateData: InsertCertificate; file: File }) => {
      const token = localStorage.getItem("auth_token");
      const formData = new FormData();
      formData.append("file", data.file);
      formData.append("title", data.certificateData.title);
      formData.append("institution", data.certificateData.institution);
      formData.append("certificateType", data.certificateData.certificateType || "course");
      if (data.certificateData.description) {
        formData.append("description", data.certificateData.description);
      }
      if (data.certificateData.internshipDuration) {
        formData.append("internshipDuration", data.certificateData.internshipDuration);
      }

      const response = await fetch("/api/certificates", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
        },
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Upload failed");
      }

      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Tag uploaded successfully",
        description: "Your certificate is now pending review.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/certificates"] });
      reset();
      setSelectedFile(null);
    },
    onError: (error: any) => {
      toast({
        title: "Upload failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Create/Update project mutation
  const projectMutation = useMutation({
    mutationFn: async (data: InsertProject) => {
      const token = localStorage.getItem("auth_token");
      const url = editingProject ? `/api/projects/${editingProject.id}` : "/api/projects";
      const method = editingProject ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to save project");
      }

      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: editingProject ? "Project updated" : "Project created",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      resetProject();
      setShowProjectModal(false);
      setEditingProject(null);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to save project",
        variant: "destructive",
      });
    },
  });

  // Delete project mutation
  const deleteProjectMutation = useMutation({
    mutationFn: async (projectId: string) => {
      const token = localStorage.getItem("auth_token");
      const response = await fetch(`/api/projects/${projectId}`, {
        method: "DELETE",
        headers: {
          "Authorization": `Bearer ${token}`,
        },
      });

      if (!response.ok) throw new Error("Failed to delete project");
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Project deleted",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete project",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: InsertCertificate) => {
    if (!selectedFile) {
      toast({
        title: "File required",
        description: "Please select a certificate file to upload.",
        variant: "destructive",
      });
      return;
    }

    uploadMutation.mutate({ certificateData: data, file: selectedFile });
  };

  const generatePortfolioQR = async () => {
    try {
      const portfolioUrl = `${window.location.origin}/portfolio/${user?.id}`;
      const qr = await QRCode.toDataURL(portfolioUrl);
      setQrCode(qr);
      setShowQRModal(true);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to generate QR code",
        variant: "destructive",
      });
    }
  };

  const downloadPortfolio = async () => {
    try {
      await initPdfMake();
      
      const response = await fetch(`/api/portfolio/${user?.id}`, {
        headers: getAuthHeaders(),
      });
      if (!response.ok) throw new Error("Failed to fetch portfolio");
      
      const data = await response.json();
      const fullName = `${data.user.firstName} ${data.user.lastName}`;
      
      // Flatten portfolio data into single certificates array
      const portfolio = data.portfolio || {};
      const allCerts = [
        ...(portfolio.skills || []),
        ...(portfolio.internships || []),
        ...(portfolio.hackathons || []),
        ...(portfolio.workshops || []),
      ];

      const docDefinition: any = {
        pageSize: "A4",
        pageMargins: [40, 40, 40, 40],
        content: [
          // Header
          {
            text: fullName,
            fontSize: 24,
            bold: true,
            alignment: "center",
            margin: [0, 0, 0, 5],
          },
          {
            text: data.user.role.charAt(0).toUpperCase() + data.user.role.slice(1),
            fontSize: 12,
            alignment: "center",
            color: "#666666",
            margin: [0, 0, 0, 10],
          },
          {
            text: data.user.email,
            fontSize: 10,
            alignment: "center",
            color: "#0066cc",
            margin: [0, 0, 0, 15],
          },
          
          // Divider
          {
            canvas: [
              {
                type: "line",
                x1: 0,
                y1: 5,
                x2: 515,
                y2: 5,
                lineWidth: 1,
                lineColor: "#cccccc",
              },
            ],
            margin: [0, 0, 0, 15],
          },

          // Verified Credentials Section
          {
            text: "VERIFIED CREDENTIALS",
            fontSize: 12,
            bold: true,
            color: "#1a1a1a",
            margin: [0, 0, 0, 10],
          },
          
          // Certificates Table
          allCerts.length > 0
            ? {
                table: {
                  headerRows: 1,
                  widths: ["*", "30%", "20%"],
                  body: [
                    [
                      {
                        text: "Certificate",
                        bold: true,
                        color: "white",
                        fillColor: "#0066cc",
                        margin: [5, 5, 5, 5],
                      },
                      {
                        text: "Institution",
                        bold: true,
                        color: "white",
                        fillColor: "#0066cc",
                        margin: [5, 5, 5, 5],
                      },
                      {
                        text: "Date",
                        bold: true,
                        color: "white",
                        fillColor: "#0066cc",
                        margin: [5, 5, 5, 5],
                      },
                    ],
                    ...allCerts.map((cert: any) => [
                      {
                        text: cert.title,
                        margin: [5, 5, 5, 5],
                      },
                      {
                        text: cert.institution,
                        margin: [5, 5, 5, 5],
                      },
                      {
                        text: new Date(cert.createdAt).toLocaleDateString(),
                        margin: [5, 5, 5, 5],
                      },
                    ]),
                  ],
                },
                margin: [0, 0, 0, 20],
              }
            : {
                text: "No verified credentials yet.",
                italics: true,
                color: "#999999",
                margin: [0, 0, 0, 20],
              },

          // Summary Section
          {
            text: "PORTFOLIO SUMMARY",
            fontSize: 12,
            bold: true,
            color: "#1a1a1a",
            margin: [0, 0, 0, 10],
          },
          {
            columns: [
              {
                width: "25%",
                stack: [
                  {
                    text: allCerts.length,
                    fontSize: 16,
                    bold: true,
                    color: "#0066cc",
                  },
                  {
                    text: "Total Certificates",
                    fontSize: 10,
                    color: "#666666",
                  },
                ],
              },
              {
                width: "25%",
                stack: [
                  {
                    text: allCerts.length,
                    fontSize: 16,
                    bold: true,
                    color: "#00aa00",
                  },
                  {
                    text: "Verified",
                    fontSize: 10,
                    color: "#666666",
                  },
                ],
              },
              {
                width: "25%",
                stack: [
                  {
                    text: data.viewCount || 0,
                    fontSize: 16,
                    bold: true,
                    color: "#aa6600",
                  },
                  {
                    text: "Portfolio Views",
                    fontSize: 10,
                    color: "#666666",
                  },
                ],
              },
              {
                width: "25%",
                stack: [
                  {
                    text: new Date().toLocaleDateString(),
                    fontSize: 10,
                    bold: true,
                    color: "#666666",
                  },
                  {
                    text: "Generated",
                    fontSize: 10,
                    color: "#666666",
                  },
                ],
              },
            ],
            margin: [0, 0, 0, 20],
          },

          // Footer
          {
            text: "This document was generated from AcademicFolioChain - Blockchain Certificate Verification System",
            fontSize: 8,
            alignment: "center",
            color: "#999999",
            margin: [0, 20, 0, 0],
          },
        ],
      };

      pdfMake.createPdf(docDefinition).download(`${fullName}_Portfolio.pdf`);

      toast({
        title: "Success",
        description: "Portfolio downloaded as PDF",
      });
    } catch (error) {
      console.error("Download portfolio error:", error);
      toast({
        title: "Error",
        description: "Failed to download portfolio",
        variant: "destructive",
      });
    }
  };

  const copyPortfolioLink = async () => {
    const portfolioUrl = `${window.location.origin}/portfolio/${user?.id}`;
    try {
      await navigator.clipboard.writeText(portfolioUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast({
        title: "Copied",
        description: "Portfolio link copied to clipboard",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to copy link",
        variant: "destructive",
      });
    }
  };

  // Calculate stats
  const totalCertificates = certificates.length;
  const verifiedCertificates = certificates.filter((cert: Certificate) => cert.status === 'approved').length;
  const pendingCertificates = certificates.filter((cert: Certificate) => cert.status === 'pending').length;
  const portfolioViews = 247; // This would come from an API in a real app

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="bg-card border-b border-border sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                <GraduationCap className="text-primary-foreground" />
              </div>
              <span className="font-semibold text-foreground">Student Dashboard</span>
            </div>
            <div className="flex items-center space-x-4">
              <Button variant="ghost" size="sm">
                <Bell className="h-4 w-4" />
              </Button>
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                  <User className="text-blue-600 text-sm" />
                </div>
                <span className="text-sm font-medium text-foreground">
                  {user?.firstName} {user?.lastName}
                </span>
              </div>
              <Button variant="ghost" size="sm" onClick={logout} data-testid="logout-button">
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <StatsCard
            title="Total Certificates"
            value={totalCertificates}
            icon={CertIcon}
            iconColor="text-blue-600"
            iconBgColor="bg-blue-100"
          />
          <StatsCard
            title="Verified"
            value={verifiedCertificates}
            icon={CheckCircle}
            iconColor="text-green-600"
            iconBgColor="bg-green-100"
          />
          <StatsCard
            title="Pending"
            value={pendingCertificates}
            icon={Clock}
            iconColor="text-yellow-600"
            iconBgColor="bg-yellow-100"
          />
          <StatsCard
            title="Portfolio Views"
            value={portfolioViews}
            icon={Eye}
            iconColor="text-purple-600"
            iconBgColor="bg-purple-100"
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Tag Upload */}
          <div className="lg:col-span-2">
            <Card className="mb-6">
              <CardHeader>
                <CardTitle>Upload New Tag</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                  <FileUpload
                    onFileSelect={setSelectedFile}
                    acceptedTypes={['image/*', 'application/pdf']}
                    className="mb-4"
                  />
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="title">Certificate Title</Label>
                      <Input
                        id="title"
                        placeholder="e.g., Bachelor's Degree"
                        {...register("title")}
                        data-testid="certificate-title-input"
                      />
                      {errors.title && (
                        <p className="text-sm text-destructive mt-1">{errors.title.message}</p>
                      )}
                    </div>
                    <div>
                      <Label htmlFor="institution">Issuing Institution</Label>
                      <Input
                        id="institution"
                        placeholder="e.g., Stanford University"
                        {...register("institution")}
                        data-testid="certificate-institution-input"
                      />
                      {errors.institution && (
                        <p className="text-sm text-destructive mt-1">{errors.institution.message}</p>
                      )}
                    </div>
                  </div>
                  
                  <div>
                    <Label htmlFor="certificateType">Certificate Type</Label>
                    <Controller
                      name="certificateType"
                      control={control}
                      render={({ field }) => (
                        <Select onValueChange={field.onChange} value={field.value}>
                          <SelectTrigger id="certificateType" data-testid="certificate-type-select">
                            <SelectValue placeholder="Select certificate type" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="course">Course</SelectItem>
                            <SelectItem value="hackathon">Hackathon</SelectItem>
                            <SelectItem value="internship">Internship</SelectItem>
                            <SelectItem value="workshop">Workshop</SelectItem>
                          </SelectContent>
                        </Select>
                      )}
                    />
                  </div>

                  {watchCertificateType === "internship" && (
                    <div>
                      <Label htmlFor="internshipDuration">Internship Duration</Label>
                      <Input
                        id="internshipDuration"
                        placeholder="e.g., 3 months, June - August 2024"
                        {...register("internshipDuration")}
                        data-testid="internship-duration-input"
                      />
                    </div>
                  )}
                  
                  <div>
                    <Label htmlFor="description">Description (Optional)</Label>
                    <Input
                      id="description"
                      placeholder="Additional details about the certificate"
                      {...register("description")}
                      data-testid="certificate-description-input"
                    />
                  </div>
                  
                  <Button 
                    type="submit" 
                    className="w-full" 
                    disabled={uploadMutation.isPending}
                    data-testid="upload-certificate-button"
                  >
                    {uploadMutation.isPending ? "Uploading..." : "Upload Tag"}
                  </Button>
                </form>
              </CardContent>
            </Card>

            {/* Recent Certificates */}
            <Card>
              <CardHeader>
                <CardTitle>Recent Certificates</CardTitle>
              </CardHeader>
              <CardContent>
                {certificatesLoading ? (
                  <div className="space-y-4">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="animate-pulse">
                        <div className="h-24 bg-muted rounded-lg"></div>
                      </div>
                    ))}
                  </div>
                ) : certificates.length === 0 ? (
                  <div className="text-center py-8">
                    <CertIcon className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">No certificates uploaded yet</p>
                    <p className="text-sm text-muted-foreground">Upload your first certificate to get started</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {certificates.slice(0, 5).map((certificate: Certificate) => (
                      <CertificateCard
                        key={certificate.id}
                        certificate={certificate}
                      />
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Projects Section */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Projects</CardTitle>
                <Button size="sm" onClick={() => { setEditingProject(null); setShowProjectModal(true); }} data-testid="add-project-button">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Project
                </Button>
              </CardHeader>
              <CardContent>
                {projectsLoading ? (
                  <div className="space-y-3">
                    {[1, 2].map((i) => (
                      <div key={i} className="animate-pulse">
                        <div className="h-20 bg-muted rounded-lg"></div>
                      </div>
                    ))}
                  </div>
                ) : projects.length === 0 ? (
                  <div className="text-center py-8">
                    <Github className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">No projects yet</p>
                    <p className="text-sm text-muted-foreground">Add your projects to showcase your work</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {projects.map((project: Project) => (
                      <div key={project.id} className="border rounded-lg p-4 hover:bg-muted/50 transition" data-testid={`project-card-${project.id}`}>
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h4 className="font-semibold text-foreground">{project.title}</h4>
                            <p className="text-sm text-muted-foreground mt-1">{project.description}</p>
                            <a href={project.githubLink} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline mt-2 flex items-center gap-1 w-fit">
                              <ExternalLink className="h-3 w-3" />
                              View on GitHub
                            </a>
                          </div>
                          <div className="flex gap-2 ml-4">
                            <Button size="sm" variant="ghost" onClick={() => { setEditingProject(project); setShowProjectModal(true); }} data-testid={`edit-project-${project.id}`}>
                              <Edit2 className="h-4 w-4" />
                            </Button>
                            <Button size="sm" variant="ghost" onClick={() => deleteProjectMutation.mutate(project.id)} data-testid={`delete-project-${project.id}`}>
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Portfolio & Actions */}
          <div className="space-y-6">
            {/* Portfolio Preview */}
            <Card>
              <CardHeader>
                <CardTitle>Portfolio Preview</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center p-6 bg-muted/30 rounded-lg mb-4">
                  <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
                    <User className="text-blue-600 text-xl" />
                  </div>
                  <h4 className="font-semibold text-foreground">
                    {user?.firstName} {user?.lastName}
                  </h4>
                  <p className="text-sm text-muted-foreground">
                    {user?.role === 'student' ? 'Student' : user?.role}
                  </p>
                  <p className="text-xs text-muted-foreground mt-2">
                    {verifiedCertificates} Verified Certificates
                  </p>
                </div>
                <div className="space-y-2">
                  <Link href={`/portfolio/${user?.id}`}>
                    <Button className="w-full" data-testid="view-portfolio-button">
                      View Full Portfolio
                    </Button>
                  </Link>
                  <Button variant="outline" className="w-full" onClick={() => setShowShareModal(true)} data-testid="share-portfolio-button">
                    Share Portfolio
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <Button variant="ghost" className="w-full justify-between" onClick={generatePortfolioQR} data-testid="generate-qr-button">
                    <div className="flex items-center space-x-3">
                      <QRCodeIcon className="text-primary" />
                      <span>Generate QR Code</span>
                    </div>
                    <span>→</span>
                  </Button>
                  
                  <Button variant="ghost" className="w-full justify-between" onClick={downloadPortfolio} data-testid="download-portfolio-button">
                    <div className="flex items-center space-x-3">
                      <Download className="text-primary" />
                      <span>Download Portfolio</span>
                    </div>
                    <span>→</span>
                  </Button>
                  
                  <Button variant="ghost" className="w-full justify-between" onClick={() => setShowAnalyticsModal(true)} data-testid="view-analytics-button">
                    <div className="flex items-center space-x-3">
                      <BarChart3 className="text-primary" />
                      <span>View Analytics</span>
                    </div>
                    <span>→</span>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Share Portfolio Modal */}
      <Dialog open={showShareModal} onOpenChange={setShowShareModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Share Your Portfolio</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-sm text-muted-foreground">Portfolio Link</Label>
              <div className="flex items-center gap-2 mt-2">
                <Input
                  readOnly
                  value={`${window.location.origin}/portfolio/${user?.id}`}
                  className="text-sm"
                />
                <Button
                  size="sm"
                  variant="outline"
                  onClick={copyPortfolioLink}
                  data-testid="copy-portfolio-link-button"
                >
                  {copied ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
            <div className="text-sm text-muted-foreground">
              Share this link with recruiters to showcase your verified certificates.
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* QR Code Modal */}
      <Dialog open={showQRModal} onOpenChange={setShowQRModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Portfolio QR Code</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col items-center space-y-4">
            {qrCode && (
              <img src={qrCode} alt="QR Code" className="w-48 h-48 border rounded-lg p-2 bg-white" />
            )}
            <Button
              onClick={() => {
                const link = document.createElement("a");
                link.href = qrCode;
                link.download = `${user?.firstName}_${user?.lastName}_portfolio_qr.png`;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
              }}
              className="w-full"
              data-testid="download-qr-button"
            >
              <Download className="h-4 w-4 mr-2" />
              Download QR Code
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Analytics Modal */}
      <Dialog open={showAnalyticsModal} onOpenChange={setShowAnalyticsModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Portfolio Analytics</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-muted/50 rounded-lg p-4">
                <div className="text-2xl font-bold">{portfolioViews}</div>
                <div className="text-sm text-muted-foreground">Total Views</div>
              </div>
              <div className="bg-muted/50 rounded-lg p-4">
                <div className="text-2xl font-bold">{verifiedCertificates}</div>
                <div className="text-sm text-muted-foreground">Verified Certs</div>
              </div>
              <div className="bg-muted/50 rounded-lg p-4">
                <div className="text-2xl font-bold">{totalCertificates}</div>
                <div className="text-sm text-muted-foreground">Total Certs</div>
              </div>
              <div className="bg-muted/50 rounded-lg p-4">
                <div className="text-2xl font-bold">{pendingCertificates}</div>
                <div className="text-sm text-muted-foreground">Pending Review</div>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add/Edit Project Modal */}
      <Dialog open={showProjectModal} onOpenChange={setShowProjectModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingProject ? "Edit Project" : "Add New Project"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmitProject((data) => projectMutation.mutate(data))} className="space-y-4">
            <div>
              <Label htmlFor="title">Project Title</Label>
              <Input
                id="title"
                placeholder="e.g., E-commerce Platform"
                {...registerProject("title")}
                data-testid="project-title-input"
              />
              {projectErrors.title && (
                <p className="text-sm text-destructive mt-1">{projectErrors.title.message}</p>
              )}
            </div>
            
            <div>
              <Label htmlFor="description">Description</Label>
              <Input
                id="description"
                placeholder="Brief description of the project"
                {...registerProject("description")}
                data-testid="project-description-input"
              />
              {projectErrors.description && (
                <p className="text-sm text-destructive mt-1">{projectErrors.description.message}</p>
              )}
            </div>
            
            <div>
              <Label htmlFor="githubLink">GitHub Link</Label>
              <Input
                id="githubLink"
                placeholder="https://github.com/username/project"
                {...registerProject("githubLink")}
                data-testid="project-github-input"
              />
              {projectErrors.githubLink && (
                <p className="text-sm text-destructive mt-1">{projectErrors.githubLink.message}</p>
              )}
            </div>

            <Button type="submit" className="w-full" data-testid="save-project-button">
              {editingProject ? "Update Project" : "Add Project"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
