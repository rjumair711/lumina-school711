-- AlterTable
ALTER TABLE "Teacher" ADD COLUMN     "permissions" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "permissionsUpdatedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "PermissionLog" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "teacherId" TEXT NOT NULL,
    "changedById" TEXT,
    "changedByName" TEXT NOT NULL,
    "added" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "removed" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PermissionLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PermissionLog_schoolId_createdAt_idx" ON "PermissionLog"("schoolId", "createdAt");

-- CreateIndex
CREATE INDEX "PermissionLog_teacherId_createdAt_idx" ON "PermissionLog"("teacherId", "createdAt");

-- AddForeignKey
ALTER TABLE "PermissionLog" ADD CONSTRAINT "PermissionLog_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PermissionLog" ADD CONSTRAINT "PermissionLog_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "Teacher"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PermissionLog" ADD CONSTRAINT "PermissionLog_changedById_fkey" FOREIGN KEY ("changedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

