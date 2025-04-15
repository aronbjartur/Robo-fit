// src/app/api/routines/[id]/route.ts
import { NextResponse } from 'next/server';
// Fjarlægja Prisma týpuna þar sem hún er ekki notuð beint hér
import { PrismaClient /*, Prisma */ } from '@prisma/client';
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
  const routineId = parseInt(params.id, 10);
  if (isNaN(routineId)) { return NextResponse.json({ error: 'Invalid ID' }, { status: 400 }); }

  const authHeader = request.headers.get('Authorization');
  if (!jwtSecret) { console.error("DELETE Routine Config Error: JWT_SECRET not set"); return NextResponse.json({ error: 'Server error' }, { status: 500 }); }
  if (!authHeader || !authHeader.startsWith('Bearer ')) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const token = authHeader.split(' ')[1];
  let userId: number;
  try {
    const decoded = jwt.verify(token, jwtSecret) as JwtPayload;
    if (!decoded?.id || typeof decoded.id !== 'number') throw new Error('Invalid token payload');
    userId = decoded.id;
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    await prisma.$transaction(async (tx) => {
      const routine = await tx.routine.findUnique({ where: { id: routineId, userId: userId }, select: { id: true } });
      if (!routine) { const nfError = new Error('Not found'); nfError.name = 'NotFoundError'; throw nfError; }
      await tx.routineExercise.deleteMany({ where: { routineId: routineId } });
      await tx.routine.delete({ where: { id: routineId, userId: userId } });
    });
    return new NextResponse(null, { status: 204 });

  } catch (error: unknown) {
    if (typeof error === 'object' && error !== null && 'name' in error && error.name === 'NotFoundError') {
       return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    console.error(`API Error deleting routine ${routineId}:`, error);
    return NextResponse.json({ error: 'Failed to delete' }, { status: 500 });
  }
}