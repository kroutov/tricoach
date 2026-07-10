import { classifyDailyWeather, recipeWeatherAffinity } from '../../src/modules/nutrition/engine/recipeWeatherAffinity';

describe('recipeWeatherAffinity', () => {
  it('classifies a hot-leaning category as hot', () => {
    expect(recipeWeatherAffinity(['SALAD'])).toBe('hot');
    expect(recipeWeatherAffinity(['SANDWICH'])).toBe('hot');
    expect(recipeWeatherAffinity(['TOAST'])).toBe('hot');
    expect(recipeWeatherAffinity(['DIPS'])).toBe('hot');
  });

  it('classifies a cold-leaning category as cold', () => {
    expect(recipeWeatherAffinity(['STEW'])).toBe('cold');
    expect(recipeWeatherAffinity(['SOUP'])).toBe('cold');
    expect(recipeWeatherAffinity(['BAKED'])).toBe('cold');
    expect(recipeWeatherAffinity(['PIE'])).toBe('cold');
  });

  it('classifies an unrecognized or neutral category as neutral', () => {
    expect(recipeWeatherAffinity(['PASTA'])).toBe('neutral');
    expect(recipeWeatherAffinity(['CAKE'])).toBe('neutral');
    expect(recipeWeatherAffinity([])).toBe('neutral');
  });

  it('ignores a neutral secondary category and keeps the directional signal', () => {
    expect(recipeWeatherAffinity(['SALAD', 'PASTA'])).toBe('hot');
  });

  it('classifies genuinely mixed hot+cold categories as neutral rather than picking a side', () => {
    expect(recipeWeatherAffinity(['SALAD', 'SOUP'])).toBe('neutral');
  });
});

describe('classifyDailyWeather', () => {
  it('classifies at and above the hot threshold as hot', () => {
    expect(classifyDailyWeather(25)).toBe('hot');
    expect(classifyDailyWeather(30)).toBe('hot');
  });

  it('classifies at and below the cold threshold as cold', () => {
    expect(classifyDailyWeather(10)).toBe('cold');
    expect(classifyDailyWeather(-2)).toBe('cold');
  });

  it('classifies temperatures between the thresholds as neutral', () => {
    expect(classifyDailyWeather(18)).toBe('neutral');
    expect(classifyDailyWeather(11)).toBe('neutral');
    expect(classifyDailyWeather(24)).toBe('neutral');
  });
});
