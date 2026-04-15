-- CreateTable
CREATE TABLE "x_post_config" (
    "id" TEXT NOT NULL DEFAULT 'singleton',
    "autoPostEnabled" BOOLEAN NOT NULL DEFAULT false,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "x_post_config_pkey" PRIMARY KEY ("id")
);
