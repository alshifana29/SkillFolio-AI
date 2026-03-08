import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import multer from "multer";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import QRCode from "qrcode";
import path from "path";
import fs from "fs";
import { storage } from "./storage";
import { blockchain } from "./blockchain";
import { forgeryDetector } from "./ai";
import { insertUserSchema, insertCertificateSchema, loginSchema, insertProjectSchema } from "@shared/schema";
import { z } from "zod";

const JWT_SECRET = process.env.JWT_SECRET || "academicfoliochain-secret-key-2024";
const SALT_ROUNDS = 10;

const uploadDir = path.join(process.cwd(), "uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const multerStorage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, uploadDir);
  },
  filename: (_req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  },
});

const upload = multer({
  storage: multerStorage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowedTypes = [
      "image/jpeg",
      "image/jpg",
      "image/png",
      "image/gif",
      "image/webp",
      "image/bmp",
      "image/tiff",
      "application/pdf",
    ];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Invalid file type"));
    }
  },
});

const uploadFields = upload.fields([{ name: "file", maxCount: 1 }]);

interface AuthRequest extends Request {
  user?: { id: string; email: string; role: string };
}

const authenticateToken = async (req: AuthRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    return res.status(401).json({ error: "Access token required" });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { id: string; email: string; role: string };
    const user = await storage.getUserById(decoded.id);
    
    if (!user || !user.isActive) {
      return res.status(401).json({ error: "User not found or inactive" });
    }

    req.user = { id: user.id, email: user.email, role: user.role };
    next();
  } catch (error) {
    return res.status(403).json({ error: "Invalid or expired token" });
  }
};

const requireRole = (...roles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ error: "Insufficient permissions" });
    }
    next();
  };
};

