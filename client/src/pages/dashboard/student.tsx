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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { FileUpload } from "@/components/ui/file-upload";
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
  Sparkles,
  ArrowUpRight,
  Share2,
  FolderGit2,
  Upload,
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
    <div className="min-h-screen bg-linear-to-b from-slate-50 to-white dark:from-slate-950 dark:to-slate-900">
      {/* Navigation */}
      <nav className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-lg border-b border-slate-200 dark:border-slate-800 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-linear-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-200 dark:shadow-indigo-900/30">
                <GraduationCap className="h-5 w-5 text-white" />
              </div>
              <div>
                <span className="font-bold text-foreground text-base tracking-tight">SkillFolio</span>
                <span className="text-xs text-muted-foreground ml-1.5 hidden sm:inline">Dashboard</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                className="relative rounded-xl"
                onClick={() => setShowNotificationsModal(true)}
              >
                <Bell className="h-4 w-4" />
                {unreadNotifications > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 rounded-full text-[10px] text-white flex items-center justify-center font-bold animate-pulse">
                    {unreadNotifications}
                  </span>
                )}
              </Button>
              <div className="h-8 w-px bg-border mx-1"></div>
              <div className="flex items-center gap-2.5 pl-1">
                <div className="w-8 h-8 bg-linear-to-br from-blue-400 to-indigo-500 rounded-full flex items-center justify-center text-white text-xs font-bold shadow-sm">
                  {user?.firstName?.[0]}{user?.lastName?.[0]}
                </div>
                <div className="hidden sm:block">
                  <span className="text-sm font-semibold text-foreground block leading-tight">
                    {user?.firstName} {user?.lastName}
                  </span>
                  <span className="text-[11px] text-muted-foreground leading-tight">Student</span>
                </div>
              </div>
              <Button variant="ghost" size="icon" className="rounded-xl text-muted-foreground hover:text-red-500" onClick={logout} data-testid="logout-button">
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Banner */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-foreground tracking-tight">
                Welcome back, {user?.firstName}!
              </h1>
              <p className="text-muted-foreground text-sm mt-1">
                Track your certifications, projects, and career progress.
              </p>
            </div>
            <div className="hidden md:flex items-center gap-2">
              <Link href={`/portfolio/${user?.id}`}>
                <Button variant="outline" size="sm" className="rounded-xl gap-2" data-testid="view-portfolio-button">
                  <Eye className="h-3.5 w-3.5" />
                  View Portfolio
                </Button>
              </Link>
              <Button size="sm" className="rounded-xl gap-2 bg-linear-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white shadow-lg shadow-indigo-200 dark:shadow-indigo-900/30" onClick={() => setShowShareModal(true)} data-testid="share-portfolio-button">
                <Share2 className="h-3.5 w-3.5" />
                Share
              </Button>
            </div>
          </div>
        </div>

        {/* Profile Completeness Banner */}
        {profileScore < 100 && (
          <div className="mb-8 bg-linear-to-r from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/30 border border-amber-200 dark:border-amber-800 rounded-2xl p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-900/50 flex items-center justify-center">
                  <Target className="h-4 w-4 text-amber-600" />
                </div>
                <div>
                  <span className="text-sm font-semibold text-amber-900 dark:text-amber-200">Profile Completeness</span>
                  <span className="text-xs text-amber-600 dark:text-amber-400 ml-2">
                    {profileScore < 50
                      ? "Add certificates & projects to boost your profile"
                      : profileScore < 80
                      ? "Almost there! Keep adding credentials"
                      : "Great profile! Keep adding achievements"}
                  </span>
                </div>
              </div>
              <span className="text-lg font-bold text-amber-700 dark:text-amber-300">{profileScore}%</span>
            </div>
            <div className="w-full bg-amber-200/50 dark:bg-amber-800/30 rounded-full h-2.5">
              <div
                className="bg-linear-to-r from-amber-400 to-orange-500 h-2.5 rounded-full transition-all duration-500"
                style={{ width: `${profileScore}%` }}
              ></div>
            </div>
          </div>
        )}

        {/* Stats Row */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
          {[
            { title: "Total Certificates", value: totalCertificates, icon: CertIcon, gradient: "from-blue-500 to-cyan-500", bg: "bg-blue-50 dark:bg-blue-950/30" },
            { title: "Verified", value: verifiedCertificates, icon: CheckCircle, gradient: "from-emerald-500 to-green-500", bg: "bg-emerald-50 dark:bg-emerald-950/30" },
            { title: "Pending", value: pendingCertificates, icon: Clock, gradient: "from-amber-500 to-yellow-500", bg: "bg-amber-50 dark:bg-amber-950/30" },
            { title: "Portfolio Views", value: portfolioViews, icon: Eye, gradient: "from-purple-500 to-violet-500", bg: "bg-purple-50 dark:bg-purple-950/30" },
            { title: "Recruiter Interest", value: analytics?.recruiterInterest?.totalContactRequests ?? 0, icon: MessageSquare, gradient: "from-indigo-500 to-blue-500", bg: "bg-indigo-50 dark:bg-indigo-950/30" },
          ].map((stat) => (
            <Card key={stat.title} className={`${stat.bg} border-0 shadow-sm hover:shadow-md transition-shadow duration-200`}>
              <CardContent className="p-4 sm:p-5">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl bg-linear-to-br ${stat.gradient} flex items-center justify-center shadow-sm`}>
                    <stat.icon className="h-5 w-5 text-white" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-2xl font-bold text-foreground leading-none" data-testid={`stats-value-${stat.title.toLowerCase().replace(/\s+/g, '-')}`}>
                      {stat.value}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1 truncate" data-testid={`stats-title-${stat.title.toLowerCase().replace(/\s+/g, '-')}`}>
                      {stat.title}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-8">
          <TabsList className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-1 shadow-sm grid grid-cols-4 w-full max-w-lg">
            <TabsTrigger value="overview" className="rounded-lg data-[state=active]:bg-linear-to-r data-[state=active]:from-indigo-500 data-[state=active]:to-purple-600 data-[state=active]:text-white data-[state=active]:shadow-sm">Overview</TabsTrigger>
            <TabsTrigger value="certificates" className="rounded-lg data-[state=active]:bg-linear-to-r data-[state=active]:from-indigo-500 data-[state=active]:to-purple-600 data-[state=active]:text-white data-[state=active]:shadow-sm">Certificates</TabsTrigger>
            <TabsTrigger value="analytics" className="rounded-lg data-[state=active]:bg-linear-to-r data-[state=active]:from-indigo-500 data-[state=active]:to-purple-600 data-[state=active]:text-white data-[state=active]:shadow-sm">Analytics</TabsTrigger>
            <TabsTrigger value="inbox" className="rounded-lg data-[state=active]:bg-linear-to-r data-[state=active]:from-indigo-500 data-[state=active]:to-purple-600 data-[state=active]:text-white data-[state=active]:shadow-sm">
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
                <Card className="border-0 shadow-md bg-white dark:bg-slate-900 rounded-2xl overflow-hidden">
                  <CardHeader className="bg-linear-to-r from-indigo-500/5 to-purple-500/5 dark:from-indigo-500/10 dark:to-purple-500/10 border-b border-slate-100 dark:border-slate-800">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-linear-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
                        <Upload className="h-4 w-4 text-white" />
                      </div>
                      <div>
                        <CardTitle className="text-base">Upload New Tag</CardTitle>
                        <p className="text-xs text-muted-foreground mt-0.5">Add a certificate for AI verification</p>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="p-6">
                    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
                      <FileUpload
                        onFileSelect={setSelectedFile}
                        acceptedTypes={["image/*", "application/pdf"]}
                        className="mb-4"
                      />

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <Label htmlFor="title" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Certificate Title</Label>
                          <Input
                            id="title"
                            placeholder="e.g., Bachelor's Degree"
                            className="rounded-xl border-slate-200 dark:border-slate-700 focus:ring-indigo-500"
                            {...register("title")}
                            data-testid="certificate-title-input"
                          />
                          {errors.title && (
                            <p className="text-sm text-destructive">{errors.title.message}</p>
                          )}
                        </div>
                        <div className="space-y-1.5">
                          <Label htmlFor="institution" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Issuing Institution</Label>
                          <Input
                            id="institution"
                            placeholder="e.g., Stanford University"
                            className="rounded-xl border-slate-200 dark:border-slate-700 focus:ring-indigo-500"
                            {...register("institution")}
                            data-testid="certificate-institution-input"
                          />
                          {errors.institution && (
                            <p className="text-sm text-destructive">{errors.institution.message}</p>
                          )}
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <Label htmlFor="certificateType" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Certificate Type</Label>
                        <Controller
                          name="certificateType"
                          control={control}
                          render={({ field }) => (
                            <Select onValueChange={field.onChange} value={field.value}>
                              <SelectTrigger id="certificateType" className="rounded-xl" data-testid="certificate-type-select">
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
                        <div className="space-y-1.5">
                          <Label htmlFor="internshipDuration" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Internship Duration</Label>
                          <Input
                            id="internshipDuration"
                            placeholder="e.g., 3 months, June - August 2024"
                            className="rounded-xl"
                            {...register("internshipDuration")}
                            data-testid="internship-duration-input"
                          />
                        </div>
                      )}

                      <div className="space-y-1.5">
                        <Label htmlFor="description" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Description (Optional)</Label>
                        <Input
                          id="description"
                          placeholder="Additional details about the certificate"
                          className="rounded-xl"
                          {...register("description")}
                          data-testid="certificate-description-input"
                        />
                      </div>

                      <Button
                        type="submit"
                        className="w-full rounded-xl bg-linear-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white shadow-lg shadow-indigo-200 dark:shadow-indigo-900/30 h-11 text-sm font-semibold"
                        disabled={uploadMutation.isPending}
                        data-testid="upload-certificate-button"
                      >
                        {uploadMutation.isPending ? (
                          <span className="flex items-center gap-2">
                            <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                            Uploading & Analyzing...
                          </span>
                        ) : (
                          <span className="flex items-center gap-2">
                            <Upload className="h-4 w-4" />
                            Upload Tag
                          </span>
                        )}
                      </Button>
                    </form>
                  </CardContent>
                </Card>

                {/* Projects */}
                <Card className="border-0 shadow-md bg-white dark:bg-slate-900 rounded-2xl overflow-hidden">
                  <CardHeader className="flex flex-row items-center justify-between bg-linear-to-r from-emerald-500/5 to-teal-500/5 dark:from-emerald-500/10 dark:to-teal-500/10 border-b border-slate-100 dark:border-slate-800">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-linear-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
                        <FolderGit2 className="h-4 w-4 text-white" />
                      </div>
                      <div>
                        <CardTitle className="text-base">Projects</CardTitle>
                        <p className="text-xs text-muted-foreground mt-0.5">{projects.length} project{projects.length !== 1 ? 's' : ''} added</p>
                      </div>
                    </div>
                    <Button size="sm" className="rounded-xl gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm" onClick={() => { setEditingProject(null); setShowProjectModal(true); }} data-testid="add-project-button">
                      <Plus className="h-3.5 w-3.5" />
                      Add
                    </Button>
                  </CardHeader>
                  <CardContent className="p-5">
                    {projectsLoading ? (
                      <div className="space-y-3">
                        {[1, 2].map((i) => (
                          <div key={i} className="animate-pulse">
                            <div className="h-20 bg-muted rounded-xl"></div>
                          </div>
                        ))}
                      </div>
                    ) : projects.length === 0 ? (
                      <div className="text-center py-10">
                        <div className="w-14 h-14 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto mb-4">
                          <Github className="h-7 w-7 text-muted-foreground/50" />
                        </div>
                        <p className="font-medium text-foreground">No projects yet</p>
                        <p className="text-sm text-muted-foreground mt-1">Showcase your work by adding projects</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {projects.map((project: Project) => (
                          <div key={project.id} className="group border border-slate-100 dark:border-slate-800 rounded-xl p-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 hover:border-slate-200 dark:hover:border-slate-700 transition-all duration-200" data-testid={`project-card-${project.id}`}>
                            <div className="flex items-start justify-between">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <div className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0">
                                    <FolderGit2 className="h-3.5 w-3.5 text-emerald-600" />
                                  </div>
                                  <h4 className="font-semibold text-foreground text-sm truncate">{project.title}</h4>
                                </div>
                                <p className="text-sm text-muted-foreground mt-1.5 line-clamp-2 ml-9">{project.description}</p>
                                <a href={project.githubLink} target="_blank" rel="noopener noreferrer" className="text-xs text-indigo-500 hover:text-indigo-600 hover:underline mt-2 flex items-center gap-1 w-fit ml-9">
                                  <ExternalLink className="h-3 w-3" />
                                  View on GitHub
                                </a>
                              </div>
                              <div className="flex gap-1 ml-3 opacity-0 group-hover:opacity-100 transition-opacity">
                                <Button size="icon" variant="ghost" className="h-7 w-7 rounded-lg" onClick={() => { setEditingProject(project); setShowProjectModal(true); }} data-testid={`edit-project-${project.id}`}>
                                  <Edit2 className="h-3.5 w-3.5" />
                                </Button>
                                <Button size="icon" variant="ghost" className="h-7 w-7 rounded-lg hover:text-red-500" onClick={() => deleteProjectMutation.mutate(project.id)} data-testid={`delete-project-${project.id}`}>
                                  <Trash2 className="h-3.5 w-3.5" />
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
                <Card className="border-0 shadow-md bg-white dark:bg-slate-900 rounded-2xl overflow-hidden">
                  <div className="bg-linear-to-br from-indigo-500 to-purple-600 p-6 text-center relative overflow-hidden">
                    <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAiIGhlaWdodD0iMjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iMiIgY3k9IjIiIHI9IjEiIGZpbGw9InJnYmEoMjU1LDI1NSwyNTUsMC4wNSkiLz48L3N2Zz4=')] opacity-50"></div>
                    <div className="relative">
                      <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center mx-auto mb-3 ring-2 ring-white/30">
                        <span className="text-xl font-bold text-white">{user?.firstName?.[0]}{user?.lastName?.[0]}</span>
                      </div>
                      <h4 className="font-bold text-white text-base">
                        {user?.firstName} {user?.lastName}
                      </h4>
                      <p className="text-indigo-100 text-xs mt-0.5">
                        Student
                      </p>
                    </div>
                  </div>
                  <CardContent className="p-5">
                    <div className="flex items-center justify-around mb-5 -mt-1">
                      <div className="text-center">
                        <div className="text-xl font-bold text-foreground">{verifiedCertificates}</div>
                        <div className="text-[11px] text-muted-foreground">Verified</div>
                      </div>
                      <div className="h-10 w-px bg-slate-200 dark:bg-slate-700"></div>
                      <div className="text-center">
                        <div className="text-xl font-bold text-foreground">{projects.length}</div>
                        <div className="text-[11px] text-muted-foreground">Projects</div>
                      </div>
                      <div className="h-10 w-px bg-slate-200 dark:bg-slate-700"></div>
                      <div className="text-center">
                        <div className="text-xl font-bold text-foreground">{portfolioViews}</div>
                        <div className="text-[11px] text-muted-foreground">Views</div>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Link href={`/portfolio/${user?.id}`}>
                        <Button className="w-full rounded-xl bg-linear-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white shadow-sm h-9 text-sm" data-testid="view-portfolio-button">
                          <Eye className="h-3.5 w-3.5 mr-2" />
                          View Full Portfolio
                        </Button>
                      </Link>
                      <Button variant="outline" className="w-full rounded-xl h-9 text-sm" onClick={() => setShowShareModal(true)} data-testid="share-portfolio-button">
                        <Share2 className="h-3.5 w-3.5 mr-2" />
                        Share Portfolio
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                {/* Quick Actions */}
                <Card className="border-0 shadow-md bg-white dark:bg-slate-900 rounded-2xl">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-semibold flex items-center gap-2">
                      <Sparkles className="h-4 w-4 text-amber-500" />
                      Quick Actions
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-3 pt-0">
                    <div className="space-y-1">
                      {[
                        { icon: QRCodeIcon, label: "Generate QR Code", onClick: generatePortfolioQR, testId: "generate-qr-button", color: "text-violet-500" },
                        { icon: Download, label: "Download Resume", onClick: downloadPortfolio, testId: "download-portfolio-button", color: "text-blue-500" },
                        { icon: BarChart3, label: "View Analytics", onClick: () => setActiveTab("analytics"), testId: "view-analytics-button", color: "text-emerald-500" },
                        { icon: CertIcon, label: "All Certificates", onClick: () => setActiveTab("certificates"), testId: "view-certificates-button", color: "text-amber-500" },
                      ].map((action) => (
                        <Button
                          key={action.label}
                          variant="ghost"
                          className="w-full justify-between rounded-xl h-10 px-3 hover:bg-slate-50 dark:hover:bg-slate-800"
                          onClick={action.onClick}
                          data-testid={action.testId}
                        >
                          <div className="flex items-center gap-2.5">
                            <action.icon className={`h-4 w-4 ${action.color}`} />
                            <span className="text-sm">{action.label}</span>
                          </div>
                          <ArrowUpRight className="h-3.5 w-3.5 text-muted-foreground" />
                        </Button>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Skill Breakdown Mini */}
                {skillDistData.length > 0 && (
                  <Card className="border-0 shadow-md bg-white dark:bg-slate-900 rounded-2xl">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-semibold flex items-center gap-2">
                        <Award className="h-4 w-4 text-indigo-500" />
                        Skill Breakdown
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-5 pt-0">
                      <div className="space-y-3">
                        {skillDistData.map((item) => {
                          const total = skillDistData.reduce((sum, d) => sum + d.value, 0);
                          const pct = total > 0 ? Math.round((item.value / total) * 100) : 0;
                          return (
                            <div key={item.name}>
                              <div className="flex items-center justify-between mb-1.5">
                                <div className="flex items-center gap-2">
                                  <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }}></div>
                                  <span className="text-sm text-foreground">{item.name}</span>
                                </div>
                                <span className="text-xs font-semibold text-muted-foreground">{item.value} ({pct}%)</span>
                              </div>
                              <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-1.5">
                                <div className="h-1.5 rounded-full transition-all duration-500" style={{ width: `${pct}%`, backgroundColor: item.color }}></div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          </TabsContent>

          {/* ============ CERTIFICATES TAB ============ */}
          <TabsContent value="certificates">
            <Card className="border-0 shadow-md bg-white dark:bg-slate-900 rounded-2xl overflow-hidden">
              <CardHeader className="bg-linear-to-r from-blue-500/5 to-indigo-500/5 dark:from-blue-500/10 dark:to-indigo-500/10 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-linear-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
                      <CertIcon className="h-4 w-4 text-white" />
                    </div>
                    <div>
                      <CardTitle className="text-base">All Certificates</CardTitle>
                      <p className="text-xs text-muted-foreground mt-0.5">{certificates.length} certificate{certificates.length !== 1 ? 's' : ''} total</p>
                    </div>
                  </div>
                  {certificates.length > 0 && (
                    <div className="flex gap-2">
                      <Badge variant="secondary" className="rounded-lg gap-1">
                        <CheckCircle className="h-3 w-3 text-green-500" />
                        {verifiedCertificates} verified
                      </Badge>
                      <Badge variant="secondary" className="rounded-lg gap-1">
                        <Clock className="h-3 w-3 text-amber-500" />
                        {pendingCertificates} pending
                      </Badge>
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent className="p-5">
                {certificatesLoading ? (
                  <div className="space-y-4">
                    {[1, 2, 3, 4, 5].map((i) => (
                      <div key={i} className="animate-pulse">
                        <div className="h-24 bg-muted rounded-xl"></div>
                      </div>
                    ))}
                  </div>
                ) : certificates.length === 0 ? (
                  <div className="text-center py-16">
                    <div className="w-16 h-16 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto mb-4">
                      <CertIcon className="h-8 w-8 text-muted-foreground/50" />
                    </div>
                    <p className="text-lg font-medium text-foreground">No certificates uploaded yet</p>
                    <p className="text-sm text-muted-foreground mt-1 mb-5">Upload your first certificate to get started</p>
                    <Button onClick={() => setActiveTab("overview")} className="rounded-xl gap-2 bg-linear-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white">
                      <Upload className="h-4 w-4" /> Upload Certificate
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
                {[
                  { label: "Verification Rate", value: `${analytics?.overview?.verificationRate ?? 0}%`, icon: Shield, gradient: "from-emerald-500 to-green-500", bg: "bg-emerald-50 dark:bg-emerald-950/30" },
                  { label: "Total Views", value: portfolioViews, icon: Eye, gradient: "from-purple-500 to-violet-500", bg: "bg-purple-50 dark:bg-purple-950/30" },
                  { label: "Recruiter Contacts", value: analytics?.recruiterInterest?.totalContactRequests ?? 0, icon: MessageSquare, gradient: "from-indigo-500 to-blue-500", bg: "bg-indigo-50 dark:bg-indigo-950/30" },
                  { label: "Profile Score", value: `${profileScore}%`, icon: Target, gradient: "from-amber-500 to-orange-500", bg: "bg-amber-50 dark:bg-amber-950/30" },
                ].map((stat) => (
                  <Card key={stat.label} className={`${stat.bg} border-0 shadow-sm`}>
                    <CardContent className="p-5">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-xl bg-linear-to-br ${stat.gradient} flex items-center justify-center shadow-sm`}>
                          <stat.icon className="h-5 w-5 text-white" />
                        </div>
                        <div>
                          <div className="text-2xl font-bold text-foreground">{stat.value}</div>
                          <div className="text-xs text-muted-foreground">{stat.label}</div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Portfolio View Trends */}
                <Card className="border-0 shadow-md bg-white dark:bg-slate-900 rounded-2xl">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                      <TrendingUp className="h-4 w-4 text-indigo-500" />
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
                <Card className="border-0 shadow-md bg-white dark:bg-slate-900 rounded-2xl">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                      <Award className="h-4 w-4 text-amber-500" />
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
                <Card className="border-0 shadow-md bg-white dark:bg-slate-900 rounded-2xl">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                      <Briefcase className="h-4 w-4 text-blue-500" />
                      Recruiter Interest
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between p-3.5 bg-slate-50 dark:bg-slate-800/50 rounded-xl">
                        <span className="text-sm text-foreground">Total Contact Requests</span>
                        <span className="font-bold text-foreground">{analytics?.recruiterInterest?.totalContactRequests ?? 0}</span>
                      </div>
                      <div className="flex items-center justify-between p-3.5 bg-amber-50 dark:bg-amber-950/20 rounded-xl">
                        <span className="text-sm text-foreground">Pending Requests</span>
                        <Badge variant="secondary" className="rounded-lg">{analytics?.recruiterInterest?.pendingContactRequests ?? 0}</Badge>
                      </div>
                      <div className="flex items-center justify-between p-3.5 bg-emerald-50 dark:bg-emerald-950/20 rounded-xl">
                        <span className="text-sm text-foreground">Accepted Connections</span>
                        <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300 rounded-lg">{analytics?.recruiterInterest?.acceptedContactRequests ?? 0}</Badge>
                      </div>
                      {(analytics?.recruiterInterest?.totalContactRequests ?? 0) === 0 && (
                        <p className="text-xs text-muted-foreground text-center pt-2">
                          Share your portfolio with recruiters to receive contact requests.
                        </p>
                      )}
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-0 shadow-md bg-white dark:bg-slate-900 rounded-2xl">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                      <Activity className="h-4 w-4 text-emerald-500" />
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
                <Card className="border-0 shadow-md bg-white dark:bg-slate-900 rounded-2xl">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                      <CheckCircle className="h-4 w-4 text-emerald-500" />
                      Verified Skills
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2">
                      {analytics.skills.map((skill: string, i: number) => (
                        <Badge key={i} className="bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300 hover:bg-emerald-100 rounded-lg px-3 py-1">
                          <CheckCircle className="h-3 w-3 mr-1.5" />
                          {skill}
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
              <Card className="border-0 shadow-md bg-white dark:bg-slate-900 rounded-2xl overflow-hidden">
                <CardHeader className="bg-linear-to-r from-blue-500/5 to-indigo-500/5 dark:from-blue-500/10 dark:to-indigo-500/10 border-b border-slate-100 dark:border-slate-800">
                  <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                    <div className="w-7 h-7 rounded-lg bg-linear-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
                      <MessageSquare className="h-3.5 w-3.5 text-white" />
                    </div>
                    Recruiter Contact Requests
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-5">
                  {contactRequests.length === 0 ? (
                    <div className="text-center py-10">
                      <div className="w-14 h-14 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto mb-4">
                        <MessageSquare className="h-7 w-7 text-muted-foreground/50" />
                      </div>
                      <p className="font-medium text-foreground">No contact requests yet</p>
                      <p className="text-xs text-muted-foreground mt-1">Recruiters can reach out through your portfolio</p>
                    </div>
                  ) : (
                    <div className="space-y-3 max-h-[400px] overflow-y-auto">
                      {contactRequests.map((cr: any) => (
                        <div key={cr.id} className="border border-slate-100 dark:border-slate-800 rounded-xl p-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition">
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex items-center gap-2.5">
                              <div className="w-8 h-8 rounded-lg bg-linear-to-br from-blue-400 to-indigo-500 flex items-center justify-center text-white text-xs font-bold">
                                {(cr.recruiterName || "R")[0]}
                              </div>
                              <div>
                                <p className="font-semibold text-sm text-foreground">{cr.recruiterName || "Recruiter"}</p>
                                <p className="text-[11px] text-muted-foreground">
                                  {new Date(cr.createdAt).toLocaleDateString()}
                                </p>
                              </div>
                            </div>
                            <Badge variant={cr.status === "pending" ? "secondary" : cr.status === "accepted" ? "default" : "destructive"} className="rounded-lg text-[11px]">
                              {cr.status}
                            </Badge>
                          </div>
                          {cr.message && (
                            <p className="text-sm text-muted-foreground mb-3">{cr.message}</p>
                          )}
                          {cr.status === "pending" && (
                            <div className="flex gap-2">
                              <Button size="sm" className="rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white" onClick={() => respondContactMutation.mutate({ requestId: cr.id, status: "accepted" })}>
                                Accept
                              </Button>
                              <Button size="sm" variant="outline" className="rounded-lg" onClick={() => respondContactMutation.mutate({ requestId: cr.id, status: "rejected" })}>
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
              <Card className="border-0 shadow-md bg-white dark:bg-slate-900 rounded-2xl overflow-hidden">
                <CardHeader className="flex flex-row items-center justify-between bg-linear-to-r from-amber-500/5 to-orange-500/5 dark:from-amber-500/10 dark:to-orange-500/10 border-b border-slate-100 dark:border-slate-800">
                  <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                    <div className="w-7 h-7 rounded-lg bg-linear-to-br from-amber-500 to-orange-500 flex items-center justify-center">
                      <Bell className="h-3.5 w-3.5 text-white" />
                    </div>
                    Notifications
                  </CardTitle>
                  {unreadNotifications > 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="rounded-lg text-xs"
                      onClick={() => markAllReadMutation.mutate()}
                    >
                      Mark all read
                    </Button>
                  )}
                </CardHeader>
                <CardContent className="p-5">
                  {notifications.length === 0 ? (
                    <div className="text-center py-10">
                      <div className="w-14 h-14 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto mb-4">
                        <Bell className="h-7 w-7 text-muted-foreground/50" />
                      </div>
                      <p className="font-medium text-foreground">No notifications</p>
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-[400px] overflow-y-auto">
                      {notifications.slice(0, 20).map((notif: any) => (
                        <div
                          key={notif.id}
                          className={`p-3.5 rounded-xl border cursor-pointer transition-all duration-200 ${
                            notif.isRead
                              ? "bg-background border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50"
                              : "bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800 hover:bg-blue-100 dark:hover:bg-blue-950/30"
                          }`}
                          onClick={() => {
                            if (!notif.isRead) markReadMutation.mutate(notif.id);
                          }}
                        >
                          <div className="flex items-start justify-between">
                            <div className="min-w-0">
                              <p className={`text-sm ${notif.isRead ? "text-muted-foreground" : "font-semibold text-foreground"}`}>
                                {notif.title}
                              </p>
                              <p className="text-xs text-muted-foreground mt-1">{notif.message}</p>
                              <p className="text-[11px] text-muted-foreground mt-1.5">
                                {new Date(notif.createdAt).toLocaleDateString()}
                              </p>
                            </div>
                            {!notif.isRead && (
                              <div className="w-2.5 h-2.5 rounded-full bg-blue-500 mt-1 shrink-0 ml-2 animate-pulse"></div>
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
        <DialogContent className="rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Share2 className="h-5 w-5 text-indigo-500" />
              Share Your Portfolio
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Portfolio Link</Label>
              <div className="flex items-center gap-2 mt-2">
                <Input
                  readOnly
                  value={`${window.location.origin}/portfolio/${user?.id}`}
                  className="text-sm rounded-xl bg-slate-50 dark:bg-slate-800"
                />
                <Button
                  size="sm"
                  variant="outline"
                  className="rounded-xl"
                  onClick={copyPortfolioLink}
                  data-testid="copy-portfolio-link-button"
                >
                  {copied ? (
                    <Check className="h-4 w-4 text-emerald-500" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Share this link with recruiters to showcase your verified certificates.
            </p>
          </div>
        </DialogContent>
      </Dialog>

      {/* QR Code Modal */}
      <Dialog open={showQRModal} onOpenChange={setShowQRModal}>
        <DialogContent className="rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <QRCodeIcon className="h-5 w-5 text-violet-500" />
              Portfolio QR Code
            </DialogTitle>
          </DialogHeader>
          <div className="flex flex-col items-center space-y-4">
            {qrCode && (
              <div className="p-4 bg-white rounded-2xl shadow-inner border border-slate-100">
                <img src={qrCode} alt="QR Code" className="w-48 h-48" />
              </div>
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
              className="w-full rounded-xl bg-linear-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white"
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
        <DialogContent className="max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Bell className="h-4 w-4 text-amber-500" />
              Notifications
              {unreadNotifications > 0 && (
                <Badge variant="destructive" className="ml-1 rounded-lg">{unreadNotifications} new</Badge>
              )}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-2 max-h-[400px] overflow-y-auto">
            {notifications.length === 0 ? (
              <p className="text-center text-muted-foreground py-6">No notifications</p>
            ) : (
              notifications.slice(0, 15).map((notif: any) => (
                <div
                  key={notif.id}
                  className={`p-3.5 rounded-xl border cursor-pointer transition-all duration-200 ${
                    notif.isRead ? "bg-muted/30 hover:bg-muted/50" : "bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800"
                  }`}
                  onClick={() => {
                    if (!notif.isRead) markReadMutation.mutate(notif.id);
                  }}
                >
                  <p className={`text-sm ${notif.isRead ? "text-muted-foreground" : "font-semibold text-foreground"}`}>
                    {notif.title}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">{notif.message}</p>
                  <p className="text-[11px] text-muted-foreground mt-1.5">
                    {new Date(notif.createdAt).toLocaleDateString()}
                  </p>
                </div>
              ))
            )}
          </div>
          {unreadNotifications > 0 && (
            <Button
              variant="outline"
              className="w-full rounded-xl"
              onClick={() => markAllReadMutation.mutate()}
            >
              Mark all as read
            </Button>
          )}
        </DialogContent>
      </Dialog>

      {/* Add/Edit Project Modal */}
      <Dialog open={showProjectModal} onOpenChange={setShowProjectModal}>
        <DialogContent className="rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FolderGit2 className="h-5 w-5 text-emerald-500" />
              {editingProject ? "Edit Project" : "Add New Project"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmitProject((data) => projectMutation.mutate(data))} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="title" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Project Title</Label>
              <Input
                id="title"
                placeholder="e.g., E-commerce Platform"
                className="rounded-xl"
                {...registerProject("title")}
                data-testid="project-title-input"
              />
              {projectErrors.title && (
                <p className="text-sm text-destructive">{projectErrors.title.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="description" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Description</Label>
              <Input
                id="description"
                placeholder="Brief description of the project"
                className="rounded-xl"
                {...registerProject("description")}
                data-testid="project-description-input"
              />
              {projectErrors.description && (
                <p className="text-sm text-destructive">{projectErrors.description.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="githubLink" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">GitHub Link</Label>
              <Input
                id="githubLink"
                placeholder="https://github.com/username/project"
                className="rounded-xl"
                {...registerProject("githubLink")}
                data-testid="project-github-input"
              />
              {projectErrors.githubLink && (
                <p className="text-sm text-destructive">{projectErrors.githubLink.message}</p>
              )}
            </div>

            <Button type="submit" className="w-full rounded-xl bg-linear-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white shadow-sm h-10" data-testid="save-project-button">
              {editingProject ? "Update Project" : "Add Project"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
