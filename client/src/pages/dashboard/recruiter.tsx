// import { useState } from "react";
// import { useQuery } from "@tanstack/react-query";
// import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
// import { Button } from "@/components/ui/button";
// import { Input } from "@/components/ui/input";
// import { Label } from "@/components/ui/label";
// import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
// import { Badge } from "@/components/ui/badge";
// import { useAuth } from "@/hooks/use-auth";
// import { getAuthHeaders } from "@/lib/auth";
// import { 
//   Search, 
//   QrCode, 
//   CheckCircle, 
//   Bell,
//   LogOut,
//   User,
//   Heart,
//   ExternalLink
// } from "lucide-react";
// import { useLocation } from "wouter";

// interface Student {
//   id: string;
//   firstName: string;
//   lastName: string;
//   email: string;
//   certificatesCount: number;
//   portfolioViews: number;
//   status: 'available' | 'seeking' | 'hired';
// }

// const savedCandidates = [
//   { id: "4", name: "David Kim", degree: "PhD Computer Science, MIT", certs: 15 },
//   { id: "5", name: "Lisa Chen", degree: "MBA Finance, Wharton", certs: 9 },
//   { id: "6", name: "Robert Taylor", degree: "MS Data Science, Carnegie Mellon", certs: 11 }
// ];

// const recentVerifications = [
//   { name: "Alex Wong", institution: "MIT", time: "2 min ago" },
//   { name: "Maria Garcia", institution: "Stanford", time: "1 hour ago" }
// ];

// export default function RecruiterDashboard() {
//   const { user, logout } = useAuth();
//   const [, setLocation] = useLocation();
//   const [searchKeywords, setSearchKeywords] = useState("");
//   const [fieldOfStudy, setFieldOfStudy] = useState("all");
//   const [graduationYear, setGraduationYear] = useState("all");

//   const { data: students, isLoading, isError } = useQuery<Student[]>({
//     queryKey: ['students'],
//     queryFn: async () => {
//       const response = await fetch('/api/students', {
//         headers: getAuthHeaders(),
//       });
//       if (!response.ok) {
//         throw new Error('Failed to fetch students');
//       }
//       return response.json();
//     },
//   });

//   const getStatusColor = (status: string) => {
//     switch (status) {
//       case 'available': return 'bg-blue-100 text-blue-800';
//       case 'seeking': return 'bg-yellow-100 text-yellow-800';
//       case 'hired': return 'bg-gray-100 text-gray-800';
//       default: return 'bg-gray-100 text-gray-800';
//     }
//   };

//   return (
//     <div className="min-h-screen bg-background">
//       {/* Navigation */}
//       <nav className="bg-card border-b border-border sticky top-0 z-40">
//         <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
//           <div className="flex justify-between items-center py-4">
//             <div className="flex items-center space-x-3">
//               <div className="w-8 h-8 bg-purple-600 rounded-lg flex items-center justify-center">
//                 <Search className="text-white" />
//               </div>
//               <span className="font-semibold text-foreground">Recruiter Dashboard</span>
//             </div>
//             <div className="flex items-center space-x-4">
//               <Button variant="ghost" size="sm">
//                 <Bell className="h-4 w-4" />
//               </Button>
//               <div className="flex items-center space-x-2">
//                 <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
//                   <User className="text-purple-600 text-sm" />
//                 </div>
//                 <span className="text-sm font-medium text-foreground">
//                   {user?.firstName} {user?.lastName}
//                 </span>
//               </div>
//               <Button variant="ghost" size="sm" onClick={logout} data-testid="logout-button">
//                 <LogOut className="h-4 w-4" />
//               </Button>
//             </div>
//           </div>
//         </div>
//       </nav>

