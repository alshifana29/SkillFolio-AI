import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { getAuthHeaders } from "@/lib/auth";
import { useLocation } from "wouter";
import { QRScanner } from "@/components/ui/qr-scanner";
import { useToast } from "@/hooks/use-toast";
import {
  Search,
  Bell,
  User,
  LogOut,
  QrCode,
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
  MoreHorizontal,
  Bookmark,
  BookmarkCheck,
  MessageSquare,
  Send,
  X,
  StickyNote,
  Trash2,
  Users,
  BarChart3,
  Eye,
  GitCompare,
  Sparkles,
  FileText,
  Star,
  Clock,
  Plus,
} from "lucide-react";

// Types
interface Student {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  certificatesCount: number;
  portfolioViews: number;
  status: "available" | "seeking" | "hired";
  skills: string[];
  certificates: {
    id: string;
    title: string;
    institution: string;
    certificateType: string;
  }[];
}

interface ShortlistEntry {
  id: string;
  recruiterId: string;
  studentId: string;
  createdAt: string;
  student: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    certificatesCount: number;
    portfolioViews: number;
    skills: string[];
  };
}

interface RecruiterNote {
  id: string;
  recruiterId: string;
  studentId: string;
  note: string;
  createdAt: string;
}

interface DashboardStats {
  shortlistedCount: number;
  candidatesViewed: number;
  certificatesVerified: number;
  searchesPerformed: number;
  contactRequestsSent: number;
  recentVerifications: any[];
}

// Tab type
type TabType = "search" | "shortlist" | "compare" | "dashboard";

