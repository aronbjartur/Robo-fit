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
    console.error("API GET Exercises Error: JWT_SECRET not set");
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
    const exercises = await prisma.exercise.findMany({
      where: { OR: [ { isDefault: true }, { userId: userId } ] },
      orderBy: { name: 'asc' },
      select: { id: true, name: true, description: true, userId: true }
    });
    return NextResponse.json(exercises, { status: 200 });
  } catch (error) {
    console.error("API GET Exercises DB Error:", error);
    return NextResponse.json({ error: 'Failed to get exercises' }, { status: 500 });
  }
}

const createExerciseSchema = z.object({
  name: z.string().trim().min(1, { message: "Name required" }),
  description: z.string().trim().optional().nullable(),
});

export async function POST(request: Request) {
    const authHeader = request.headers.get('Authorization');
    if (!jwtSecret) { console.error("API POST Exercise Error: JWT_SECRET not set"); return NextResponse.json({ error: 'Server error' }, { status: 500 }); }
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

    const validationResult = createExerciseSchema.safeParse(requestBody);
    if (!validationResult.success) {
        return NextResponse.json({ error: 'Invalid data', details: validationResult.error.flatten().fieldErrors }, { status: 400 });
    }
    const { name, description } = validationResult.data;

    try {
        const newExercise = await prisma.exercise.create({
          data: { name: name, description: description, isDefault: false, userId: userId },
          select: { id: true, name: true, description: true, userId: true }
        });
        return NextResponse.json(newExercise, { status: 201 });
    } catch (error: unknown) { 
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
           
            const target = error.meta?.target as string[] | string | undefined; // Skilgreina týpu fyrir target
            if (target && (Array.isArray(target) || typeof target === 'string') && target.includes('name')) {
               return NextResponse.json({ error: 'Exercise name already exists' }, { status: 409 });
            }
        }
        console.error(`API POST Exercise Error for user ${userId}:`, error);
        return NextResponse.json({ error: 'Failed to create exercise' }, { status: 500 });
    }
}