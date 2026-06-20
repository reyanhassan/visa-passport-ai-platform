CREATE SCHEMA IF NOT EXISTS "public";

CREATE TYPE "UserRole" AS ENUM ('INDIVIDUAL', 'AGENCY_USER', 'AGENCY_ADMIN', 'ADMIN');
CREATE TYPE "AgencyStatus" AS ENUM ('PENDING', 'ACTIVE', 'SUSPENDED');
CREATE TYPE "ExtractionJobStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED');
CREATE TYPE "VisaApplicationStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'IN_REVIEW', 'APPROVED', 'REJECTED', 'CANCELLED');

CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "fullName" VARCHAR(200) NOT NULL,
    "email" VARCHAR(320) NOT NULL,
    "passwordHash" VARCHAR(255),
    "role" "UserRole" NOT NULL DEFAULT 'INDIVIDUAL',
    "agencyId" TEXT,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,
    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Agency" (
    "id" TEXT NOT NULL,
    "name" VARCHAR(200) NOT NULL,
    "email" VARCHAR(320) NOT NULL,
    "phone" VARCHAR(32),
    "country" CHAR(2),
    "city" VARCHAR(120),
    "status" "AgencyStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,
    CONSTRAINT "Agency_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PassportExtractionJob" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "agencyId" TEXT,
    "status" "ExtractionJobStatus" NOT NULL DEFAULT 'PENDING',
    "documentType" VARCHAR(32) NOT NULL,
    "countryHint" VARCHAR(3),
    "imageObjectKey" TEXT,
    "confidence" DECIMAL(5,4),
    "errorMessage" TEXT,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,
    "expiresAt" TIMESTAMPTZ(3),
    CONSTRAINT "PassportExtractionJob_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PassportExtractedData" (
    "id" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "passportNumberEncrypted" TEXT NOT NULL,
    "surnameEncrypted" TEXT NOT NULL,
    "givenNamesEncrypted" TEXT NOT NULL,
    "nationality" VARCHAR(3) NOT NULL,
    "dateOfBirthEncrypted" TEXT NOT NULL,
    "sex" VARCHAR(16),
    "dateOfIssue" DATE,
    "dateOfExpiry" DATE,
    "placeOfBirthEncrypted" TEXT,
    "mrzRawEncrypted" TEXT,
    "mrzValid" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PassportExtractedData_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "VisaApplication" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "agencyId" TEXT,
    "passportJobId" TEXT,
    "destinationCountry" CHAR(2) NOT NULL,
    "visaType" VARCHAR(120) NOT NULL,
    "status" "VisaApplicationStatus" NOT NULL DEFAULT 'DRAFT',
    "formData" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,
    CONSTRAINT "VisaApplication_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CountryRule" (
    "id" TEXT NOT NULL,
    "countryCode" CHAR(2) NOT NULL,
    "countryName" VARCHAR(120) NOT NULL,
    "rules" JSONB NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,
    CONSTRAINT "CountryRule_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "agencyId" TEXT,
    "action" VARCHAR(120) NOT NULL,
    "entityType" VARCHAR(120) NOT NULL,
    "entityId" VARCHAR(191),
    "ipAddress" VARCHAR(45),
    "userAgent" TEXT,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
CREATE INDEX "User_agencyId_role_idx" ON "User"("agencyId", "role");
CREATE INDEX "User_createdAt_idx" ON "User"("createdAt");
CREATE UNIQUE INDEX "Agency_email_key" ON "Agency"("email");
CREATE INDEX "Agency_status_idx" ON "Agency"("status");
CREATE INDEX "Agency_country_idx" ON "Agency"("country");
CREATE INDEX "Agency_createdAt_idx" ON "Agency"("createdAt");
CREATE INDEX "PassportExtractionJob_status_createdAt_idx" ON "PassportExtractionJob"("status", "createdAt");
CREATE INDEX "PassportExtractionJob_userId_createdAt_idx" ON "PassportExtractionJob"("userId", "createdAt");
CREATE INDEX "PassportExtractionJob_agencyId_createdAt_idx" ON "PassportExtractionJob"("agencyId", "createdAt");
CREATE INDEX "PassportExtractionJob_expiresAt_idx" ON "PassportExtractionJob"("expiresAt");
CREATE UNIQUE INDEX "PassportExtractedData_jobId_key" ON "PassportExtractedData"("jobId");
CREATE INDEX "VisaApplication_userId_createdAt_idx" ON "VisaApplication"("userId", "createdAt");
CREATE INDEX "VisaApplication_agencyId_status_createdAt_idx" ON "VisaApplication"("agencyId", "status", "createdAt");
CREATE INDEX "VisaApplication_passportJobId_idx" ON "VisaApplication"("passportJobId");
CREATE INDEX "VisaApplication_destinationCountry_visaType_idx" ON "VisaApplication"("destinationCountry", "visaType");
CREATE INDEX "VisaApplication_status_updatedAt_idx" ON "VisaApplication"("status", "updatedAt");
CREATE UNIQUE INDEX "CountryRule_countryCode_key" ON "CountryRule"("countryCode");
CREATE INDEX "CountryRule_isActive_idx" ON "CountryRule"("isActive");
CREATE INDEX "CountryRule_countryName_idx" ON "CountryRule"("countryName");
CREATE INDEX "AuditLog_userId_createdAt_idx" ON "AuditLog"("userId", "createdAt");
CREATE INDEX "AuditLog_agencyId_createdAt_idx" ON "AuditLog"("agencyId", "createdAt");
CREATE INDEX "AuditLog_entityType_entityId_idx" ON "AuditLog"("entityType", "entityId");
CREATE INDEX "AuditLog_action_createdAt_idx" ON "AuditLog"("action", "createdAt");
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");

ALTER TABLE "User" ADD CONSTRAINT "User_agencyId_fkey" FOREIGN KEY ("agencyId") REFERENCES "Agency"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "PassportExtractionJob" ADD CONSTRAINT "PassportExtractionJob_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "PassportExtractionJob" ADD CONSTRAINT "PassportExtractionJob_agencyId_fkey" FOREIGN KEY ("agencyId") REFERENCES "Agency"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "PassportExtractedData" ADD CONSTRAINT "PassportExtractedData_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "PassportExtractionJob"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "VisaApplication" ADD CONSTRAINT "VisaApplication_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "VisaApplication" ADD CONSTRAINT "VisaApplication_agencyId_fkey" FOREIGN KEY ("agencyId") REFERENCES "Agency"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "VisaApplication" ADD CONSTRAINT "VisaApplication_passportJobId_fkey" FOREIGN KEY ("passportJobId") REFERENCES "PassportExtractionJob"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_agencyId_fkey" FOREIGN KEY ("agencyId") REFERENCES "Agency"("id") ON DELETE SET NULL ON UPDATE CASCADE;
