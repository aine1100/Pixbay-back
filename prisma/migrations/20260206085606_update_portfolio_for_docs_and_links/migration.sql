-- AlterTable
ALTER TABLE "PortfolioMedia" ADD COLUMN     "url" TEXT,
ALTER COLUMN "original" DROP NOT NULL,
ALTER COLUMN "compressed" DROP NOT NULL,
ALTER COLUMN "thumbnail" DROP NOT NULL,
ALTER COLUMN "watermarked" DROP NOT NULL;
