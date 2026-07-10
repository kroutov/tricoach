import request from 'supertest';
import { Express } from 'express';
import { randomUUID } from 'crypto';
import { createApp } from '../../src/app';
import { prisma } from '../../src/db/client';
import { toDateOnly } from '../../src/lib/dateOnly';
import { devLogin } from '../helpers/auth';
import { resetDb } from '../helpers/db';

const app = createApp();

afterEach(resetDb);
afterAll(async () => prisma.$disconnect());

async function seedRecipes() {
  await prisma.recipe.create({
    data: {
      title: 'Pâtes riches en glucides',
      mealTypes: ['DINNER'],
      categories: ['PASTA'],
      dietaryTags: ['VEGETARIAN', 'CHICKEN_ONLY', 'PESCATARIAN', 'OMNIVORE'],
      effortProfile: 'CARB_LOAD',
      prepTime: 'MIN_15_30',
      instructions: 'Cuire les pâtes, ajouter la sauce.',
      ingredients: { create: [{ name: 'Pâtes', amount: 300, unit: 'g', aisle: 'GROCERY' }] },
    },
  });
  await prisma.recipe.create({
    data: {
      title: 'Bowl léger',
      mealTypes: ['DINNER'],
      categories: ['SALAD'],
      dietaryTags: ['VEGETARIAN', 'CHICKEN_ONLY', 'PESCATARIAN', 'OMNIVORE'],
      effortProfile: 'LIGHT',
      prepTime: 'UNDER_15',
      instructions: 'Mélanger les légumes.',
      ingredients: { create: [{ name: 'Salade', amount: 100, unit: 'g', aisle: 'PRODUCE' }] },
    },
  });
  await prisma.recipe.create({
    data: {
      title: 'Poulet basquaise',
      mealTypes: ['LUNCH', 'DINNER'],
      categories: ['BAKED'],
      dietaryTags: ['CHICKEN_ONLY', 'OMNIVORE'],
      effortProfile: 'BALANCED',
      prepTime: 'MIN_30_45',
      instructions: 'Cuire le poulet avec les poivrons.',
      ingredients: { create: [{ name: 'Blanc de poulet', amount: 400, unit: 'g', aisle: 'BUTCHER' }] },
    },
  });
  await prisma.recipe.create({
    data: {
      title: 'Salade de quinoa',
      mealTypes: ['LUNCH'],
      categories: ['SALAD', 'VEGETARIAN'],
      dietaryTags: ['VEGETARIAN', 'CHICKEN_ONLY', 'PESCATARIAN', 'OMNIVORE'],
      effortProfile: 'BALANCED',
      prepTime: 'MIN_15_30',
      instructions: 'Mélanger le quinoa cuit avec les légumes.',
      ingredients: { create: [{ name: 'Quinoa', amount: 150, unit: 'g', aisle: 'GROCERY' }] },
    },
  });
}

/** Minimal ACTIVE plan with one controllable workout, for effort-profile-dependent tests. */
async function seedActivePlanWithWorkout(userId: string, workoutDate: Date, intensity: 'EASY' | 'MODERATE' | 'HARD', estimatedTss: number) {
  const goal = await prisma.goal.create({ data: { userId, type: 'TRIATHLON_OLYMPIC', targetDate: new Date('2027-06-01') } });
  const start = toDateOnly(new Date());
  const end = toDateOnly(new Date(start.getTime() + 27 * 86_400_000));
  await prisma.trainingPlan.create({
    data: {
      id: randomUUID(),
      userId,
      goalId: goal.id,
      startDate: start,
      endDate: end,
      durationWeeks: 4,
      status: 'ACTIVE',
      generationVersion: 'test',
      macrocycles: {
        create: [
          {
            name: 'Bloc unique',
            phase: 'BASE',
            startDate: start,
            endDate: end,
            mesocycles: {
              create: [
                {
                  name: 'Semaine unique',
                  focus: 'base',
                  startDate: start,
                  endDate: end,
                  microcycles: {
                    create: [
                      {
                        weekNumber: 1,
                        startDate: start,
                        endDate: end,
                        workouts: {
                          create: [
                            {
                              date: toDateOnly(workoutDate),
                              sport: 'RUN',
                              title: 'Séance test',
                              description: 'Séance test',
                              structure: {},
                              plannedDurationMin: 60,
                              estimatedTss,
                              intensity,
                              status: 'PLANNED',
                            },
                          ],
                        },
                      },
                    ],
                  },
                },
              ],
            },
          },
        ],
      },
    },
  });
}

function nextMondayFrom(now: Date): Date {
  const start = toDateOnly(now);
  const day = start.getUTCDay();
  const daysUntilNextMonday = ((8 - day) % 7) || 7;
  return new Date(start.getTime() + daysUntilNextMonday * 86_400_000);
}

