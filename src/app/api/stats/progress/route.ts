import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';

const prisma = new PrismaClient();
const jwtSecret = process.env.JWT_SECRET;

interface JwtPayload { id: number; }
type LogDataForStats = { date: Date | null; weight: number | null; };

export async function GET(request: Request) {
  const authHeader = request.headers.get('Authorization');
  if (!jwtSecret) {
    console.error("API Stats Error: JWT_SECRET not set");
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

  const { searchParams } = new URL(request.url);
  const exerciseIdParam = searchParams.get('exerciseId');
  if (!exerciseIdParam) {
    return NextResponse.json({ error: 'Missing parameter' }, { status: 400 });
  }
  const exerciseId = parseInt(exerciseIdParam, 10);
  if (isNaN(exerciseId)) {
    return NextResponse.json({ error: 'Invalid parameter' }, { status: 400 });
  }

  try {
    const logs: LogDataForStats[] = await prisma.workoutLog.findMany({
      where: { userId: userId, exerciseId: exerciseId },
      orderBy: { date: 'asc' },
      select: { date: true, weight: true }
    });

    
    if (logs.length === 0) {
        return NextResponse.json([], { status: 200 });
    }

   
    const processedData = logs
        .filter(log => log.date instanceof Date && typeof log.weight === 'number' && !isNaN(log.weight))
        .map(log => ({
            date: log.date!.toISOString().split('T')[0],
            value: log.weight!
        }));

    return NextResponse.json(processedData, { status: 200 });

  } catch (error) {
    console.error(`API Stats Error processing data for ex ${exerciseId}, user ${userId}:`, error);
    return NextResponse.json({ error: 'Failed to get progress data' }, { status: 500 });
  }
}