//       <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
//         <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
//           {/* Search and Results */}
//           <div className="lg:col-span-2">
//             <Card>
//               <CardHeader>
//                 <CardTitle>Candidate Search</CardTitle>
//               </CardHeader>
//               <CardContent>
//                 {/* Search Filters */}
//                 <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
//                   <div>
//                     <Label htmlFor="keywords">Keywords</Label>
//                     <Input
//                       id="keywords"
//                       placeholder="Skills, degree, institution..."
//                       value={searchKeywords}
//                       onChange={(e) => setSearchKeywords(e.target.value)}
//                       data-testid="search-keywords-input"
//                     />
//                   </div>
//                   <div>
//                     <Label htmlFor="field">Field of Study</Label>
//                     <Select value={fieldOfStudy} onValueChange={setFieldOfStudy}>
//                       <SelectTrigger data-testid="field-select">
//                         <SelectValue placeholder="All Fields" />
//                       </SelectTrigger>
//                       <SelectContent>
//                         <SelectItem value="all">All Fields</SelectItem>
//                         <SelectItem value="computer-science">Computer Science</SelectItem>
//                         <SelectItem value="engineering">Engineering</SelectItem>
//                         <SelectItem value="business">Business</SelectItem>
//                         <SelectItem value="psychology">Psychology</SelectItem>
//                       </SelectContent>
//                     </Select>
//                   </div>
//                   <div>
//                     <Label htmlFor="year">Graduation Year</Label>
//                     <Select value={graduationYear} onValueChange={setGraduationYear}>
//                       <SelectTrigger data-testid="year-select">
//                         <SelectValue placeholder="Any Year" />
//                       </SelectTrigger>
//                       <SelectContent>
//                         <SelectItem value="all">Any Year</SelectItem>
//                         <SelectItem value="2024">2024</SelectItem>
//                         <SelectItem value="2023">2023</SelectItem>
//                         <SelectItem value="2022">2022</SelectItem>
//                         <SelectItem value="2021">2021</SelectItem>
//                       </SelectContent>
//                     </Select>
//                   </div>
//                 </div>
                
//                 <Button className="w-full mb-6" data-testid="search-candidates-button">
//                   Search Candidates
//                 </Button>

//                 {/* Search Results */}
//                 <div className="space-y-4">
//                   {isLoading && <p>Loading students...</p>}
//                   {isError && <p>Error fetching students. Please try again later.</p>}
//                   {students && students.map((student) => (
//                     <div
//                       key={student.id}
//                       className="border border-border rounded-lg p-4 hover:bg-muted/30 transition-colors cursor-pointer"
//                       data-testid={`student-card-${student.id}`}
//                     >
//                       <div className="flex items-start justify-between">
//                         <div className="flex items-center space-x-3">
//                           <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
//                             <User className="text-blue-600" />
//                           </div>
//                           <div>
//                             <h4 className="font-medium text-foreground">
//                               {student.firstName} {student.lastName}
//                             </h4>
//                             <p className="text-sm text-muted-foreground">{student.email}</p>
//                             <p className="text-sm text-muted-foreground">
//                               {student.certificatesCount} verified certificates • Portfolio views: {student.portfolioViews}
//                             </p>
//                           </div>
//                         </div>
//                         <div className="flex flex-col items-end space-y-2">
//                           <div className="flex space-x-2">
//                             <Badge className="bg-green-100 text-green-800">Verified</Badge>
//                             <Badge className={getStatusColor(student.status)}>
//                               {student.status.charAt(0).toUpperCase() + student.status.slice(1)}
//                             </Badge>
//                           </div>
//                           <Button 
//                             variant="link" 
//                             size="sm" 
//                             className="text-primary hover:underline"
//                             data-testid={`view-portfolio-${student.id}`}
//                             onClick={() => setLocation(`/portfolio/${student.id}`)}
//                           >
//                             View Portfolio
//                           </Button>
//                         </div>
//                       </div>
//                     </div>
//                   ))}
//                 </div>
//               </CardContent>
//             </Card>
//           </div>

//           {/* QR Scanner */}
//           <div className="space-y-6">
//             <Card>
//               <CardHeader>
//                 <CardTitle>QR Code Scanner</CardTitle>
//               </CardHeader>
//               <CardContent>
//                 <div className="bg-muted/30 rounded-lg p-8 text-center mb-4">
//                   <QrCode className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
//                   <p className="text-muted-foreground mb-2">Scan certificate QR code</p>
//                   <p className="text-sm text-muted-foreground">for instant verification</p>
//                 </div>
//                 <Button className="w-full" data-testid="open-camera-button">
//                   Open Camera
//                 </Button>
//               </CardContent>
//             </Card>

