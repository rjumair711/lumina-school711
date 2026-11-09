-- DropForeignKey
ALTER TABLE "StudyMaterial" DROP CONSTRAINT "StudyMaterial_teacherId_fkey";

-- AlterTable
ALTER TABLE "StudyMaterial" ADD COLUMN     "fileName" TEXT,
ADD COLUMN     "fileSize" INTEGER,
ADD COLUMN     "isPublished" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "mimeType" TEXT,
ADD COLUMN     "uploadedByName" TEXT,
ALTER COLUMN "teacherId" DROP NOT NULL;

-- CreateTable
CREATE TABLE "StudyMaterialFile" (
    "id" TEXT NOT NULL,
    "materialId" TEXT NOT NULL,
    "data" BYTEA NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StudyMaterialFile_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "StudyMaterialFile_materialId_key" ON "StudyMaterialFile"("materialId");

-- CreateIndex
CREATE INDEX "StudyMaterial_schoolId_createdAt_idx" ON "StudyMaterial"("schoolId", "createdAt");

-- CreateIndex
CREATE INDEX "StudyMaterial_classId_idx" ON "StudyMaterial"("classId");

-- CreateIndex
CREATE INDEX "StudyMaterial_subjectId_idx" ON "StudyMaterial"("subjectId");

-- AddForeignKey
ALTER TABLE "StudyMaterial" ADD CONSTRAINT "StudyMaterial_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "Teacher"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudyMaterialFile" ADD CONSTRAINT "StudyMaterialFile_materialId_fkey" FOREIGN KEY ("materialId") REFERENCES "StudyMaterial"("id") ON DELETE CASCADE ON UPDATE CASCADE;

