import { eq, desc, and, sql, or, ilike } from "drizzle-orm";
import { db } from "./db";
import {
  users,
  certificates,
  blockchainBlocks,
  forgeryReports,
  portfolioViews,
  notifications,
  activityLogs,
  projects,
  recruiterShortlist,
  recruiterNotes,
  contactRequests,
  verifiedCertificateRegistry,
  type User,
  type InsertUser,
  type Certificate,
  type InsertCertificate,
  type BlockchainBlock,
  type ForgeryReport,
  type PortfolioView,
  type Notification,
  type InsertNotification,
  type ActivityLog,
  type Project,
  type InsertProject,
  type RecruiterShortlist,
  type RecruiterNote,
  type ContactRequest,
  type VerifiedCertificateRegistry,
} from "@shared/schema";

export interface IStorage {
  createUser(userData: InsertUser): Promise<User>;
  getUserById(id: string): Promise<User | null>;
  getUserByEmail(email: string): Promise<User | null>;
  updateUser(id: string, userData: Partial<User>): Promise<User | null>;
  getAllUsers(): Promise<User[]>;
  getUsersByRole(role: string): Promise<User[]>;
  deleteUser(id: string): Promise<boolean>;

  createCertificate(certData: InsertCertificate & { userId: string }): Promise<Certificate>;
  getCertificateById(id: string): Promise<Certificate | null>;
  getCertificatesByUserId(userId: string): Promise<Certificate[]>;
  getPendingCertificates(): Promise<Certificate[]>;
  getAllCertificates(): Promise<Certificate[]>;
  updateCertificate(id: string, certData: Partial<Certificate>): Promise<Certificate | null>;
  approveCertificate(id: string, reviewerId: string, notes: string, hash: string, qrCode: string): Promise<Certificate | null>;
  rejectCertificate(id: string, reviewerId: string, notes: string): Promise<Certificate | null>;
  searchCertificates(query: string): Promise<Certificate[]>;
  getCertificatesByStatus(status: string): Promise<Certificate[]>;
  findDuplicateCertificates(title: string, institution: string, excludeId?: string): Promise<Certificate[]>;

  addBlock(block: Omit<BlockchainBlock, "id">): Promise<BlockchainBlock>;
  getLatestBlock(): Promise<BlockchainBlock | null>;
  getBlockByHash(hash: string): Promise<BlockchainBlock | null>;
  getBlockByCertificateId(certificateId: string): Promise<BlockchainBlock | null>;
  getAllBlocks(): Promise<BlockchainBlock[]>;
  getBlockCount(): Promise<number>;

  createForgeryReport(report: Omit<ForgeryReport, "id" | "createdAt">): Promise<ForgeryReport>;
  getForgeryReportByCertificateId(certificateId: string): Promise<ForgeryReport | null>;
  getRecentForgeryReports(limit?: number): Promise<ForgeryReport[]>;

  recordPortfolioView(userId: string, viewerIp?: string, viewerUserAgent?: string): Promise<PortfolioView>;
  getPortfolioViewCount(userId: string): Promise<number>;
  getPortfolioViews(userId: string): Promise<PortfolioView[]>;

  createNotification(notification: InsertNotification): Promise<Notification>;
  getNotificationsByUserId(userId: string): Promise<Notification[]>;
  markNotificationAsRead(id: string): Promise<Notification | null>;
  markAllNotificationsAsRead(userId: string): Promise<void>;
  getUnreadNotificationCount(userId: string): Promise<number>;

  logActivity(userId: string, action: string, resourceType?: string, resourceId?: string, metadata?: any): Promise<ActivityLog>;
  getActivityByUserId(userId: string): Promise<ActivityLog[]>;
  getRecentActivity(limit?: number): Promise<ActivityLog[]>;

  createProject(projectData: InsertProject & { userId: string }): Promise<Project>;
  getProjectsByUserId(userId: string): Promise<Project[]>;
  getProjectById(id: string): Promise<Project | null>;
  updateProject(id: string, projectData: Partial<Project>): Promise<Project | null>;
  deleteProject(id: string): Promise<boolean>;

