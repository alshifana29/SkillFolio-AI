import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/use-auth";
import { StatsCard } from "@/components/dashboard/stats-card";
import { getAuthHeaders } from "@/lib/auth";
import { 
  Users, 
  Tag, 
  Link, 
  Heart,
  Bell,
  LogOut,
  User,
  Settings,
  Database,
  FolderSync,
  BarChart3,
  AlertCircle,
  CheckCircle,
  Clock
} from "lucide-react";

interface AnalyticsData {
  users: {
    total: number;
    students: number;
    faculty: number;
    recruiters: number;
    admins: number;
  };
  certificates: {
    total: number;
    pending: number;
    approved: number;
    rejected: number;
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

export default function AdminDashboard() {
  const { user, logout } = useAuth();
  const [userSearchTerm, setUserSearchTerm] = useState("");
  const [selectedRole, setSelectedRole] = useState("all");
  const [selectedStatus, setSelectedStatus] = useState("all");

  // Fetch analytics data
  const { data: analytics, isLoading: analyticsLoading } = useQuery<AnalyticsData>({
    queryKey: ["/api/analytics/overview"],
    queryFn: async () => {
      const response = await fetch("/api/analytics/overview", {
        headers: getAuthHeaders(),
      });
      if (!response.ok) throw new Error("Failed to fetch analytics");
      return response.json();
    },
  });

  // Fetch users data
  const { data: users = [], isLoading: usersLoading } = useQuery<UserData[]>({
    queryKey: ["/api/admin/users"],
    queryFn: async () => {
      const response = await fetch("/api/admin/users", {
        headers: getAuthHeaders(),
      });
      if (!response.ok) throw new Error("Failed to fetch users");
      return response.json();
    },
  });

  // Filter users based on search and filters
  const filteredUsers = users.filter(u => {
    const matchesSearch = userSearchTerm === "" || 
      u.email.toLowerCase().includes(userSearchTerm.toLowerCase()) ||
      `${u.firstName} ${u.lastName}`.toLowerCase().includes(userSearchTerm.toLowerCase());
    
    const matchesRole = selectedRole === "all" || u.role === selectedRole;
    const matchesStatus = selectedStatus === "all" || 
      (selectedStatus === "active" && u.isActive) ||
      (selectedStatus === "inactive" && !u.isActive);
    
    return matchesSearch && matchesRole && matchesStatus;
  });

  const getStatusColor = (isActive: boolean) => {
    return isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800';
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'student': return 'bg-blue-100 text-blue-800';
      case 'faculty': return 'bg-green-100 text-green-800';
      case 'recruiter': return 'bg-purple-100 text-purple-800';
      case 'admin': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="bg-card border-b border-border sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-red-600 rounded-lg flex items-center justify-center">
                <Settings className="text-white" />
              </div>
              <span className="font-semibold text-foreground">Admin Dashboard</span>
            </div>
            <div className="flex items-center space-x-4">
              <Button variant="ghost" size="sm">
                <Bell className="h-4 w-4" />
              </Button>
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center">
                  <User className="text-red-600 text-sm" />
                </div>
                <span className="text-sm font-medium text-foreground">
                  Administrator
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
        {/* System Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {analyticsLoading ? (
            <>
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="animate-pulse">
                  <div className="h-32 bg-muted rounded-xl"></div>
                </div>
              ))}
            </>
          ) : (
            <>
              <StatsCard
                title="Total Users"
                value={analytics?.users.total || 0}
                icon={Users}
                iconColor="text-blue-600"
                iconBgColor="bg-blue-100"
                trend="+12% this month"
                trendColor="text-green-600"
              />
              <StatsCard
                title="Certificates"
                value={analytics?.certificates.total || 0}
                icon={Tag}
                iconColor="text-green-600"
                iconBgColor="bg-green-100"
                trend="+8% this month"
                trendColor="text-green-600"
              />
              <StatsCard
                title="Blockchain TXs"
                value={analytics?.certificates.approved || 0}
                icon={Link}
                iconColor="text-purple-600"
                iconBgColor="bg-purple-100"
                trend="+15% this month"
                trendColor="text-green-600"
              />
              <StatsCard
                title="System Health"
                value="99.8%"
                icon={Heart}
                iconColor="text-green-600"
                iconBgColor="bg-green-100"
                description="All systems operational"
              />
            </>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* User Management */}
          <div className="lg:col-span-2">
            <Card className="mb-6">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>User Management</CardTitle>
                  <Button data-testid="add-user-button">
                    Add User
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {/* Search and Filters */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                  <Input
                    placeholder="Search users..."
                    value={userSearchTerm}
                    onChange={(e) => setUserSearchTerm(e.target.value)}
                    data-testid="user-search-input"
                  />
                  <Select value={selectedRole} onValueChange={setSelectedRole}>
                    <SelectTrigger data-testid="role-filter-select">
                      <SelectValue placeholder="All Roles" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Roles</SelectItem>
                      <SelectItem value="student">Students</SelectItem>
                      <SelectItem value="faculty">Faculty</SelectItem>
                      <SelectItem value="recruiter">Recruiters</SelectItem>
                      <SelectItem value="admin">Admins</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                    <SelectTrigger data-testid="status-filter-select">
                      <SelectValue placeholder="All Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* User List */}
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-left py-3 px-4 font-medium text-muted-foreground">User</th>
                        <th className="text-left py-3 px-4 font-medium text-muted-foreground">Role</th>
                        <th className="text-left py-3 px-4 font-medium text-muted-foreground">Status</th>
                        <th className="text-left py-3 px-4 font-medium text-muted-foreground">Joined</th>
                        <th className="text-left py-3 px-4 font-medium text-muted-foreground">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {usersLoading ? (
                        <>
                          {[1, 2, 3].map((i) => (
                            <tr key={i} className="border-b border-border">
                              <td className="py-3 px-4">
                                <div className="animate-pulse flex items-center space-x-3">
                                  <div className="w-8 h-8 bg-muted rounded-full"></div>
                                  <div className="space-y-1">
                                    <div className="h-4 bg-muted rounded w-24"></div>
                                    <div className="h-3 bg-muted rounded w-32"></div>
                                  </div>
                                </div>
                              </td>
                              <td className="py-3 px-4">
                                <div className="h-6 bg-muted rounded w-16"></div>
                              </td>
                              <td className="py-3 px-4">
                                <div className="h-6 bg-muted rounded w-16"></div>
                              </td>
                              <td className="py-3 px-4">
                                <div className="h-4 bg-muted rounded w-20"></div>
                              </td>
                              <td className="py-3 px-4">
                                <div className="flex space-x-2">
                                  <div className="h-6 bg-muted rounded w-12"></div>
                                  <div className="h-6 bg-muted rounded w-16"></div>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </>
                      ) : filteredUsers.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="py-8 px-4 text-center text-muted-foreground">
                            No users found matching your criteria
                          </td>
                        </tr>
                      ) : (
                        filteredUsers.map((user) => (
                          <tr key={user.id} className="border-b border-border hover:bg-muted/30" data-testid={`user-row-${user.id}`}>
                            <td className="py-3 px-4">
                              <div className="flex items-center space-x-3">
                                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                                  <User className="text-blue-600 text-sm" />
                                </div>
                                <div>
                                  <p className="font-medium text-foreground">
                                    {user.firstName} {user.lastName}
                                  </p>
                                  <p className="text-sm text-muted-foreground">{user.email}</p>
                                </div>
                              </div>
                            </td>
                            <td className="py-3 px-4">
                              <Badge className={getRoleColor(user.role)}>
                                {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                              </Badge>
                            </td>
                            <td className="py-3 px-4">
                              <Badge className={getStatusColor(user.isActive)}>
                                {user.isActive ? 'Active' : 'Inactive'}
                              </Badge>
                            </td>
                            <td className="py-3 px-4 text-sm text-muted-foreground">
                              {new Date(user.createdAt).toLocaleDateString()}
                            </td>
                            <td className="py-3 px-4">
                              <div className="flex space-x-2">
                                <Button 
                                  variant="link" 
                                  size="sm" 
                                  className="text-primary hover:underline"
                                  data-testid={`edit-user-${user.id}`}
                                >
                                  Edit
                                </Button>
                                <Button 
                                  variant="link" 
                                  size="sm" 
                                  className="text-destructive hover:underline"
                                  data-testid={`suspend-user-${user.id}`}
                                >
                                  Suspend
                                </Button>
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>

            {/* Analytics Chart */}
            <Card>
              <CardHeader>
                <CardTitle>System Analytics</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64 bg-muted/30 rounded-lg flex items-center justify-center">
                  <div className="text-center">
                    <BarChart3 className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">Analytics chart would be displayed here</p>
                    <p className="text-sm text-muted-foreground">(Chart.js implementation)</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* System Tools */}
          <div className="space-y-6">
            {/* Blockchain Monitor */}
            <Card>
              <CardHeader>
                <CardTitle>Blockchain Monitor</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Block Height</span>
                    <span className="font-medium text-foreground">#{analytics?.certificates.approved || 0}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Hash Rate</span>
                    <span className="font-medium text-green-600">Stable</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Last Block</span>
                    <span className="font-medium text-foreground">2 min ago</span>
                  </div>
                  <Button className="w-full" data-testid="view-blockchain-button">
                    View Blockchain
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* System Alerts */}
            <Card>
              <CardHeader>
                <CardTitle>System Alerts</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                    <p className="text-sm font-medium text-green-800">System Backup Complete</p>
                    <p className="text-xs text-green-600">5 minutes ago</p>
                  </div>
                  
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                    <p className="text-sm font-medium text-yellow-800">High AI Processing Load</p>
                    <p className="text-xs text-yellow-600">1 hour ago</p>
                  </div>
                  
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                    <p className="text-sm font-medium text-blue-800">New Faculty User Registered</p>
                    <p className="text-xs text-blue-600">3 hours ago</p>
                  </div>
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
                  <Button 
                    variant="ghost" 
                    className="w-full justify-between p-3 bg-muted/50 hover:bg-muted"
                    data-testid="backup-database-button"
                  >
                    <div className="flex items-center space-x-3">
                      <Database className="text-primary" />
                      <span>Backup Database</span>
                    </div>
                    <span>→</span>
                  </Button>
                  
                  <Button 
                    variant="ghost" 
                    className="w-full justify-between p-3 bg-muted/50 hover:bg-muted"
                    data-testid="sync-blockchain-button"
                  >
                    <div className="flex items-center space-x-3">
                      <FolderSync className="text-primary" />
                      <span>FolderSync Blockchain</span>
                    </div>
                    <span>→</span>
                  </Button>
                  
                  <Button 
                    variant="ghost" 
                    className="w-full justify-between p-3 bg-muted/50 hover:bg-muted"
                    data-testid="system-settings-button"
                  >
                    <div className="flex items-center space-x-3">
                      <Settings className="text-primary" />
                      <span>System Settings</span>
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
