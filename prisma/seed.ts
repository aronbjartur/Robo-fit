// seed sem ég bað chatgbt að búa til fyrir mig

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Start seeding ...');

  // --- Seed Default Exercises ---
  console.log('Seeding default exercises...');
  // Pull
  const bicepCurl = await prisma.exercise.upsert({ where: { name: 'Bicep Curl' }, update: {}, create: { name: 'Bicep Curl', description: 'Dumbbell or barbell bicep curl', isDefault: true } });
  const hammerCurl = await prisma.exercise.upsert({ where: { name: 'Hammer Curl' }, update: {}, create: { name: 'Hammer Curl', description: 'Neutral grip dumbbell curl', isDefault: true } });
  const oneArmRow = await prisma.exercise.upsert({ where: { name: 'One Arm Row' }, update: {}, create: { name: 'One Arm Row', description: 'Dumbbell row for back', isDefault: true } });
  const pulldownMachine = await prisma.exercise.upsert({ where: { name: 'Pulldown Machine' }, update: {}, create: { name: 'Pulldown Machine', description: 'Lat pulldown machine', isDefault: true } });
  const deadlift = await prisma.exercise.upsert({ where: { name: 'Deadlift' }, update: {}, create: { name: 'Deadlift', description: 'Conventional barbell deadlift', isDefault: true } }); // Often pull or legs

  // Legs
  const squat = await prisma.exercise.upsert({ where: { name: 'Squat' }, update: {}, create: { name: 'Squat', description: 'Barbell back squat', isDefault: true } });
  const legExtension = await prisma.exercise.upsert({ where: { name: 'Leg Extension' }, update: {}, create: { name: 'Leg Extension', description: 'Machine leg extension for quads', isDefault: true } });
  const legCurl = await prisma.exercise.upsert({ where: { name: 'Leg Curl' }, update: {}, create: { name: 'Leg Curl', description: 'Machine leg curl for hamstrings', isDefault: true } });

  // Push
  const benchPress = await prisma.exercise.upsert({ where: { name: 'Bench Press' }, update: {}, create: { name: 'Bench Press', description: 'Barbell chest press', isDefault: true } });
  const shoulderPress = await prisma.exercise.upsert({ where: { name: 'Shoulder Press' }, update: {}, create: { name: 'Shoulder Press', description: 'Dumbbell or barbell overhead press', isDefault: true } });
  const flyMachine = await prisma.exercise.upsert({ where: { name: 'Fly Machine' }, update: {}, create: { name: 'Fly Machine', description: 'Pec deck or cable fly machine', isDefault: true } });
  const lateralRaises = await prisma.exercise.upsert({ where: { name: 'Lateral Raises' }, update: {}, create: { name: 'Lateral Raises', description: 'Dumbbell lateral raises for shoulders', isDefault: true } });

  console.log('Default exercises seeded.');

  // --- Seed Default Routines ---
  console.log('Seeding default routines...');
  const pushRoutine = await prisma.routine.upsert({
    where: { name: 'Push Day' }, // Nota nafn sem unique identifier hér
    update: {},
    create: { name: 'Push Day', isDefault: true },
  });
  const pullRoutine = await prisma.routine.upsert({
    where: { name: 'Pull Day' },
    update: {},
    create: { name: 'Pull Day', isDefault: true },
  });
  const legsRoutine = await prisma.routine.upsert({
    where: { name: 'Leg Day' },
    update: {},
    create: { name: 'Leg Day', isDefault: true },
  });
  console.log('Default routines seeded.');

  // --- Link Exercises to Routines (RoutineExercise) ---
  // Þetta er dæmi um hvernig æfingarnar gætu tengst. Þú getur breytt þessu.
  console.log('Linking exercises to routines...');

  // Push Day Links
  await prisma.routineExercise.createMany({
    data: [
      { routineId: pushRoutine.id, exerciseId: benchPress.id, order: 1 },
      { routineId: pushRoutine.id, exerciseId: shoulderPress.id, order: 2 },
      { routineId: pushRoutine.id, exerciseId: flyMachine.id, order: 3 },
      { routineId: pushRoutine.id, exerciseId: lateralRaises.id, order: 4 }, // Lateral raises oft á push degi
      // Hér gætirðu bætt við triceps æfingu ef þú bætir henni við listann
    ],
    skipDuplicates: true, // Hindrar villur ef linkur er þegar til
  });

  // Pull Day Links
  await prisma.routineExercise.createMany({
    data: [
      { routineId: pullRoutine.id, exerciseId: deadlift.id, order: 1 }, // Deadlift getur verið pull eða legs
      { routineId: pullRoutine.id, exerciseId: pulldownMachine.id, order: 2 },
      { routineId: pullRoutine.id, exerciseId: oneArmRow.id, order: 3 },
      { routineId: pullRoutine.id, exerciseId: bicepCurl.id, order: 4 },
      { routineId: pullRoutine.id, exerciseId: hammerCurl.id, order: 5 },
    ],
    skipDuplicates: true,
  });

  // Leg Day Links
  await prisma.routineExercise.createMany({
    data: [
      { routineId: legsRoutine.id, exerciseId: squat.id, order: 1 },
      { routineId: legsRoutine.id, exerciseId: legExtension.id, order: 2 },
      { routineId: legsRoutine.id, exerciseId: legCurl.id, order: 3 },
      // Hér gætirðu bætt við kálfaæfingu
    ],
    skipDuplicates: true,
  });

  console.log('Exercise-routine links seeded.');

  console.log('Seeding finished.');
}

main()
  .catch((e) => {
    console.error('Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    console.log('Prisma disconnected.');
  });