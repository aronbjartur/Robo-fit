// src/app/api/exercises/[id]/route.ts
import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';

const prisma = new PrismaClient();
const jwtSecret = process.env.JWT_SECRET;

interface JwtPayload {
  id: number;
  username: string;
  admin: boolean;
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  const exerciseIdParam = params.id;
  const exerciseId = parseInt(exerciseIdParam, 10);
  if (isNaN(exerciseId)) {
    return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });
  }

  const authHeader = request.headers.get('Authorization');
  if (!jwtSecret) {
    console.error("DELETE Exercise Config Error: JWT_SECRET not set");
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const token = authHeader.split(' ')[1];
  let userId: number;
  try {
    const decoded = jwt.verify(token, jwtSecret) as JwtPayload;
    if (!decoded || typeof decoded.id !== 'number') {
      throw new Error('Invalid token payload structure');
    }
    userId = decoded.id;
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Use a transaction for safety and consistency
    await prisma.$transaction(async (tx) => {
      // First, verify that the exercise exists and belongs to the user
      const exercise = await tx.exercise.findUnique({
        where: { id: exerciseId, userId: userId },
        select: { id: true }
      });
      if (!exercise) {
        const nfError = new Error('Not found');
        nfError.name = 'NotFoundError';
        throw nfError;
      }

      // Delete related records before deleting the exercise
      await tx.workoutLog.deleteMany({ where: { exerciseId: exerciseId } });
      await tx.routineExercise.deleteMany({ where: { exerciseId: exerciseId } });
      await tx.exercise.delete({ where: { id: exerciseId } });
    });

    return new NextResponse(null, { status: 204 });
  } catch (error: unknown) {
    if (
      typeof error === 'object' &&
      error !== null &&
      'name' in error &&
      (error as any).name === 'NotFoundError'
    ) {
      return NextResponse.json({ error: 'Not found or forbidden' }, { status: 404 });
    }
    console.error(`API Error deleting exercise ${exerciseId}:`, error);
    return NextResponse.json({ error: 'Failed to delete' }, { status: 500 });
  }
}