describe('GET /nutrition/recipes', () => {
  it('filters the catalog by meal type, dietary tag, and category', async () => {
    await seedRecipes();
    const { token } = await devLogin(app, { appleUserId: 'nutrition-catalog' });

    const dinner = await request(app).get('/api/v1/nutrition/recipes?mealType=dinner').set('Authorization', `Bearer ${token}`);
    expect(dinner.status).toBe(200);
    expect(dinner.body.map((r: any) => r.title).sort()).toEqual(['Bowl léger', 'Poulet basquaise', 'Pâtes riches en glucides']);

    const pescatarian = await request(app)
      .get('/api/v1/nutrition/recipes?dietaryTag=pescatarian')
      .set('Authorization', `Bearer ${token}`);
    expect(pescatarian.body.map((r: any) => r.title).sort()).toEqual(['Bowl léger', 'Pâtes riches en glucides', 'Salade de quinoa']);

    const baked = await request(app).get('/api/v1/nutrition/recipes?category=ovenBaked').set('Authorization', `Bearer ${token}`);
    expect(baked.body).toHaveLength(1);
    expect(baked.body[0].title).toBe('Poulet basquaise');
    expect(baked.body[0].ingredients[0]).toMatchObject({ name: 'Blanc de poulet', amount: 400, unit: 'g', aisle: 'butcher' });
  });

  it('requires authentication', async () => {
    const res = await request(app).get('/api/v1/nutrition/recipes');
    expect(res.status).toBe(401);
  });
});

describe('GET /nutrition/recipes/suggested', () => {
  it('surfaces a carbLoad recipe first on a day with a hard session planned', async () => {
    await seedRecipes();
    const { token, user } = await devLogin(app, { appleUserId: 'nutrition-suggest-hard' });
    await seedActivePlanWithWorkout(user.id, new Date(), 'HARD', 95);

    const today = new Date().toISOString().slice(0, 10);
    const res = await request(app)
      .get(`/api/v1/nutrition/recipes/suggested?date=${today}&mealType=dinner`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.effortProfile).toBe('carbLoad');
    expect(res.body.recipes.length).toBeGreaterThan(1);
    expect(res.body.recipes[0].title).toBe('Pâtes riches en glucides');
  });

  it('surfaces a light recipe first on a rest day', async () => {
    await seedRecipes();
    const { token, user } = await devLogin(app, { appleUserId: 'nutrition-suggest-rest' });
    // No active plan at all -> treated as a rest day (no workouts, no load history).
    void user;

    const today = new Date().toISOString().slice(0, 10);
    const res = await request(app)
      .get(`/api/v1/nutrition/recipes/suggested?date=${today}&mealType=dinner`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.effortProfile).toBe('light');
    expect(res.body.recipes[0].title).toBe('Bowl léger');
  });

  it('never returns an empty list when at least one recipe matches mealType/diet', async () => {
    await seedRecipes();
    const { token, user } = await devLogin(app, { appleUserId: 'nutrition-suggest-fallback' });
    await seedActivePlanWithWorkout(user.id, new Date(), 'HARD', 95);

    const today = new Date().toISOString().slice(0, 10);
    const res = await request(app)
      .get(`/api/v1/nutrition/recipes/suggested?date=${today}&mealType=lunch`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.recipes.length).toBeGreaterThan(0);
  });
});

describe('dietary preference', () => {
  it('defaults to null and can be set/read back', async () => {
    const { token } = await devLogin(app, { appleUserId: 'nutrition-pref' });

    const initial = await request(app).get('/api/v1/me/nutrition/preference').set('Authorization', `Bearer ${token}`);
    expect(initial.body).toEqual({ dietaryPreference: null });

    const updated = await request(app)
      .put('/api/v1/me/nutrition/preference')
      .set('Authorization', `Bearer ${token}`)
      .send({ dietaryPreference: 'vegetarian' });
    expect(updated.body).toEqual({ dietaryPreference: 'vegetarian' });

    const readBack = await request(app).get('/api/v1/me/nutrition/preference').set('Authorization', `Bearer ${token}`);
    expect(readBack.body).toEqual({ dietaryPreference: 'vegetarian' });
  });

  it('filters the suggested-recipes catalog by the stored preference', async () => {
    await seedRecipes();
    const { token } = await devLogin(app, { appleUserId: 'nutrition-pref-filter' });
    await request(app).put('/api/v1/me/nutrition/preference').set('Authorization', `Bearer ${token}`).send({ dietaryPreference: 'vegetarian' });

    const today = new Date().toISOString().slice(0, 10);
    const res = await request(app)
      .get(`/api/v1/nutrition/recipes/suggested?date=${today}&mealType=lunch`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.body.recipes.map((r: any) => r.title)).toEqual(['Salade de quinoa']);
  });
});

