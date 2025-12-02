# AcademicFolioChain

## Overview

AcademicFolioChain is a blockchain-based certificate verification platform that provides secure academic credential management for educational institutions. The system enables students to upload certificates, faculty to review and approve submissions, and recruiters to search and verify credentials. The platform uses a custom lightweight blockchain implementation to store immutable hashes of approved certificates, ensuring authenticity and preventing forgery.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

**Framework & Tooling**
- React with TypeScript via Vite for fast development and optimized builds
- Wouter for lightweight client-side routing without heavy router dependencies
- React Query (TanStack Query) for server state management, caching, and synchronization

**UI Components**
- Radix UI primitives provide accessible, unstyled component foundations
- Tailwind CSS with custom design tokens for consistent styling across the application
- shadcn/ui component library using the "new-york" style variant for polished UI elements
- Custom CSS variables for theming support (light/dark modes)

**State Management Strategy**
- Server state managed through React Query with infinite stale time to prevent unnecessary refetches
- Authentication state synced between localStorage (token storage) and React Query cache
- Form state handled by React Hook Form with Zod schema validation

**Authentication Flow**
- JWT tokens stored in localStorage under the `auth_token` key
- Token automatically attached to requests via custom `getAuthHeaders()` utility
- Protected routes check authentication status and redirect based on user role
- Role-based dashboard routing (student, faculty, recruiter, admin)

### Backend Architecture

**Server Framework**
- Express.js with TypeScript running on Node.js
- ES modules throughout the codebase for modern JavaScript features
- Custom middleware for authentication, file uploads, and request logging

**API Design**
- RESTful endpoints organized by resource type (auth, certificates, blockchain)
- JWT-based authentication middleware validates tokens on protected routes
- Role-based access control enforced at the route handler level
- Multer handles multipart form data for certificate file uploads (max 10MB)

**File Upload System**
- Files stored in local `uploads/` directory with unique timestamped filenames
- Supported formats: JPEG, PNG, GIF, PDF
- File metadata stored in database alongside certificate records
- Static file serving via Express middleware for uploaded content

**Blockchain Implementation**
- Custom lightweight proof-of-work blockchain (not Ethereum or external blockchain)
- Configurable difficulty level (default: 2 leading zeros)
- Each block contains: index, timestamp, data, previous hash, hash, nonce
- Mining function finds valid nonce to satisfy difficulty requirement
- Genesis block automatically created on first initialization
- Blocks linked to certificate records via foreign key relationships

**AI Forgery Detection**
- ForgeryDetector class analyzes uploaded certificates for authenticity
- Pattern matching against suspicious keywords (photoshop, modified, fake, etc.)
- Institution name validation against known educational providers
- Fraud scoring system (0-100) with configurable thresholds
- Error Level Analysis (ELA), noise analysis, and template matching placeholders
- Extracted text analysis and QR code validation
- Metadata examination (file size, type, dimensions, software used)

### Database Architecture

**ORM & Connection**
- Drizzle ORM provides type-safe database queries and schema definitions
- Neon serverless PostgreSQL for scalable cloud database hosting
- WebSocket-based connection pooling for optimal performance
- Schema-first approach with migrations stored in `./migrations`

**Core Tables**

*Users Table*
- UUID primary keys for all user records
- Email uniqueness constraint for authentication
- Password field stores bcrypt hashed credentials (10 salt rounds)
- Role-based system: student, faculty, recruiter, admin
- Profile images supported via URL storage
- Active status flag for account management

*Certificates Table*
- Foreign key relationship to users table (userId)
- Title, institution, and certificate type fields
- File storage: URL, filename, and MIME type
- Workflow states: pending, approved, rejected
- ReviewedBy foreign key links to faculty user who processed the certificate
- AI analysis results stored as JSON text
- Fraud score (integer 0-100) from forgery detection
- Blockchain hash stored after approval
- QR code data URL stored for verification

*Blockchain Blocks Table*
- Sequential index for block ordering
- JSONB data field stores certificate information
- Previous hash creates chain linkage
- Current hash computed from block contents
- Nonce field stores proof-of-work result
- Optional certificate_id foreign key links blocks to specific certificates

*Supporting Tables*
- Forgery reports for detailed AI analysis results
- Portfolio views for analytics tracking
- Notifications for user alerts
- Activity logs for audit trails
- Projects table for additional student portfolio items

**Storage Layer Abstraction**
- IStorage interface defines all database operations
- Methods organized by entity (users, certificates, blocks)
- Support for CRUD operations, searching, and status filtering
- Duplicate detection via title and institution matching
- Soft deletion patterns with isActive flags

### Security Architecture

**Password Security**
- Bcrypt hashing with 10 salt rounds prevents rainbow table attacks
- Passwords never stored in plaintext or logged
- Separate login schema validation with Zod

**API Security**
- JWT secret key stored in environment variable (JWT_SECRET)
- Tokens expire based on configuration (expiration time configurable)
- Bearer token authentication pattern in Authorization header
- Protected routes validate token and extract user identity
- Role-based middleware checks user permissions before allowing actions

**File Security**
- MIME type validation restricts uploads to allowed formats
- File size limits prevent denial-of-service attacks
- Unique filenames prevent path traversal vulnerabilities
- Static file serving configured with security headers

**Input Validation**
- Zod schemas validate all incoming data at API boundaries
- Insert schemas generated from Drizzle table definitions
- Type safety prevents SQL injection and malformed data
- Error messages sanitized before returning to client

## External Dependencies

### Database & Storage
- **Neon Serverless PostgreSQL**: Cloud-hosted PostgreSQL with serverless architecture and WebSocket connections
- **Drizzle ORM**: Type-safe SQL query builder and schema management with PostgreSQL dialect

### Authentication & Security
- **bcrypt**: Password hashing library for secure credential storage
- **jsonwebtoken**: JWT token generation and validation for stateless authentication

### File Processing
- **Multer**: Middleware for handling multipart/form-data file uploads
- **QRCode**: QR code generation library for creating verification codes

### Frontend UI Libraries
- **Radix UI**: Comprehensive collection of accessible, unstyled React components (accordion, dialog, dropdown, select, tabs, toast, tooltip, etc.)
- **Tailwind CSS**: Utility-first CSS framework with custom configuration
- **shadcn/ui**: Pre-built component library built on Radix UI and Tailwind

### Development Tools
- **Vite**: Fast build tool and development server with HMR support
- **TypeScript**: Static type checking across client and server code
- **Replit Plugins**: Development banner, runtime error modal, and cartographer for Replit environment integration

### Build & Deployment
- **esbuild**: Fast JavaScript bundler for server-side code
- **PostCSS**: CSS transformation with Tailwind and Autoprefixer plugins
- **Custom build script**: Combines Vite (client) and esbuild (server) builds into `dist/` directory

### AI & Crypto
- **crypto**: Node.js built-in module for hash generation (SHA-256) in blockchain implementation
- AI forgery detection module (custom implementation, no external ML service dependencies in current codebase)