export default function RecruiterDashboard() {
  const { user, logout } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Tab state
  const [activeTab, setActiveTab] = useState<TabType>("search");

  // Search state
  const [searchKeywords, setSearchKeywords] = useState("");
  const [fieldOfStudy, setFieldOfStudy] = useState("all");
  const [graduationYear, setGraduationYear] = useState("all");
  const [submittedFilters, setSubmittedFilters] = useState({
    keywords: "",
    field: "all",
    year: "all",
  });

  // QR Scanner state
  const [showQRScanner, setShowQRScanner] = useState(false);

  // Notes modal state
  const [notesModal, setNotesModal] = useState<{ open: boolean; studentId: string; studentName: string }>({
    open: false,
    studentId: "",
    studentName: "",
  });
  const [newNote, setNewNote] = useState("");

  // Contact request modal state
  const [contactModal, setContactModal] = useState<{ open: boolean; studentId: string; studentName: string }>({
    open: false,
    studentId: "",
    studentName: "",
  });
  const [contactMessage, setContactMessage] = useState("");

  // Compare state
  const [compareIds, setCompareIds] = useState<string[]>([]);

  // ==================
  // DATA QUERIES
  // ==================

  // Search students
  const {
    data: students,
    isLoading,
    isError,
  } = useQuery<Student[]>({
    queryKey: ["students", submittedFilters],
    queryFn: async () => {
      const queryParams = new URLSearchParams();
      if (submittedFilters.keywords) queryParams.append("keywords", submittedFilters.keywords);
      if (submittedFilters.field !== "all") queryParams.append("field", submittedFilters.field);
      if (submittedFilters.year !== "all") queryParams.append("year", submittedFilters.year);

      const response = await fetch(`/api/students?${queryParams.toString()}`, {
        headers: getAuthHeaders(),
      });
      if (!response.ok) throw new Error("Failed to fetch students");
      return response.json();
    },
  });

  // Shortlist
  const { data: shortlist } = useQuery<ShortlistEntry[]>({
    queryKey: ["recruiter-shortlist"],
    queryFn: async () => {
      const res = await fetch("/api/recruiter/shortlist", { headers: getAuthHeaders() });
      if (!res.ok) throw new Error("Failed to fetch shortlist");
      return res.json();
    },
  });

  // Dashboard stats
  const { data: dashboardStats } = useQuery<DashboardStats>({
    queryKey: ["recruiter-dashboard"],
    queryFn: async () => {
      const res = await fetch("/api/recruiter/dashboard", { headers: getAuthHeaders() });
      if (!res.ok) throw new Error("Failed to fetch dashboard");
      return res.json();
    },
  });

  // Notes for current student
  const { data: studentNotes } = useQuery<RecruiterNote[]>({
    queryKey: ["recruiter-notes", notesModal.studentId],
    queryFn: async () => {
      if (!notesModal.studentId) return [];
      const res = await fetch(`/api/recruiter/notes/${notesModal.studentId}`, { headers: getAuthHeaders() });
      if (!res.ok) throw new Error("Failed to fetch notes");
      return res.json();
    },
    enabled: !!notesModal.studentId,
  });

  // Compare data
  const { data: compareData } = useQuery({
    queryKey: ["recruiter-compare", compareIds],
    queryFn: async () => {
      if (compareIds.length < 2) return [];
      const res = await fetch(`/api/recruiter/compare?ids=${compareIds.join(",")}`, { headers: getAuthHeaders() });
      if (!res.ok) throw new Error("Failed to compare");
      return res.json();
    },
    enabled: compareIds.length >= 2,
  });

  // ==================
  // MUTATIONS
  // ==================

  const shortlistMutation = useMutation({
    mutationFn: async ({ studentId, action }: { studentId: string; action: "add" | "remove" }) => {
      const res = await fetch(`/api/recruiter/shortlist/${studentId}`, {
        method: action === "add" ? "POST" : "DELETE",
        headers: { ...getAuthHeaders(), "Content-Type": "application/json" },
      });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ["recruiter-shortlist"] });
      queryClient.invalidateQueries({ queryKey: ["recruiter-dashboard"] });
      toast({
        title: vars.action === "add" ? "Added to shortlist" : "Removed from shortlist",
        description: vars.action === "add" ? "Candidate saved for later review." : "Candidate removed.",
      });
    },
  });

  const addNoteMutation = useMutation({
    mutationFn: async ({ studentId, note }: { studentId: string; note: string }) => {
      const res = await fetch(`/api/recruiter/notes/${studentId}`, {
        method: "POST",
        headers: { ...getAuthHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({ note }),
      });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["recruiter-notes", notesModal.studentId] });
      setNewNote("");
      toast({ title: "Note added", description: "Your note has been saved." });
    },
  });

  const deleteNoteMutation = useMutation({
    mutationFn: async (noteId: string) => {
      const res = await fetch(`/api/recruiter/notes/${noteId}`, {
        method: "DELETE",
        headers: getAuthHeaders(),
      });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["recruiter-notes", notesModal.studentId] });
      toast({ title: "Note deleted" });
    },
  });

  const contactMutation = useMutation({
    mutationFn: async ({ studentId, message }: { studentId: string; message: string }) => {
      const res = await fetch(`/api/recruiter/contact-request/${studentId}`, {
        method: "POST",
        headers: { ...getAuthHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({ message }),
      });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["recruiter-dashboard"] });
      setContactModal({ open: false, studentId: "", studentName: "" });
      setContactMessage("");
      toast({ title: "Contact request sent", description: "The student will be notified." });
    },
  });

  // ==================
  // HANDLERS
  // ==================

  const handleSearch = () => {
    setSubmittedFilters({
      keywords: searchKeywords,
      field: fieldOfStudy,
      year: graduationYear,
    });
  };

  const isStudentShortlisted = (studentId: string) => {
    return shortlist?.some((s) => s.studentId === studentId) || false;
  };

  const toggleShortlist = (studentId: string) => {
    const action = isStudentShortlisted(studentId) ? "remove" : "add";
    shortlistMutation.mutate({ studentId, action });
  };

  const toggleCompare = (studentId: string) => {
    setCompareIds((prev) => {
      if (prev.includes(studentId)) return prev.filter((id) => id !== studentId);
      if (prev.length >= 4) {
        toast({ title: "Max 4 candidates", description: "Remove one before adding more.", variant: "destructive" });
        return prev;
      }
      return [...prev, studentId];
    });
  };

  // ==================
  // HELPERS
  // ==================

  const getStatusStyle = (status: string) => {
    switch (status) {
      case "available": return "bg-emerald-50 text-emerald-700 border-emerald-200";
      case "seeking": return "bg-amber-50 text-amber-700 border-amber-200";
      case "hired": return "bg-slate-50 text-slate-500 border-slate-200";
      default: return "bg-slate-50 text-slate-500 border-slate-200";
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "available": return "Top Candidate";
      case "seeking": return "Active";
      default: return "New";
    }
  };

  // ==================
  // RENDER
  // ==================

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
      {/* QR Scanner Dialog */}
      <QRScanner open={showQRScanner} onClose={() => setShowQRScanner(false)} />

      {/* Notes Modal */}
      {notesModal.open && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setNotesModal({ open: false, studentId: "", studentName: "" })}>
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[80vh] overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="p-5 border-b border-slate-200 flex justify-between items-center">
              <div>
                <h3 className="font-bold text-slate-800">Notes for {notesModal.studentName}</h3>
                <p className="text-xs text-slate-500">Private notes only visible to you</p>
              </div>
              <button onClick={() => setNotesModal({ open: false, studentId: "", studentName: "" })} className="text-slate-400 hover:text-slate-600">
                <X size={20} />
              </button>
            </div>
            <div className="p-5 space-y-4 overflow-y-auto max-h-[50vh]">
              {studentNotes && studentNotes.length > 0 ? (
                studentNotes.map((note) => (
                  <div key={note.id} className="bg-amber-50 border border-amber-200 rounded-lg p-3 relative group">
                    <p className="text-sm text-slate-700">{note.note}</p>
                    <p className="text-xs text-slate-400 mt-2">{new Date(note.createdAt).toLocaleString()}</p>
                    <button
                      onClick={() => deleteNoteMutation.mutate(note.id)}
                      className="absolute top-2 right-2 text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))
              ) : (
                <p className="text-center text-slate-400 text-sm py-4">No notes yet. Add your first note below.</p>
              )}
            </div>
            <div className="p-4 border-t border-slate-200">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newNote}
                  onChange={(e) => setNewNote(e.target.value)}
                  placeholder="Add a note..."
                  className="flex-1 px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && newNote.trim()) {
                      addNoteMutation.mutate({ studentId: notesModal.studentId, note: newNote.trim() });
                    }
                  }}
                />
                <button
                  onClick={() => {
                    if (newNote.trim()) addNoteMutation.mutate({ studentId: notesModal.studentId, note: newNote.trim() });
                  }}
                  disabled={!newNote.trim()}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors"
                >
                  <Plus size={16} />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Contact Request Modal */}
      {contactModal.open && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setContactModal({ open: false, studentId: "", studentName: "" })}>
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <div className="p-5 border-b border-slate-200">
              <h3 className="font-bold text-slate-800">Contact {contactModal.studentName}</h3>
              <p className="text-xs text-slate-500 mt-1">Send a connection request. The student will be notified.</p>
            </div>
            <div className="p-5">
              <textarea
                value={contactMessage}
                onChange={(e) => setContactMessage(e.target.value)}
                placeholder={`Hi ${contactModal.studentName}, I'm interested in your profile...`}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 min-h-[100px] resize-none"
              />
            </div>
            <div className="p-4 border-t border-slate-200 flex gap-2 justify-end">
              <button
                onClick={() => setContactModal({ open: false, studentId: "", studentName: "" })}
                className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => contactMutation.mutate({ studentId: contactModal.studentId, message: contactMessage })}
                disabled={contactMutation.isPending}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors flex items-center gap-2"
              >
                <Send size={14} /> Send Request
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- Top Navigation --- */}
      <nav className="bg-white border-b border-slate-200 sticky top-0 z-20 px-4 md:px-8 h-16 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-2">
          <div className="bg-indigo-600 p-1.5 rounded-lg">
            <ShieldCheck className="w-6 h-6 text-white" />
          </div>
          <span className="text-xl font-bold bg-linear-to-r from-indigo-700 to-indigo-500 bg-clip-text text-transparent">
            SkillFolio Recruiter
          </span>
        </div>

        {/* Tab Navigation */}
        <div className="hidden md:flex items-center gap-1 bg-slate-100 rounded-lg p-1">
          {(
            [
              { key: "search", label: "Search", icon: Search },
              { key: "shortlist", label: "Shortlist", icon: Bookmark },
              { key: "compare", label: "Compare", icon: GitCompare },
              { key: "dashboard", label: "Dashboard", icon: BarChart3 },
            ] as const
          ).map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                activeTab === key
                  ? "bg-white text-indigo-700 shadow-sm"
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              <Icon size={14} />
              {label}
              {key === "shortlist" && shortlist && shortlist.length > 0 && (
                <span className="bg-indigo-100 text-indigo-700 text-[10px] px-1.5 py-0.5 rounded-full font-bold">
                  {shortlist.length}
                </span>
              )}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-4">
          <button
            onClick={() => setShowQRScanner(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-700 rounded-lg text-sm font-medium hover:bg-emerald-100 transition-colors border border-emerald-200"
          >
            <QrCode size={16} />
            <span className="hidden sm:inline">Scan QR</span>
          </button>

          <div className="flex items-center gap-3 pl-3 border-l border-slate-200">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-semibold text-slate-700">
                {user?.firstName || "Recruiter"} {user?.lastName || "User"}
              </p>
              <p className="text-xs text-slate-500">Recruiter</p>
            </div>
            <div className="w-9 h-9 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700">
              <User size={18} />
            </div>
            <button onClick={() => logout()} data-testid="logout-button" className="text-slate-400 hover:text-red-500 transition-colors">
              <LogOut size={18} />
            </button>
          </div>
        </div>
      </nav>

      {/* Mobile Tab Bar */}
      <div className="md:hidden flex border-b border-slate-200 bg-white overflow-x-auto">
        {(
          [
            { key: "search", label: "Search", icon: Search },
            { key: "shortlist", label: "Shortlist", icon: Bookmark },
            { key: "compare", label: "Compare", icon: GitCompare },
            { key: "dashboard", label: "Stats", icon: BarChart3 },
          ] as const
        ).map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={`flex-1 flex flex-col items-center gap-1 py-3 text-xs font-medium border-b-2 transition-colors ${
              activeTab === key ? "text-indigo-700 border-indigo-600" : "text-slate-500 border-transparent"
            }`}
          >
            <Icon size={16} />
            {label}
          </button>
        ))}
      </div>

      {/* --- Main Content --- */}
      <main className="max-w-7xl mx-auto p-4 md:p-8 space-y-6">
        {/* ====== SEARCH TAB ====== */}
        {activeTab === "search" && (
          <>
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
              <div>
                <h1 className="text-2xl font-bold text-slate-800">Candidate Search</h1>
                <p className="text-slate-500">
                  Find and verify top talent with blockchain-backed credentials.
                </p>
              </div>
              {compareIds.length >= 2 && (
                <button
                  onClick={() => setActiveTab("compare")}
                  className="px-4 py-2 bg-violet-600 text-white rounded-lg text-sm font-medium hover:bg-violet-700 transition-colors shadow-md flex items-center gap-2"
                >
                  <GitCompare size={16} /> Compare ({compareIds.length})
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* LEFT: Search & Results */}
              <div className="lg:col-span-2 space-y-6">
                {/* Search Filters */}
                <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200 space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                    <div className="md:col-span-6 relative">
                      <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1 block">
                        Keywords / Skills
                      </label>
                      <div className="relative">
                        <Search className="absolute left-3 top-2.5 text-slate-400" size={18} />
                        <input
                          type="text"
                          placeholder="React, Python, AWS, internship..."
                          className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-sm"
                          value={searchKeywords}
                          onChange={(e) => setSearchKeywords(e.target.value)}
                          onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                          data-testid="search-keywords-input"
                        />
                      </div>
                    </div>
                    <div className="md:col-span-3">
                      <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1 block">
                        Field
                      </label>
                      <div className="relative">
                        <select
                          className="w-full pl-3 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
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
                    <div className="md:col-span-3">
                      <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1 block">
                        Grad Year
                      </label>
                      <div className="relative">
                        <select
                          className="w-full pl-3 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                          value={graduationYear}
                          onChange={(e) => setGraduationYear(e.target.value)}
                          data-testid="year-select"
                        >
                          <option value="all">Any Year</option>
                          <option value="2026">2026</option>
                          <option value="2025">2025</option>
                          <option value="2024">2024</option>
                          <option value="2023">2023</option>
                        </select>
                        <ChevronDown className="absolute right-3 top-2.5 text-slate-400 pointer-events-none" size={16} />
                      </div>
                    </div>
                  </div>

                  <button
                    className="w-full py-2.5 bg-indigo-600 text-white font-medium rounded-lg text-sm hover:bg-indigo-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                    onClick={handleSearch}
                    disabled={isLoading}
                    data-testid="search-candidates-button"
                  >
                    <Search size={16} />
                    {isLoading ? "Searching..." : "Search Candidates"}
                  </button>
                </div>

                {/* Results */}
                <div className="space-y-4">
                  <div className="flex justify-between items-center px-1">
                    <span className="text-sm font-medium text-slate-500">
                      {students ? `${students.length} Candidates Found` : "Loading..."}
                    </span>
                  </div>

                  {isLoading && (
                    <div className="text-center py-16">
                      <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600 mx-auto mb-4"></div>
                      <p className="text-slate-500">Searching candidates...</p>
                    </div>
                  )}
                  {isError && (
                    <div className="text-center py-10 bg-red-50 rounded-xl border border-red-200">
                      <p className="text-red-600 font-medium">Failed to load candidates.</p>
                      <p className="text-red-400 text-sm mt-1">Please try again.</p>
                    </div>
                  )}

                  {!isLoading && students && students.length === 0 && (
                    <div className="text-center py-16 bg-white rounded-xl border border-slate-200">
                      <Users size={40} className="mx-auto text-slate-300 mb-4" />
                      <p className="text-slate-500 font-medium">No candidates found</p>
                      <p className="text-slate-400 text-sm mt-1">Try different search keywords</p>
                    </div>
                  )}

                  {students &&
                    students.map((student) => (
                      <StudentCard
                        key={student.id}
                        student={student}
                        isShortlisted={isStudentShortlisted(student.id)}
                        isComparing={compareIds.includes(student.id)}
                        onToggleShortlist={() => toggleShortlist(student.id)}
                        onToggleCompare={() => toggleCompare(student.id)}
                        onViewPortfolio={() => setLocation(`/portfolio/${student.id}`)}
                        onOpenNotes={() =>
                          setNotesModal({
                            open: true,
                            studentId: student.id,
                            studentName: `${student.firstName} ${student.lastName}`,
                          })
                        }
                        onContactRequest={() =>
                          setContactModal({
                            open: true,
                            studentId: student.id,
                            studentName: `${student.firstName} ${student.lastName}`,
                          })
                        }
                        getStatusStyle={getStatusStyle}
                        getStatusLabel={getStatusLabel}
                      />
                    ))}
                </div>
              </div>

              {/* RIGHT: Widgets */}
              <div className="space-y-6">
                {/* QR Scanner Widget */}
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                  <div className="p-5 border-b border-slate-100">
                    <h3 className="font-bold text-slate-800 flex items-center gap-2">
                      <QrCode size={20} className="text-indigo-600" /> Quick Verify
                    </h3>
                  </div>
                  <div className="p-6 flex flex-col items-center justify-center text-center">
                    <div className="mb-4 relative group cursor-pointer" onClick={() => setShowQRScanner(true)}>
                      <div className="w-32 h-32 border-2 border-dashed border-slate-300 rounded-xl flex items-center justify-center bg-slate-50 group-hover:border-indigo-400 transition-colors">
                        <QrCode size={40} className="text-slate-400 group-hover:text-indigo-500 transition-colors" />
                      </div>
                      <div className="absolute -top-1 -left-1 w-4 h-4 border-t-2 border-l-2 border-indigo-600 rounded-tl-lg"></div>
                      <div className="absolute -top-1 -right-1 w-4 h-4 border-t-2 border-r-2 border-indigo-600 rounded-tr-lg"></div>
                      <div className="absolute -bottom-1 -left-1 w-4 h-4 border-b-2 border-l-2 border-indigo-600 rounded-bl-lg"></div>
                      <div className="absolute -bottom-1 -right-1 w-4 h-4 border-b-2 border-r-2 border-indigo-600 rounded-br-lg"></div>
                    </div>
                    <p className="text-sm text-slate-500 mb-4">
                      Scan certificate QR code for instant blockchain verification.
                    </p>
                    <button
                      onClick={() => setShowQRScanner(true)}
                      data-testid="open-camera-button"
                      className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2"
                    >
                      <QrCode size={16} />
                      Open Camera Scanner
                    </button>
                  </div>
                </div>

                {/* Quick Stats */}
                <div className="bg-linear-to-br from-indigo-600 to-violet-700 rounded-xl shadow-lg p-5 text-white relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-4 opacity-10">
                    <TrendingUp size={80} />
                  </div>
                  <h3 className="text-sm font-medium text-indigo-100 mb-3">Your Activity</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-2xl font-bold">{dashboardStats?.shortlistedCount || 0}</p>
                      <p className="text-xs text-indigo-200">Shortlisted</p>
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{dashboardStats?.searchesPerformed || 0}</p>
                      <p className="text-xs text-indigo-200">Searches</p>
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{dashboardStats?.certificatesVerified || 0}</p>
                      <p className="text-xs text-indigo-200">Verified</p>
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{dashboardStats?.contactRequestsSent || 0}</p>
                      <p className="text-xs text-indigo-200">Contacted</p>
                    </div>
                  </div>
                </div>

                {/* Shortlist Preview */}
                {shortlist && shortlist.length > 0 && (
                  <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                    <div className="p-4 border-b border-slate-100 flex justify-between items-center">
                      <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                        <BookmarkCheck size={16} className="text-indigo-600" /> Shortlisted
                      </h3>
                      <button
                        onClick={() => setActiveTab("shortlist")}
                        className="text-xs text-indigo-600 hover:underline"
                      >
                        View All ({shortlist.length})
                      </button>
                    </div>
                    <div className="divide-y divide-slate-100">
                      {shortlist.slice(0, 3).map((entry) => (
                        <div
                          key={entry.id}
                          className="p-3 flex items-center gap-3 hover:bg-slate-50 transition-colors cursor-pointer"
                          onClick={() => setLocation(`/portfolio/${entry.studentId}`)}
                        >
                          <img
                            src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${entry.student.firstName}${entry.student.lastName}`}
                            alt=""
                            className="w-8 h-8 rounded-full bg-slate-100"
                          />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-slate-700 truncate">
                              {entry.student.firstName} {entry.student.lastName}
                            </p>
                            <p className="text-xs text-slate-400">
                              {entry.student.certificatesCount} certs
                            </p>
                          </div>
                          <ExternalLink size={14} className="text-slate-300" />
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </>
        )}

        {/* ====== SHORTLIST TAB ====== */}
        {activeTab === "shortlist" && (
          <>
            <div>
              <h1 className="text-2xl font-bold text-slate-800">Saved Candidates</h1>
              <p className="text-slate-500">
                Your shortlisted candidates for review. {shortlist?.length || 0} saved.
              </p>
            </div>

            {!shortlist || shortlist.length === 0 ? (
              <div className="text-center py-20 bg-white rounded-xl border border-slate-200">
                <Bookmark size={48} className="mx-auto text-slate-300 mb-4" />
                <p className="text-slate-500 font-medium">No saved candidates</p>
                <p className="text-slate-400 text-sm mt-1">
                  Click the bookmark icon on a candidate to save them here.
                </p>
                <button
                  onClick={() => setActiveTab("search")}
                  className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors"
                >
                  Search Candidates
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {shortlist.map((entry) => (
                  <div
                    key={entry.id}
                    className="bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow overflow-hidden"
                  >
                    <div className="p-5">
                      <div className="flex items-center gap-3 mb-4">
                        <img
                          src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${entry.student.firstName}${entry.student.lastName}`}
                          alt=""
                          className="w-12 h-12 rounded-full bg-slate-100 border border-slate-200"
                        />
                        <div>
                          <h3 className="font-bold text-slate-800">
                            {entry.student.firstName} {entry.student.lastName}
                          </h3>
                          <p className="text-xs text-slate-500">{entry.student.email}</p>
                        </div>
                      </div>
                      <div className="flex gap-2 mb-4">
                        <span className="text-xs bg-green-50 text-green-700 px-2 py-1 rounded border border-green-200 font-medium">
                          <Award size={10} className="inline mr-1" />
                          {entry.student.certificatesCount} Certs
                        </span>
                        <span className="text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded border border-blue-200 font-medium">
                          <Eye size={10} className="inline mr-1" />
                          {entry.student.portfolioViews} Views
                        </span>
                      </div>
                      {entry.student.skills && entry.student.skills.length > 0 && (
                        <div className="flex flex-wrap gap-1 mb-4">
                          {entry.student.skills.slice(0, 3).map((skill, i) => (
                            <span key={i} className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded">
                              {skill}
                            </span>
                          ))}
                          {entry.student.skills.length > 3 && (
                            <span className="text-[10px] text-slate-400">
                              +{entry.student.skills.length - 3} more
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                    <div className="border-t border-slate-100 p-3 flex gap-2">
                      <button
                        onClick={() => setLocation(`/portfolio/${entry.studentId}`)}
                        className="flex-1 py-1.5 text-xs font-medium bg-indigo-50 text-indigo-700 rounded-lg hover:bg-indigo-100 transition-colors"
                      >
                        View Portfolio
                      </button>
                      <button
                        onClick={() =>
                          setNotesModal({
                            open: true,
                            studentId: entry.studentId,
                            studentName: `${entry.student.firstName} ${entry.student.lastName}`,
                          })
                        }
                        className="py-1.5 px-3 text-xs font-medium bg-amber-50 text-amber-700 rounded-lg hover:bg-amber-100 transition-colors"
                      >
                        <StickyNote size={12} />
                      </button>
                      <button
                        onClick={() => toggleShortlist(entry.studentId)}
                        className="py-1.5 px-3 text-xs font-medium bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* ====== COMPARE TAB ====== */}
        {activeTab === "compare" && (
          <>
            <div>
              <h1 className="text-2xl font-bold text-slate-800">Compare Candidates</h1>
              <p className="text-slate-500">
                Side-by-side comparison of selected candidates.{" "}
                {compareIds.length < 2 && "Select at least 2 candidates from search."}
              </p>
            </div>

            {compareIds.length < 2 ? (
              <div className="text-center py-20 bg-white rounded-xl border border-slate-200">
                <GitCompare size={48} className="mx-auto text-slate-300 mb-4" />
                <p className="text-slate-500 font-medium">Select candidates to compare</p>
                <p className="text-slate-400 text-sm mt-1">
                  Use the compare button on candidate cards in search results.
                </p>
                <button
                  onClick={() => setActiveTab("search")}
                  className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors"
                >
                  Go to Search
                </button>
              </div>
            ) : (
              <div>
                <div className="flex gap-2 mb-6 flex-wrap">
                  {compareIds.map((id) => {
                    const s = students?.find((st) => st.id === id);
                    return (
                      <span
                        key={id}
                        className="text-xs bg-violet-50 text-violet-700 px-3 py-1.5 rounded-full font-medium flex items-center gap-1 border border-violet-200"
                      >
                        {s ? `${s.firstName} ${s.lastName}` : id}
                        <button onClick={() => toggleCompare(id)} className="hover:text-red-500">
                          <X size={12} />
                        </button>
                      </span>
                    );
                  })}
                </div>

                {compareData && compareData.length >= 2 && (
                  <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-slate-200 bg-slate-50">
                          <th className="text-left p-4 font-semibold text-slate-600">Metric</th>
                          {compareData.map((c: any) => (
                            <th key={c.id} className="text-center p-4 font-semibold text-slate-800">
                              <div className="flex flex-col items-center gap-2">
                                <img
                                  src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${c.firstName}${c.lastName}`}
                                  alt=""
                                  className="w-10 h-10 rounded-full bg-slate-100"
                                />
                                {c.firstName} {c.lastName}
                              </div>
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        <tr>
                          <td className="p-4 font-medium text-slate-600">Total Certificates</td>
                          {compareData.map((c: any) => (
                            <td key={c.id} className="p-4 text-center font-bold text-slate-800">
                              {c.certificatesCount}
                            </td>
                          ))}
                        </tr>
                        <tr>
                          <td className="p-4 font-medium text-slate-600">Courses</td>
                          {compareData.map((c: any) => (
                            <td key={c.id} className="p-4 text-center">{c.certificateTypes?.course || 0}</td>
                          ))}
                        </tr>
                        <tr>
                          <td className="p-4 font-medium text-slate-600">Internships</td>
                          {compareData.map((c: any) => (
                            <td key={c.id} className="p-4 text-center">{c.certificateTypes?.internship || 0}</td>
                          ))}
                        </tr>
                        <tr>
                          <td className="p-4 font-medium text-slate-600">Hackathons</td>
                          {compareData.map((c: any) => (
                            <td key={c.id} className="p-4 text-center">{c.certificateTypes?.hackathon || 0}</td>
                          ))}
                        </tr>
                        <tr>
                          <td className="p-4 font-medium text-slate-600">Workshops</td>
                          {compareData.map((c: any) => (
                            <td key={c.id} className="p-4 text-center">{c.certificateTypes?.workshop || 0}</td>
                          ))}
                        </tr>
                        <tr>
                          <td className="p-4 font-medium text-slate-600">Projects</td>
                          {compareData.map((c: any) => (
                            <td key={c.id} className="p-4 text-center">{c.projectsCount || 0}</td>
                          ))}
                        </tr>
                        <tr>
                          <td className="p-4 font-medium text-slate-600">Portfolio Views</td>
                          {compareData.map((c: any) => (
                            <td key={c.id} className="p-4 text-center">{c.portfolioViews || 0}</td>
                          ))}
                        </tr>
                        <tr>
                          <td className="p-4 font-medium text-slate-600">Skills</td>
                          {compareData.map((c: any) => (
                            <td key={c.id} className="p-4 text-center">
                              <div className="flex flex-wrap gap-1 justify-center">
                                {(c.skills || []).slice(0, 4).map((s: string, i: number) => (
                                  <span key={i} className="text-[10px] bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded">
                                    {s}
                                  </span>
                                ))}
                              </div>
                            </td>
                          ))}
                        </tr>
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </>
        )}

        {/* ====== DASHBOARD TAB ====== */}
        {activeTab === "dashboard" && (
          <>
            <div>
              <h1 className="text-2xl font-bold text-slate-800">Recruiter Dashboard</h1>
              <p className="text-slate-500">Your recruiting activity and insights.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard
                icon={<Bookmark size={24} />}
                label="Shortlisted"
                value={dashboardStats?.shortlistedCount || 0}
                color="indigo"
              />
              <StatCard
                icon={<Eye size={24} />}
                label="Candidates Viewed"
                value={dashboardStats?.candidatesViewed || 0}
                color="blue"
              />
              <StatCard
                icon={<ShieldCheck size={24} />}
                label="Certs Verified"
                value={dashboardStats?.certificatesVerified || 0}
                color="green"
              />
              <StatCard
                icon={<Send size={24} />}
                label="Contact Requests"
                value={dashboardStats?.contactRequestsSent || 0}
                color="violet"
              />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Shortlisted summary */}
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
                <div className="p-5 border-b border-slate-100">
                  <h3 className="font-bold text-slate-800">Shortlisted Candidates</h3>
                </div>
                <div className="divide-y divide-slate-100">
                  {shortlist && shortlist.length > 0 ? (
                    shortlist.slice(0, 5).map((entry) => (
                      <div
                        key={entry.id}
                        className="p-4 flex items-center gap-3 hover:bg-slate-50 transition-colors cursor-pointer"
                        onClick={() => setLocation(`/portfolio/${entry.studentId}`)}
                      >
                        <img
                          src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${entry.student.firstName}${entry.student.lastName}`}
                          alt=""
                          className="w-10 h-10 rounded-full bg-slate-100"
                        />
                        <div className="flex-1">
                          <p className="text-sm font-semibold text-slate-700">
                            {entry.student.firstName} {entry.student.lastName}
                          </p>
                          <p className="text-xs text-slate-400">
                            {entry.student.certificatesCount} verified certs
                          </p>
                        </div>
                        <ExternalLink size={14} className="text-slate-300" />
                      </div>
                    ))
                  ) : (
                    <div className="p-8 text-center text-slate-400 text-sm">
                      No shortlisted candidates yet.
                    </div>
                  )}
                </div>
              </div>

              {/* Activity Timeline */}
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
                <div className="p-5 border-b border-slate-100">
                  <h3 className="font-bold text-slate-800">Recent Activity</h3>
                </div>
                <div className="p-5 space-y-4">
                  {dashboardStats?.recentVerifications && dashboardStats.recentVerifications.length > 0 ? (
                    dashboardStats.recentVerifications.map((v: any) => (
                      <div key={v.id} className="flex items-start gap-3">
                        <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center shrink-0">
                          <CheckCircle size={14} className="text-green-600" />
                        </div>
                        <div>
                          <p className="text-sm text-slate-700">
                            Verified certificate{" "}
                            {v.metadata?.studentName && (
                              <span className="font-medium">for {v.metadata.studentName}</span>
                            )}
                          </p>
                          <p className="text-xs text-slate-400">
                            <Clock size={10} className="inline mr-1" />
                            {new Date(v.createdAt).toLocaleString()}
                          </p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center text-slate-400 text-sm py-4">
                      <Clock size={24} className="mx-auto mb-2 text-slate-300" />
                      No recent activity. Start searching and verifying candidates!
                    </div>
                  )}
                </div>
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}

// ==================
// SUB-COMPONENTS
// ==================

function StudentCard({
  student,
  isShortlisted,
  isComparing,
  onToggleShortlist,
  onToggleCompare,
  onViewPortfolio,
  onOpenNotes,
  onContactRequest,
  getStatusStyle,
  getStatusLabel,
}: {
  student: Student;
  isShortlisted: boolean;
  isComparing: boolean;
  onToggleShortlist: () => void;
  onToggleCompare: () => void;
  onViewPortfolio: () => void;
  onOpenNotes: () => void;
  onContactRequest: () => void;
  getStatusStyle: (s: string) => string;
  getStatusLabel: (s: string) => string;
}) {
  return (
    <div
      className={`bg-white p-5 rounded-xl shadow-sm border hover:shadow-md transition-all group relative ${
        isComparing ? "border-violet-400 ring-2 ring-violet-100" : "border-slate-200"
      }`}
      data-testid={`student-card-${student.id}`}
    >
      <div className="flex flex-col sm:flex-row gap-4">
        {/* Avatar */}
        <div className="shrink-0">
          <img
            src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${student.firstName}${student.lastName}`}
            alt="Avatar"
            className="w-16 h-16 rounded-full bg-slate-100 object-cover border border-slate-100"
          />
        </div>

        {/* Content */}
        <div className="grow min-w-0">
          <div className="flex justify-between items-start">
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-lg font-bold text-slate-800">
                  {student.firstName} {student.lastName}
                </h3>
                <span className="bg-green-100 text-green-700 text-[10px] px-1.5 py-0.5 rounded-full font-bold flex items-center gap-0.5 border border-green-200">
                  <ShieldCheck size={10} /> VERIFIED
                </span>
              </div>
              <div className="flex items-center gap-2 text-sm text-slate-500 mt-1 flex-wrap">
                <span className="flex items-center gap-1">
                  <Mail size={12} /> {student.email}
                </span>
              </div>
            </div>
            <div className="flex flex-col items-end gap-2">
              <span className={`text-xs font-bold px-2 py-1 rounded-md border ${getStatusStyle(student.status)}`}>
                {getStatusLabel(student.status)}
              </span>
            </div>
          </div>

          {/* Skills */}
          {student.skills && student.skills.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {student.skills.slice(0, 5).map((skill, i) => (
                <span
                  key={i}
                  className="text-xs font-medium bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded border border-indigo-100"
                >
                  {skill}
                </span>
              ))}
              {student.skills.length > 5 && (
                <span className="text-xs text-slate-400">+{student.skills.length - 5} more</span>
              )}
            </div>
          )}

          {/* Stats & Actions */}
          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between flex-wrap gap-2">
            <div className="flex gap-4 text-sm text-slate-600">
              <span className="flex items-center gap-1.5 font-medium">
                <Award size={16} className="text-orange-500" /> {student.certificatesCount} Certs
              </span>
              <span className="flex items-center gap-1.5">
                <ExternalLink size={16} className="text-slate-400" /> {student.portfolioViews} Views
              </span>
            </div>
            <div className="flex items-center gap-1">
              {/* Bookmark */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleShortlist();
                }}
                className={`p-2 rounded-lg transition-colors ${
                  isShortlisted
                    ? "text-indigo-600 bg-indigo-50 hover:bg-indigo-100"
                    : "text-slate-400 hover:bg-slate-50 hover:text-indigo-500"
                }`}
                title={isShortlisted ? "Remove from shortlist" : "Add to shortlist"}
              >
                {isShortlisted ? <BookmarkCheck size={18} /> : <Bookmark size={18} />}
              </button>

              {/* Notes */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onOpenNotes();
                }}
                className="p-2 rounded-lg text-slate-400 hover:bg-amber-50 hover:text-amber-600 transition-colors"
                title="Add note"
              >
                <StickyNote size={18} />
              </button>

              {/* Compare */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleCompare();
                }}
                className={`p-2 rounded-lg transition-colors ${
                  isComparing
                    ? "text-violet-600 bg-violet-50 hover:bg-violet-100"
                    : "text-slate-400 hover:bg-violet-50 hover:text-violet-500"
                }`}
                title={isComparing ? "Remove from comparison" : "Add to comparison"}
              >
                <GitCompare size={18} />
              </button>

              {/* Contact */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onContactRequest();
                }}
                className="p-2 rounded-lg text-slate-400 hover:bg-emerald-50 hover:text-emerald-600 transition-colors"
                title="Send contact request"
              >
                <Send size={18} />
              </button>

              {/* Portfolio */}
              <button
                onClick={onViewPortfolio}
                data-testid={`view-portfolio-${student.id}`}
                className="ml-1 text-indigo-600 font-medium hover:text-indigo-800 transition-colors text-sm whitespace-nowrap"
              >
                View Portfolio &rarr;
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  color: "indigo" | "blue" | "green" | "violet";
}) {
  const colorMap = {
    indigo: "bg-indigo-50 text-indigo-600 border-indigo-100",
    blue: "bg-blue-50 text-blue-600 border-blue-100",
    green: "bg-green-50 text-green-600 border-green-100",
    violet: "bg-violet-50 text-violet-600 border-violet-100",
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-3 ${colorMap[color]}`}>{icon}</div>
      <p className="text-2xl font-bold text-slate-800">{value}</p>
      <p className="text-sm text-slate-500">{label}</p>
    </div>
  );
}