describe('menu selection', () => {
  it('upserts, lists, and deletes a menu selection', async () => {
    await seedRecipes();
    const { token } = await devLogin(app, { appleUserId: 'nutrition-menu' });
    const recipe = await prisma.recipe.findFirstOrThrow({ where: { title: 'Poulet basquaise' } });
    const date = new Date().toISOString().slice(0, 10);

    const put = await request(app)
      .put(`/api/v1/me/nutrition/menu/${date}/dinner`)
      .set('Authorization', `Bearer ${token}`)
      .send({ recipeId: recipe.id });
    expect(put.status).toBe(200);
    expect(put.body.recipe.title).toBe('Poulet basquaise');

    const list = await request(app)
      .get(`/api/v1/me/nutrition/menu?from=${date}&to=${date}`)
      .set('Authorization', `Bearer ${token}`);
    expect(list.body).toHaveLength(1);
    expect(list.body[0].mealType).toBe('dinner');

    const other = await prisma.recipe.findFirstOrThrow({ where: { title: 'Bowl léger' } });
    const replace = await request(app)
      .put(`/api/v1/me/nutrition/menu/${date}/dinner`)
      .set('Authorization', `Bearer ${token}`)
      .send({ recipeId: other.id });
    expect(replace.body.recipe.title).toBe('Bowl léger');
    const listAfterReplace = await request(app)
      .get(`/api/v1/me/nutrition/menu?from=${date}&to=${date}`)
      .set('Authorization', `Bearer ${token}`);
    expect(listAfterReplace.body).toHaveLength(1);

    const del = await request(app).delete(`/api/v1/me/nutrition/menu/${date}/dinner`).set('Authorization', `Bearer ${token}`);
    expect(del.status).toBe(204);

    const listAfterDelete = await request(app)
      .get(`/api/v1/me/nutrition/menu?from=${date}&to=${date}`)
      .set('Authorization', `Bearer ${token}`);
    expect(listAfterDelete.body).toHaveLength(0);
  });

  it('scopes menu selections to the caller', async () => {
    await seedRecipes();
    const { token: tokenA } = await devLogin(app, { appleUserId: 'nutrition-menu-a' });
    const { token: tokenB } = await devLogin(app, { appleUserId: 'nutrition-menu-b' });
    const recipe = await prisma.recipe.findFirstOrThrow({ where: { title: 'Poulet basquaise' } });
    const date = new Date().toISOString().slice(0, 10);

    await request(app).put(`/api/v1/me/nutrition/menu/${date}/lunch`).set('Authorization', `Bearer ${tokenA}`).send({ recipeId: recipe.id });

    const listB = await request(app).get(`/api/v1/me/nutrition/menu?from=${date}&to=${date}`).set('Authorization', `Bearer ${tokenB}`);
    expect(listB.body).toHaveLength(0);

    const deleteB = await request(app).delete(`/api/v1/me/nutrition/menu/${date}/lunch`).set('Authorization', `Bearer ${tokenB}`);
    expect(deleteB.status).toBe(404);
  });

  it('returns 404 when selecting a recipe that does not exist', async () => {
    const { token } = await devLogin(app, { appleUserId: 'nutrition-menu-missing-recipe' });
    const date = new Date().toISOString().slice(0, 10);
    const res = await request(app)
      .put(`/api/v1/me/nutrition/menu/${date}/lunch`)
      .set('Authorization', `Bearer ${token}`)
      .send({ recipeId: randomUUID() });
    expect(res.status).toBe(404);
  });

  it('always confirms a slot on explicit write, even one previously auto-proposed', async () => {
    await seedRecipes();
    const { token, user } = await devLogin(app, { appleUserId: 'nutrition-menu-confirm-on-pick' });
    const recipe = await prisma.recipe.findFirstOrThrow({ where: { title: 'Poulet basquaise' } });
    const date = new Date().toISOString().slice(0, 10);

    await prisma.menuSelection.create({
      data: { userId: user.id, date: toDateOnly(new Date()), mealType: 'DINNER', recipeId: recipe.id, status: 'PROPOSED' },
    });

    const put = await request(app)
      .put(`/api/v1/me/nutrition/menu/${date}/dinner`)
      .set('Authorization', `Bearer ${token}`)
      .send({ recipeId: recipe.id });

    expect(put.body.status).toBe('confirmed');
  });
});

