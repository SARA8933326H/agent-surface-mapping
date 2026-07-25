-- AlterTable
ALTER TABLE "Risk" ADD COLUMN     "remediation" TEXT,
ADD COLUMN     "source" TEXT NOT NULL DEFAULT 'HEURISTIC',
ADD COLUMN     "url" TEXT;
