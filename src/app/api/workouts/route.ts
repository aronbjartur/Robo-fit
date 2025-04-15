import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';
import { z } from 'zod';

const prisma = new PrismaClient();
const jwtSecret = process.env.JWT_SECRET;

interface JwtPayload {
  id: number;
  username?: string;
  admin?: boolean;
}

const workoutLogSchema = z.object({
  exerciseId: z.number().int().positive({ message: "Invalid Exercise ID" }),
  date: z.string().datetime({ message: "Invalid date format (ISO 8601 string expected)" }),
  sets: z.number().int().min(1, { message: "Sets must be at least 1"}),
  reps: z.number().int().min(1, { message: "Reps must be at least 1"}),
  weight: z.number().min(0, { message: "Weight cannot be negative"}),
});

export async function POST(request: Request) {
  const authHeader = request.headers.get('Authorization');
  if (!jwtSecret) { console.error("API POST Workout Error: JWT_SECRET not set"); return NextResponse.json({ error: 'Server Error' }, { status: 500 }); }
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
  let requestBody;
  try { requestBody = await request.json(); }
  catch { 
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const validationResult = workoutLogSchema.safeParse(requestBody);
  if (!validationResult.success) {
    return NextResponse.json({ error: 'Invalid data', details: validationResult.error.flatten().fieldErrors }, { status: 400 });
  }
  const { exerciseId, date, sets, reps, weight } = validationResult.data;

  try {
    const exercise = await prisma.exercise.findFirst({
       where: { id: exerciseId, OR: [ { isDefault: true }, { userId: userId } ] },
       select: { id: true }
    });
    if (!exercise) {
        return NextResponse.json({ error: 'Selected exercise is not valid' }, { status: 400 });
    }

    const newLog = await prisma.workoutLog.create({
      data: { userId: userId, exerciseId: exerciseId, date: new Date(date), sets: sets, reps: reps, weight: weight },
      select: { id: true, date: true, sets: true, reps: true, weight: true, exerciseId: true, userId: true }
    });

    return NextResponse.json(newLog, { status: 201 });

  } catch (error) {
    console.error("API POST Workout DB Error:", error);
    return NextResponse.json({ error: 'Failed to save log' }, { status: 500 });
  }
}

export async function GET(request: Request) {
   const authHeader = request.headers.get('Authorization');
   if (!jwtSecret) { console.error("API GET Workouts Error: JWT_SECRET not set"); return NextResponse.json({ error: 'Server Error' }, { status: 500 }); }
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
        const logs = await prisma.workoutLog.findMany({
            where: { userId: userId },
            orderBy: { date: 'desc' },
            include: { exercise: { select: { name: true } } }
        });
        return NextResponse.json(logs, { status: 200 });
   } catch(error) {
       console.error("API GET Workouts DB Error:", error);
       return NextResponse.json({ error: 'Failed to get logs' }, { status: 500 });
   }
}