function generateSmartSummary(user: any, certificates: any[], projects: any[]) {
  const approvedCerts = certificates.filter(c => c.status === "approved");
  const skills = approvedCerts.filter(c => c.certificateType === "course");
  const internships = approvedCerts.filter(c => c.certificateType === "internship");
  
  let summary = `${user.firstName} ${user.lastName}`;
  
  if (internships.length > 0) {
    summary += ` is an experienced candidate with ${internships.length} internship(s) including ${internships[0].institution}`;
  } else {
    summary += ` is a motivated learner`;
  }

  if (skills.length > 0) {
    const skillNames = skills.slice(0, 3).map((s: any) => s.title).join(", ");
    summary += `, skilled in ${skillNames}`;
  }

  if (projects.length > 0) {
    summary += `. Portfolio showcases ${projects.length} project(s) demonstrating practical application of concepts.`;
  }

  return summary + ".";
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {

  app.post("/api/auth/register", async (req: Request, res: Response) => {
    try {
      const userData = insertUserSchema.parse(req.body);
      
      const existingUser = await storage.getUserByEmail(userData.email);
      if (existingUser) {
        return res.status(400).json({ error: "Email already registered" });
      }

      const hashedPassword = await bcrypt.hash(userData.password, SALT_ROUNDS);
      const user = await storage.createUser({
        ...userData,
        password: hashedPassword,
      });

      const token = jwt.sign(
        { id: user.id, email: user.email, role: user.role },
        JWT_SECRET,
        { expiresIn: "7d" }
      );

      await storage.logActivity(user.id, "user_registered", "user", user.id);

      const { password: _, ...userWithoutPassword } = user;
      res.status(201).json({ user: userWithoutPassword, token });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors[0].message });
      }
      console.error("Registration error:", error);
      res.status(500).json({ error: "Registration failed" });
    }
  });

  app.post("/api/auth/login", async (req: Request, res: Response) => {
    try {
      const credentials = loginSchema.parse(req.body);
      
      const user = await storage.getUserByEmail(credentials.email);
      if (!user) {
        return res.status(401).json({ error: "Invalid email or password" });
      }

      const passwordMatch = await bcrypt.compare(credentials.password, user.password);
      if (!passwordMatch) {
        return res.status(401).json({ error: "Invalid email or password" });
      }

      if (!user.isActive) {
        return res.status(403).json({ error: "Account is deactivated" });
      }

      const token = jwt.sign(
        { id: user.id, email: user.email, role: user.role },
        JWT_SECRET,
        { expiresIn: "7d" }
      );

      await storage.logActivity(user.id, "user_login", "user", user.id);

      const { password: _, ...userWithoutPassword } = user;
      res.json({ user: userWithoutPassword, token });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors[0].message });
      }
      console.error("Login error:", error);
      res.status(500).json({ error: "Login failed" });
    }
  });

  app.get("/api/auth/me", authenticateToken, async (req: AuthRequest, res: Response) => {
    try {
      const user = await storage.getUserById(req.user!.id);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      const { password: _, ...userWithoutPassword } = user;
      res.json(userWithoutPassword);
    } catch (error) {
      console.error("Get user error:", error);
      res.status(500).json({ error: "Failed to get user" });
    }
  });

  app.post("/api/certificates", authenticateToken, uploadFields, async (req: AuthRequest, res: Response) => {
    try {
      const certData = insertCertificateSchema.parse(req.body);
      
      const files = req.files as { [key: string]: Express.Multer.File[] } | undefined;
      const uploadedFile = files?.file?.[0];

      const certificate = await storage.createCertificate({
        ...certData,
        userId: req.user!.id,
        fileUrl: uploadedFile ? `/uploads/${uploadedFile.filename}` : null,
        fileName: uploadedFile?.originalname || null,
        fileType: uploadedFile?.mimetype || null,
      });

      let responseCertificate = certificate;

      if (uploadedFile) {
        const startTime = Date.now();
        const fileBuffer = fs.readFileSync(uploadedFile.path);
        
        // Fetch full user details for name matching in AI analysis
        const user = await storage.getUserById(req.user!.id);
        const analysis = await forgeryDetector.analyzeCertificate(
          certificate,
          fileBuffer,
          user,
          uploadedFile.path,
          uploadedFile.mimetype
        );
        const scanTime = Date.now() - startTime;
        
        // Add measurable metric to analysis for evaluation
        analysis.reasoning += ` [AI Scan Time: ${scanTime}ms]`;
        
        const updatedCertificate = await storage.updateCertificate(certificate.id, {
          aiAnalysis: analysis.reasoning,
          fraudScore: analysis.fraudScore,
        });
        if (updatedCertificate) {
          responseCertificate = updatedCertificate;
        }

        await forgeryDetector.saveForgeryReport(certificate.id, analysis);
      }

      await storage.logActivity(req.user!.id, "certificate_uploaded", "certificate", certificate.id);

      await storage.createNotification({
        userId: req.user!.id,
        type: "certificate_submitted",
        title: "Certificate Submitted",
        message: `Your certificate "${certificate.title}" has been submitted for review.`,
        data: { certificateId: certificate.id },
      });

      res.status(201).json(responseCertificate);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors[0].message });
      }
      console.error("Create certificate error:", error);
      res.status(500).json({ error: "Failed to create certificate" });
    }
  });

  app.get("/api/certificates", authenticateToken, async (req: AuthRequest, res: Response) => {
    try {
      const { status, search } = req.query;
      let certificates;

      if (req.user!.role === "student") {
        certificates = await storage.getCertificatesByUserId(req.user!.id);
      } else if (req.user!.role === "faculty") {
        if (status === "pending") {
          certificates = await storage.getPendingCertificates();
        } else {
          certificates = await storage.getAllCertificates();
        }
      } else {
        certificates = await storage.getAllCertificates();
      }

      if (search && typeof search === "string") {
        certificates = await storage.searchCertificates(search);
      }

      if (status && typeof status === "string" && req.user!.role !== "student") {
        certificates = certificates.filter(c => c.status === status);
      }

      res.json(certificates);
    } catch (error) {
      console.error("Get certificates error:", error);
      res.status(500).json({ error: "Failed to get certificates" });
    }
  });

  app.get("/api/certificates/:id", authenticateToken, async (req: AuthRequest, res: Response) => {
    try {
      const certificate = await storage.getCertificateById(req.params.id);
      if (!certificate) {
        return res.status(404).json({ error: "Certificate not found" });
      }

      if (req.user!.role === "student" && certificate.userId !== req.user!.id) {
        return res.status(403).json({ error: "Access denied" });
      }

      const forgeryReport = await storage.getForgeryReportByCertificateId(certificate.id);
      const blockchainBlock = await storage.getBlockByCertificateId(certificate.id);

      res.json({
        ...certificate,
        forgeryReport,
        blockchainBlock,
      });
    } catch (error) {
      console.error("Get certificate error:", error);
      res.status(500).json({ error: "Failed to get certificate" });
    }
  });

  app.post("/api/certificates/:id/approve", authenticateToken, requireRole("faculty", "admin"), async (req: AuthRequest, res: Response) => {
    try {
      const { notes } = req.body;
      const certificate = await storage.getCertificateById(req.params.id);
      
      if (!certificate) {
        return res.status(404).json({ error: "Certificate not found" });
      }

      if (certificate.status !== "pending") {
        return res.status(400).json({ error: "Certificate is not pending review" });
      }

      const block = await blockchain.addCertificateToChain(certificate);

      const verificationUrl = `${process.env.BASE_URL || "http://localhost:5000"}/verify/${block.hash}`;
      const qrCode = await QRCode.toDataURL(verificationUrl);

      const updatedCertificate = await storage.approveCertificate(
        certificate.id,
        req.user!.id,
        notes || "Approved",
        block.hash,
        qrCode
      );

      await storage.logActivity(req.user!.id, "certificate_approved", "certificate", certificate.id);

      await storage.createNotification({
        userId: certificate.userId,
        type: "certificate_approved",
        title: "Certificate Approved",
        message: `Your certificate "${certificate.title}" has been approved and added to the blockchain.`,
        data: { certificateId: certificate.id, blockHash: block.hash },
      });

      res.json(updatedCertificate);
    } catch (error) {
      console.error("Approve certificate error:", error);
      res.status(500).json({ error: "Failed to approve certificate" });
    }
  });

  app.post("/api/certificates/:id/reject", authenticateToken, requireRole("faculty", "admin"), async (req: AuthRequest, res: Response) => {
    try {
      const { notes } = req.body;
      const certificate = await storage.getCertificateById(req.params.id);
      
      if (!certificate) {
        return res.status(404).json({ error: "Certificate not found" });
      }

      if (certificate.status !== "pending") {
        return res.status(400).json({ error: "Certificate is not pending review" });
      }

      const updatedCertificate = await storage.rejectCertificate(
        certificate.id,
        req.user!.id,
        notes || "Rejected"
      );

      await storage.logActivity(req.user!.id, "certificate_rejected", "certificate", certificate.id);

      await storage.createNotification({
        userId: certificate.userId,
        type: "certificate_rejected",
        title: "Certificate Rejected",
        message: `Your certificate "${certificate.title}" has been rejected. Reason: ${notes || "Not specified"}`,
        data: { certificateId: certificate.id },
      });

      res.json(updatedCertificate);
    } catch (error) {
      console.error("Reject certificate error:", error);
      res.status(500).json({ error: "Failed to reject certificate" });
    }
  });

  app.patch("/api/certificates/:id/review", authenticateToken, requireRole("faculty", "admin"), async (req: AuthRequest, res: Response) => {
    try {
      const { status, reviewNotes } = req.body;
      const certificate = await storage.getCertificateById(req.params.id);
      
      if (!certificate) {
        return res.status(404).json({ error: "Certificate not found" });
      }

      if (certificate.status !== "pending") {
        return res.status(400).json({ error: "Certificate is not pending review" });
      }

      if (status === "approved") {
        const block = await blockchain.addCertificateToChain(certificate);
        const verificationUrl = `${process.env.BASE_URL || "http://localhost:5000"}/verify/${block.hash}`;
        const qrCode = await QRCode.toDataURL(verificationUrl);

        const updatedCertificate = await storage.approveCertificate(
          certificate.id,
          req.user!.id,
          reviewNotes || "Approved",
          block.hash,
          qrCode
        );

        await storage.logActivity(req.user!.id, "certificate_approved", "certificate", certificate.id);
        await storage.createNotification({
          userId: certificate.userId,
          type: "certificate_approved",
          title: "Certificate Approved",
          message: `Your certificate "${certificate.title}" has been approved and added to the blockchain.`,
          data: { certificateId: certificate.id, blockHash: block.hash },
        });

        res.json(updatedCertificate);
      } else if (status === "rejected") {
        const updatedCertificate = await storage.rejectCertificate(
          certificate.id,
          req.user!.id,
          reviewNotes || "Rejected"
        );

        await storage.logActivity(req.user!.id, "certificate_rejected", "certificate", certificate.id);
        await storage.createNotification({
          userId: certificate.userId,
          type: "certificate_rejected",
          title: "Certificate Rejected",
          message: `Your certificate "${certificate.title}" has been rejected. Reason: ${reviewNotes || "Not specified"}`,
          data: { certificateId: certificate.id },
        });

        res.json(updatedCertificate);
      } else {
        return res.status(400).json({ error: "Invalid status. Use 'approved' or 'rejected'" });
      }
    } catch (error) {
      console.error("Review certificate error:", error);
      res.status(500).json({ error: "Failed to review certificate" });
    }
  });

  app.get("/api/certificates/:id/analysis", authenticateToken, async (req: AuthRequest, res: Response) => {
    try {
      const certificate = await storage.getCertificateById(req.params.id);
      if (!certificate) {
        return res.status(404).json({ error: "Certificate not found" });
      }

      const forgeryReport = await storage.getForgeryReportByCertificateId(certificate.id);
      const refresh = String(req.query.refresh || "").toLowerCase() === "true";
      
      if (forgeryReport && !refresh) {
        res.json({
          ...forgeryReport,
          badge: forgeryDetector.getAuthenticityBadge(forgeryReport.authenticity),
          description: forgeryDetector.getFraudScoreDescription(forgeryReport.fraudScore),
        });
      } else {
        const filePath = certificate.fileUrl
          ? path.join(process.cwd(), certificate.fileUrl.replace(/^\/+/, ""))
          : undefined;
        const fileExists = !!filePath && fs.existsSync(filePath);
        const fileBuffer = fileExists ? fs.readFileSync(filePath) : undefined;
        const user = await storage.getUserById(certificate.userId);

        const analysis = await forgeryDetector.analyzeCertificate(
          certificate,
          fileBuffer,
          user || undefined,
          filePath,
          certificate.fileType || undefined
        );
        const report = await forgeryDetector.saveForgeryReport(certificate.id, analysis);
        
        res.json({
          ...report,
          badge: forgeryDetector.getAuthenticityBadge(report.authenticity),
          description: forgeryDetector.getFraudScoreDescription(report.fraudScore),
        });
      }
    } catch (error) {
      console.error("Get analysis error:", error);
      res.status(500).json({ error: "Failed to get analysis" });
    }
  });

  app.get("/api/verify/:hash", async (req: Request, res: Response) => {
    try {
      const { hash } = req.params;
      const verification = await blockchain.verifyBlock(hash);

      if (!verification.verified) {
        return res.status(404).json({ error: "Certificate not found or verification failed" });
      }

      const user = verification.certificate 
        ? await storage.getUserById(verification.certificate.userId)
        : null;

      res.json({
        verified: true,
        certificate: verification.certificate ? {
          title: verification.certificate.title,
          institution: verification.certificate.institution,
          status: verification.certificate.status,
          createdAt: verification.certificate.createdAt,
        } : null,
        owner: user ? {
          firstName: user.firstName,
          lastName: user.lastName,
        } : null,
        block: verification.block ? {
          index: verification.block.index,
          hash: verification.block.hash,
          timestamp: verification.block.timestamp,
        } : null,
      });
    } catch (error) {
      console.error("Verify error:", error);
      res.status(500).json({ error: "Verification failed" });
    }
  });

  app.get("/api/blockchain/stats", authenticateToken, async (_req: AuthRequest, res: Response) => {
    try {
      const stats = await blockchain.getChainStats();
      res.json(stats);
    } catch (error) {
      console.error("Get blockchain stats error:", error);
      res.status(500).json({ error: "Failed to get blockchain stats" });
    }
  });

  app.get("/api/blockchain/validate", authenticateToken, requireRole("admin"), async (_req: AuthRequest, res: Response) => {
    try {
      const validation = await blockchain.validateChain();
      res.json(validation);
    } catch (error) {
      console.error("Validate blockchain error:", error);
      res.status(500).json({ error: "Failed to validate blockchain" });
    }
  });

  app.get("/api/portfolio/:userId", async (req: Request, res: Response) => {
    try {
      const user = await storage.getUserById(req.params.userId);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      await storage.recordPortfolioView(
        user.id,
        req.ip,
        req.headers["user-agent"]
      );

      const certificates = await storage.getCertificatesByUserId(user.id);
      const projects = await storage.getProjectsByUserId(user.id);
      const approvedCerts = certificates.filter(c => c.status === "approved");
      const viewCount = await storage.getPortfolioViewCount(user.id);

      // Organize certificates by type
      const skills = approvedCerts
        .filter(c => c.certificateType === "course")
        .map(c => ({
          id: c.id,
          title: c.title,
          institution: c.institution,
          blockchainHash: c.blockchainHash,
          qrCode: c.qrCode,
          createdAt: c.createdAt,
        }));

      const internships = approvedCerts
        .filter(c => c.certificateType === "internship")
        .map(c => ({
          id: c.id,
          title: c.title,
          institution: c.institution,
          duration: c.internshipDuration,
          description: c.description,
          blockchainHash: c.blockchainHash,
          qrCode: c.qrCode,
          createdAt: c.createdAt,
        }));

      const hackathons = approvedCerts
        .filter(c => c.certificateType === "hackathon")
        .map(c => ({
          id: c.id,
          title: c.title,
          institution: c.institution,
          blockchainHash: c.blockchainHash,
          qrCode: c.qrCode,
          createdAt: c.createdAt,
        }));

      const workshops = approvedCerts
        .filter(c => c.certificateType === "workshop")
        .map(c => ({
          id: c.id,
          title: c.title,
          institution: c.institution,
          blockchainHash: c.blockchainHash,
          qrCode: c.qrCode,
          createdAt: c.createdAt,
        }));

      const { password: _, ...userWithoutPassword } = user;

      // Resume Optimization: Generate recruiter-friendly summary
      const smartSummary = generateSmartSummary(user, approvedCerts, projects);

      res.json({
        user: userWithoutPassword,
        summary: smartSummary,
        portfolio: {
          skills,
          internships,
          hackathons,
          workshops,
          projects: projects.map(p => ({
            id: p.id,
            title: p.title,
            description: p.description,
            githubLink: p.githubLink,
            createdAt: p.createdAt,
          })),
        },
        viewCount,
      });
    } catch (error) {
      console.error("Get portfolio error:", error);
      res.status(500).json({ error: "Failed to get portfolio" });
    }
  });

  app.get("/api/notifications", authenticateToken, async (req: AuthRequest, res: Response) => {
    try {
      const notifications = await storage.getNotificationsByUserId(req.user!.id);
      res.json(notifications);
    } catch (error) {
      console.error("Get notifications error:", error);
      res.status(500).json({ error: "Failed to get notifications" });
    }
  });

  app.post("/api/notifications/:id/read", authenticateToken, async (req: AuthRequest, res: Response) => {
    try {
      const notification = await storage.markNotificationAsRead(req.params.id);
      res.json(notification);
    } catch (error) {
      console.error("Mark notification read error:", error);
      res.status(500).json({ error: "Failed to mark notification as read" });
    }
  });

  app.post("/api/notifications/read-all", authenticateToken, async (req: AuthRequest, res: Response) => {
    try {
      await storage.markAllNotificationsAsRead(req.user!.id);
      res.json({ success: true });
    } catch (error) {
      console.error("Mark all notifications read error:", error);
      res.status(500).json({ error: "Failed to mark all notifications as read" });
    }
  });

  app.get("/api/activity", authenticateToken, async (req: AuthRequest, res: Response) => {
    try {
      const activity = await storage.getActivityByUserId(req.user!.id);
      res.json(activity);
    } catch (error) {
      console.error("Get activity error:", error);
      res.status(500).json({ error: "Failed to get activity" });
    }
  });

  app.get("/api/admin/users", authenticateToken, requireRole("admin"), async (req: AuthRequest, res: Response) => {
    try {
      const users = await storage.getAllUsers();
      console.log(`Admin ${req.user?.id} fetching users: found ${users.length} users`);
      const usersWithoutPassword = users.map((user) => {
        const { password, ...rest } = user;
        return rest;
      });
      res.json(usersWithoutPassword);
    } catch (error) {
      console.error("Get users error:", error);
      res.status(500).json({ error: "Failed to get users" });
    }
  });

  app.patch("/api/admin/users/:id", authenticateToken, requireRole("admin"), async (req: AuthRequest, res: Response) => {
    try {
      const { isActive, role } = req.body;
      const user = await storage.updateUser(req.params.id, { isActive, role });
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      const { password: _, ...userWithoutPassword } = user;
      res.json(userWithoutPassword);
    } catch (error) {
      console.error("Update user error:", error);
      res.status(500).json({ error: "Failed to update user" });
    }
  });

  app.get("/api/admin/analytics", authenticateToken, requireRole("admin"), async (_req: AuthRequest, res: Response) => {
    try {
      const analytics = await storage.getAnalytics();
      res.json(analytics);
    } catch (error) {
      console.error("Get analytics error:", error);
      res.status(500).json({ error: "Failed to get analytics" });
    }
  });

  app.get("/api/recruiter/candidates", authenticateToken, requireRole("recruiter"), async (req: AuthRequest, res: Response) => {
    try {
      const { search, minCertificates } = req.query;
      const students = await storage.getUsersByRole("student");
      
      const candidatesWithCerts = await Promise.all(
        students.map(async (student) => {
          const certs = await storage.getCertificatesByUserId(student.id);
          const approvedCerts = certs.filter(c => c.status === "approved");
          const { password: _, ...studentWithoutPassword } = student;
          return {
            ...studentWithoutPassword,
            certificateCount: approvedCerts.length,
            certificates: approvedCerts.slice(0, 5),
          };
        })
      );

      let filtered = candidatesWithCerts;

      if (search && typeof search === "string") {
        const searchLower = search.toLowerCase();
        filtered = filtered.filter(c => 
          c.firstName.toLowerCase().includes(searchLower) ||
          c.lastName.toLowerCase().includes(searchLower) ||
          c.email.toLowerCase().includes(searchLower) ||
          c.certificates.some(cert => 
            cert.title.toLowerCase().includes(searchLower) ||
            cert.institution.toLowerCase().includes(searchLower)
          )
        );
      }

      if (minCertificates && !isNaN(Number(minCertificates))) {
        filtered = filtered.filter(c => c.certificateCount >= Number(minCertificates));
      }

      filtered.sort((a, b) => b.certificateCount - a.certificateCount);

      res.json(filtered);
    } catch (error) {
      console.error("Get candidates error:", error);
      res.status(500).json({ error: "Failed to get candidates" });
    }
  });

  // ============================================
  // RECRUITER API ROUTES
  // ============================================

  // GET /api/students - Fetch all students with certificate data (for recruiter search)
  app.get("/api/students", authenticateToken, requireRole("recruiter"), async (req: AuthRequest, res: Response) => {
    try {
      const { keywords, field, year } = req.query;
      const students = await storage.getUsersByRole("student");

      const studentsWithData = await Promise.all(
        students.map(async (student) => {
          const certs = await storage.getCertificatesByUserId(student.id);
          const approvedCerts = certs.filter(c => c.status === "approved");
          const viewCount = await storage.getPortfolioViewCount(student.id);
          const { password: _, ...safe } = student;

          // Extract skills from certificate titles
          const skillTags = approvedCerts.map(c => c.title);

          return {
            ...safe,
            certificatesCount: approvedCerts.length,
            portfolioViews: viewCount,
            status: approvedCerts.length > 5 ? "available" as const : approvedCerts.length > 0 ? "seeking" as const : "hired" as const,
            skills: skillTags,
            certificates: approvedCerts.map(c => ({
              id: c.id,
              title: c.title,
              institution: c.institution,
              certificateType: c.certificateType,
            })),
          };
        })
      );

      let filtered = studentsWithData;

      // Keyword search across name, email, certificate titles, institutions
      if (keywords && typeof keywords === "string" && keywords.trim()) {
        const kw = keywords.toLowerCase();
        filtered = filtered.filter(s =>
          s.firstName.toLowerCase().includes(kw) ||
          s.lastName.toLowerCase().includes(kw) ||
          s.email.toLowerCase().includes(kw) ||
          s.skills.some(sk => sk.toLowerCase().includes(kw)) ||
          s.certificates.some(c =>
            c.title.toLowerCase().includes(kw) ||
            c.institution.toLowerCase().includes(kw)
          )
        );
      }

      // Sort by certificates count descending
      filtered.sort((a, b) => b.certificatesCount - a.certificatesCount);

      await storage.logActivity(req.user!.id, "recruiter_search", "search", undefined, { keywords, field, year, resultCount: filtered.length });

      res.json(filtered);
    } catch (error) {
      console.error("Get students error:", error);
      res.status(500).json({ error: "Failed to fetch students" });
    }
  });

  // Recruiter Shortlist
  app.post("/api/recruiter/shortlist/:studentId", authenticateToken, requireRole("recruiter"), async (req: AuthRequest, res: Response) => {
    try {
      const student = await storage.getUserById(req.params.studentId);
      if (!student) return res.status(404).json({ error: "Student not found" });

      const entry = await storage.addToShortlist(req.user!.id, req.params.studentId);
      await storage.logActivity(req.user!.id, "candidate_shortlisted", "shortlist", req.params.studentId);
      res.json(entry);
    } catch (error) {
      console.error("Shortlist error:", error);
      res.status(500).json({ error: "Failed to shortlist candidate" });
    }
  });

  app.delete("/api/recruiter/shortlist/:studentId", authenticateToken, requireRole("recruiter"), async (req: AuthRequest, res: Response) => {
    try {
      await storage.removeFromShortlist(req.user!.id, req.params.studentId);
      res.json({ success: true });
    } catch (error) {
      console.error("Remove shortlist error:", error);
      res.status(500).json({ error: "Failed to remove from shortlist" });
    }
  });

  app.get("/api/recruiter/shortlist", authenticateToken, requireRole("recruiter"), async (req: AuthRequest, res: Response) => {
    try {
      const shortlist = await storage.getShortlist(req.user!.id);

      // Enrich with student data
      const enriched = await Promise.all(
        shortlist.map(async (entry) => {
          const student = await storage.getUserById(entry.studentId);
          if (!student) return null;
          const certs = await storage.getCertificatesByUserId(student.id);
          const approvedCerts = certs.filter(c => c.status === "approved");
          const viewCount = await storage.getPortfolioViewCount(student.id);
          const { password: _, ...safe } = student;
          return {
            ...entry,
            student: {
              ...safe,
              certificatesCount: approvedCerts.length,
              portfolioViews: viewCount,
              skills: approvedCerts.map(c => c.title),
            },
          };
        })
      );

      res.json(enriched.filter(Boolean));
    } catch (error) {
      console.error("Get shortlist error:", error);
      res.status(500).json({ error: "Failed to get shortlist" });
    }
  });

  // Recruiter Notes  
  app.post("/api/recruiter/notes/:studentId", authenticateToken, requireRole("recruiter"), async (req: AuthRequest, res: Response) => {
    try {
      const { note } = req.body;
      if (!note || typeof note !== "string") return res.status(400).json({ error: "Note is required" });

      const entry = await storage.addRecruiterNote(req.user!.id, req.params.studentId, note);
      res.json(entry);
    } catch (error) {
      console.error("Add note error:", error);
      res.status(500).json({ error: "Failed to add note" });
    }
  });

  app.get("/api/recruiter/notes/:studentId", authenticateToken, requireRole("recruiter"), async (req: AuthRequest, res: Response) => {
    try {
      const notes = await storage.getRecruiterNotes(req.user!.id, req.params.studentId);
      res.json(notes);
    } catch (error) {
      console.error("Get notes error:", error);
      res.status(500).json({ error: "Failed to get notes" });
    }
  });

  app.delete("/api/recruiter/notes/:noteId", authenticateToken, requireRole("recruiter"), async (req: AuthRequest, res: Response) => {
    try {
      await storage.deleteRecruiterNote(req.params.noteId);
      res.json({ success: true });
    } catch (error) {
      console.error("Delete note error:", error);
      res.status(500).json({ error: "Failed to delete note" });
    }
  });

  // Contact Requests
  app.post("/api/recruiter/contact-request/:studentId", authenticateToken, requireRole("recruiter"), async (req: AuthRequest, res: Response) => {
    try {
      const { message } = req.body;
      const student = await storage.getUserById(req.params.studentId);
      if (!student) return res.status(404).json({ error: "Student not found" });

      const entry = await storage.createContactRequest(req.user!.id, req.params.studentId, message);

      // Send notification to student
      const recruiter = await storage.getUserById(req.user!.id);
      await storage.createNotification({
        userId: req.params.studentId,
        type: "contact_request",
        title: "New Contact Request",
        message: `${recruiter?.firstName || 'A recruiter'} ${recruiter?.lastName || ''} wants to connect with you.`,
        data: { requestId: entry.id, recruiterId: req.user!.id },
      });

      await storage.logActivity(req.user!.id, "contact_request_sent", "contact_request", entry.id);
      res.json(entry);
    } catch (error) {
      console.error("Contact request error:", error);
      res.status(500).json({ error: "Failed to send contact request" });
    }
  });

  app.get("/api/recruiter/contact-requests", authenticateToken, requireRole("recruiter"), async (req: AuthRequest, res: Response) => {
    try {
      const requests = await storage.getContactRequestsByRecruiter(req.user!.id);
      res.json(requests);
    } catch (error) {
      console.error("Get contact requests error:", error);
      res.status(500).json({ error: "Failed to get contact requests" });
    }
  });

  // Candidate Compare
  app.get("/api/recruiter/compare", authenticateToken, requireRole("recruiter"), async (req: AuthRequest, res: Response) => {
    try {
      const { ids } = req.query;
      if (!ids || typeof ids !== "string") return res.status(400).json({ error: "ids query parameter required" });

      const studentIds = ids.split(",").map(id => id.trim());
      const results = await Promise.all(
        studentIds.map(async (studentId) => {
          const student = await storage.getUserById(studentId);
          if (!student) return null;
          const certs = await storage.getCertificatesByUserId(studentId);
          const approvedCerts = certs.filter(c => c.status === "approved");
          const projects = await storage.getProjectsByUserId(studentId);
          const viewCount = await storage.getPortfolioViewCount(studentId);
          const { password: _, ...safe } = student;

          return {
            ...safe,
            certificatesCount: approvedCerts.length,
            portfolioViews: viewCount,
            projectsCount: projects.length,
            skills: approvedCerts.map(c => c.title),
            certificateTypes: {
              course: approvedCerts.filter(c => c.certificateType === "course").length,
              internship: approvedCerts.filter(c => c.certificateType === "internship").length,
              hackathon: approvedCerts.filter(c => c.certificateType === "hackathon").length,
              workshop: approvedCerts.filter(c => c.certificateType === "workshop").length,
            },
          };
        })
      );

      res.json(results.filter(Boolean));
    } catch (error) {
      console.error("Compare error:", error);
      res.status(500).json({ error: "Failed to compare candidates" });
    }
  });

  // Skill-based matching
  app.get("/api/recruiter/match", authenticateToken, requireRole("recruiter"), async (req: AuthRequest, res: Response) => {
    try {
      const { skills } = req.query;
      if (!skills || typeof skills !== "string") return res.status(400).json({ error: "skills query parameter required" });

      const skillList = skills.split(",").map(s => s.trim().toLowerCase());
      const students = await storage.getUsersByRole("student");

      const matchedStudents = await Promise.all(
        students.map(async (student) => {
          const certs = await storage.getCertificatesByUserId(student.id);
          const approvedCerts = certs.filter(c => c.status === "approved");
          const { password: _, ...safe } = student;

          // Match score: how many skill keywords match certificate titles
          let matchScore = 0;
          const matchedSkills: string[] = [];
          for (const cert of approvedCerts) {
            for (const skill of skillList) {
              if (cert.title.toLowerCase().includes(skill) || cert.institution.toLowerCase().includes(skill)) {
                matchScore++;
                if (!matchedSkills.includes(skill)) matchedSkills.push(skill);
              }
            }
          }

          if (matchScore === 0) return null;

          const viewCount = await storage.getPortfolioViewCount(student.id);

          return {
            ...safe,
            certificatesCount: approvedCerts.length,
            portfolioViews: viewCount,
            matchScore,
            matchedSkills,
            skills: approvedCerts.map(c => c.title),
          };
        })
      );

      const result = matchedStudents.filter(Boolean).sort((a: any, b: any) => b.matchScore - a.matchScore);
      res.json(result);
    } catch (error) {
      console.error("Match error:", error);
      res.status(500).json({ error: "Failed to match candidates" });
    }
  });

  // Recruiter Dashboard Stats
  app.get("/api/recruiter/dashboard", authenticateToken, requireRole("recruiter"), async (req: AuthRequest, res: Response) => {
    try {
      const shortlist = await storage.getShortlist(req.user!.id);
      const activity = await storage.getActivityByUserId(req.user!.id);
      const contactRequests = await storage.getContactRequestsByRecruiter(req.user!.id);

      const candidatesViewed = activity.filter(a => a.action === "recruiter_search" || a.action === "portfolio_viewed").length;
      const certificatesVerified = activity.filter(a => a.action === "certificate_verified").length;
      const searchesPerformed = activity.filter(a => a.action === "recruiter_search").length;

      // Get recent verifications from activity
      const recentVerifications = activity
        .filter(a => a.action === "certificate_verified")
        .slice(0, 5)
        .map(a => ({
          id: a.id,
          action: a.action,
          metadata: a.metadata,
          createdAt: a.createdAt,
        }));

      res.json({
        shortlistedCount: shortlist.length,
        candidatesViewed,
        certificatesVerified,
        searchesPerformed,
        contactRequestsSent: contactRequests.length,
        recentVerifications,
      });
    } catch (error) {
      console.error("Get recruiter dashboard error:", error);
      res.status(500).json({ error: "Failed to get dashboard stats" });
    }
  });

  // Log certificate verification by recruiter (for tracking)
  app.post("/api/recruiter/verify-log", authenticateToken, requireRole("recruiter"), async (req: AuthRequest, res: Response) => {
    try {
      const { certificateHash, studentName, institution } = req.body;
      await storage.logActivity(req.user!.id, "certificate_verified", "certificate", certificateHash, {
        studentName,
        institution,
        verifiedAt: new Date().toISOString(),
      });
      res.json({ success: true });
    } catch (error) {
      console.error("Verify log error:", error);
      res.status(500).json({ error: "Failed to log verification" });
    }
  });

  // Projects endpoints
  app.post("/api/projects", authenticateToken, async (req: AuthRequest, res: Response) => {
    try {
      const projectData = insertProjectSchema.parse(req.body);
      const project = await storage.createProject({
        ...projectData,
        userId: req.user!.id,
      });
      await storage.logActivity(req.user!.id, "project_created", "project", project.id);
      res.status(201).json(project);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors[0].message });
      }
      console.error("Create project error:", error);
      res.status(500).json({ error: "Failed to create project" });
    }
  });

  app.get("/api/projects", authenticateToken, async (req: AuthRequest, res: Response) => {
    try {
      const projects = await storage.getProjectsByUserId(req.user!.id);
      res.json(projects);
    } catch (error) {
      console.error("Get projects error:", error);
      res.status(500).json({ error: "Failed to get projects" });
    }
  });

  app.get("/api/projects/:id", authenticateToken, async (req: AuthRequest, res: Response) => {
    try {
      const project = await storage.getProjectById(req.params.id);
      if (!project) {
        return res.status(404).json({ error: "Project not found" });
      }
      if (project.userId !== req.user!.id) {
        return res.status(403).json({ error: "Unauthorized" });
      }
      res.json(project);
    } catch (error) {
      console.error("Get project error:", error);
      res.status(500).json({ error: "Failed to get project" });
    }
  });

  app.put("/api/projects/:id", authenticateToken, async (req: AuthRequest, res: Response) => {
    try {
      const project = await storage.getProjectById(req.params.id);
      if (!project) {
        return res.status(404).json({ error: "Project not found" });
      }
      if (project.userId !== req.user!.id) {
        return res.status(403).json({ error: "Unauthorized" });
      }

      const projectData = insertProjectSchema.partial().parse(req.body);
      const updated = await storage.updateProject(req.params.id, projectData);
      await storage.logActivity(req.user!.id, "project_updated", "project", req.params.id);
      res.json(updated);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors[0].message });
      }
      console.error("Update project error:", error);
      res.status(500).json({ error: "Failed to update project" });
    }
  });

  app.delete("/api/projects/:id", authenticateToken, async (req: AuthRequest, res: Response) => {
    try {
      const project = await storage.getProjectById(req.params.id);
      if (!project) {
        return res.status(404).json({ error: "Project not found" });
      }
      if (project.userId !== req.user!.id) {
        return res.status(403).json({ error: "Unauthorized" });
      }

      await storage.deleteProject(req.params.id);
      await storage.logActivity(req.user!.id, "project_deleted", "project", req.params.id);
      res.json({ message: "Project deleted" });
    } catch (error) {
      console.error("Delete project error:", error);
      res.status(500).json({ error: "Failed to delete project" });
    }
  });

  app.use("/uploads", (req, res, next) => {
    res.setHeader("Cache-Control", "public, max-age=31536000");
    next();
  });

  return httpServer;
}
