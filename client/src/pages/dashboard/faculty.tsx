import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { StatsCard } from "@/components/dashboard/stats-card";
import { CertificateCard } from "@/components/dashboard/certificate-card";
import { getAuthHeaders } from "@/lib/auth";
import type { Certificate } from "@shared/schema";
import { 
  Clock, 
  CheckCircle, 
  AlertTriangle, 
  Users,
  Bell,
  LogOut,
  User,
  Presentation
} from "lucide-react";

export default function FacultyDashboard() {
  const { user, logout } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedFilter, setSelectedFilter] = useState<string>("pending");

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

  const handleReject = (id: string) => {
    reviewMutation.mutate({ id, status: "rejected", reviewNotes: "Rejected - requires additional verification" });
  };

  // Calculate stats
  const pendingCount = certificates.filter((cert: Certificate) => cert.status === 'pending').length;
  const approvedToday = 12; // This would come from an API
  const flaggedCount = certificates.filter((cert: Certificate) => 
    cert.aiAnalysis?.includes('⚠️')
  ).length;
  const totalStudents = 156; // This would come from an API

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="bg-card border-b border-border sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-green-600 rounded-lg flex items-center justify-center">
                <Presentation className="text-white" />
              </div>
              <span className="font-semibold text-foreground">Faculty Dashboard</span>
            </div>
            <div className="flex items-center space-x-4">
              <Button variant="ghost" size="sm" className="relative">
                <Bell className="h-4 w-4" />
                {pendingCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full"></span>
                )}
              </Button>
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                  <User className="text-green-600 text-sm" />
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
            title="Pending Reviews"
            value={pendingCount}
            icon={Clock}
            iconColor="text-yellow-600"
            iconBgColor="bg-yellow-100"
          />
          <StatsCard
            title="Approved Today"
            value={approvedToday}
            icon={CheckCircle}
            iconColor="text-green-600"
            iconBgColor="bg-green-100"
          />
          <StatsCard
            title="AI Flags"
            value={flaggedCount}
            icon={AlertTriangle}
            iconColor="text-red-600"
            iconBgColor="bg-red-100"
          />
          <StatsCard
            title="Total Students"
            value={totalStudents}
            icon={Users}
            iconColor="text-blue-600"
            iconBgColor="bg-blue-100"
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Review Queue */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Certificate Review Queue</CardTitle>
                  <div className="flex items-center space-x-2">
                    <Button
                      variant={selectedFilter === "pending" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setSelectedFilter("pending")}
                      data-testid="filter-pending-button"
                    >
                      Pending
                    </Button>
                    <Button
                      variant={selectedFilter === "approved" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setSelectedFilter("approved")}
                      data-testid="filter-approved-button"
                    >
                      Approved
                    </Button>
                    <Button
                      variant={selectedFilter === "rejected" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setSelectedFilter("rejected")}
                      data-testid="filter-rejected-button"
                    >
                      Rejected
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="space-y-4">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="animate-pulse">
                        <div className="h-32 bg-muted rounded-lg"></div>
                      </div>
                    ))}
                  </div>
                ) : certificates.length === 0 ? (
                  <div className="text-center py-8">
                    <CheckCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">No certificates to review</p>
                    <p className="text-sm text-muted-foreground">All caught up!</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {certificates.map((certificate: Certificate) => (
                      <CertificateCard
                        key={certificate.id}
                        certificate={certificate}
                        showActions={selectedFilter === "pending"}
                        onApprove={handleApprove}
                        onReject={handleReject}
                      />
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Faculty Tools */}
          <div className="space-y-6">
            {/* AI Assistant */}
            <Card>
              <CardHeader>
                <CardTitle>AI Assistant</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                    <p className="text-sm text-blue-800 mb-2">Current Batch Analysis</p>
                    <p className="text-sm text-blue-700">Processing {pendingCount} certificates...</p>
                    <div className="w-full bg-blue-200 rounded-full h-2 mt-2">
                      <div className="bg-blue-600 h-2 rounded-full w-3/4"></div>
                    </div>
                  </div>
                  
                  <Button className="w-full" data-testid="run-batch-analysis-button">
                    Run Batch Analysis
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Today's Activity */}
            <Card>
              <CardHeader>
                <CardTitle>Today's Activity</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Reviews Completed</span>
                    <span className="font-medium text-foreground">12/15</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Approval Rate</span>
                    <span className="font-medium text-green-600">89%</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Avg. Review Time</span>
                    <span className="font-medium text-foreground">3.2 min</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Recent Actions */}
            <Card>
              <CardHeader>
                <CardTitle>Recent Actions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center space-x-3 text-sm">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span className="text-muted-foreground">Approved certificate for Alex Wong</span>
                  </div>
                  <div className="flex items-center space-x-3 text-sm">
                    <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                    <span className="text-muted-foreground">Rejected fraudulent document</span>
                  </div>
                  <div className="flex items-center space-x-3 text-sm">
                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                    <span className="text-muted-foreground">Reviewed AI analysis for batch #23</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
