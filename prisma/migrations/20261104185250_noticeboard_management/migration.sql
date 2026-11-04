-- CreateEnum
CREATE TYPE "NoticeStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "NoticeAudience" AS ENUM ('EVERYONE', 'TEACHERS', 'STUDENTS', 'PARENTS', 'CLASS');

-- AlterTable
ALTER TABLE "Notice" ADD COLUMN     "audience" "NoticeAudience" NOT NULL DEFAULT 'EVERYONE',
ADD COLUMN     "authorId" TEXT,
ADD COLUMN     "classId" TEXT,
ADD COLUMN     "expiresAt" TIMESTAMP(3),
ADD COLUMN     "isPinned" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "publishAt" TIMESTAMP(3),
ADD COLUMN     "status" "NoticeStatus" NOT NULL DEFAULT 'PUBLISHED';

-- CreateIndex
CREATE INDEX "Notice_schoolId_status_publishAt_idx" ON "Notice"("schoolId", "status", "publishAt");

-- CreateIndex
CREATE INDEX "Notice_schoolId_audience_idx" ON "Notice"("schoolId", "audience");

-- CreateIndex
CREATE INDEX "Notice_classId_idx" ON "Notice"("classId");

-- AddForeignKey
ALTER TABLE "Notice" ADD CONSTRAINT "Notice_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notice" ADD CONSTRAINT "Notice_classId_fkey" FOREIGN KEY ("classId") REFERENCES "Class"("id") ON DELETE SET NULL ON UPDATE CASCADE;
