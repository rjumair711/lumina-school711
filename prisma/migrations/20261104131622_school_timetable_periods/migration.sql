-- CreateTable
CREATE TABLE "SchoolPeriod" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isBreak" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SchoolPeriod_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SchoolPeriod_schoolId_sortOrder_idx" ON "SchoolPeriod"("schoolId", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "SchoolPeriod_schoolId_name_key" ON "SchoolPeriod"("schoolId", "name");

-- AddForeignKey
ALTER TABLE "SchoolPeriod" ADD CONSTRAINT "SchoolPeriod_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;