//             {/* Recent Verifications */}
//             <Card>
//               <CardHeader>
//                 <CardTitle>Recent Verifications</CardTitle>
//               </CardHeader>
//               <CardContent>
//                 <div className="space-y-3">
//                   {recentVerifications.map((verification, index) => (
//                     <div
//                       key={index}
//                       className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg"
//                     >
//                       <div>
//                         <p className="text-sm font-medium text-green-800">
//                           {verification.name} - {verification.institution}
//                         </p>
//                         <p className="text-xs text-green-600">Verified {verification.time}</p>
//                       </div>
//                       <CheckCircle className="text-green-600" />
//                     </div>
//                   ))}
//                 </div>
//               </CardContent>
//             </Card>
//           </div>
//         </div>

//         {/* Saved Candidates */}
//         <Card>
//           <CardHeader>
//             <div className="flex items-center justify-between">
//               <CardTitle>Saved Candidates</CardTitle>
//               <Button variant="link" className="text-primary hover:underline text-sm">
//                 Manage Saved
//               </Button>
//             </div>
//           </CardHeader>
//           <CardContent>
//             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
//               {savedCandidates.map((candidate) => (
//                 <div key={candidate.id} className="border border-border rounded-lg p-4">
//                   <div className="flex items-center justify-between mb-3">
//                     <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
//                       <User className="text-blue-600" />
//                     </div>
//                     <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-destructive">
//                       <Heart className="h-4 w-4" />
//                     </Button>
//                   </div>
//                   <h4 className="font-medium text-foreground mb-1">{candidate.name}</h4>
//                   <p className="text-sm text-muted-foreground mb-2">{candidate.degree}</p>
//                   <div className="flex items-center justify-between">
//                     <Badge className="bg-green-100 text-green-800">{candidate.certs} Certs</Badge>
//                     <Button variant="link" size="sm" data-testid={`view-saved-${candidate.id}`}>
//                       View
//                     </Button>
//                   </div>
//                 </div>
//               ))}
//             </div>
//           </CardContent>
//         </Card>
//       </div>
//     </div>
//   );
// }


import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { getAuthHeaders } from "@/lib/auth";
import { useLocation } from "wouter";
import { 
  Search, 
  Bell, 
  User, 
  LogOut, 
  QrCode, 
  Camera, 
  CheckCircle, 
  TrendingUp, 
  Filter, 
  Heart, 
  Briefcase, 
  Award, 
  ExternalLink,
  ShieldCheck,
  MapPin,
  Mail,
  ChevronDown,
  MoreHorizontal
} from "lucide-react";

// Keep your existing interfaces
interface Student {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  certificatesCount: number;
  portfolioViews: number;
  status: 'available' | 'seeking' | 'hired';
}

// Keep your existing static data
const savedCandidates = [
  { id: "4", name: "David Kim", degree: "PhD Computer Science, MIT", certs: 15 },
  { id: "5", name: "Lisa Chen", degree: "MBA Finance, Wharton", certs: 9 },
  { id: "6", name: "Robert Taylor", degree: "MS Data Science, Carnegie Mellon", certs: 11 }
];

const recentVerifications = [
  { name: "Alex Wong", institution: "MIT", time: "2 min ago" },
  { name: "Maria Garcia", institution: "Stanford", time: "1 hour ago" }
];

