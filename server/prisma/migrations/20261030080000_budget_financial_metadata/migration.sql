-- Provenance columns used by the budget and financial import paths.
ALTER TABLE "Budget" ADD COLUMN "metadata" JSONB;
ALTER TABLE "FinancialRecord" ADD COLUMN "metadata" JSONB;
