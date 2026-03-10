import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { FileUpload } from "@/components/ui/file-upload";
import { StatsCard } from "@/components/dashboard/stats-card";
import { CertificateCard } from "@/components/dashboard/certificate-card";
import { getAuthHeaders } from "@/lib/auth";
import { insertCertificateSchema, insertProjectSchema, type InsertCertificate, type Certificate, type Project, type InsertProject } from "@shared/schema";
import * as QRCode from "qrcode";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  Area,
  AreaChart,
} from "recharts";
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
  ExternalLink,
  TrendingUp,
  Shield,
  Briefcase,
  Award,
  Target,
  MessageSquare,
  FileText,
  Activity,
  ChevronRight,
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

const PIE_COLORS = ["#6366f1", "#f59e0b", "#10b981", "#ef4444"];

export default function StudentDashboard() {
  const { user, logout } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showQRModal, setShowQRModal] = useState(false);
  const [showAnalyticsModal, setShowAnalyticsModal] = useState(false);
  const [showNotificationsModal, setShowNotificationsModal] = useState(false);
  const [qrCode, setQrCode] = useState<string>("");
  const [copied, setCopied] = useState(false);
  const [showProjectModal, setShowProjectModal] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [activeTab, setActiveTab] = useState("overview");

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

  // Fetch analytics data
  const { data: analytics } = useQuery({
    queryKey: ["/api/student/analytics"],
    queryFn: async () => {
      const response = await fetch("/api/student/analytics", {
        headers: getAuthHeaders(),
      });
      if (!response.ok) throw new Error("Failed to fetch analytics");
      return response.json();
    },
  });

  // Fetch notifications
  const { data: notifications = [] } = useQuery({
    queryKey: ["/api/notifications"],
    queryFn: async () => {
      const response = await fetch("/api/notifications", {
        headers: getAuthHeaders(),
      });
      if (!response.ok) throw new Error("Failed to fetch notifications");
      return response.json();
    },
  });

  // Fetch contact requests for student
  const { data: contactRequests = [] } = useQuery({
    queryKey: ["/api/student/contact-requests"],
    queryFn: async () => {
      const response = await fetch("/api/student/contact-requests", {
        headers: getAuthHeaders(),
      });
      if (!response.ok) return [];
      return response.json();
    },
  });

  // Mark notification read mutation
  const markReadMutation = useMutation({
    mutationFn: async (notifId: string) => {
      const response = await fetch(`/api/notifications/${notifId}/read`, {
        method: "POST",
        headers: getAuthHeaders(),
      });
      if (!response.ok) throw new Error("Failed");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
      queryClient.invalidateQueries({ queryKey: ["/api/student/analytics"] });
    },
  });

  // Mark all notifications read
  const markAllReadMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/notifications/read-all", {
        method: "POST",
        headers: getAuthHeaders(),
      });
      if (!response.ok) throw new Error("Failed");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
      queryClient.invalidateQueries({ queryKey: ["/api/student/analytics"] });
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
      queryClient.invalidateQueries({ queryKey: ["/api/student/analytics"] });
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
      queryClient.invalidateQueries({ queryKey: ["/api/student/analytics"] });
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
      queryClient.invalidateQueries({ queryKey: ["/api/student/analytics"] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete project",
        variant: "destructive",
      });
    },
  });

  // Contact request response mutation
  const respondContactMutation = useMutation({
    mutationFn: async ({ requestId, status }: { requestId: string; status: string }) => {
      const response = await fetch(`/api/student/contact-requests/${requestId}`, {
        method: "PATCH",
        headers: {
          ...getAuthHeaders(),
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status }),
      });
      if (!response.ok) throw new Error("Failed to respond");
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Response sent" });
      queryClient.invalidateQueries({ queryKey: ["/api/student/contact-requests"] });
      queryClient.invalidateQueries({ queryKey: ["/api/student/analytics"] });
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
      const portfolio = data.portfolio || {};

      const content: any[] = [
        {
          text: fullName,
          fontSize: 28,
          bold: true,
          alignment: "left",
          color: "#1a1a1a",
          margin: [0, 0, 0, 2],
        },
        {
          text: "Professional Portfolio",
          fontSize: 12,
          color: "#8F0D0D",
          alignment: "left",
          margin: [0, 0, 0, 10],
        },
        {
          text: data.user.email,
          fontSize: 10,
          color: "#0066cc",
          margin: [0, 0, 0, 5],
        },
        {
          text: `Portfolio: ${window.location.origin}/portfolio/${user?.id}`,
          fontSize: 9,
          color: "#0066cc",
          margin: [0, 0, 0, 15],
        },
        {
          canvas: [{
            type: "line",
            x1: 0, y1: 0, x2: 515, y2: 0,
            lineWidth: 2,
            lineColor: "#8F0D0D",
          }],
          margin: [0, 0, 0, 15],
        },
      ];

      // Summary section
      if (data.summary) {
        content.push({
          text: "PROFESSIONAL SUMMARY",
          fontSize: 13,
          bold: true,
          color: "#450808",
          margin: [0, 5, 0, 8],
        });
        content.push({
          text: data.summary,
          fontSize: 10,
          color: "#444444",
          margin: [0, 0, 0, 12],
        });
      }

      // WORK EXPERIENCE (Internships)
      if (portfolio.internships && portfolio.internships.length > 0) {
        content.push({
          text: "WORK EXPERIENCE",
          fontSize: 13,
          bold: true,
          color: "#450808",
          margin: [0, 10, 0, 8],
        });

        portfolio.internships.forEach((internship: any, idx: number) => {
          if (idx > 0) {
            content.push({ text: "", margin: [0, 5, 0, 5] });
          }
          content.push({
            columns: [
              {
                width: "70%",
                text: internship.title,
                fontSize: 11,
                bold: true,
                color: "#1a1a1a",
              },
              {
                width: "30%",
                text: internship.duration || "",
                fontSize: 10,
                color: "#666666",
                alignment: "right",
              },
            ],
            margin: [0, 0, 0, 2],
          });
          content.push({
            text: internship.institution,
            fontSize: 10,
            color: "#666666",
            margin: [0, 0, 0, 4],
          });
          if (internship.description) {
            content.push({
              text: internship.description,
              fontSize: 9,
              color: "#444444",
              margin: [0, 0, 0, 0],
            });
          }
        });

        content.push({ text: "", margin: [0, 8, 0, 0] });
      }

      // SKILLS (Courses)
      if (portfolio.skills && portfolio.skills.length > 0) {
        content.push({
          text: "SKILLS & CERTIFICATIONS",
          fontSize: 13,
          bold: true,
          color: "#450808",
          margin: [0, 5, 0, 8],
        });

        const skillsText = portfolio.skills
          .map((skill: any) => `• ${skill.title} — ${skill.institution}`)
          .join("\n");

        content.push({
          text: skillsText,
          fontSize: 10,
          color: "#444444",
          margin: [0, 0, 0, 8],
        });
      }

      // PROJECTS
      if (portfolio.projects && portfolio.projects.length > 0) {
        content.push({
          text: "PROJECTS",
          fontSize: 13,
          bold: true,
          color: "#450808",
          margin: [0, 5, 0, 8],
        });

        portfolio.projects.forEach((project: any, idx: number) => {
          if (idx > 0) {
            content.push({ text: "", margin: [0, 5, 0, 5] });
          }
          content.push({
            text: project.title,
            fontSize: 11,
            bold: true,
            color: "#1a1a1a",
            margin: [0, 0, 0, 2],
          });
          if (project.description) {
            content.push({
              text: project.description,
              fontSize: 9,
              color: "#444444",
              margin: [0, 0, 0, 2],
            });
          }
          if (project.githubLink) {
            content.push({
              text: project.githubLink,
              fontSize: 9,
              color: "#0066cc",
              decoration: "underline",
              margin: [0, 0, 0, 0],
            });
          }
        });

        content.push({ text: "", margin: [0, 8, 0, 0] });
      }

      // ACHIEVEMENTS (Hackathons & Workshops)
      const achievements = [
        ...(portfolio.hackathons || []),
        ...(portfolio.workshops || []),
      ];

      if (achievements.length > 0) {
        content.push({
          text: "ACHIEVEMENTS",
          fontSize: 13,
          bold: true,
          color: "#450808",
          margin: [0, 5, 0, 8],
        });

        const achievementsText = achievements
          .map((ach: any) => `• ${ach.title} — ${ach.institution}`)
          .join("\n");

        content.push({
          text: achievementsText,
          fontSize: 10,
          color: "#444444",
          margin: [0, 0, 0, 8],
        });
      }

      // Footer with verification info
      content.push({
        canvas: [{
          type: "line",
          x1: 0, y1: 0, x2: 515, y2: 0,
          lineWidth: 0.5,
          lineColor: "#cccccc",
        }],
        margin: [0, 15, 0, 8],
      });

      content.push({
        text: [
          { text: "Blockchain Verified Resume", bold: true, fontSize: 8 },
          { text: ` | Generated on ${new Date().toLocaleDateString()} | `, fontSize: 8 },
          { text: `Verified Credentials: ${
            (portfolio.skills?.length || 0) +
            (portfolio.internships?.length || 0) +
            (portfolio.hackathons?.length || 0) +
            (portfolio.workshops?.length || 0)
          }`, fontSize: 8 },
          { text: ` | Portfolio Views: ${data.viewCount || 0}`, fontSize: 8 },
        ],
        alignment: "center",
        color: "#999999",
        margin: [0, 0, 0, 0],
      });

      const docDefinition: any = {
        pageSize: "A4",
        pageMargins: [40, 40, 40, 40],
        content: content,
      };

      pdfMake.createPdf(docDefinition).download(`${fullName}_Resume.pdf`);

      toast({
        title: "Success",
        description: "Resume downloaded as PDF",
      });
    } catch (error) {
      console.error("Download portfolio error:", error);
      toast({
        title: "Error",
        description: "Failed to download resume",
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
  const verifiedCertificates = certificates.filter((cert: Certificate) => cert.status === "approved").length;
  const pendingCertificates = certificates.filter((cert: Certificate) => cert.status === "pending").length;
  const portfolioViews = analytics?.overview?.totalViews ?? 0;
  const profileScore = analytics?.overview?.profileScore ?? 0;
  const unreadNotifications = notifications.filter((n: any) => !n.isRead).length;

  // Prepare chart data
  const skillDistData = analytics?.skillDistribution
    ? [
        { name: "Courses", value: analytics.skillDistribution.course, color: "#6366f1" },
        { name: "Hackathons", value: analytics.skillDistribution.hackathon, color: "#f59e0b" },
        { name: "Internships", value: analytics.skillDistribution.internship, color: "#10b981" },
        { name: "Workshops", value: analytics.skillDistribution.workshop, color: "#ef4444" },
      ].filter(d => d.value > 0)
    : [];

  const viewTrendData = analytics?.viewTrends?.slice(-14) || [];

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
              <Button
                variant="ghost"
                size="sm"
                className="relative"
                onClick={() => setShowNotificationsModal(true)}
              >
                <Bell className="h-4 w-4" />
                {unreadNotifications > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full text-[10px] text-white flex items-center justify-center">
                    {unreadNotifications}
                  </span>
                )}
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
        {/* Profile Completeness Banner */}
        {profileScore < 100 && (
          <Card className="mb-6 border-amber-200 bg-amber-50/50">
            <CardContent className="py-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Target className="h-4 w-4 text-amber-600" />
                  <span className="text-sm font-medium text-amber-800">Profile Completeness</span>
                </div>
                <span className="text-sm font-bold text-amber-700">{profileScore}%</span>
              </div>
              <Progress value={profileScore} className="h-2" />
              <p className="text-xs text-amber-600 mt-2">
                {profileScore < 50
                  ? "Add certificates, projects, and internships to boost your profile."
                  : profileScore < 80
                  ? "Almost there! Add more verified credentials to stand out."
                  : "Great profile! Keep adding achievements to maintain visibility."}
              </p>
            </CardContent>
          </Card>
        )}

        {/* Stats Row */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-8">
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
          <StatsCard
            title="Recruiter Interest"
            value={analytics?.recruiterInterest?.totalContactRequests ?? 0}
            icon={MessageSquare}
            iconColor="text-indigo-600"
            iconBgColor="bg-indigo-100"
          />
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-8">
          <TabsList className="grid grid-cols-4 w-full max-w-lg">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="certificates">Certificates</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
            <TabsTrigger value="inbox">
              Inbox
              {(unreadNotifications + (contactRequests?.filter((cr: any) => cr.status === "pending").length || 0)) > 0 && (
                <Badge variant="destructive" className="ml-1 h-4 px-1 text-[10px]">
                  {unreadNotifications + (contactRequests?.filter((cr: any) => cr.status === "pending").length || 0)}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          {/* ============ OVERVIEW TAB ============ */}
          <TabsContent value="overview">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Main Content */}
              <div className="lg:col-span-2 space-y-6">
                {/* Tag Upload */}
                <Card>
                  <CardHeader>
                    <CardTitle>Upload New Tag</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                      <FileUpload
                        onFileSelect={setSelectedFile}
                        acceptedTypes={["image/*", "application/pdf"]}
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
                  <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle>Recent Certificates</CardTitle>
                    {certificates.length > 5 && (
                      <Button variant="ghost" size="sm" onClick={() => setActiveTab("certificates")}>
                        View All <ChevronRight className="h-4 w-4 ml-1" />
                      </Button>
                    )}
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

                {/* Projects */}
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

              {/* Sidebar */}
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
                        {user?.role === "student" ? "Student" : user?.role}
                      </p>
                      <div className="flex items-center justify-center gap-4 mt-3">
                        <div className="text-center">
                          <div className="text-lg font-bold text-foreground">{verifiedCertificates}</div>
                          <div className="text-xs text-muted-foreground">Verified</div>
                        </div>
                        <div className="h-8 w-px bg-border"></div>
                        <div className="text-center">
                          <div className="text-lg font-bold text-foreground">{projects.length}</div>
                          <div className="text-xs text-muted-foreground">Projects</div>
                        </div>
                        <div className="h-8 w-px bg-border"></div>
                        <div className="text-center">
                          <div className="text-lg font-bold text-foreground">{portfolioViews}</div>
                          <div className="text-xs text-muted-foreground">Views</div>
                        </div>
                      </div>
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
                          <span>Download as Resume</span>
                        </div>
                        <span>→</span>
                      </Button>

                      <Button variant="ghost" className="w-full justify-between" onClick={() => setActiveTab("analytics")} data-testid="view-analytics-button">
                        <div className="flex items-center space-x-3">
                          <BarChart3 className="text-primary" />
                          <span>View Analytics</span>
                        </div>
                        <span>→</span>
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                {/* Skill Breakdown Mini */}
                {skillDistData.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm">Skill Breakdown</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {skillDistData.map((item) => (
                          <div key={item.name} className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }}></div>
                              <span className="text-sm text-foreground">{item.name}</span>
                            </div>
                            <Badge variant="secondary">{item.value}</Badge>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          </TabsContent>

          {/* ============ CERTIFICATES TAB ============ */}
          <TabsContent value="certificates">
            <Card>
              <CardHeader>
                <CardTitle>All Certificates</CardTitle>
              </CardHeader>
              <CardContent>
                {certificatesLoading ? (
                  <div className="space-y-4">
                    {[1, 2, 3, 4, 5].map((i) => (
                      <div key={i} className="animate-pulse">
                        <div className="h-24 bg-muted rounded-lg"></div>
                      </div>
                    ))}
                  </div>
                ) : certificates.length === 0 ? (
                  <div className="text-center py-12">
                    <CertIcon className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                    <p className="text-lg text-muted-foreground">No certificates uploaded yet</p>
                    <p className="text-sm text-muted-foreground mb-4">Upload your first certificate to get started</p>
                    <Button onClick={() => setActiveTab("overview")}>
                      <Plus className="h-4 w-4 mr-2" /> Upload Certificate
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {certificates.map((certificate: Certificate) => (
                      <CertificateCard
                        key={certificate.id}
                        certificate={certificate}
                      />
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ============ ANALYTICS TAB ============ */}
          <TabsContent value="analytics">
            <div className="space-y-6">
              {/* Analytics Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
                        <Shield className="h-5 w-5 text-green-600" />
                      </div>
                      <div>
                        <div className="text-2xl font-bold">{analytics?.overview?.verificationRate ?? 0}%</div>
                        <div className="text-xs text-muted-foreground">Verification Rate</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
                        <Eye className="h-5 w-5 text-purple-600" />
                      </div>
                      <div>
                        <div className="text-2xl font-bold">{portfolioViews}</div>
                        <div className="text-xs text-muted-foreground">Total Views</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-indigo-100 flex items-center justify-center">
                        <MessageSquare className="h-5 w-5 text-indigo-600" />
                      </div>
                      <div>
                        <div className="text-2xl font-bold">{analytics?.recruiterInterest?.totalContactRequests ?? 0}</div>
                        <div className="text-xs text-muted-foreground">Recruiter Contacts</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center">
                        <Target className="h-5 w-5 text-amber-600" />
                      </div>
                      <div>
                        <div className="text-2xl font-bold">{profileScore}%</div>
                        <div className="text-xs text-muted-foreground">Profile Score</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Portfolio View Trends */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <TrendingUp className="h-4 w-4" />
                      Portfolio View Trends (14 days)
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {viewTrendData.length > 0 ? (
                      <ResponsiveContainer width="100%" height={250}>
                        <AreaChart data={viewTrendData}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis
                            dataKey="date"
                            tickFormatter={(val) => new Date(val).toLocaleDateString("en", { month: "short", day: "numeric" })}
                            fontSize={11}
                          />
                          <YAxis allowDecimals={false} fontSize={11} />
                          <Tooltip
                            labelFormatter={(val) => new Date(val).toLocaleDateString()}
                            formatter={(value: number) => [value, "Views"]}
                          />
                          <Area type="monotone" dataKey="views" stroke="#6366f1" fill="#6366f1" fillOpacity={0.2} />
                        </AreaChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="h-[250px] flex items-center justify-center text-muted-foreground">
                        <div className="text-center">
                          <Eye className="h-10 w-10 mx-auto mb-2 opacity-30" />
                          <p className="text-sm">No view data yet</p>
                          <p className="text-xs">Share your portfolio to start getting views</p>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Skill Distribution */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Award className="h-4 w-4" />
                      Certificate Distribution
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {skillDistData.length > 0 ? (
                      <div className="flex items-center gap-6">
                        <ResponsiveContainer width="50%" height={200}>
                          <PieChart>
                            <Pie
                              data={skillDistData}
                              cx="50%"
                              cy="50%"
                              innerRadius={40}
                              outerRadius={80}
                              dataKey="value"
                              paddingAngle={4}
                            >
                              {skillDistData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                              ))}
                            </Pie>
                            <Tooltip />
                          </PieChart>
                        </ResponsiveContainer>
                        <div className="space-y-3 flex-1">
                          {skillDistData.map((item, i) => (
                            <div key={item.name} className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }}></div>
                                <span className="text-sm">{item.name}</span>
                              </div>
                              <span className="text-sm font-semibold">{item.value}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className="h-[200px] flex items-center justify-center text-muted-foreground">
                        <div className="text-center">
                          <CertIcon className="h-10 w-10 mx-auto mb-2 opacity-30" />
                          <p className="text-sm">No certificates yet</p>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Recruiter Interest & Recent Activity */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Briefcase className="h-4 w-4" />
                      Recruiter Interest
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                        <span className="text-sm">Total Contact Requests</span>
                        <span className="font-bold">{analytics?.recruiterInterest?.totalContactRequests ?? 0}</span>
                      </div>
                      <div className="flex items-center justify-between p-3 bg-amber-50 rounded-lg">
                        <span className="text-sm">Pending Requests</span>
                        <Badge variant="secondary">{analytics?.recruiterInterest?.pendingContactRequests ?? 0}</Badge>
                      </div>
                      <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                        <span className="text-sm">Accepted Connections</span>
                        <Badge className="bg-green-100 text-green-800">{analytics?.recruiterInterest?.acceptedContactRequests ?? 0}</Badge>
                      </div>
                      {(analytics?.recruiterInterest?.totalContactRequests ?? 0) === 0 && (
                        <p className="text-xs text-muted-foreground text-center pt-2">
                          Share your portfolio with recruiters to receive contact requests.
                        </p>
                      )}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Activity className="h-4 w-4" />
                      Recent Activity
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {(analytics?.recentActivity?.length ?? 0) > 0 ? (
                      <div className="space-y-3 max-h-[250px] overflow-y-auto">
                        {analytics.recentActivity.map((act: any) => (
                          <div key={act.id} className="flex items-start gap-3 text-sm">
                            <div className="w-2 h-2 rounded-full bg-primary mt-1.5 shrink-0"></div>
                            <div className="min-w-0">
                              <p className="text-foreground">
                                {act.action === "certificate_uploaded" && "Uploaded a certificate"}
                                {act.action === "certificate_approved" && "Certificate approved"}
                                {act.action === "certificate_rejected" && "Certificate rejected"}
                                {act.action === "user_login" && "Logged in"}
                                {act.action === "user_registered" && "Registered account"}
                                {!["certificate_uploaded", "certificate_approved", "certificate_rejected", "user_login", "user_registered"].includes(act.action) && act.action}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {new Date(act.createdAt).toLocaleDateString()} at {new Date(act.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8 text-muted-foreground">
                        <Activity className="h-10 w-10 mx-auto mb-2 opacity-30" />
                        <p className="text-sm">No activity yet</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Verified Skills */}
              {(analytics?.skills?.length ?? 0) > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      Verified Skills
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2">
                      {analytics.skills.map((skill: string, i: number) => (
                        <Badge key={i} className="bg-green-100 text-green-800 hover:bg-green-200">
                          ✓ {skill}
                        </Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          {/* ============ INBOX TAB ============ */}
          <TabsContent value="inbox">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Contact Requests from Recruiters */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MessageSquare className="h-4 w-4" />
                    Recruiter Contact Requests
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {contactRequests.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <MessageSquare className="h-10 w-10 mx-auto mb-2 opacity-30" />
                      <p className="text-sm">No contact requests yet</p>
                      <p className="text-xs mt-1">Recruiters can send you contact requests through your portfolio</p>
                    </div>
                  ) : (
                    <div className="space-y-4 max-h-[400px] overflow-y-auto">
                      {contactRequests.map((cr: any) => (
                        <div key={cr.id} className="border rounded-lg p-4">
                          <div className="flex items-start justify-between mb-2">
                            <div>
                              <p className="font-medium text-sm">{cr.recruiterName || "Recruiter"}</p>
                              <p className="text-xs text-muted-foreground">
                                {new Date(cr.createdAt).toLocaleDateString()}
                              </p>
                            </div>
                            <Badge variant={cr.status === "pending" ? "secondary" : cr.status === "accepted" ? "default" : "destructive"}>
                              {cr.status}
                            </Badge>
                          </div>
                          {cr.message && (
                            <p className="text-sm text-muted-foreground mb-3">{cr.message}</p>
                          )}
                          {cr.status === "pending" && (
                            <div className="flex gap-2">
                              <Button size="sm" onClick={() => respondContactMutation.mutate({ requestId: cr.id, status: "accepted" })}>
                                Accept
                              </Button>
                              <Button size="sm" variant="outline" onClick={() => respondContactMutation.mutate({ requestId: cr.id, status: "rejected" })}>
                                Decline
                              </Button>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Notifications */}
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Bell className="h-4 w-4" />
                    Notifications
                  </CardTitle>
                  {unreadNotifications > 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => markAllReadMutation.mutate()}
                    >
                      Mark all read
                    </Button>
                  )}
                </CardHeader>
                <CardContent>
                  {notifications.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <Bell className="h-10 w-10 mx-auto mb-2 opacity-30" />
                      <p className="text-sm">No notifications</p>
                    </div>
                  ) : (
                    <div className="space-y-3 max-h-[400px] overflow-y-auto">
                      {notifications.slice(0, 20).map((notif: any) => (
                        <div
                          key={notif.id}
                          className={`p-3 rounded-lg border cursor-pointer transition ${
                            notif.isRead ? "bg-background" : "bg-blue-50 border-blue-200"
                          }`}
                          onClick={() => {
                            if (!notif.isRead) markReadMutation.mutate(notif.id);
                          }}
                        >
                          <div className="flex items-start justify-between">
                            <div className="min-w-0">
                              <p className={`text-sm ${notif.isRead ? "text-muted-foreground" : "font-medium text-foreground"}`}>
                                {notif.title}
                              </p>
                              <p className="text-xs text-muted-foreground mt-1">{notif.message}</p>
                              <p className="text-xs text-muted-foreground mt-1">
                                {new Date(notif.createdAt).toLocaleDateString()}
                              </p>
                            </div>
                            {!notif.isRead && (
                              <div className="w-2 h-2 rounded-full bg-blue-500 mt-1 shrink-0 ml-2"></div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
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

      {/* Notifications Modal */}
      <Dialog open={showNotificationsModal} onOpenChange={setShowNotificationsModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Bell className="h-4 w-4" />
              Notifications
              {unreadNotifications > 0 && (
                <Badge variant="destructive" className="ml-1">{unreadNotifications} new</Badge>
              )}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 max-h-[400px] overflow-y-auto">
            {notifications.length === 0 ? (
              <p className="text-center text-muted-foreground py-6">No notifications</p>
            ) : (
              notifications.slice(0, 15).map((notif: any) => (
                <div
                  key={notif.id}
                  className={`p-3 rounded-lg border cursor-pointer transition ${
                    notif.isRead ? "bg-muted/30" : "bg-blue-50 border-blue-200"
                  }`}
                  onClick={() => {
                    if (!notif.isRead) markReadMutation.mutate(notif.id);
                  }}
                >
                  <p className={`text-sm ${notif.isRead ? "text-muted-foreground" : "font-medium"}`}>
                    {notif.title}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">{notif.message}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {new Date(notif.createdAt).toLocaleDateString()}
                  </p>
                </div>
              ))
            )}
          </div>
          {unreadNotifications > 0 && (
            <Button
              variant="outline"
              className="w-full"
              onClick={() => markAllReadMutation.mutate()}
            >
              Mark all as read
            </Button>
          )}
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
