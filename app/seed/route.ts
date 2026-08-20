import { seedDatabase } from '@/app/lib/seed';

export async function GET() {
  // Prevent public reseeding on production deployments
  if (process.env.NODE_ENV === 'production' && process.env.ALLOW_SEED !== '1') {
    return Response.json(
      { error: 'Seeding is disabled in production.' },
      { status: 403 },
    );
  }

  try {
    const result = await seedDatabase();
    return Response.json({
      message: 'Database seeded successfully',
      result,
    });
  } catch (error) {
    console.error('Seed error:', error);
    return Response.json(
      { error: error instanceof Error ? error.message : 'Seed failed' },
      { status: 500 },
    );
  }
}
