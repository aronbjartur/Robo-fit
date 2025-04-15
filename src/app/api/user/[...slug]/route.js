import { Hono } from 'hono';
import { handle } from 'hono/vercel';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import { z } from 'zod';
import { PrismaClient } from '@prisma/client';

const jwtSecret = process.env.JWT_SECRET;

if (!jwtSecret) {
  console.error("FATAL ERROR: JWT_SECRET is not defined in environment variables.");
}

const tokenLifetime = parseInt(process.env.TOKEN_LIFETIME || '3600', 10);
const bcryptRounds = parseInt(process.env.BCRYPT_ROUNDS || '10', 10);

const prisma = new PrismaClient();
const app = new Hono().basePath('/api/user');

const UserSchema = z.object({
  username: z.string(),
  email: z.string().email(),
  password: z.string().min(6),
});

async function findUserByUsername(username) {
  return await prisma.user.findUnique({ where: { username } });
}

app.post('/register', async (c) => {
  let payload;
  try { payload = await c.req.json(); }
  catch { return c.json({ error: 'Invalid request' }, 400); }

  const validationResult = UserSchema.safeParse(payload);
  if (!validationResult.success) { return c.json({ error: 'Invalid input' }, 400); }
  const { username, email, password } = validationResult.data;

  try {
    const existingUser = await findUserByUsername(username);
    if (existingUser) { return c.json({ error: 'Username taken' }, 409); }

    const hashedPassword = await bcrypt.hash(password, bcryptRounds);

    const newUser = await prisma.user.create({
      data: { username, email, password: hashedPassword, admin: false },
    });

    const userWithoutPassword = { ...newUser };
    delete userWithoutPassword.password;
    return c.json(userWithoutPassword, 201);

  } catch (error) {
    console.error("Registration Error:", error);
    if (typeof error === 'object' && error !== null && 'code' in error && error.code === 'P2002') {
         return c.json({ error: 'Username or Email taken' }, 409);
    }
    return c.json({ error: 'Registration failed' }, 500);
  }
});

app.post('/login', async (c) => {
  let payload;
   try { payload = await c.req.json(); }
   catch { return c.json({ error: 'Invalid request' }, 400); }

  const { username, password } = payload;

  if (!username || !password) { return c.json({ error: 'Missing credentials' }, 400); }

  try {
    const user = await findUserByUsername(username);
    if (!user) { return c.json({ error: 'Invalid credentials' }, 401); }

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) { return c.json({ error: 'Invalid credentials' }, 401); }

     if (!jwtSecret) { console.error("Login Error: JWT Secret missing"); return c.json({ error: 'Server configuration error' }, 500); }

    const tokenPayload = { id: user.id, username: user.username, admin: user.admin };
    const token = jwt.sign(tokenPayload, jwtSecret, { expiresIn: tokenLifetime });

    const userWithoutPassword = { ...user };
    delete userWithoutPassword.password;
    return c.json({ user: userWithoutPassword, token, expiresIn: tokenLifetime });

  } catch (loginError) {
    console.error("Login Error:", loginError);
    return c.json({ error: 'Login failed' }, 500);
  }
});

app.get('/me', async (c) => {
  const authHeader = c.req.header('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) { return c.json({ error: 'Unauthorized' }, 401); }

  const token = authHeader.split(' ')[1];

  if (!jwtSecret) { console.error("Get Profile Error: JWT Secret missing"); return c.json({ error: 'Server configuration error' }, 500); }

  let decoded;
  try { decoded = jwt.verify(token, jwtSecret); }
  catch { return c.json({ error: 'Unauthorized' }, 401); }

  try {
    if (!decoded || typeof decoded !== 'object' || typeof decoded.id !== 'number') { return c.json({ error: 'Invalid token' }, 401); }

    const user = await prisma.user.findUnique({ where: { id: decoded.id } });
    if (!user) { return c.json({ error: 'User not found' }, 404); }

    const userWithoutPassword = { ...user };
    delete userWithoutPassword.password;
    return c.json(userWithoutPassword);

  } catch (profileError) {
    console.error("Get Profile Error:", profileError);
    return c.json({ error: 'Failed to get profile' }, 500);
  }
});

export const GET = handle(app);
export const POST = handle(app);