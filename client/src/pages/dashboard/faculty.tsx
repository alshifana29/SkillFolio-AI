import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { CertificateCard } from "@/components/dashboard/certificate-card";
import { QRScanner } from "@/components/ui/qr-scanner";
import { getAuthHeaders } from "@/lib/auth";
import type { Certificate } from "@shared/schema";
import { 
  Clock, 
  CheckCircle, 
  AlertTriangle, 
  Users,
  Bell,
  LogOut,
  Presentation,
  QrCode as QRCodeIcon,
  AlertCircle,
  Shield,
  Zap,
  Activity,
  ArrowUpRight,
  FileSearch,
  ScanLine,
  Filter,
} from "lucide-react";

export default function FacultyDashboard() {
  const { user, logout } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedFilter, setSelectedFilter] = useState<string>("pending");
  const [showQRScanner, setShowQRScanner] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectingCertId, setRejectingCertId] = useState<string | null>(null);
  const [fixSuggestions, setFixSuggestions] = useState("");

  // Fetch certificates for review
  const { data: certificates = [], isLoading } = useQuery({
    queryKey: ["/api/certificates", selectedFilter],
    queryFn: async () => {
      const response = await fetch(`/api/certificates?status=${selectedFilter}`, {
        headers: getAuthHeaders(),
      });
      if (!response.ok) throw new Error("Failed to fetch certificates");
      return response.json();
    },
  });

  // Review certificate mutation
  const reviewMutation = useMutation({
    mutationFn: async ({ id, status, reviewNotes }: { id: string; status: string; reviewNotes?: string }) => {
      const response = await fetch(`/api/certificates/${id}/review`, {
        method: "PATCH",
        headers: {
          ...getAuthHeaders(),
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status, reviewNotes }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Review failed");
      }

      return response.json();
    },
    onSuccess: (_, variables) => {
      toast({
        title: "Certificate reviewed",
        description: `Certificate has been ${variables.status}.`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/certificates"] });
    },
    onError: (error: any) => {
      toast({
        title: "Review failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleApprove = (id: string) => {
    reviewMutation.mutate({ id, status: "approved", reviewNotes: "Approved by faculty" });
  };

  const handleRejectClick = (id: string) => {
    setRejectingCertId(id);
    setShowRejectModal(true);
  };

  const handleRejectConfirm = () => {
    if (!rejectingCertId) return;
    const notes = fixSuggestions 
      ? `Rejected - Fix Suggestions: ${fixSuggestions}` 
      : "Rejected - requires additional verification";
    reviewMutation.mutate({ id: rejectingCertId, status: "rejected", reviewNotes: notes });
    setShowRejectModal(false);
    setRejectingCertId(null);
    setFixSuggestions("");
  };

  // Calculate stats
  const pendingCount = certificates.filter((cert: Certificate) => cert.status === 'pending').length;
  const approvedToday = 12; // This would come from an API
  const flaggedCount = certificates.filter((cert: Certificate) => 
    cert.aiAnalysis?.includes('⚠️')
  ).length;
  const totalStudents = 156; // This would come from an API

  return (
    <div className="min-h-screen bg-linear-to-b from-slate-50 to-white dark:from-slate-950 dark:to-slate-900">
      {/* Navigation */}
      <nav className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-lg border-b border-slate-200 dark:border-slate-800 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-linear-to-br from-emerald-500 to-teal-600 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-200 dark:shadow-emerald-900/30">
                <Presentation className="h-5 w-5 text-white" />
              </div>
              <div>
                <span className="font-bold text-foreground text-base tracking-tight">SkillFolio</span>
                <span className="text-xs text-muted-foreground ml-1.5 hidden sm:inline">Faculty</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" className="relative rounded-xl">
                <Bell className="h-4 w-4" />
                {pendingCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 rounded-full text-[10px] text-white flex items-center justify-center font-bold animate-pulse">
                    {pendingCount}
                  </span>
                )}
              </Button>
              <div className="h-8 w-px bg-border mx-1"></div>
              <div className="flex items-center gap-2.5 pl-1">
                <div className="w-8 h-8 bg-linear-to-br from-emerald-400 to-teal-500 rounded-full flex items-center justify-center text-white text-xs font-bold shadow-sm">
                  {user?.firstName?.[0]}{user?.lastName?.[0]}
                </div>
                <div className="hidden sm:block">
                  <span className="text-sm font-semibold text-foreground block leading-tight">
                    {user?.firstName} {user?.lastName}
                  </span>
                  <span className="text-[11px] text-muted-foreground leading-tight">Faculty Reviewer</span>
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
        {/* Welcome + Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-foreground tracking-tight">
            Welcome back, {user?.firstName}!
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Review, verify, and manage student certificate submissions.
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[
            { title: "Pending Reviews", value: pendingCount, icon: Clock, gradient: "from-amber-500 to-yellow-500", bg: "bg-amber-50 dark:bg-amber-950/30" },
            { title: "Approved Today", value: approvedToday, icon: CheckCircle, gradient: "from-emerald-500 to-green-500", bg: "bg-emerald-50 dark:bg-emerald-950/30" },
            { title: "AI Flags", value: flaggedCount, icon: AlertTriangle, gradient: "from-red-500 to-rose-500", bg: "bg-red-50 dark:bg-red-950/30" },
            { title: "Total Students", value: totalStudents, icon: Users, gradient: "from-blue-500 to-indigo-500", bg: "bg-blue-50 dark:bg-blue-950/30" },
          ].map((stat) => (
            <Card key={stat.title} className={`${stat.bg} border-0 shadow-sm hover:shadow-md transition-shadow duration-200`}>
              <CardContent className="p-4 sm:p-5">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl bg-linear-to-br ${stat.gradient} flex items-center justify-center shadow-sm`}>
                    <stat.icon className="h-5 w-5 text-white" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-2xl font-bold text-foreground leading-none">
                      {stat.value}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1 truncate">
                      {stat.title}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Review Queue */}
          <div className="lg:col-span-2">
            <Card className="border-0 shadow-md bg-white dark:bg-slate-900 rounded-2xl overflow-hidden">
              <CardHeader className="bg-linear-to-r from-emerald-500/5 to-teal-500/5 dark:from-emerald-500/10 dark:to-teal-500/10 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center justify-between flex-wrap gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-linear-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
                      <FileSearch className="h-4 w-4 text-white" />
                    </div>
                    <div>
                      <CardTitle className="text-base">Certificate Review Queue</CardTitle>
                      <p className="text-xs text-muted-foreground mt-0.5">{certificates.length} certificate{certificates.length !== 1 ? 's' : ''} shown</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="flex items-center gap-1 mr-1">
                      <Filter className="h-3.5 w-3.5 text-muted-foreground" />
                    </div>
                    {[
                      { key: "pending", label: "Pending", color: "from-amber-500 to-yellow-500" },
                      { key: "approved", label: "Approved", color: "from-emerald-500 to-green-500" },
                      { key: "rejected", label: "Rejected", color: "from-red-500 to-rose-500" },
                    ].map((filter) => (
                      <Button
                        key={filter.key}
                        variant={selectedFilter === filter.key ? "default" : "outline"}
                        size="sm"
                        className={`rounded-lg text-xs h-8 ${
                          selectedFilter === filter.key
                            ? `bg-linear-to-r ${filter.color} text-white border-0 shadow-sm`
                            : "border-slate-200 dark:border-slate-700"
                        }`}
                        onClick={() => setSelectedFilter(filter.key)}
                        data-testid={`filter-${filter.key}-button`}
                      >
                        {filter.label}
                      </Button>
                    ))}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-5">
                {isLoading ? (
                  <div className="space-y-4">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="animate-pulse">
                        <div className="h-32 bg-muted rounded-xl"></div>
                      </div>
                    ))}
                  </div>
                ) : certificates.length === 0 ? (
                  <div className="text-center py-14">
                    <div className="w-16 h-16 rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 flex items-center justify-center mx-auto mb-4">
                      <CheckCircle className="h-8 w-8 text-emerald-400" />
                    </div>
                    <p className="font-medium text-foreground text-base">No certificates to review</p>
                    <p className="text-sm text-muted-foreground mt-1">All caught up! Check back later.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {certificates.map((certificate: Certificate) => (
                      <CertificateCard
                        key={certificate.id}
                        certificate={certificate}
                        showActions={selectedFilter === "pending"}
                        onApprove={handleApprove}
                        onReject={handleRejectClick}
                      />
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Faculty Tools */}
          <div className="space-y-6">
            {/* QR Scanner */}
            <Card className="border-0 shadow-md bg-white dark:bg-slate-900 rounded-2xl overflow-hidden">
              <CardHeader className="bg-linear-to-r from-violet-500/5 to-purple-500/5 dark:from-violet-500/10 dark:to-purple-500/10 border-b border-slate-100 dark:border-slate-800 pb-3">
                <CardTitle className="flex items-center gap-2.5 text-sm font-semibold">
                  <div className="w-7 h-7 rounded-lg bg-linear-to-br from-violet-500 to-purple-600 flex items-center justify-center">
                    <ScanLine className="h-3.5 w-3.5 text-white" />
                  </div>
                  QR Verification
                </CardTitle>
              </CardHeader>
              <CardContent className="p-5">
                <p className="text-sm text-muted-foreground mb-4">
                  Scan QR codes from printed certificates to instantly verify authenticity.
                </p>
                <Button 
                  className="w-full rounded-xl bg-linear-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700 text-white shadow-sm h-10"
                  onClick={() => setShowQRScanner(true)}
                  data-testid="open-qr-scanner-button"
                >
                  <QRCodeIcon className="h-4 w-4 mr-2" />
                  Scan QR Code
                </Button>
              </CardContent>
            </Card>

            {/* AI Assistant */}
            <Card className="border-0 shadow-md bg-white dark:bg-slate-900 rounded-2xl overflow-hidden">
              <CardHeader className="bg-linear-to-r from-blue-500/5 to-cyan-500/5 dark:from-blue-500/10 dark:to-cyan-500/10 border-b border-slate-100 dark:border-slate-800 pb-3">
                <CardTitle className="flex items-center gap-2.5 text-sm font-semibold">
                  <div className="w-7 h-7 rounded-lg bg-linear-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
                    <Zap className="h-3.5 w-3.5 text-white" />
                  </div>
                  AI Assistant
                </CardTitle>
              </CardHeader>
              <CardContent className="p-5">
                <div className="space-y-4">
                  <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-xs font-semibold uppercase tracking-wider text-blue-700 dark:text-blue-300">Current Batch Analysis</p>
                      <Badge className="bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300 rounded-lg text-[11px]">{pendingCount} items</Badge>
                    </div>
                    <div className="w-full bg-blue-200/60 dark:bg-blue-800/30 rounded-full h-2 mt-3">
                      <div className="bg-linear-to-r from-blue-500 to-cyan-500 h-2 rounded-full w-3/4 transition-all duration-500"></div>
                    </div>
                    <p className="text-xs text-blue-600 dark:text-blue-400 mt-2">Processing {pendingCount} certificates...</p>
                  </div>
                  
                  <Button className="w-full rounded-xl bg-linear-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white shadow-sm h-10" data-testid="run-batch-analysis-button">
                    <Zap className="h-4 w-4 mr-2" />
                    Run Batch Analysis
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Today's Activity */}
            <Card className="border-0 shadow-md bg-white dark:bg-slate-900 rounded-2xl">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                  <Activity className="h-4 w-4 text-emerald-500" />
                  Today's Activity
                </CardTitle>
              </CardHeader>
              <CardContent className="p-5 pt-0">
                <div className="space-y-3">
                  {[
                    { label: "Reviews Completed", value: "12/15", color: "text-foreground" },
                    { label: "Approval Rate", value: "89%", color: "text-emerald-600 dark:text-emerald-400" },
                    { label: "Avg. Review Time", value: "3.2 min", color: "text-foreground" },
                  ].map((item) => (
                    <div key={item.label} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl">
                      <span className="text-sm text-muted-foreground">{item.label}</span>
                      <span className={`text-sm font-bold ${item.color}`}>{item.value}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Recent Actions */}
            <Card className="border-0 shadow-md bg-white dark:bg-slate-900 rounded-2xl">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                  <Shield className="h-4 w-4 text-indigo-500" />
                  Recent Actions
                </CardTitle>
              </CardHeader>
              <CardContent className="p-5 pt-0">
                <div className="space-y-2.5">
                  {[
                    { color: "bg-emerald-500", text: "Approved certificate for Alex Wong" },
                    { color: "bg-red-500", text: "Rejected fraudulent document" },
                    { color: "bg-blue-500", text: "Reviewed AI analysis for batch #23" },
                  ].map((action, i) => (
                    <div key={i} className="flex items-start gap-3 p-2.5 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/50 transition">
                      <div className={`w-2 h-2 ${action.color} rounded-full mt-1.5 shrink-0`}></div>
                      <span className="text-sm text-muted-foreground leading-snug">{action.text}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* QR Scanner */}
      <QRScanner open={showQRScanner} onClose={() => setShowQRScanner(false)} />

      {/* Reject with Fix Suggestions Modal */}
      <Dialog open={showRejectModal} onOpenChange={setShowRejectModal}>
        <DialogContent className="rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-red-100 dark:bg-red-950/30 flex items-center justify-center">
                <AlertCircle className="h-4 w-4 text-red-600" />
              </div>
              Reject Certificate
            </DialogTitle>
            <DialogDescription>
              Provide constructive feedback and fix suggestions for the student
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="fixSuggestions" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Fix Suggestions</Label>
              <textarea
                id="fixSuggestions"
                placeholder="e.g., Please re-upload with a clearer scan, ensure all text is visible, use original document..."
                className="w-full px-3 py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 resize-none text-sm bg-slate-50 dark:bg-slate-800"
                rows={4}
                value={fixSuggestions}
                onChange={(e) => setFixSuggestions(e.target.value)}
                data-testid="fix-suggestions-textarea"
              />
              <p className="text-xs text-muted-foreground">
                Personalized feedback helps students understand what to fix
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setShowRejectModal(false);
                  setFixSuggestions("");
                }}
                className="flex-1 rounded-xl"
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleRejectConfirm}
                className="flex-1 rounded-xl"
                data-testid="confirm-reject-button"
              >
                Reject & Send Feedback
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
