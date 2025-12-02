import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { FileUpload } from "@/components/ui/file-upload";
import { StatsCard } from "@/components/dashboard/stats-card";
import { CertificateCard } from "@/components/dashboard/certificate-card";
import { getAuthHeaders } from "@/lib/auth";
import { insertCertificateSchema, type InsertCertificate, type Certificate } from "@shared/schema";
import { 
  GraduationCap, 
  Tag as CertIcon, 
  CheckCircle, 
  Clock, 
  Eye,
  QrCode,
  Download,
  BarChart3,
  Bell,
  LogOut,
  User
} from "lucide-react";

export default function StudentDashboard() {
  const { user, logout } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<InsertCertificate>({
    resolver: zodResolver(insertCertificateSchema),
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

  // Tag upload mutation
  const uploadMutation = useMutation({
    mutationFn: async (data: { certificateData: InsertCertificate; file: File }) => {
      const formData = new FormData();
      formData.append("certificate", data.file);
      formData.append("title", data.certificateData.title);
      formData.append("institution", data.certificateData.institution);
      if (data.certificateData.description) {
        formData.append("description", data.certificateData.description);
      }

      const response = await fetch("/api/certificates", {
        method: "POST",
        headers: getAuthHeaders(),
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
                      <Label htmlFor="title">Tag Title</Label>
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
                  <Button variant="outline" className="w-full" data-testid="share-portfolio-button">
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
                  <Button variant="ghost" className="w-full justify-between" data-testid="generate-qr-button">
                    <div className="flex items-center space-x-3">
                      <QrCode className="text-primary" />
                      <span>Generate QR Code</span>
                    </div>
                    <span>→</span>
                  </Button>
                  
                  <Button variant="ghost" className="w-full justify-between" data-testid="download-portfolio-button">
                    <div className="flex items-center space-x-3">
                      <Download className="text-primary" />
                      <span>Download Portfolio</span>
                    </div>
                    <span>→</span>
                  </Button>
                  
                  <Button variant="ghost" className="w-full justify-between" data-testid="view-analytics-button">
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
    </div>
  );
}
