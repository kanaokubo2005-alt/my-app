-- AlterTable
ALTER TABLE "User" ADD COLUMN     "age" INTEGER;

-- CreateTable
CREATE TABLE "Task" (
    "id" SERIAL NOT NULL,
    "title" TEXT NOT NULL,
    "deadline" TEXT NOT NULL,
    "priority" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "duration" INTEGER NOT NULL,
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "description" TEXT,

    CONSTRAINT "Task_pkey" PRIMARY KEY ("id")
);
