-- Keep the production User table aligned with the fields used by auth queries.
ALTER TABLE "User"
  ADD COLUMN IF NOT EXISTS "accessRole" TEXT DEFAULT 'CEO',
  ADD COLUMN IF NOT EXISTS "accessResetAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "organizationId" TEXT;

-- OAuth-created users do not have a password until they set one.
ALTER TABLE "User" ALTER COLUMN "passwordHash" DROP NOT NULL;
