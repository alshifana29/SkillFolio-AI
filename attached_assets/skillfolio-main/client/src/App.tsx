import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/components/auth/auth-provider";
import { useAuth } from "@/hooks/use-auth";
import NotFound from "@/pages/not-found";
import Landing from "@/pages/landing";
import Login from "@/pages/auth/login";
import Register from "@/pages/auth/register";
import StudentDashboard from "@/pages/dashboard/student";
import FacultyDashboard from "@/pages/dashboard/faculty";
import RecruiterDashboard from "@/pages/dashboard/recruiter";
import AdminDashboard from "@/pages/dashboard/admin";
import Portfolio from "@/pages/portfolio/[id]";

function AuthenticatedRoutes() {
  const { user } = useAuth();

  if (!user) {
    return (
      <Switch>
        <Route path="/login" component={Login} />
        <Route path="/register" component={Register} />
        <Route path="/portfolio/:id" component={Portfolio} />
        <Route>
          <Landing />
        </Route>
      </Switch>
    );
  }

  return (
    <Switch>
      <Route path="/" component={() => <DashboardRouter user={user} />} />
      <Route path="/dashboard" component={() => <DashboardRouter user={user} />} />
      <Route path="/login" component={Login} />
      <Route path="/register" component={Register} />
      <Route path="/portfolio/:id" component={Portfolio} />
      <Route component={NotFound} />
    </Switch>
  );
}

function DashboardRouter({ user }: { user: any }) {
  switch (user.role) {
    case 'student':
      return <StudentDashboard />;
    case 'faculty':
      return <FacultyDashboard />;
    case 'recruiter':
      return <RecruiterDashboard />;
    case 'admin':
      return <AdminDashboard />;
    default:
      return <StudentDashboard />;
  }
}

function Router() {
  return (
    <AuthProvider>
      <AuthenticatedRoutes />
    </AuthProvider>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
