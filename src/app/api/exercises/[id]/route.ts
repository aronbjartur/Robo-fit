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
  const exerciseId = parseInt(params.id, 10);
  if (isNaN(exerciseId)) { return NextResponse.json({ error: 'Invalid ID' }, { status: 400 }); }

  const authHeader = request.headers.get('Authorization');
  if (!jwtSecret) { console.error("DELETE Exercise Config Error: JWT_SECRET not set"); return NextResponse.json({ error: 'Server error' }, { status: 500 }); }
  if (!authHeader || !authHeader.startsWith('Bearer ')) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const token = authHeader.split(' ')[1];
  let userId: number;
  try {
    const decoded = jwt.verify(token, jwtSecret) as JwtPayload;
    if (!decoded || typeof decoded.id !== 'number') {
      throw new Error('Invalid token payload structure');
    }
    userId = decoded.id;
  } catch { // Fjarlægja ónotaða error breytu (_e)
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const exercise = await prisma.exercise.findUnique({
      where: { id: exerciseId, userId: userId },
      select: { id: true }
    });
    if (!exercise) { return NextResponse.json({ error: 'Not found' }, { status: 404 }); }

    await prisma.$transaction(async (tx) => {
      await tx.workoutLog.deleteMany({ where: { exerciseId: exerciseId } });
      await tx.routineExercise.deleteMany({ where: { exerciseId: exerciseId } });
      await tx.exercise.delete({ where: { id: exerciseId, userId: userId } });
    });

    return new NextResponse(null, { status: 204 });

  } catch (error) {
    console.error(`API Error deleting exercise ${exerciseId}:`, error);
    return NextResponse.json({ error: 'Failed to delete' }, { status: 500 });
  }
}