describe('POST /me/nutrition/menu/confirm-week', () => {
  it('confirms every proposed slot in the week and is idempotent', async () => {
    await seedRecipes();
    const { token, user } = await devLogin(app, { appleUserId: 'confirm-week' });
    const recipe = await prisma.recipe.findFirstOrThrow({ where: { title: 'Poulet basquaise' } });
    const weekStart = nextMondayFrom(new Date());
    const weekStartStr = weekStart.toISOString().slice(0, 10);

    await prisma.menuSelection.create({
      data: { userId: user.id, date: weekStart, mealType: 'LUNCH', recipeId: recipe.id, status: 'PROPOSED' },
    });

    const confirmRes = await request(app)
      .post('/api/v1/me/nutrition/menu/confirm-week')
      .set('Authorization', `Bearer ${token}`)
      .send({ weekStart: weekStartStr });
    expect(confirmRes.status).toBe(200);
    expect(confirmRes.body.confirmed).toBe(1);

    const weekEndStr = new Date(weekStart.getTime() + 6 * 86_400_000).toISOString().slice(0, 10);
    const menu = await request(app)
      .get(`/api/v1/me/nutrition/menu?from=${weekStartStr}&to=${weekEndStr}`)
      .set('Authorization', `Bearer ${token}`);
    expect(menu.body[0].status).toBe('confirmed');

    const secondConfirm = await request(app)
      .post('/api/v1/me/nutrition/menu/confirm-week')
      .set('Authorization', `Bearer ${token}`)
      .send({ weekStart: weekStartStr });
    expect(secondConfirm.body.confirmed).toBe(0);
  });
});

describe('POST /internal/nutrition/propose-week', () => {
  it('rejects requests without the correct cron secret', async () => {
    const noAuth = await request(app).post('/api/v1/internal/nutrition/propose-week');
    expect(noAuth.status).toBe(401);

    const wrongSecret = await request(app).post('/api/v1/internal/nutrition/propose-week').set('Authorization', 'Bearer wrong-secret');
    expect(wrongSecret.status).toBe(401);
  });

  it('proposes next week lunch+dinner only for users with prior menu history, skipping already-confirmed slots', async () => {
    await seedRecipes();
    const { token: eligibleToken, user: eligibleUser } = await devLogin(app, { appleUserId: 'propose-week-eligible' });
    const { token: freshToken } = await devLogin(app, { appleUserId: 'propose-week-fresh' });
    void eligibleUser;

    const today = new Date().toISOString().slice(0, 10);
    const chicken = await prisma.recipe.findFirstOrThrow({ where: { title: 'Poulet basquaise' } });
    // One manual pick makes this user "eligible" (proven menu history).
    await request(app)
      .put(`/api/v1/me/nutrition/menu/${today}/lunch`)
      .set('Authorization', `Bearer ${eligibleToken}`)
      .send({ recipeId: chicken.id });

    const weekStart = nextMondayFrom(new Date());
    const weekStartStr = weekStart.toISOString().slice(0, 10);
    const weekEndStr = new Date(weekStart.getTime() + 6 * 86_400_000).toISOString().slice(0, 10);

    // Pre-confirm Monday's dinner — the job must leave it untouched.
    const bowl = await prisma.recipe.findFirstOrThrow({ where: { title: 'Bowl léger' } });
    await request(app)
      .put(`/api/v1/me/nutrition/menu/${weekStartStr}/dinner`)
      .set('Authorization', `Bearer ${eligibleToken}`)
      .send({ recipeId: bowl.id });

    const trigger = await request(app).post('/api/v1/internal/nutrition/propose-week').set('Authorization', 'Bearer test-cron-secret');
    expect(trigger.status).toBe(200);
    expect(trigger.body.usersProcessed).toBe(1);

    const menu = await request(app)
      .get(`/api/v1/me/nutrition/menu?from=${weekStartStr}&to=${weekEndStr}`)
      .set('Authorization', `Bearer ${eligibleToken}`);

    // 7 days x (lunch + dinner) = 14 slots, 1 already confirmed -> 13 freshly proposed.
    expect(menu.body).toHaveLength(14);
    const monday = menu.body.filter((s: any) => s.date.slice(0, 10) === weekStartStr);
    const mondayDinner = monday.find((s: any) => s.mealType === 'dinner');
    expect(mondayDinner.status).toBe('confirmed');
    expect(mondayDinner.recipe.title).toBe('Bowl léger');
    const mondayLunch = monday.find((s: any) => s.mealType === 'lunch');
    expect(mondayLunch.status).toBe('proposed');

    const freshUserMenu = await request(app)
      .get(`/api/v1/me/nutrition/menu?from=${weekStartStr}&to=${weekEndStr}`)
      .set('Authorization', `Bearer ${freshToken}`);
    expect(freshUserMenu.body).toHaveLength(0);
  });
});
