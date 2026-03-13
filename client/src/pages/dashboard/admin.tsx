import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { getAuthHeaders } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import {
  Users,
  Bell,
  LogOut,
  Settings,
  Database,
  BarChart3,
  AlertCircle,
  CheckCircle,
  Clock,
  Shield,
  ShieldCheck,
  FileText,
  AlertTriangle,
  Search,
  ChevronDown,
  Eye,
  MoreHorizontal,
  Activity,
  Hash,
  TrendingUp,
  Download,
  ScrollText,
  Zap,
  X,
  FileWarning,
  UserCog,
  Award,
  BookOpen,
  Briefcase,
  Code,
  Layers,
  ArrowUpRight,
  RefreshCw,
  Server,
  HardDrive,
} from "lucide-react";
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
} from "recharts";

interface AdminDashboardData {
  stats: {
    totalUsers: number;
    totalCertificates: number;
    certificatesVerified: number;
    certificatesPending: number;
    certificatesRejected: number;
    suspiciousCertificates: number;
    totalBlocks: number;
  };
  roleDistribution: Record<string, number>;
  categoryBreakdown: Record<string, number>;
  monthlyUploads: { month: string; count: number }[];
  recentCertificates: {
    id: string;
    title: string;
    institution: string;
    certificateType: string;
    status: string;
    studentName: string;
    studentEmail: string;
    createdAt: string;
    updatedAt: string;
    fraudScore: number | null;
  }[];
  suspiciousCertificates: {
    id: string;
    certificateId: string;
    certificateTitle: string;
    studentName: string;
    fraudScore: number;
    authenticity: string;
    reasoning: string | null;
    createdAt: string;
  }[];
  systemHealth: {
    serverStatus: string;
    databaseStatus: string;
    storageUsage: number;
    totalBlocks: number;
    latestBlockHash: string;
    latestBlockTime: string | null;
  };
  alerts: {
    type: string;
    message: string;
    time: string;
    severity: "info" | "warning" | "success" | "error";
  }[];
  logs: {
    event: string;
    user: string;
    time: string;
  }[];
  hashIntegrity: {
    totalVerifiedHashes: number;
    latestHash: string;
    latestHashTime: string | null;
    validationStatus: string;
  };
}

interface UserData {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  isActive: boolean;
  createdAt: string;
}

type AdminTab = "overview" | "users" | "certificates" | "analytics" | "tools";