  getAnalytics(): Promise<{
    users: { total: number; roles: Record<string, number>; newThisWeek: number };
    certificates: { total: number; status: Record<string, number>; approvedThisWeek: number };
    blockchainBlocks: number;
  }>;

  // Recruiter features
  addToShortlist(recruiterId: string, studentId: string): Promise<RecruiterShortlist>;
  removeFromShortlist(recruiterId: string, studentId: string): Promise<boolean>;
  getShortlist(recruiterId: string): Promise<RecruiterShortlist[]>;
  isShortlisted(recruiterId: string, studentId: string): Promise<boolean>;

  addRecruiterNote(recruiterId: string, studentId: string, note: string): Promise<RecruiterNote>;
  getRecruiterNotes(recruiterId: string, studentId: string): Promise<RecruiterNote[]>;
  deleteRecruiterNote(noteId: string): Promise<boolean>;

  createContactRequest(recruiterId: string, studentId: string, message?: string): Promise<ContactRequest>;
  getContactRequestsForStudent(studentId: string): Promise<ContactRequest[]>;
  getContactRequestsByRecruiter(recruiterId: string): Promise<ContactRequest[]>;
  updateContactRequestStatus(id: string, status: string): Promise<ContactRequest | null>;

  // Verified certificate registry
  addToVerifiedRegistry(entry: { certificateId: string; contentHash: string; imageHash?: string; fileHash?: string; approvedBy?: string }): Promise<VerifiedCertificateRegistry>;
  getVerifiedRegistry(): Promise<VerifiedCertificateRegistry[]>;
}

export class DatabaseStorage implements IStorage {
  async createUser(userData: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(userData).returning();
    return user;
  }

  async getUserById(id: string): Promise<User | null> {
    const [user] = await db.select().from(users).where(eq(users.id, id)).limit(1);
    return user || null;
  }