export default function RecruiterDashboard() {
  // --- Existing Logic & Hooks ---
  const { user, logout } = useAuth();
  const [, setLocation] = useLocation();
  const [searchKeywords, setSearchKeywords] = useState("");
  const [fieldOfStudy, setFieldOfStudy] = useState("all");
  const [graduationYear, setGraduationYear] = useState("all");

  const [submittedFilters, setSubmittedFilters] = useState({
    keywords: "",
    field: "all",
    year: "all",
  });

  const { data: students, isLoading, isError, refetch } = useQuery<Student[]>({
    queryKey: ['students', submittedFilters],
    queryFn: async () => {
      const queryParams = new URLSearchParams();
      if (submittedFilters.keywords) {
        queryParams.append('keywords', submittedFilters.keywords);
      }
      if (submittedFilters.field !== 'all') {
        queryParams.append('field', submittedFilters.field);
      }
      if (submittedFilters.year !== 'all') {
        queryParams.append('year', submittedFilters.year);
      }
      
      const response = await fetch(`/api/students?${queryParams.toString()}`, {
        headers: getAuthHeaders(),
      });

      if (!response.ok) {
        throw new Error('Failed to fetch students');
      }
      return response.json();
    },
  });

  const handleSearch = () => {
    setSubmittedFilters({
      keywords: searchKeywords,
      field: fieldOfStudy,
      year: graduationYear,
    });
  };

  // --- UI Logic (Scanner Animation) ---
  const [isScanning, setIsScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const [showScannerModal, setShowScannerModal] = useState(false);

  const handleScanClick = () => {
    setShowScannerModal(true);
    setIsScanning(true);
    setScanProgress(0);
  };

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isScanning && scanProgress < 100) {
      interval = setInterval(() => {
        setScanProgress(prev => {
          if (prev >= 100) {
            clearInterval(interval);
            setTimeout(() => {
              setIsScanning(false);
              setShowScannerModal(false);
              // alert("Scan Complete"); // Optional feedback
            }, 500);
            return 100;
          }
          return prev + 5;
        });
      }, 100);
    }
    return () => clearInterval(interval);
  }, [isScanning, scanProgress]);

  // --- Helper for UI Styling ---
  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'available': return 'bg-blue-50 text-blue-700 border-blue-100';
      case 'seeking': return 'bg-amber-50 text-amber-700 border-amber-100';
      case 'hired': return 'bg-slate-50 text-slate-600 border-slate-100';
      default: return 'bg-slate-50 text-slate-600 border-slate-100';
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
      
      {/* --- Top Navigation --- */}
      <nav className="bg-white border-b border-slate-200 sticky top-0 z-20 px-4 md:px-8 h-16 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-2">
          <div className="bg-indigo-600 p-1.5 rounded-lg">
            <ShieldCheck className="w-6 h-6 text-white" />
          </div>
          <span className="text-xl font-bold bg-gradient-to-r from-indigo-700 to-indigo-500 bg-clip-text text-transparent">
            Recruiter Dashboard
          </span>
        </div>

        <div className="flex items-center gap-6">
          <div className="hidden md:flex items-center gap-1 text-sm font-medium text-slate-600 hover:text-indigo-600 cursor-pointer transition-colors">
            <TrendingUp size={16} />
            <span>Market Insights</span>
          </div>
          <div className="h-6 w-px bg-slate-200 hidden md:block"></div>
          <button className="relative p-2 text-slate-500 hover:bg-slate-100 rounded-full transition-colors">
            <Bell size={20} />
            {/* Notification Dot */}
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border border-white"></span>
          </button>
          
          <div className="flex items-center gap-3 pl-2 border-l border-slate-200">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-semibold text-slate-700">
                {user?.firstName || 'Recruiter'} {user?.lastName || 'User'}
              </p>
              <p className="text-xs text-slate-500">Talent Acquisition</p>
            </div>
            <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 border-2 border-indigo-50">
              <User size={20} />
            </div>
            <button 
              onClick={() => logout()} 
              data-testid="logout-button"
              className="text-slate-400 hover:text-red-500 cursor-pointer ml-2 transition-colors"
            >
              <LogOut size={18} />
            </button>
          </div>
        </div>
      </nav>

      {/* --- Main Content --- */}
      <main className="max-w-7xl mx-auto p-4 md:p-8 space-y-8">
        
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Candidate Search</h1>
            <p className="text-slate-500">Find and verify top talent with blockchain-backed credentials.</p>
          </div>
          <div className="flex gap-2">
            <button className="px-4 py-2 bg-white border border-slate-300 rounded-lg text-slate-600 text-sm font-medium hover:bg-slate-50 transition-colors shadow-sm">
              Export Report
            </button>
            <button className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors shadow-md flex items-center gap-2">
              <Briefcase size={16} /> Post New Job
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* --- LEFT COLUMN: Search & Results --- */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Search Bar & Filters */}
            <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                
                {/* Keywords Input */}
                <div className="md:col-span-6 relative">
                  <label htmlFor="keywords" className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1 block">Keywords</label>
                  <div className="relative">
                    <Search className="absolute left-3 top-2.5 text-slate-400" size={18} />
                    <input 
                      id="keywords"
                      type="text" 
                      placeholder="Skills, degree, institution..." 
                      className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-sm"
                      value={searchKeywords}
                      onChange={(e) => setSearchKeywords(e.target.value)}
                      data-testid="search-keywords-input"
                    />
                  </div>
                </div>

                {/* Field of Study Select */}
                <div className="md:col-span-3">
                  <label htmlFor="field" className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1 block">Field</label>
                  <div className="relative">
                    <select 
                      id="field"
                      className="w-full pl-3 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-sm appearance-none cursor-pointer"
                      value={fieldOfStudy}
                      onChange={(e) => setFieldOfStudy(e.target.value)}
                      data-testid="field-select"
                    >
                      <option value="all">All Fields</option>
                      <option value="computer-science">Computer Science</option>
                      <option value="engineering">Engineering</option>
                      <option value="business">Business</option>
                      <option value="psychology">Psychology</option>
                    </select>
                    <ChevronDown className="absolute right-3 top-2.5 text-slate-400 pointer-events-none" size={16} />
                  </div>
                </div>

                {/* Graduation Year Select */}
                <div className="md:col-span-3">
                   <label htmlFor="year" className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1 block">Grad Year</label>
                   <div className="relative">
                    <select 
                      id="year"
                      className="w-full pl-3 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-sm appearance-none cursor-pointer"
                      value={graduationYear}
                      onChange={(e) => setGraduationYear(e.target.value)}
                      data-testid="year-select"
                    >
                      <option value="all">Any Year</option>
                      <option value="2024">2024</option>
                      <option value="2023">2023</option>
                      <option value="2022">2022</option>
                      <option value="2021">2021</option>
                    </select>
                    <ChevronDown className="absolute right-3 top-2.5 text-slate-400 pointer-events-none" size={16} />
                   </div>
                </div>

              </div>
              
              <button 
                className="w-full py-2 bg-indigo-50 text-indigo-700 font-medium rounded-lg text-sm hover:bg-indigo-100 transition-colors disabled:opacity-50"
                data-testid="search-candidates-button"
                onClick={handleSearch}
                disabled={isLoading}
              >
                 {isLoading ? 'Searching...' : 'Update Search Results'}
              </button>
            </div>

            {/* Results List */}
            <div className="space-y-4">
              <div className="flex justify-between items-center px-1">
                <span className="text-sm font-medium text-slate-500">
                  {students ? `${students.length} Candidates Found` : 'Searching...'}
                </span>
                <button className="text-sm text-indigo-600 font-medium flex items-center gap-1 hover:underline">
                   Advanced Filters <Filter size={14} />
                </button>
              </div>

              {isLoading && <div className="text-center py-10 text-slate-500">Loading candidates...</div>}
              {isError && <div className="text-center py-10 text-red-500">Failed to load candidates.</div>}

              {students && students.map((student) => (
                <div key={student.id} className="bg-white p-5 rounded-xl shadow-sm border border-slate-200 hover:shadow-md transition-shadow group relative" data-testid={`student-card-${student.id}`}>
                  <div className="flex flex-col sm:flex-row gap-4">
                    {/* Avatar (Generated for UI consistency) */}
                    <div className="flex-shrink-0">
                      <img 
                        src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${student.firstName}${student.lastName}`} 
                        alt="Avatar" 
                        className="w-16 h-16 rounded-full bg-slate-100 object-cover border border-slate-100" 
                      />
                    </div>

                    {/* Content */}
                    <div className="flex-grow">
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="text-lg font-bold text-slate-800">{student.firstName} {student.lastName}</h3>
                            <span className="bg-green-100 text-green-700 text-[10px] px-1.5 py-0.5 rounded-full font-bold flex items-center gap-0.5 border border-green-200">
                                <ShieldCheck size={10} /> VERIFIED
                            </span>
                          </div>
                          <div className="flex items-center gap-2 text-sm text-slate-500 mt-1">
                             <Mail size={12} /> {student.email}
                             {/* Placeholder logic for missing data */}
                             <span className="text-slate-300">•</span>
                             <MapPin size={12} /> Remote / Available
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-2">
                           <span className={`text-xs font-bold px-2 py-1 rounded-md border ${getStatusStyle(student.status)}`}>
                             {student.status.charAt(0).toUpperCase() + student.status.slice(1)}
                           </span>
                        </div>
                      </div>

                      {/* Skills placeholders to match UI style (optional) */}
                      <div className="mt-4 flex flex-wrap gap-2">
                           <span className="text-xs font-medium bg-slate-100 text-slate-600 px-2 py-1 rounded border border-slate-200">
                             Skills Verified
                           </span>
                           <span className="text-xs font-medium bg-slate-100 text-slate-600 px-2 py-1 rounded border border-slate-200">
                             Full History
                           </span>
                      </div>

                      <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between text-sm">
                        <div className="flex gap-4 text-slate-600">
                          <span className="flex items-center gap-1.5 font-medium">
                            <Award size={16} className="text-orange-500" /> {student.certificatesCount} Verified Certs
                          </span>
                          <span className="flex items-center gap-1.5">
                            <ExternalLink size={16} className="text-slate-400" /> {student.portfolioViews} Views
                          </span>
                        </div>
                        <div className="flex gap-3">
                           <button className="p-2 rounded-full text-slate-400 hover:bg-slate-50 transition-colors">
                             <Heart size={18} />
                           </button>
                           <button 
                             onClick={() => setLocation(`/portfolio/${student.id}`)}
                             data-testid={`view-portfolio-${student.id}`}
                             className="text-indigo-600 font-medium hover:text-indigo-800 transition-colors"
                           >
                             View Portfolio &rarr;
                           </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* --- RIGHT COLUMN: Tools & Widgets --- */}
          <div className="space-y-6">
            
            {/* QR Scanner Widget */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
               <div className="p-5 border-b border-slate-100">
                 <h3 className="font-bold text-slate-800 flex items-center gap-2">
                   <QrCode size={20} className="text-indigo-600" /> Quick Verify
                 </h3>
               </div>
               <div className="p-6 flex flex-col items-center justify-center text-center">
                 {showScannerModal ? (
                   <div className="w-full aspect-square bg-black rounded-lg relative overflow-hidden flex flex-col items-center justify-center">
                     <div className="absolute inset-0 opacity-20" 
                          style={{backgroundImage: 'radial-gradient(#ffffff 1px, transparent 1px)', backgroundSize: '10px 10px'}}>
                     </div>
                     <div className="absolute top-0 left-0 w-full h-1 bg-green-500 shadow-[0_0_15px_rgba(34,197,94,0.8)]" 
                          style={{top: `${scanProgress}%`, transition: 'top 0.1s linear'}}></div>
                     <p className="text-white text-xs font-mono relative z-10 bg-black/50 px-2 py-1 rounded">Scanning... {scanProgress}%</p>
                   </div>
                 ) : (
                   <div className="mb-4 relative group cursor-pointer" onClick={handleScanClick}>
                     <div className="w-32 h-32 border-2 border-dashed border-slate-300 rounded-xl flex items-center justify-center bg-slate-50 group-hover:border-indigo-400 transition-colors">
                       <Camera size={32} className="text-slate-400 group-hover:text-indigo-500 transition-colors" />
                     </div>
                     {/* Scanner Corners */}
                     <div className="absolute -top-1 -left-1 w-4 h-4 border-t-2 border-l-2 border-indigo-600 rounded-tl-lg"></div>
                     <div className="absolute -top-1 -right-1 w-4 h-4 border-t-2 border-r-2 border-indigo-600 rounded-tr-lg"></div>
                     <div className="absolute -bottom-1 -left-1 w-4 h-4 border-b-2 border-l-2 border-indigo-600 rounded-bl-lg"></div>
                     <div className="absolute -bottom-1 -right-1 w-4 h-4 border-b-2 border-r-2 border-indigo-600 rounded-br-lg"></div>
                   </div>
                 )}
                 <p className="text-sm text-slate-500 mb-4">Scan certificate QR code for instant verification.</p>
                 <button 
                  onClick={handleScanClick}
                  disabled={isScanning}
                  data-testid="open-camera-button"
                  className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium transition-colors disabled:bg-slate-300">
                   {isScanning ? "Processing..." : "Open Camera"}
                 </button>
               </div>
            </div>

            {/* Recent Verifications */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200">
              <div className="p-4 border-b border-slate-100 flex justify-between items-center">
                <h3 className="font-bold text-slate-800 text-sm">Recent Verifications</h3>
                <button className="text-xs text-indigo-600 hover:underline">View All</button>
              </div>
              <div className="divide-y divide-slate-100">
                {recentVerifications.map((item, index) => (
                  <div key={index} className="p-4 flex items-center gap-3 hover:bg-slate-50 transition-colors">
                    <div className="w-2 h-2 rounded-full bg-green-500"></div>
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-slate-700">{item.name}</p>
                      <p className="text-xs text-slate-500 flex items-center gap-1">
                        via {item.institution}
                      </p>
                    </div>
                    <div className="text-right">
                       <span className="bg-green-50 text-green-700 border border-green-100 p-1 rounded-full block">
                         <CheckCircle size={14} />
                       </span>
                       <span className="text-[10px] text-slate-400 mt-1 block">{item.time}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Analytics Widget (New UI Feature) */}
            <div className="bg-gradient-to-br from-indigo-600 to-violet-700 rounded-xl shadow-lg p-5 text-white relative overflow-hidden">
               <div className="absolute top-0 right-0 p-4 opacity-10">
                 <TrendingUp size={80} />
               </div>
               <h3 className="text-sm font-medium text-indigo-100 mb-1">Weekly Verification</h3>
               <p className="text-3xl font-bold mb-4">1,284</p>
               <div className="flex items-center gap-2 text-xs font-medium bg-white/10 w-fit px-2 py-1 rounded">
                 <TrendingUp size={12} /> +12% vs last week
               </div>
            </div>

          </div>
        </div>

        {/* --- BOTTOM SECTION: Saved Candidates --- */}
        <section>
          <div className="flex items-center justify-between mb-4">
             <h2 className="text-lg font-bold text-slate-800">Saved Candidates</h2>
             <button className="text-sm text-indigo-600 font-medium">Manage Saved</button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {savedCandidates.map((candidate) => (
              <div key={candidate.id} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow flex items-start justify-between">
                <div className="flex items-center gap-3">
                  {/* Generated Avatar */}
                  <img 
                    src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${candidate.name}`} 
                    alt={candidate.name} 
                    className="w-10 h-10 rounded-full bg-slate-100" 
                  />
                  <div>
                    <h4 className="text-sm font-bold text-slate-800">{candidate.name}</h4>
                    <p className="text-xs text-slate-500 line-clamp-1">{candidate.degree}</p>
                    <div className="flex items-center gap-2 mt-1">
                       <span className="text-[10px] bg-green-50 text-green-700 px-1.5 py-0.5 rounded border border-green-100 font-medium">
                         {candidate.certs} Certs
                       </span>
                    </div>
                  </div>
                </div>
                <button 
                  className="text-slate-400 hover:text-indigo-600"
                  data-testid={`view-saved-${candidate.id}`}
                >
                  <MoreHorizontal size={16} />
                </button>
              </div>
            ))}
            
            {/* Add New Placeholder */}
            <div className="border-2 border-dashed border-slate-200 rounded-xl flex items-center justify-center p-4 hover:border-indigo-300 hover:bg-indigo-50 transition-all cursor-pointer group">
               <div className="text-center">
                 <div className="w-8 h-8 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-2 text-slate-400 group-hover:bg-indigo-100 group-hover:text-indigo-600 transition-colors">
                   <Search size={14} />
                 </div>
                 <p className="text-xs font-medium text-slate-500 group-hover:text-indigo-600">Browse More</p>
               </div>
            </div>
          </div>
        </section>

      </main>
      
      {/* CSS for scanning animation */}
      <style>{`
        @keyframes scan {
          0% { top: 0%; opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 1; }
          100% { top: 100%; opacity: 0; }
        }
      `}</style>
    </div>
  );
}