CREATE TABLE "VisaApplicationDocument" (
    "id" TEXT NOT NULL,
    "applicationId" TEXT NOT NULL,
    "userId" TEXT,
    "checklistItemId" VARCHAR(80) NOT NULL,
    "label" VARCHAR(120) NOT NULL,
    "objectKey" TEXT NOT NULL,
    "fileName" VARCHAR(255) NOT NULL,
    "contentType" VARCHAR(120) NOT NULL,
    "size" INTEGER NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,
    CONSTRAINT "VisaApplicationDocument_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "VisaApplicationDocument_applicationId_checklistItemId_idx" ON "VisaApplicationDocument"("applicationId", "checklistItemId");
CREATE INDEX "VisaApplicationDocument_userId_createdAt_idx" ON "VisaApplicationDocument"("userId", "createdAt");

ALTER TABLE "VisaApplicationDocument" ADD CONSTRAINT "VisaApplicationDocument_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "VisaApplication"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "VisaApplicationDocument" ADD CONSTRAINT "VisaApplicationDocument_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
