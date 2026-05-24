-- CreateEnum
CREATE TYPE "Role" AS ENUM ('USER', 'ADMIN');

-- AlterTable: Add role to User
ALTER TABLE "User" ADD COLUMN "role" "Role" NOT NULL DEFAULT 'USER';

-- CreateIndex: User indexes for admin queries
CREATE INDEX "User_role_idx" ON "User"("role");
CREATE INDEX "User_plan_idx" ON "User"("plan");
CREATE INDEX "User_createdAt_idx" ON "User"("createdAt");

-- CreateIndex: AppProject createdAt for admin queries
CREATE INDEX "AppProject_createdAt_idx" ON "AppProject"("createdAt");