  async getUserByEmail(email: string): Promise<User | null> {
    const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);
    return user || null;
  }

  async updateUser(id: string, userData: Partial<User>): Promise<User | null> {
    const [user] = await db.update(users).set({ ...userData, updatedAt: new Date() }).where(eq(users.id, id)).returning();
    return user || null;
  }

  async getAllUsers(): Promise<User[]> {
    return db.select().from(users).orderBy(desc(users.createdAt));
  }

  async getUsersByRole(role: string): Promise<User[]> {
    return db.select().from(users).where(eq(users.role, role)).orderBy(desc(users.createdAt));
  }

  async deleteUser(id: string): Promise<boolean> {
    await db.delete(users).where(eq(users.id, id));
    return true;
  }

  async createCertificate(certData: InsertCertificate & { userId: string }): Promise<Certificate> {
    const [cert] = await db.insert(certificates).values(certData).returning();
    return cert;
  }

  async getCertificateById(id: string): Promise<Certificate | null> {
    const [cert] = await db.select().from(certificates).where(eq(certificates.id, id)).limit(1);
    return cert || null;
  }

  async getCertificatesByUserId(userId: string): Promise<Certificate[]> {
    return db.select().from(certificates).where(eq(certificates.userId, userId)).orderBy(desc(certificates.createdAt));
  }

  async getPendingCertificates(): Promise<Certificate[]> {
    return db.select().from(certificates).where(eq(certificates.status, "pending")).orderBy(desc(certificates.createdAt));
  }

  async getAllCertificates(): Promise<Certificate[]> {
    return db.select().from(certificates).orderBy(desc(certificates.createdAt));
  }

  async updateCertificate(id: string, certData: Partial<Certificate>): Promise<Certificate | null> {
    const [cert] = await db.update(certificates).set({ ...certData, updatedAt: new Date() }).where(eq(certificates.id, id)).returning();
    return cert || null;
  }

  async approveCertificate(id: string, reviewerId: string, notes: string, hash: string, qrCode: string): Promise<Certificate | null> {
    const [cert] = await db.update(certificates).set({
      status: "approved",
      reviewedBy: reviewerId,
      reviewNotes: notes,
      blockchainHash: hash,
      qrCode: qrCode,
      updatedAt: new Date(),
    }).where(eq(certificates.id, id)).returning();
    return cert || null;
  }

  async rejectCertificate(id: string, reviewerId: string, notes: string): Promise<Certificate | null> {
    const [cert] = await db.update(certificates).set({
      status: "rejected",
      reviewedBy: reviewerId,
      reviewNotes: notes,
      updatedAt: new Date(),
    }).where(eq(certificates.id, id)).returning();
    return cert || null;
  }

  async searchCertificates(query: string): Promise<Certificate[]> {
    const searchPattern = `%${query}%`;
    return db.select().from(certificates).where(
      or(
        ilike(certificates.title, searchPattern),
        ilike(certificates.institution, searchPattern)
      )
    ).orderBy(desc(certificates.createdAt));
  }

  async getCertificatesByStatus(status: string): Promise<Certificate[]> {
    return db.select().from(certificates).where(eq(certificates.status, status)).orderBy(desc(certificates.createdAt));
  }

  async findDuplicateCertificates(title: string, institution: string, excludeId?: string): Promise<Certificate[]> {
    const conditions = [
      ilike(certificates.title, `%${title}%`),
      ilike(certificates.institution, `%${institution}%`),
    ];
    
    if (excludeId) {
      return db.select().from(certificates).where(
        and(
          ...conditions,
          sql`${certificates.id} != ${excludeId}`
        )
      );
    }
    
    return db.select().from(certificates).where(and(...conditions));
  }

  async addBlock(block: Omit<BlockchainBlock, "id">): Promise<BlockchainBlock> {
    const [newBlock] = await db.insert(blockchainBlocks).values(block).returning();
    return newBlock;
  }

  async getLatestBlock(): Promise<BlockchainBlock | null> {
    const [block] = await db.select().from(blockchainBlocks).orderBy(desc(blockchainBlocks.index)).limit(1);
    return block || null;
  }

  async getBlockByHash(hash: string): Promise<BlockchainBlock | null> {
    const [block] = await db.select().from(blockchainBlocks).where(eq(blockchainBlocks.hash, hash)).limit(1);
    return block || null;
  }

  async getBlockByCertificateId(certificateId: string): Promise<BlockchainBlock | null> {
    const [block] = await db.select().from(blockchainBlocks).where(eq(blockchainBlocks.certificateId, certificateId)).limit(1);
    return block || null;
  }

  async getAllBlocks(): Promise<BlockchainBlock[]> {
    return db.select().from(blockchainBlocks).orderBy(blockchainBlocks.index);
  }

  async getBlockCount(): Promise<number> {
    const result = await db.select({ count: sql<number>`count(*)` }).from(blockchainBlocks);
    return Number(result[0]?.count || 0);
  }

  async createForgeryReport(report: Omit<ForgeryReport, "id" | "createdAt">): Promise<ForgeryReport> {
    const [newReport] = await db.insert(forgeryReports).values(report).returning();
    return newReport;
  }

  async getForgeryReportByCertificateId(certificateId: string): Promise<ForgeryReport | null> {
    const [report] = await db.select()
      .from(forgeryReports)
      .where(eq(forgeryReports.certificateId, certificateId))
      .orderBy(desc(forgeryReports.createdAt))
      .limit(1);
    return report || null;
  }

  async getRecentForgeryReports(limit: number = 300): Promise<ForgeryReport[]> {
    return db.select().from(forgeryReports).orderBy(desc(forgeryReports.createdAt)).limit(limit);
  }

  async recordPortfolioView(userId: string, viewerIp?: string, viewerUserAgent?: string): Promise<PortfolioView> {
    const [view] = await db.insert(portfolioViews).values({
      userId,
      viewerIp,
      viewerUserAgent,
    }).returning();
    return view;
  }

  async getPortfolioViewCount(userId: string): Promise<number> {
    const result = await db.select({ count: sql<number>`count(*)` }).from(portfolioViews).where(eq(portfolioViews.userId, userId));
    return Number(result[0]?.count || 0);
  }

  async getPortfolioViews(userId: string): Promise<PortfolioView[]> {
    return db.select().from(portfolioViews).where(eq(portfolioViews.userId, userId)).orderBy(desc(portfolioViews.createdAt));
  }

  async createNotification(notification: InsertNotification): Promise<Notification> {
    const [notif] = await db.insert(notifications).values(notification).returning();
    return notif;
  }

  async getNotificationsByUserId(userId: string): Promise<Notification[]> {
    return db.select().from(notifications).where(eq(notifications.userId, userId)).orderBy(desc(notifications.createdAt));
  }

  async markNotificationAsRead(id: string): Promise<Notification | null> {
    const [notif] = await db.update(notifications).set({ isRead: true }).where(eq(notifications.id, id)).returning();
    return notif || null;
  }

  async markAllNotificationsAsRead(userId: string): Promise<void> {
    await db.update(notifications).set({ isRead: true }).where(eq(notifications.userId, userId));
  }

  async getUnreadNotificationCount(userId: string): Promise<number> {
    const result = await db.select({ count: sql<number>`count(*)` }).from(notifications)
      .where(and(eq(notifications.userId, userId), eq(notifications.isRead, false)));
    return Number(result[0]?.count || 0);
  }

  async logActivity(userId: string, action: string, resourceType?: string, resourceId?: string, metadata?: any): Promise<ActivityLog> {
    const [log] = await db.insert(activityLogs).values({
      userId,
      action,
      resourceType,
      resourceId,
      metadata,
    }).returning();
    return log;
  }

  async getActivityByUserId(userId: string): Promise<ActivityLog[]> {
    return db.select().from(activityLogs).where(eq(activityLogs.userId, userId)).orderBy(desc(activityLogs.createdAt)).limit(50);
  }

  async getRecentActivity(limit: number = 50): Promise<ActivityLog[]> {
    return db.select().from(activityLogs).orderBy(desc(activityLogs.createdAt)).limit(limit);
  }

  async createProject(projectData: InsertProject & { userId: string }): Promise<Project> {
    const [project] = await db.insert(projects).values(projectData).returning();
    return project;
  }

  async getProjectsByUserId(userId: string): Promise<Project[]> {
    return db.select().from(projects).where(eq(projects.userId, userId)).orderBy(desc(projects.createdAt));
  }

  async getProjectById(id: string): Promise<Project | null> {
    const [project] = await db.select().from(projects).where(eq(projects.id, id)).limit(1);
    return project || null;
  }

  async updateProject(id: string, projectData: Partial<Project>): Promise<Project | null> {
    const [project] = await db.update(projects).set({ ...projectData, updatedAt: new Date() }).where(eq(projects.id, id)).returning();
    return project || null;
  }

  async deleteProject(id: string): Promise<boolean> {
    await db.delete(projects).where(eq(projects.id, id));
    return true;
  }

  async getAnalytics(): Promise<{
    users: { total: number; roles: Record<string, number>; newThisWeek: number };
    certificates: { total: number; status: Record<string, number>; approvedThisWeek: number };
    blockchainBlocks: number;
  }> {
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

    const allUsers = await db.select().from(users);
    const allCerts = await db.select().from(certificates);
    const blockCount = await this.getBlockCount();

    const userRoles: Record<string, number> = {};
    let newUsersThisWeek = 0;
    for (const user of allUsers) {
      userRoles[user.role] = (userRoles[user.role] || 0) + 1;
      if (user.createdAt > oneWeekAgo) {
        newUsersThisWeek++;
      }
    }

    const certStatus: Record<string, number> = {};
    let approvedThisWeek = 0;
    for (const cert of allCerts) {
      certStatus[cert.status] = (certStatus[cert.status] || 0) + 1;
      if (cert.status === 'approved' && cert.updatedAt > oneWeekAgo) {
        approvedThisWeek++;
      }
    }

    return {
      users: {
        total: allUsers.length,
        roles: userRoles,
        newThisWeek: newUsersThisWeek,
      },
      certificates: {
        total: allCerts.length,
        status: certStatus,
        approvedThisWeek,
      },
      blockchainBlocks: blockCount,
    };
  }

  // Recruiter features
  async addToShortlist(recruiterId: string, studentId: string): Promise<RecruiterShortlist> {
    // Check if already shortlisted
    const existing = await db.select().from(recruiterShortlist)
      .where(and(eq(recruiterShortlist.recruiterId, recruiterId), eq(recruiterShortlist.studentId, studentId)))
      .limit(1);
    if (existing.length > 0) return existing[0];
    
    const [entry] = await db.insert(recruiterShortlist).values({ recruiterId, studentId }).returning();
    return entry;
  }

  async removeFromShortlist(recruiterId: string, studentId: string): Promise<boolean> {
    await db.delete(recruiterShortlist)
      .where(and(eq(recruiterShortlist.recruiterId, recruiterId), eq(recruiterShortlist.studentId, studentId)));
    return true;
  }

  async getShortlist(recruiterId: string): Promise<RecruiterShortlist[]> {
    return db.select().from(recruiterShortlist)
      .where(eq(recruiterShortlist.recruiterId, recruiterId))
      .orderBy(desc(recruiterShortlist.createdAt));
  }

  async isShortlisted(recruiterId: string, studentId: string): Promise<boolean> {
    const [entry] = await db.select().from(recruiterShortlist)
      .where(and(eq(recruiterShortlist.recruiterId, recruiterId), eq(recruiterShortlist.studentId, studentId)))
      .limit(1);
    return !!entry;
  }

  async addRecruiterNote(recruiterId: string, studentId: string, note: string): Promise<RecruiterNote> {
    const [entry] = await db.insert(recruiterNotes).values({ recruiterId, studentId, note }).returning();
    return entry;
  }

  async getRecruiterNotes(recruiterId: string, studentId: string): Promise<RecruiterNote[]> {
    return db.select().from(recruiterNotes)
      .where(and(eq(recruiterNotes.recruiterId, recruiterId), eq(recruiterNotes.studentId, studentId)))
      .orderBy(desc(recruiterNotes.createdAt));
  }

  async deleteRecruiterNote(noteId: string): Promise<boolean> {
    await db.delete(recruiterNotes).where(eq(recruiterNotes.id, noteId));
    return true;
  }

  async createContactRequest(recruiterId: string, studentId: string, message?: string): Promise<ContactRequest> {
    const [entry] = await db.insert(contactRequests).values({ recruiterId, studentId, message }).returning();
    return entry;
  }

  async getContactRequestsForStudent(studentId: string): Promise<ContactRequest[]> {
    return db.select().from(contactRequests)
      .where(eq(contactRequests.studentId, studentId))
      .orderBy(desc(contactRequests.createdAt));
  }

  async getContactRequestsByRecruiter(recruiterId: string): Promise<ContactRequest[]> {
    return db.select().from(contactRequests)
      .where(eq(contactRequests.recruiterId, recruiterId))
      .orderBy(desc(contactRequests.createdAt));
  }

  async updateContactRequestStatus(id: string, status: string): Promise<ContactRequest | null> {
    const [entry] = await db.update(contactRequests)
      .set({ status, updatedAt: new Date() })
      .where(eq(contactRequests.id, id))
      .returning();
    return entry || null;
  }

  // Verified certificate registry
  async addToVerifiedRegistry(entry: { certificateId: string; contentHash: string; imageHash?: string; fileHash?: string; approvedBy?: string }): Promise<VerifiedCertificateRegistry> {
    const [record] = await db.insert(verifiedCertificateRegistry).values(entry).returning();
    return record;
  }

  async getVerifiedRegistry(): Promise<VerifiedCertificateRegistry[]> {
    return db.select().from(verifiedCertificateRegistry);
  }
}

export const storage = new DatabaseStorage();
