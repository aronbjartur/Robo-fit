import { NextResponse } from 'next/server';
import { PrismaClient, Prisma } from '@prisma/client'; 
import jwt from 'jsonwebtoken';
import { z } from 'zod';

const prisma = new PrismaClient();
const jwtSecret = process.env.JWT_SECRET;

interface JwtPayload {
  id: number;
  username: string;
  admin: boolean;
}

export async function GET(request: Request) {
  const authHeader = request.headers.get('Authorization');
  if (!jwtSecret) {
    console.error("API GET Routines Error: JWT_SECRET not set");
    return NextResponse.json({ error: 'Server Error' }, { status: 500 });
  }
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const token = authHeader.split(' ')[1];
  let userId: number;
  try {
    const decoded = jwt.verify(token, jwtSecret) as JwtPayload;
    if (!decoded?.id || typeof decoded.id !== 'number') {
        throw new Error('Invalid token payload structure');
    }
    userId = decoded.id;
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const routines = await prisma.routine.findMany({
      where: { OR: [ { isDefault: true }, { userId: userId } ] },
      include: { exercises: { orderBy: { order: 'asc' }, include: { exercise: { select: { id: true, name: true } } } } },
      orderBy: [ { isDefault: 'desc' }, { name: 'asc' } ]
    });
    return NextResponse.json(routines, { status: 200 });

  } catch (error) {
    console.error("API GET Routines DB Error:", error);
    return NextResponse.json({ error: 'Failed to get routines' }, { status: 500 });
  }
}

const createRoutineSchema = z.object({
  name: z.string().trim().min(1, { message: "Routine name cannot be empty" }),
  exerciseIds: z.array(z.number().int().positive()).min(1, { message: "Select at least one exercise" }),
});

export async function POST(request: Request) {
     const authHeader = request.headers.get('Authorization');
     if (!jwtSecret) { console.error("API POST Routine Error: JWT_SECRET not set"); return NextResponse.json({ error: 'Server error' }, { status: 500 });}
     if (!authHeader || !authHeader.startsWith('Bearer ')) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
     const token = authHeader.split(' ')[1];
     let userId: number;
     try {
         const decoded = jwt.verify(token, jwtSecret) as JwtPayload;
         if (!decoded?.id || typeof decoded.id !== 'number') { throw new Error('Invalid token payload'); }
         userId = decoded.id;
     } catch { 
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
    let requestBody;
    try { requestBody = await request.json(); }
    catch { 
        return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
      }

    const validationResult = createRoutineSchema.safeParse(requestBody);
    if (!validationResult.success) {
        return NextResponse.json({ error: 'Invalid data', details: validationResult.error.flatten().fieldErrors }, { status: 400 });
    }
    const { name, exerciseIds } = validationResult.data;

    try {
        const validExercises = await prisma.exercise.findMany({
            where: { id: { in: exerciseIds }, OR: [ { isDefault: true }, { userId: userId } ] },
            select: { id: true }
        });
        if (validExercises.length !== exerciseIds.length) {
            const validIds = new Set(validExercises.map(ex => ex.id));
            const invalidIds = exerciseIds.filter(id => !validIds.has(id));
            return NextResponse.json({ error: `Invalid or inaccessible exercise IDs: ${invalidIds.join(', ')}` }, { status: 400 });
        }

        const newRoutine = await prisma.$transaction(async (tx) => {
            const createdRoutine = await tx.routine.create({ data: { name: name, isDefault: false, userId: userId } });
            const routineExercisesData = exerciseIds.map((exId, index) => ({ routineId: createdRoutine.id, exerciseId: exId, order: index + 1 }));
            await tx.routineExercise.createMany({ data: routineExercisesData });
            const fullRoutine = await tx.routine.findUniqueOrThrow({
                 where: { id: createdRoutine.id },
                 include: { exercises: { include: { exercise: { select: { id: true, name: true } } } } }
             });
            return fullRoutine;
        });

        return NextResponse.json(newRoutine, { status: 201 });

    } catch (error: unknown) { 
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
             const target = error.meta?.target as string[] | string | undefined;
             if (target && (Array.isArray(target) || typeof target === 'string') && target.includes('name')) {
                 return NextResponse.json({ error: 'Routine name already exists' }, { status: 409 });
             }
        }
        console.error(`API POST Routine Error for user ${userId}:`, error);
        return NextResponse.json({ error: 'Failed to create routine' }, { status: 500 });
    }
}