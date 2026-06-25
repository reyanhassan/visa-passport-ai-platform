CREATE TABLE "AgencyClient" (
    "id" TEXT NOT NULL,
    "agencyId" TEXT NOT NULL,
    "fullName" VARCHAR(200) NOT NULL,
    "email" VARCHAR(320),
    "phone" VARCHAR(32),
    "notes" TEXT,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,
    CONSTRAINT "AgencyClient_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "PassportExtractionJob" ADD COLUMN "agencyClientId" TEXT;
ALTER TABLE "VisaApplication" ADD COLUMN "agencyClientId" TEXT;

CREATE INDEX "AgencyClient_agencyId_createdAt_idx" ON "AgencyClient"("agencyId", "createdAt");
CREATE INDEX "PassportExtractionJob_agencyClientId_createdAt_idx" ON "PassportExtractionJob"("agencyClientId", "createdAt");
CREATE INDEX "VisaApplication_agencyClientId_createdAt_idx" ON "VisaApplication"("agencyClientId", "createdAt");

ALTER TABLE "AgencyClient" ADD CONSTRAINT "AgencyClient_agencyId_fkey" FOREIGN KEY ("agencyId") REFERENCES "Agency"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PassportExtractionJob" ADD CONSTRAINT "PassportExtractionJob_agencyClientId_fkey" FOREIGN KEY ("agencyClientId") REFERENCES "AgencyClient"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "VisaApplication" ADD CONSTRAINT "VisaApplication_agencyClientId_fkey" FOREIGN KEY ("agencyClientId") REFERENCES "AgencyClient"("id") ON DELETE SET NULL ON UPDATE CASCADE;
