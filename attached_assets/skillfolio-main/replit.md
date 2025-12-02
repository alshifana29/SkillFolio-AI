# AcademicFolioChain

## Overview

AcademicFolioChain is a blockchain-based certificate verification system that provides secure academic credential management for educational institutions. The platform enables students to upload and verify certificates, faculty to review submissions, recruiters to verify credentials, and administrators to oversee the entire system. All approved certificates are stored on a custom lightweight blockchain with AI-powered fraud detection.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React with TypeScript using Vite for development
- **UI Library**: Radix UI components with Tailwind CSS for styling
- **State Management**: React Query for server state and caching
- **Routing**: Wouter for lightweight client-side routing
- **Authentication**: JWT tokens stored in localStorage with bearer token headers
- **File Handling**: React Dropzone for drag-and-drop certificate uploads

### Backend Architecture
- **Runtime**: Node.js with Express.js framework
- **Language**: TypeScript with ES modules
- **Authentication**: JWT with bcrypt for password hashing
- **File Processing**: Multer for handling certificate uploads
- **API Design**: RESTful endpoints with role-based access control middleware

### Database Architecture
- **Primary Database**: PostgreSQL via Neon serverless platform
- **ORM**: Drizzle ORM with type-safe schema definitions
- **Schema Design**: 
  - Users table with role-based permissions (student, faculty, recruiter, admin)
  - Certificates table with approval workflow and blockchain integration
  - Blockchain table for immutable record storage
  - Portfolio views for analytics tracking

### Blockchain Implementation
- **Type**: Custom lightweight JSON-based blockchain (not Ethereum)
- **Consensus**: Simple proof-of-work with configurable difficulty
- **Storage**: Database-backed with hash verification
- **Purpose**: Immutable storage of approved certificate hashes for verification

### Security Architecture
- **Password Security**: bcrypt hashing with salt rounds
- **API Security**: JWT middleware for protected routes
- **Role-Based Access**: Middleware enforcing user permissions
- **File Security**: Type and size validation for uploads
- **CORS**: Configured for cross-origin requests

### AI Integration
- **Purpose**: Certificate fraud detection and anomaly analysis
- **Implementation**: Simulated AI analysis returning structured results
- **Integration Point**: Pre-approval review process for faculty
- **Output**: Analysis reports for manual review assistance

## External Dependencies

### Database Services
- **Neon Database**: Serverless PostgreSQL hosting with connection pooling
- **WebSocket Support**: Real-time database connections via ws library

### Authentication & Security
- **bcrypt**: Password hashing and verification
- **jsonwebtoken**: JWT token generation and validation
- **multer**: Multipart form data handling for file uploads

### UI Components & Styling
- **Radix UI**: Comprehensive component library for accessible UI elements
- **Tailwind CSS**: Utility-first CSS framework with custom design system
- **Lucide React**: Icon library for consistent iconography

### Development Tools
- **Vite**: Fast development server and build tool
- **TypeScript**: Type safety across frontend and backend
- **ESBuild**: Fast JavaScript bundler for production builds
- **Drizzle Kit**: Database migration and schema management

### Utility Libraries
- **React Query**: Server state management and caching
- **QRCode**: QR code generation for certificate verification
- **Wouter**: Lightweight routing for single-page application
- **Class Variance Authority**: Type-safe CSS class composition
- **Zod**: Runtime type validation for API schemas

### File Processing
- **React Dropzone**: Drag-and-drop file upload interface
- **File Type Validation**: Support for PDF, JPEG, and PNG certificate formats
- **Size Limits**: 10MB maximum file size with client-side validation