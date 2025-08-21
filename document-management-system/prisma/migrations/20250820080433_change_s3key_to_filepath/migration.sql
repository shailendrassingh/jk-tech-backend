/*
  Warnings:

  - You are about to drop the column `s3Key` on the `documents` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[filePath]` on the table `documents` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `filePath` to the `documents` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "public"."documents_s3Key_key";

-- AlterTable
ALTER TABLE "public"."documents" DROP COLUMN "s3Key",
ADD COLUMN     "filePath" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "documents_filePath_key" ON "public"."documents"("filePath");
