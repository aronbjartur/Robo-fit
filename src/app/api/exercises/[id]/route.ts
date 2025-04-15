// src/app/api/exercises/[id]/route.ts
import { NextResponse } from 'next/server';
import { PrismaClient, Prisma } from '@prisma/client'; // Import Prisma týpur
import jwt from 'jsonwebtoken';

const prisma = new PrismaClient();
const jwtSecret = process.env.JWT_SECRET;

interface JwtPayload {
  id: number;
  username: string;
  admin: boolean;
}

// Skilgreina týpu fyrir context objectið sem Next.js sendir
interface RouteContext {
  params: {
    id: string;
  }
}

export async function DELETE(
  request: Request,
  context: RouteContext // Nota context hér
) {
  const exerciseIdParam = context.params.id; // Ná í ID úr context
  const exerciseId = parseInt(exerciseIdParam, 10);
  if (isNaN(exerciseId)) { return NextResponse.json({ error: 'Invalid ID' }, { status: 400 }); }

  const authHeader = request.headers.get('Authorization');
  if (!jwtSecret) { console.error("DELETE Exercise Config Error: JWT_SECRET not set"); return NextResponse.json({ error: 'Server error' }, { status: 500 }); }
  if (!authHeader || !authHeader.startsWith('Bearer ')) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const token = authHeader.split(' ')[1];
  let userId: number;
  try {
    const decoded = jwt.verify(token, jwtSecret) as JwtPayload;
    if (!decoded || typeof decoded.id !== 'number') { throw new Error('Invalid token payload structure'); }
    userId = decoded.id;
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Nota transaction fyrir öryggi og samræmi
    await prisma.$transaction(async (tx) => {
      // Athuga fyrst hvort æfingin sé til og notandinn eigi hana
      const exercise = await tx.exercise.findUnique({
        where: { id: exerciseId, userId: userId },
        select: { id: true }
      });
      // Ef ekki, kasta villu sem ytri catch grípur
      if (!exercise) { const nfError = new Error('Not found'); nfError.name = 'NotFoundError'; throw nfError; }

      // Ef fannst, halda áfram að eyða tengdum gögnum
      await tx.workoutLog.deleteMany({ where: { exerciseId: exerciseId } });
      await tx.routineExercise.deleteMany({ where: { exerciseId: exerciseId } });
      // Eyða æfingunni sjálfri (userId check óþarfi hér þar sem findUnique staðfesti)
      await tx.exercise.delete({ where: { id: exerciseId } });
    });

    return new NextResponse(null, { status: 204 });

  } catch (error: unknown) { // Nota unknown
    // Athuga hvort þetta var NotFoundError sem við köstuðum
    if (typeof error === 'object' && error !== null && 'name' in error && error.name === 'NotFoundError') {
       return NextResponse.json({ error: 'Not found or forbidden' }, { status: 404 }); // Skila 404
    }
    // Logga aðrar óvæntar villur
    console.error(`API Error deleting exercise ${exerciseId}:`, error);
    return NextResponse.json({ error: 'Failed to delete' }, { status: 500 });
  }
}