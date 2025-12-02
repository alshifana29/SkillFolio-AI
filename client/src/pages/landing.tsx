import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { GraduationCap, Shield, Bot, QrCode, Users, Search, Settings } from "lucide-react";

export default function Landing() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
                <GraduationCap className="text-primary-foreground text-xl" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-foreground">AcademicFolioChain</h1>
                <p className="text-sm text-muted-foreground">Blockchain Certificate Verification</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <Link href="/login">
                <Button variant="ghost" data-testid="header-signin-button">
                  Sign In
                </Button>
              </Link>
              <Link href="/register">
                <Button data-testid="header-getstarted-button">
                  Get Started
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative py-20 lg:py-32">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-background to-secondary/20"></div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-4xl lg:text-6xl font-bold text-foreground mb-6">
              Secure Your Academic
              <span className="text-primary"> Achievements</span>
            </h1>
            <p className="text-xl text-muted-foreground mb-8 max-w-3xl mx-auto">
              Revolutionary blockchain-based certificate verification system that ensures the authenticity of academic credentials while building professional portfolios.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/register">
                <Button size="lg" className="text-lg px-8 py-4" data-testid="hero-start-building-button">
                  Start Building Portfolio
                </Button>
              </Link>
              <Link href="/portfolio/demo">
                <Button variant="outline" size="lg" className="text-lg px-8 py-4" data-testid="hero-view-demo-button">
                  View Demo
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Role Selection Cards */}
      <section className="py-16 bg-muted/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-foreground mb-4">Choose Your Role</h2>
            <p className="text-lg text-muted-foreground">Access tailored features based on your academic position</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Student Role */}
            <Link href="/register?role=student">
              <Card className="hover:shadow-lg transition-all cursor-pointer" data-testid="role-card-student">
                <CardContent className="p-6">
                  <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
                    <GraduationCap className="text-blue-600 text-xl" />
                  </div>
                  <h3 className="text-xl font-semibold text-foreground mb-2">Student</h3>
                  <p className="text-muted-foreground mb-4">Upload certificates, build portfolio, share achievements</p>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>• Certificate upload</li>
                    <li>• Portfolio builder</li>
                    <li>• Public sharing</li>
                  </ul>
                </CardContent>
              </Card>
            </Link>

            {/* Faculty Role */}
            <Link href="/register?role=faculty">
              <Card className="hover:shadow-lg transition-all cursor-pointer" data-testid="role-card-faculty">
                <CardContent className="p-6">
                  <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-4">
                    <Users className="text-green-600 text-xl" />
                  </div>
                  <h3 className="text-xl font-semibold text-foreground mb-2">Faculty</h3>
                  <p className="text-muted-foreground mb-4">Review submissions, approve certificates, monitor students</p>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>• Review submissions</li>
                    <li>• AI-assisted verification</li>
                    <li>• Approval workflow</li>
                  </ul>
                </CardContent>
              </Card>
            </Link>

            {/* Recruiter Role */}
            <Link href="/register?role=recruiter">
              <Card className="hover:shadow-lg transition-all cursor-pointer" data-testid="role-card-recruiter">
                <CardContent className="p-6">
                  <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4">
                    <Search className="text-purple-600 text-xl" />
                  </div>
                  <h3 className="text-xl font-semibold text-foreground mb-2">Recruiter</h3>
                  <p className="text-muted-foreground mb-4">Search candidates, verify credentials, scan QR codes</p>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>• Candidate search</li>
                    <li>• QR verification</li>
                    <li>• Portfolio access</li>
                  </ul>
                </CardContent>
              </Card>
            </Link>

            {/* Admin Role */}
            <Link href="/register?role=admin">
              <Card className="hover:shadow-lg transition-all cursor-pointer" data-testid="role-card-admin">
                <CardContent className="p-6">
                  <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center mb-4">
                    <Settings className="text-red-600 text-xl" />
                  </div>
                  <h3 className="text-xl font-semibold text-foreground mb-2">Admin</h3>
                  <p className="text-muted-foreground mb-4">System monitoring, user management, analytics</p>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>• System analytics</li>
                    <li>• User management</li>
                    <li>• Blockchain audit</li>
                  </ul>
                </CardContent>
              </Card>
            </Link>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-foreground mb-4">Why AcademicFolioChain?</h2>
            <p className="text-lg text-muted-foreground">Cutting-edge technology meets academic integrity</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <Shield className="text-primary text-2xl" />
              </div>
              <h3 className="text-xl font-semibold text-foreground mb-2">Blockchain Security</h3>
              <p className="text-muted-foreground">Immutable certificate records ensure authenticity and prevent fraud</p>
            </div>
            
            <div className="text-center">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <Bot className="text-primary text-2xl" />
              </div>
              <h3 className="text-xl font-semibold text-foreground mb-2">AI-Powered Verification</h3>
              <p className="text-muted-foreground">Advanced OCR and anomaly detection for automated fraud prevention</p>
            </div>
            
            <div className="text-center">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <QrCode className="text-primary text-2xl" />
              </div>
              <h3 className="text-xl font-semibold text-foreground mb-2">QR Code Verification</h3>
              <p className="text-muted-foreground">Instant certificate verification through secure QR code scanning</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