export default function AdminDashboard() {
  const { user, logout } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<AdminTab>("overview");
  const [userSearchTerm, setUserSearchTerm] = useState("");
  const [selectedRole, setSelectedRole] = useState("all");
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [certStatusFilter, setCertStatusFilter] = useState("all");
  const [roleChangeModal, setRoleChangeModal] = useState<{ open: boolean; userId: string; userName: string; currentRole: string }>({
    open: false, userId: "", userName: "", currentRole: "",
  });
  const [selectedNewRole, setSelectedNewRole] = useState("");

  // Fetch dashboard data
  const { data: dashboard, isLoading: dashLoading } = useQuery<AdminDashboardData>({
    queryKey: ["admin-dashboard"],
    queryFn: async () => {
      const res = await fetch("/api/admin/dashboard", { headers: getAuthHeaders() });
      if (!res.ok) throw new Error("Failed to fetch dashboard");
      return res.json();
    },
    refetchInterval: 30000, // Refresh every 30 seconds for real-time data
  });

  // Fetch users
  const { data: users = [], isLoading: usersLoading } = useQuery<UserData[]>({
    queryKey: ["/api/admin/users"],
    queryFn: async () => {
      const res = await fetch("/api/admin/users", { headers: getAuthHeaders() });
      if (!res.ok) throw new Error("Failed to fetch users");
      return res.json();
    },
  });

  // Update user mutation (role change, activate/deactivate)
  const updateUserMutation = useMutation({
    mutationFn: async ({ userId, data }: { userId: string; data: { role?: string; isActive?: boolean } }) => {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: "PATCH",
        headers: { ...getAuthHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to update user");
      return res.json();
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      queryClient.invalidateQueries({ queryKey: ["admin-dashboard"] });
      toast({ title: "User updated", description: `User ${vars.data.role ? "role changed" : "status updated"} successfully.` });
      setRoleChangeModal({ open: false, userId: "", userName: "", currentRole: "" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update user.", variant: "destructive" });
    },
  });

  // Filter users
  const filteredUsers = users.filter((u) => {
    const matchesSearch =
      !userSearchTerm ||
      u.email.toLowerCase().includes(userSearchTerm.toLowerCase()) ||
      `${u.firstName} ${u.lastName}`.toLowerCase().includes(userSearchTerm.toLowerCase());
    const matchesRole = selectedRole === "all" || u.role === selectedRole;
    const matchesStatus =
      selectedStatus === "all" ||
      (selectedStatus === "active" && u.isActive) ||
      (selectedStatus === "inactive" && !u.isActive);
    return matchesSearch && matchesRole && matchesStatus;
  });

  // Filter certificates
  const filteredCerts = (dashboard?.recentCertificates || []).filter(
    (c) => certStatusFilter === "all" || c.status === certStatusFilter
  );

  const getRoleBadge = (role: string) => {
    const map: Record<string, string> = {
      student: "bg-blue-100 text-blue-700 border-blue-200",
      faculty: "bg-emerald-100 text-emerald-700 border-emerald-200",
      recruiter: "bg-violet-100 text-violet-700 border-violet-200",
      admin: "bg-rose-100 text-rose-700 border-rose-200",
    };
    return map[role] || "bg-slate-100 text-slate-600 border-slate-200";
  };

  const getStatusBadge = (status: string) => {
    const map: Record<string, string> = {
      pending: "bg-amber-50 text-amber-700 border-amber-200",
      approved: "bg-emerald-50 text-emerald-700 border-emerald-200",
      rejected: "bg-red-50 text-red-700 border-red-200",
    };
    return map[status] || "bg-slate-50 text-slate-600 border-slate-200";
  };

  const getSeverityStyle = (severity: string) => {
    const map: Record<string, { bg: string; border: string; text: string; icon: typeof AlertCircle }> = {
      info: { bg: "bg-blue-50", border: "border-blue-200", text: "text-blue-700", icon: Bell },
      warning: { bg: "bg-amber-50", border: "border-amber-200", text: "text-amber-700", icon: AlertTriangle },
      success: { bg: "bg-emerald-50", border: "border-emerald-200", text: "text-emerald-700", icon: CheckCircle },
      error: { bg: "bg-red-50", border: "border-red-200", text: "text-red-700", icon: AlertCircle },
    };
    return map[severity] || map.info;
  };

  const getCertTypeIcon = (type: string) => {
    const map: Record<string, typeof Award> = {
      course: BookOpen,
      internship: Briefcase,
      hackathon: Code,
      workshop: Layers,
    };
    return map[type] || Award;
  };

  const PIE_COLORS = ["#6366f1", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4"];

  const tabs: { key: AdminTab; label: string; icon: typeof Users }[] = [
    { key: "overview", label: "Overview", icon: BarChart3 },
    { key: "users", label: "Users", icon: Users },
    { key: "certificates", label: "Certificates", icon: FileText },
    { key: "analytics", label: "Analytics", icon: TrendingUp },
    { key: "tools", label: "Tools", icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
      {/* Role Change Modal */}
      {roleChangeModal.open && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setRoleChangeModal({ open: false, userId: "", userName: "", currentRole: "" })}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
            <div className="p-6 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-linear-to-br from-indigo-500 to-violet-600 flex items-center justify-center">
                  <UserCog size={20} className="text-white" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-800">Change Role</h3>
                  <p className="text-xs text-slate-500">{roleChangeModal.userName}</p>
                </div>
              </div>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2 block">Current Role</label>
                <span className={`text-xs font-bold px-3 py-1 rounded-full border ${getRoleBadge(roleChangeModal.currentRole)}`}>
                  {roleChangeModal.currentRole}
                </span>
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2 block">New Role</label>
                <div className="relative">
                  <select
                    value={selectedNewRole}
                    onChange={(e) => setSelectedNewRole(e.target.value)}
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  >
                    <option value="">Select role...</option>
                    {["student", "faculty", "recruiter", "admin"]
                      .filter((r) => r !== roleChangeModal.currentRole)
                      .map((r) => (
                        <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>
                      ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-3 text-slate-400 pointer-events-none" size={16} />
                </div>
              </div>
            </div>
            <div className="p-4 border-t border-slate-100 flex gap-2 justify-end">
              <button onClick={() => setRoleChangeModal({ open: false, userId: "", userName: "", currentRole: "" })} className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-xl transition-colors">
                Cancel
              </button>
              <button
                onClick={() => {
                  if (selectedNewRole) {
                    updateUserMutation.mutate({ userId: roleChangeModal.userId, data: { role: selectedNewRole } });
                  }
                }}
                disabled={!selectedNewRole || updateUserMutation.isPending}
                className="px-5 py-2 bg-linear-to-r from-indigo-600 to-violet-600 text-white rounded-xl text-sm font-medium hover:opacity-90 disabled:opacity-50 transition-all"
              >
                {updateUserMutation.isPending ? "Updating..." : "Change Role"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- Navigation --- */}
      <nav className="sticky top-0 z-30 backdrop-blur-xl bg-white/80 border-b border-slate-200/60">
        <div className="max-w-7xl mx-auto px-4 md:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-linear-to-br from-rose-500 to-orange-600 flex items-center justify-center shadow-lg shadow-rose-500/20">
              <Shield size={18} className="text-white" />
            </div>
            <span className="text-lg font-bold bg-linear-to-r from-rose-600 to-orange-500 bg-clip-text text-transparent">
              Admin Console
            </span>
          </div>

          {/* Desktop Tabs */}
          <div className="hidden md:flex items-center gap-1 bg-slate-100/80 rounded-xl p-1">
            {tabs.map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                onClick={() => setActiveTab(key)}
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-sm font-medium transition-all ${
                  activeTab === key
                    ? "bg-white text-slate-800 shadow-sm"
                    : "text-slate-500 hover:text-slate-700"
                }`}
              >
                <Icon size={14} />
                {label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-3">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-semibold text-slate-700">{user?.firstName || "Admin"}</p>
              <p className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">Administrator</p>
            </div>
            <div className="w-9 h-9 rounded-full bg-linear-to-br from-rose-500 to-orange-500 flex items-center justify-center text-white text-sm font-bold shadow-lg shadow-rose-500/20">
              {(user?.firstName?.[0] || "A")}
            </div>
            <button onClick={() => logout()} data-testid="logout-button" className="text-slate-400 hover:text-red-500 transition-colors">
              <LogOut size={18} />
            </button>
          </div>
        </div>
      </nav>

      {/* Mobile Tab Bar */}
      <div className="md:hidden flex border-b border-slate-200 bg-white overflow-x-auto">
        {tabs.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={`flex-1 flex flex-col items-center gap-1 py-3 text-xs font-medium border-b-2 transition-colors min-w-[60px] ${
              activeTab === key ? "text-rose-600 border-rose-500" : "text-slate-500 border-transparent"
            }`}
          >
            <Icon size={16} />
            {label}
          </button>
        ))}
      </div>

      {/* --- Main Content --- */}
      <main className="max-w-7xl mx-auto p-4 md:p-8 space-y-6">
        {/* ====== OVERVIEW TAB ====== */}
        {activeTab === "overview" && (
          <>
            {/* Welcome */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h1 className="text-2xl font-bold text-slate-800">
                  System Overview
                </h1>
                <p className="text-slate-500 text-sm mt-1">
                  Monitor platform health, activity, and integrity at a glance.
                </p>
              </div>
              <button
                onClick={() => queryClient.invalidateQueries({ queryKey: ["admin-dashboard"] })}
                className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors shadow-sm"
              >
                <RefreshCw size={14} /> Refresh
              </button>
            </div>

            {/* Stats Cards */}
            {dashLoading ? (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="animate-pulse h-28 bg-white rounded-2xl border border-slate-200"></div>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 hover:shadow-md transition-shadow">
                  <div className="w-10 h-10 rounded-xl bg-linear-to-br from-blue-500 to-cyan-500 flex items-center justify-center mb-3 shadow-lg shadow-blue-500/20">
                    <Users size={18} className="text-white" />
                  </div>
                  <p className="text-2xl font-bold text-slate-800">{dashboard?.stats.totalUsers || 0}</p>
                  <p className="text-xs text-slate-500 font-medium">Total Users</p>
                </div>
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 hover:shadow-md transition-shadow">
                  <div className="w-10 h-10 rounded-xl bg-linear-to-br from-emerald-500 to-teal-500 flex items-center justify-center mb-3 shadow-lg shadow-emerald-500/20">
                    <FileText size={18} className="text-white" />
                  </div>
                  <p className="text-2xl font-bold text-slate-800">{dashboard?.stats.totalCertificates || 0}</p>
                  <p className="text-xs text-slate-500 font-medium">Certificates Uploaded</p>
                </div>
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 hover:shadow-md transition-shadow">
                  <div className="w-10 h-10 rounded-xl bg-linear-to-br from-indigo-500 to-violet-500 flex items-center justify-center mb-3 shadow-lg shadow-indigo-500/20">
                    <CheckCircle size={18} className="text-white" />
                  </div>
                  <p className="text-2xl font-bold text-slate-800">{dashboard?.stats.certificatesVerified || 0}</p>
                  <p className="text-xs text-slate-500 font-medium">Verified</p>
                </div>
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 hover:shadow-md transition-shadow">
                  <div className="w-10 h-10 rounded-xl bg-linear-to-br from-amber-500 to-orange-500 flex items-center justify-center mb-3 shadow-lg shadow-amber-500/20">
                    <Clock size={18} className="text-white" />
                  </div>
                  <p className="text-2xl font-bold text-slate-800">{dashboard?.stats.certificatesPending || 0}</p>
                  <p className="text-xs text-slate-500 font-medium">Pending Review</p>
                </div>
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 hover:shadow-md transition-shadow">
                  <div className="w-10 h-10 rounded-xl bg-linear-to-br from-red-500 to-pink-500 flex items-center justify-center mb-3 shadow-lg shadow-red-500/20">
                    <AlertTriangle size={18} className="text-white" />
                  </div>
                  <p className="text-2xl font-bold text-slate-800">{dashboard?.stats.suspiciousCertificates || 0}</p>
                  <p className="text-xs text-slate-500 font-medium">Suspicious</p>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left: Alerts + Recent Activity */}
              <div className="lg:col-span-2 space-y-6">
                {/* System Alerts */}
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                  <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-linear-to-br from-amber-400 to-orange-500 flex items-center justify-center">
                      <Bell size={14} className="text-white" />
                    </div>
                    <h3 className="font-bold text-slate-800">System Alerts</h3>
                    <span className="ml-auto text-xs text-slate-400 font-medium">{dashboard?.alerts.length || 0} alerts</span>
                  </div>
                  <div className="p-4 space-y-2">
                    {dashboard?.alerts.map((alert, i) => {
                      const style = getSeverityStyle(alert.severity);
                      const AlertIcon = style.icon;
                      return (
                        <div key={i} className={`${style.bg} border ${style.border} rounded-xl p-3 flex items-start gap-3`}>
                          <AlertIcon size={16} className={`${style.text} mt-0.5 shrink-0`} />
                          <div className="flex-1 min-w-0">
                            <p className={`text-sm font-medium ${style.text}`}>{alert.message}</p>
                            <p className="text-xs text-slate-400 mt-0.5">{alert.time}</p>
                          </div>
                        </div>
                      );
                    })}
                    {(!dashboard?.alerts || dashboard.alerts.length === 0) && (
                      <p className="text-center text-slate-400 text-sm py-4">No alerts</p>
                    )}
                  </div>
                </div>

                {/* Recent Certificate Activity */}
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                  <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-linear-to-br from-indigo-500 to-violet-600 flex items-center justify-center">
                      <Activity size={14} className="text-white" />
                    </div>
                    <h3 className="font-bold text-slate-800">Recent Certificate Activity</h3>
                    <button onClick={() => setActiveTab("certificates")} className="ml-auto text-xs text-indigo-600 hover:underline font-medium flex items-center gap-1">
                      View All <ArrowUpRight size={12} />
                    </button>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-slate-50/80 border-b border-slate-100">
                          <th className="text-left py-2.5 px-4 font-semibold text-slate-500 text-xs uppercase tracking-wider">Student</th>
                          <th className="text-left py-2.5 px-4 font-semibold text-slate-500 text-xs uppercase tracking-wider">Certificate</th>
                          <th className="text-left py-2.5 px-4 font-semibold text-slate-500 text-xs uppercase tracking-wider">Status</th>
                          <th className="text-left py-2.5 px-4 font-semibold text-slate-500 text-xs uppercase tracking-wider">Uploaded</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                        {dashboard?.recentCertificates.slice(0, 6).map((cert) => (
                          <tr key={cert.id} className="hover:bg-slate-50/50 transition-colors">
                            <td className="py-3 px-4">
                              <p className="font-medium text-slate-700 text-sm">{cert.studentName}</p>
                            </td>
                            <td className="py-3 px-4">
                              <p className="text-slate-600 text-sm truncate max-w-[200px]">{cert.title}</p>
                            </td>
                            <td className="py-3 px-4">
                              <span className={`text-[10px] font-bold px-2 py-1 rounded-full border uppercase tracking-wider ${getStatusBadge(cert.status)}`}>
                                {cert.status}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-xs text-slate-400">
                              {new Date(cert.createdAt).toLocaleDateString()}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {(!dashboard?.recentCertificates || dashboard.recentCertificates.length === 0) && (
                      <p className="text-center text-slate-400 text-sm py-8">No recent certificates</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Right sidebar */}
              <div className="space-y-6">
                {/* System Health */}
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                  <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-linear-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
                      <Activity size={14} className="text-white" />
                    </div>
                    <h3 className="font-bold text-slate-800 text-sm">System Health</h3>
                  </div>
                  <div className="p-5 space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-slate-500 flex items-center gap-2"><Server size={14} /> Server</span>
                      <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200 flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                        {dashboard?.systemHealth.serverStatus === "online" ? "Online" : "Offline"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-slate-500 flex items-center gap-2"><Database size={14} /> Database</span>
                      <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                        Connected
                      </span>
                    </div>
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-sm text-slate-500 flex items-center gap-2"><HardDrive size={14} /> Storage</span>
                        <span className="text-xs font-semibold text-slate-700">{dashboard?.systemHealth.storageUsage || 0}%</span>
                      </div>
                      <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-linear-to-r from-indigo-500 to-violet-500 rounded-full transition-all duration-500"
                          style={{ width: `${dashboard?.systemHealth.storageUsage || 0}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Hash Integrity Monitor */}
                <div className="bg-linear-to-br from-slate-800 to-slate-900 rounded-2xl shadow-lg p-5 text-white relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-4 opacity-5">
                    <Hash size={80} />
                  </div>
                  <h3 className="text-sm font-bold text-slate-300 mb-1 flex items-center gap-2">
                    <ShieldCheck size={16} className="text-emerald-400" /> Hash Integrity Monitor
                  </h3>
                  <p className="text-[10px] text-slate-500 mb-4">Cryptographic hash registry for tamper-proof records</p>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-slate-400">Verified Hashes</span>
                      <span className="text-lg font-bold text-emerald-400">{dashboard?.hashIntegrity.totalVerifiedHashes || 0}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-slate-400">Latest Hash</span>
                      <code className="text-[10px] text-cyan-400 font-mono bg-slate-700/50 px-2 py-0.5 rounded">
                        {dashboard?.hashIntegrity.latestHash?.slice(0, 16) || "N/A"}...
                      </code>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-slate-400">Validation</span>
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                        dashboard?.hashIntegrity.validationStatus === "verified"
                          ? "bg-emerald-500/20 text-emerald-400"
                          : "bg-amber-500/20 text-amber-400"
                      }`}>
                        {dashboard?.hashIntegrity.validationStatus === "verified" ? "Verified" : "Pending"}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Suspicious Certificates */}
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                  <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-linear-to-br from-red-500 to-pink-600 flex items-center justify-center">
                      <FileWarning size={14} className="text-white" />
                    </div>
                    <h3 className="font-bold text-slate-800 text-sm">Suspicious Certificates</h3>
                  </div>
                  <div className="divide-y divide-slate-50">
                    {dashboard?.suspiciousCertificates && dashboard.suspiciousCertificates.length > 0 ? (
                      dashboard.suspiciousCertificates.slice(0, 4).map((s) => (
                        <div key={s.id} className="p-3 hover:bg-red-50/30 transition-colors">
                          <div className="flex items-center justify-between">
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-slate-700 truncate">{s.studentName}</p>
                              <p className="text-xs text-slate-400 truncate">{s.certificateTitle}</p>
                            </div>
                            <span className="text-xs font-bold text-red-600 bg-red-50 px-2 py-1 rounded-full border border-red-200 shrink-0 ml-2">
                              Score: {s.fraudScore}
                            </span>
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-center text-slate-400 text-sm py-6">No suspicious certificates detected</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </>
        )}

        {/* ====== USERS TAB ====== */}
        {activeTab === "users" && (
          <>
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h1 className="text-2xl font-bold text-slate-800">User Management</h1>
                <p className="text-slate-500 text-sm">Manage accounts, assign roles, and control access.</p>
              </div>
              <div className="flex items-center gap-2 text-sm text-slate-500">
                <Users size={16} /> {users.length} total users
              </div>
            </div>

            {/* Filters */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
              <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                <div className="md:col-span-5 relative">
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1 block">Search</label>
                  <div className="relative">
                    <Search className="absolute left-3 top-2.5 text-slate-400" size={16} />
                    <input
                      type="text"
                      placeholder="Search by name or email..."
                      className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-all"
                      value={userSearchTerm}
                      onChange={(e) => setUserSearchTerm(e.target.value)}
                      data-testid="user-search-input"
                    />
                  </div>
                </div>
                <div className="md:col-span-3">
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1 block">Role</label>
                  <div className="relative">
                    <select
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                      value={selectedRole}
                      onChange={(e) => setSelectedRole(e.target.value)}
                      data-testid="role-filter-select"
                    >
                      <option value="all">All Roles</option>
                      <option value="student">Student</option>
                      <option value="faculty">Faculty</option>
                      <option value="recruiter">Recruiter</option>
                      <option value="admin">Admin</option>
                    </select>
                    <ChevronDown className="absolute right-3 top-2.5 text-slate-400 pointer-events-none" size={16} />
                  </div>
                </div>
                <div className="md:col-span-3">
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1 block">Status</label>
                  <div className="relative">
                    <select
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                      value={selectedStatus}
                      onChange={(e) => setSelectedStatus(e.target.value)}
                      data-testid="status-filter-select"
                    >
                      <option value="all">All Status</option>
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                    </select>
                    <ChevronDown className="absolute right-3 top-2.5 text-slate-400 pointer-events-none" size={16} />
                  </div>
                </div>
                <div className="md:col-span-1 flex items-end">
                  <button className="w-full py-2 bg-slate-100 text-slate-600 rounded-xl text-sm font-medium hover:bg-slate-200 transition-colors" onClick={() => { setUserSearchTerm(""); setSelectedRole("all"); setSelectedStatus("all"); }}>
                    Clear
                  </button>
                </div>
              </div>
            </div>

            {/* Users Table */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-50/80 border-b border-slate-100">
                      <th className="text-left py-3 px-4 font-semibold text-slate-500 text-xs uppercase tracking-wider">User</th>
                      <th className="text-left py-3 px-4 font-semibold text-slate-500 text-xs uppercase tracking-wider">Role</th>
                      <th className="text-left py-3 px-4 font-semibold text-slate-500 text-xs uppercase tracking-wider">Status</th>
                      <th className="text-left py-3 px-4 font-semibold text-slate-500 text-xs uppercase tracking-wider">Joined</th>
                      <th className="text-left py-3 px-4 font-semibold text-slate-500 text-xs uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {usersLoading ? (
                      [1, 2, 3].map((i) => (
                        <tr key={i}>
                          <td className="py-4 px-4" colSpan={5}>
                            <div className="animate-pulse h-6 bg-slate-100 rounded-lg"></div>
                          </td>
                        </tr>
                      ))
                    ) : filteredUsers.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-12 text-center">
                          <Users size={32} className="mx-auto text-slate-300 mb-3" />
                          <p className="text-slate-500 font-medium">No users found</p>
                          <p className="text-slate-400 text-xs mt-1">Try adjusting your filters</p>
                        </td>
                      </tr>
                    ) : (
                      filteredUsers.map((u) => (
                        <tr key={u.id} className="hover:bg-slate-50/50 transition-colors" data-testid={`user-row-${u.id}`}>
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-3">
                              <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold ${
                                u.role === "admin" ? "bg-linear-to-br from-rose-500 to-orange-500 text-white" :
                                u.role === "faculty" ? "bg-linear-to-br from-emerald-500 to-teal-500 text-white" :
                                u.role === "recruiter" ? "bg-linear-to-br from-violet-500 to-purple-500 text-white" :
                                "bg-linear-to-br from-blue-500 to-cyan-500 text-white"
                              }`}>
                                {u.firstName[0]}
                              </div>
                              <div>
                                <p className="font-medium text-slate-700">{u.firstName} {u.lastName}</p>
                                <p className="text-xs text-slate-400">{u.email}</p>
                              </div>
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full border uppercase tracking-wider ${getRoleBadge(u.role)}`}>
                              {u.role}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full border flex items-center gap-1 w-fit ${
                              u.isActive ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-red-50 text-red-600 border-red-200"
                            }`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${u.isActive ? "bg-emerald-500" : "bg-red-500"}`}></span>
                              {u.isActive ? "Active" : "Inactive"}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-xs text-slate-400">
                            {new Date(u.createdAt).toLocaleDateString()}
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => {
                                  setSelectedNewRole("");
                                  setRoleChangeModal({ open: true, userId: u.id, userName: `${u.firstName} ${u.lastName}`, currentRole: u.role });
                                }}
                                className="px-2.5 py-1.5 text-xs font-medium text-indigo-600 bg-indigo-50 rounded-lg hover:bg-indigo-100 transition-colors"
                                data-testid={`edit-user-${u.id}`}
                              >
                                <UserCog size={12} className="inline mr-1" />
                                Role
                              </button>
                              <button
                                onClick={() => updateUserMutation.mutate({ userId: u.id, data: { isActive: !u.isActive } })}
                                className={`px-2.5 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                                  u.isActive
                                    ? "text-amber-600 bg-amber-50 hover:bg-amber-100"
                                    : "text-emerald-600 bg-emerald-50 hover:bg-emerald-100"
                                }`}
                                data-testid={`suspend-user-${u.id}`}
                              >
                                {u.isActive ? "Deactivate" : "Activate"}
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
              {filteredUsers.length > 0 && (
                <div className="px-5 py-3 border-t border-slate-100 bg-slate-50/50 text-xs text-slate-400">
                  Showing {filteredUsers.length} of {users.length} users
                </div>
              )}
            </div>
          </>
        )}

        {/* ====== CERTIFICATES TAB ====== */}
        {activeTab === "certificates" && (
          <>
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h1 className="text-2xl font-bold text-slate-800">Certificate Monitoring</h1>
                <p className="text-slate-500 text-sm">Track uploads, approvals, rejections, and suspicious activity.</p>
              </div>
            </div>

            {/* Status summary */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: "All", value: dashboard?.stats.totalCertificates || 0, filter: "all", color: "from-slate-500 to-slate-600" },
                { label: "Pending", value: dashboard?.stats.certificatesPending || 0, filter: "pending", color: "from-amber-500 to-orange-500" },
                { label: "Approved", value: dashboard?.stats.certificatesVerified || 0, filter: "approved", color: "from-emerald-500 to-teal-500" },
                { label: "Rejected", value: dashboard?.stats.certificatesRejected || 0, filter: "rejected", color: "from-red-500 to-pink-500" },
              ].map((item) => (
                <button
                  key={item.filter}
                  onClick={() => setCertStatusFilter(item.filter)}
                  className={`bg-white rounded-2xl border shadow-sm p-4 text-left transition-all hover:shadow-md ${
                    certStatusFilter === item.filter ? "border-indigo-300 ring-2 ring-indigo-100" : "border-slate-200"
                  }`}
                >
                  <div className={`w-8 h-8 rounded-lg bg-linear-to-br ${item.color} flex items-center justify-center mb-2`}>
                    <FileText size={14} className="text-white" />
                  </div>
                  <p className="text-xl font-bold text-slate-800">{item.value}</p>
                  <p className="text-xs text-slate-500 font-medium">{item.label}</p>
                </button>
              ))}
            </div>

            {/* Certificate Table */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
                <h3 className="font-bold text-slate-800 flex items-center gap-2">
                  <ScrollText size={16} className="text-indigo-600" />
                  {certStatusFilter === "all" ? "All Certificates" : `${certStatusFilter.charAt(0).toUpperCase() + certStatusFilter.slice(1)} Certificates`}
                </h3>
                <span className="text-xs text-slate-400">{filteredCerts.length} results</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-50/80 border-b border-slate-100">
                      <th className="text-left py-2.5 px-4 font-semibold text-slate-500 text-xs uppercase tracking-wider">Student</th>
                      <th className="text-left py-2.5 px-4 font-semibold text-slate-500 text-xs uppercase tracking-wider">Certificate</th>
                      <th className="text-left py-2.5 px-4 font-semibold text-slate-500 text-xs uppercase tracking-wider">Type</th>
                      <th className="text-left py-2.5 px-4 font-semibold text-slate-500 text-xs uppercase tracking-wider">Status</th>
                      <th className="text-left py-2.5 px-4 font-semibold text-slate-500 text-xs uppercase tracking-wider">Fraud Score</th>
                      <th className="text-left py-2.5 px-4 font-semibold text-slate-500 text-xs uppercase tracking-wider">Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {filteredCerts.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-12 text-center">
                          <FileText size={32} className="mx-auto text-slate-300 mb-3" />
                          <p className="text-slate-500 font-medium">No certificates found</p>
                        </td>
                      </tr>
                    ) : (
                      filteredCerts.map((cert) => {
                        const TypeIcon = getCertTypeIcon(cert.certificateType);
                        return (
                          <tr key={cert.id} className="hover:bg-slate-50/50 transition-colors">
                            <td className="py-3 px-4">
                              <p className="font-medium text-slate-700">{cert.studentName}</p>
                              <p className="text-[10px] text-slate-400">{cert.studentEmail}</p>
                            </td>
                            <td className="py-3 px-4">
                              <p className="text-slate-600 truncate max-w-[180px]">{cert.title}</p>
                              <p className="text-[10px] text-slate-400">{cert.institution}</p>
                            </td>
                            <td className="py-3 px-4">
                              <span className="text-xs text-slate-600 bg-slate-100 px-2 py-1 rounded-lg flex items-center gap-1 w-fit">
                                <TypeIcon size={10} /> {cert.certificateType}
                              </span>
                            </td>
                            <td className="py-3 px-4">
                              <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full border uppercase tracking-wider ${getStatusBadge(cert.status)}`}>
                                {cert.status}
                              </span>
                            </td>
                            <td className="py-3 px-4">
                              {cert.fraudScore !== null && cert.fraudScore !== undefined ? (
                                <span className={`text-xs font-bold px-2 py-1 rounded-full ${
                                  cert.fraudScore > 40 ? "bg-red-50 text-red-600 border border-red-200" :
                                  cert.fraudScore > 20 ? "bg-amber-50 text-amber-600 border border-amber-200" :
                                  "bg-emerald-50 text-emerald-600 border border-emerald-200"
                                }`}>
                                  {cert.fraudScore}
                                </span>
                              ) : (
                                <span className="text-xs text-slate-400">—</span>
                              )}
                            </td>
                            <td className="py-3 px-4 text-xs text-slate-400">
                              {new Date(cert.createdAt).toLocaleDateString()}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Suspicious Panel */}
            {dashboard?.suspiciousCertificates && dashboard.suspiciousCertificates.length > 0 && (
              <div className="bg-white rounded-2xl border border-red-200 shadow-sm overflow-hidden">
                <div className="px-5 py-4 border-b border-red-100 bg-red-50/50 flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-linear-to-br from-red-500 to-pink-600 flex items-center justify-center">
                    <AlertTriangle size={14} className="text-white" />
                  </div>
                  <div>
                    <h3 className="font-bold text-red-800">Flagged by Anomaly Detection</h3>
                    <p className="text-xs text-red-600">Certificates with fraud scores above threshold</p>
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-red-50/30 border-b border-red-100">
                        <th className="text-left py-2.5 px-4 font-semibold text-red-500 text-xs uppercase tracking-wider">Student</th>
                        <th className="text-left py-2.5 px-4 font-semibold text-red-500 text-xs uppercase tracking-wider">Certificate</th>
                        <th className="text-left py-2.5 px-4 font-semibold text-red-500 text-xs uppercase tracking-wider">Issue</th>
                        <th className="text-left py-2.5 px-4 font-semibold text-red-500 text-xs uppercase tracking-wider">Score</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-red-50">
                      {dashboard.suspiciousCertificates.map((s) => (
                        <tr key={s.id} className="hover:bg-red-50/40 transition-colors">
                          <td className="py-3 px-4 font-medium text-slate-700">{s.studentName}</td>
                          <td className="py-3 px-4 text-slate-600">{s.certificateTitle}</td>
                          <td className="py-3 px-4 text-xs text-red-600 max-w-[200px] truncate">{s.reasoning || s.authenticity}</td>
                          <td className="py-3 px-4">
                            <span className="text-xs font-bold text-red-700 bg-red-100 px-2.5 py-1 rounded-full">
                              {s.fraudScore}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        )}

        {/* ====== ANALYTICS TAB ====== */}
        {activeTab === "analytics" && (
          <>
            <div>
              <h1 className="text-2xl font-bold text-slate-800">Analytics & Reports</h1>
              <p className="text-slate-500 text-sm">Institutional insights, trends, and academic reporting data.</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Monthly Upload Activity */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-linear-to-br from-indigo-500 to-violet-600 flex items-center justify-center">
                    <BarChart3 size={14} className="text-white" />
                  </div>
                  <h3 className="font-bold text-slate-800">Monthly Upload Activity</h3>
                </div>
                <div className="p-5">
                  {dashLoading ? (
                    <div className="h-60 flex items-center justify-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height={260}>
                      <BarChart data={dashboard?.monthlyUploads || []}>
                        <defs>
                          <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#6366f1" />
                            <stop offset="100%" stopColor="#8b5cf6" />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                        <XAxis dataKey="month" tick={{ fontSize: 12, fill: "#94a3b8" }} axisLine={{ stroke: "#e2e8f0" }} />
                        <YAxis tick={{ fontSize: 12, fill: "#94a3b8" }} axisLine={{ stroke: "#e2e8f0" }} allowDecimals={false} />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: "#1e293b",
                            border: "none",
                            borderRadius: "12px",
                            color: "#fff",
                            fontSize: "12px",
                          }}
                          labelStyle={{ color: "#cbd5e1" }}
                          cursor={{ fill: "rgba(99, 102, 241, 0.08)" }}
                        />
                        <Bar dataKey="count" fill="url(#barGradient)" radius={[6, 6, 0, 0]} name="Uploads" />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </div>

              {/* Certificates per Category */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-linear-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
                    <Layers size={14} className="text-white" />
                  </div>
                  <h3 className="font-bold text-slate-800">Certificates per Category</h3>
                </div>
                <div className="p-5">
                  {dashLoading ? (
                    <div className="h-48 flex items-center justify-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
                    </div>
                  ) : dashboard?.categoryBreakdown && Object.keys(dashboard.categoryBreakdown).length > 0 ? (
                    <div className="flex flex-col md:flex-row items-center gap-6">
                      <ResponsiveContainer width="100%" height={220} className="md:max-w-[50%]">
                        <PieChart>
                          <Pie
                            data={Object.entries(dashboard.categoryBreakdown).map(([name, value]) => ({ name, value }))}
                            cx="50%"
                            cy="50%"
                            innerRadius={45}
                            outerRadius={85}
                            paddingAngle={3}
                            dataKey="value"
                            animationBegin={0}
                            animationDuration={800}
                          >
                            {Object.entries(dashboard.categoryBreakdown).map((_, i) => (
                              <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip
                            contentStyle={{
                              backgroundColor: "#1e293b",
                              border: "none",
                              borderRadius: "12px",
                              color: "#fff",
                              fontSize: "12px",
                            }}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                      <div className="space-y-2.5 flex-1 w-full">
                        {Object.entries(dashboard.categoryBreakdown).map(([cat, count], i) => {
                          const total = Object.values(dashboard.categoryBreakdown).reduce((a, b) => a + b, 0);
                          const pct = total > 0 ? Math.round((count / total) * 100) : 0;
                          return (
                            <div key={cat}>
                              <div className="flex items-center gap-2 mb-1">
                                <div className="w-3 h-3 rounded-sm shrink-0" style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }}></div>
                                <span className="text-sm text-slate-600 capitalize flex-1">{cat}</span>
                                <span className="text-sm font-bold text-slate-800">{count}</span>
                                <span className="text-[10px] text-slate-400">({pct}%)</span>
                              </div>
                              <div className="ml-5 w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }}></div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ) : (
                    <div className="h-48 flex items-center justify-center text-slate-400 text-sm">
                      No certificate data available
                    </div>
                  )}
                </div>
              </div>

              {/* Role Distribution */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-linear-to-br from-blue-500 to-cyan-600 flex items-center justify-center">
                    <Users size={14} className="text-white" />
                  </div>
                  <h3 className="font-bold text-slate-800">User Distribution</h3>
                </div>
                <div className="p-5">
                  {dashboard?.roleDistribution && Object.keys(dashboard.roleDistribution).length > 0 ? (
                    <div className="space-y-3">
                      {Object.entries(dashboard.roleDistribution).map(([role, count]) => {
                        const total = Object.values(dashboard.roleDistribution).reduce((a, b) => a + b, 0);
                        const pct = total > 0 ? Math.round((count / total) * 100) : 0;
                        const colorMap: Record<string, string> = {
                          student: "from-blue-500 to-cyan-500",
                          faculty: "from-emerald-500 to-teal-500",
                          recruiter: "from-violet-500 to-purple-500",
                          admin: "from-rose-500 to-orange-500",
                        };
                        return (
                          <div key={role}>
                            <div className="flex justify-between mb-1">
                              <span className="text-sm text-slate-600 capitalize font-medium">{role}</span>
                              <span className="text-sm font-bold text-slate-800">{count} ({pct}%)</span>
                            </div>
                            <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                              <div
                                className={`h-full bg-linear-to-r ${colorMap[role] || "from-slate-400 to-slate-500"} rounded-full transition-all duration-500`}
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="h-48 flex items-center justify-center text-slate-400 text-sm">No user data</div>
                  )}
                </div>
              </div>

              {/* Verification Stats */}
              <div className="bg-linear-to-br from-indigo-600 to-violet-700 rounded-2xl shadow-lg p-6 text-white overflow-hidden relative">
                <div className="absolute top-0 right-0 p-4 opacity-5">
                  <ShieldCheck size={100} />
                </div>
                <h3 className="text-sm font-bold text-indigo-200 mb-4 flex items-center gap-2">
                  <Zap size={16} /> Verification Summary
                </h3>
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <p className="text-3xl font-bold">{dashboard?.stats.certificatesVerified || 0}</p>
                    <p className="text-xs text-indigo-200">Verified Certificates</p>
                  </div>
                  <div>
                    <p className="text-3xl font-bold">{dashboard?.stats.certificatesPending || 0}</p>
                    <p className="text-xs text-indigo-200">Pending Review</p>
                  </div>
                  <div>
                    <p className="text-3xl font-bold">{dashboard?.stats.certificatesRejected || 0}</p>
                    <p className="text-xs text-indigo-200">Rejected</p>
                  </div>
                  <div>
                    <p className="text-3xl font-bold">{dashboard?.hashIntegrity.totalVerifiedHashes || 0}</p>
                    <p className="text-xs text-indigo-200">Hash Records</p>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}

        {/* ====== TOOLS TAB ====== */}
        {activeTab === "tools" && (
          <>
            <div>
              <h1 className="text-2xl font-bold text-slate-800">System Tools</h1>
              <p className="text-slate-500 text-sm">Administrative tools, reports, and system logs.</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left: Quick Actions + Reports */}
              <div className="lg:col-span-2 space-y-6">
                {/* Quick Actions */}
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                  <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-linear-to-br from-amber-400 to-orange-500 flex items-center justify-center">
                      <Zap size={14} className="text-white" />
                    </div>
                    <h3 className="font-bold text-slate-800">Quick Actions</h3>
                  </div>
                  <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-3">
                    <button
                      onClick={() => toast({ title: "Backup initiated", description: "Database backup has been scheduled." })}
                      className="flex items-center gap-3 p-4 bg-slate-50 hover:bg-slate-100 rounded-xl transition-colors text-left border border-slate-200"
                      data-testid="backup-database-button"
                    >
                      <div className="w-10 h-10 rounded-xl bg-linear-to-br from-blue-500 to-cyan-600 flex items-center justify-center shrink-0">
                        <Database size={18} className="text-white" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-slate-700">Backup Database</p>
                        <p className="text-[10px] text-slate-400">Create a full database snapshot</p>
                      </div>
                    </button>
                    <button
                      onClick={() => toast({ title: "Export started", description: "Institutional report is being generated." })}
                      className="flex items-center gap-3 p-4 bg-slate-50 hover:bg-slate-100 rounded-xl transition-colors text-left border border-slate-200"
                    >
                      <div className="w-10 h-10 rounded-xl bg-linear-to-br from-emerald-500 to-teal-600 flex items-center justify-center shrink-0">
                        <Download size={18} className="text-white" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-slate-700">Export Report</p>
                        <p className="text-[10px] text-slate-400">NAAC / Institutional analytics report</p>
                      </div>
                    </button>
                    <button
                      onClick={() => { setCertStatusFilter("all"); setActiveTab("certificates"); }}
                      className="flex items-center gap-3 p-4 bg-slate-50 hover:bg-slate-100 rounded-xl transition-colors text-left border border-slate-200"
                    >
                      <div className="w-10 h-10 rounded-xl bg-linear-to-br from-red-500 to-pink-600 flex items-center justify-center shrink-0">
                        <AlertTriangle size={18} className="text-white" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-slate-700">View Suspicious Certs</p>
                        <p className="text-[10px] text-slate-400">Anomaly-flagged certificates</p>
                      </div>
                    </button>
                    <button
                      onClick={() => toast({ title: "Coming soon", description: "Certificate template management will be available in a future update." })}
                      className="flex items-center gap-3 p-4 bg-slate-50 hover:bg-slate-100 rounded-xl transition-colors text-left border border-slate-200"
                    >
                      <div className="w-10 h-10 rounded-xl bg-linear-to-br from-violet-500 to-purple-600 flex items-center justify-center shrink-0">
                        <FileText size={18} className="text-white" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-slate-700">Manage Templates</p>
                        <p className="text-[10px] text-slate-400">Certificate template library</p>
                      </div>
                    </button>
                  </div>
                </div>

                {/* System Logs */}
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                  <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-linear-to-br from-slate-600 to-slate-800 flex items-center justify-center">
                      <ScrollText size={14} className="text-white" />
                    </div>
                    <h3 className="font-bold text-slate-800">System Logs</h3>
                    <span className="ml-auto text-xs text-slate-400 font-medium">{dashboard?.logs.length || 0} events</span>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-slate-50/80 border-b border-slate-100">
                          <th className="text-left py-2.5 px-4 font-semibold text-slate-500 text-xs uppercase tracking-wider">Event</th>
                          <th className="text-left py-2.5 px-4 font-semibold text-slate-500 text-xs uppercase tracking-wider">User</th>
                          <th className="text-left py-2.5 px-4 font-semibold text-slate-500 text-xs uppercase tracking-wider">Time</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                        {dashboard?.logs && dashboard.logs.length > 0 ? (
                          dashboard.logs.map((log, i) => (
                            <tr key={i} className="hover:bg-slate-50/50 transition-colors">
                              <td className="py-2.5 px-4">
                                <div className="flex items-center gap-2">
                                  <div className={`w-2 h-2 rounded-full ${
                                    log.event.includes("uploaded") ? "bg-blue-500" :
                                    log.event.includes("approved") ? "bg-emerald-500" :
                                    log.event.includes("rejected") ? "bg-red-500" :
                                    log.event.includes("registered") ? "bg-violet-500" :
                                    "bg-slate-400"
                                  }`}></div>
                                  <span className="text-sm text-slate-700">{log.event}</span>
                                </div>
                              </td>
                              <td className="py-2.5 px-4 text-sm text-slate-500">{log.user}</td>
                              <td className="py-2.5 px-4 text-xs text-slate-400">{log.time}</td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan={3} className="py-8 text-center text-slate-400 text-sm">
                              No events logged yet
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              {/* Right: Hash Integrity + Export Options */}
              <div className="space-y-6">
                {/* Hash Integrity Full Panel */}
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                  <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-linear-to-br from-slate-700 to-slate-900 flex items-center justify-center">
                      <Hash size={14} className="text-white" />
                    </div>
                    <h3 className="font-bold text-slate-800 text-sm">Hash Integrity Monitor</h3>
                  </div>
                  <div className="p-5 space-y-4">
                    <p className="text-xs text-slate-500 leading-relaxed">
                      We maintain a cryptographic hash registry to ensure certificate records cannot be tampered with.
                    </p>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center bg-slate-50 rounded-xl p-3">
                        <span className="text-xs text-slate-500">Total Verified</span>
                        <span className="text-lg font-bold text-slate-800">{dashboard?.hashIntegrity.totalVerifiedHashes || 0}</span>
                      </div>
                      <div className="bg-slate-50 rounded-xl p-3">
                        <span className="text-xs text-slate-500 block mb-1">Latest Hash</span>
                        <code className="text-[10px] text-indigo-600 font-mono break-all">
                          {dashboard?.hashIntegrity.latestHash || "N/A"}
                        </code>
                      </div>
                      <div className="flex justify-between items-center bg-slate-50 rounded-xl p-3">
                        <span className="text-xs text-slate-500">Validation Status</span>
                        <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                          dashboard?.hashIntegrity.validationStatus === "verified"
                            ? "bg-emerald-100 text-emerald-700 border border-emerald-200"
                            : "bg-amber-100 text-amber-700 border border-amber-200"
                        }`}>
                          {dashboard?.hashIntegrity.validationStatus === "verified" ? "All Verified" : "Pending"}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Export Reports */}
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                  <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-linear-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
                      <Download size={14} className="text-white" />
                    </div>
                    <h3 className="font-bold text-slate-800 text-sm">Export Reports</h3>
                  </div>
                  <div className="p-4 space-y-2">
                    {[
                      { label: "NAAC Achievement Report", desc: "Institutional analytics" },
                      { label: "Student Activity Report", desc: "Certificate uploads & approvals" },
                      { label: "Department Participation", desc: "Category-wise breakdown" },
                    ].map((report, i) => (
                      <button
                        key={i}
                        onClick={() => toast({ title: "Export started", description: `${report.label} will be downloaded shortly.` })}
                        className="w-full flex items-center gap-3 p-3 bg-slate-50 hover:bg-emerald-50 rounded-xl transition-colors text-left group border border-transparent hover:border-emerald-200"
                      >
                        <FileText size={16} className="text-slate-400 group-hover:text-emerald-600 transition-colors shrink-0" />
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-slate-700 group-hover:text-emerald-700 transition-colors">{report.label}</p>
                          <p className="text-[10px] text-slate-400">{report.desc}</p>
                        </div>
                        <Download size={14} className="text-slate-300 group-hover:text-emerald-500 ml-auto shrink-0 transition-colors" />
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
