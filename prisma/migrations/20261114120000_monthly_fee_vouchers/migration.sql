-- Monthly fee per student
ALTER TABLE "Student" ADD COLUMN "monthlyFee" DOUBLE PRECISION NOT NULL DEFAULT 0;

-- Billing month on fee vouchers ("YYYY-MM"); NULL for one-off fees
ALTER TABLE "Fee" ADD COLUMN "month" TEXT;

-- One monthly voucher per student per month
CREATE UNIQUE INDEX "Fee_studentId_month_key" ON "Fee"("studentId", "month");

CREATE INDEX "Fee_schoolId_month_idx" ON "Fee"("schoolId", "month");
