import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateGyroVector,
  distance,
  isBerryCollected,
  calculatePoints,
  pickRandomBerryType
} from './math';
import {
  INITIAL_ACHIEVEMENTS,
  evaluateAchievements
} from './achievements';
import { PlayerStats } from './types';

test('gyro vector returns zero when tilt is within deadzone', () => {
  const result = calculateGyroVector(2.0, 1.5, 0, 0, 3.5);
  assert.equal(result.x, 0);
  assert.equal(result.y, 0);
});

test('gyro vector responds when tilt exceeds deadzone', () => {
  const result = calculateGyroVector(15.0, 0, 0, 0, 3.5, 1.0);
  assert.ok(result.x > 0, 'X velocity should be positive when tilting right');
  assert.equal(result.y, 0, 'Y velocity should be zero when beta is zero');
  assert.ok(result.x <= 1.0, 'Magnitude should be clamped to 1.0');
});

test('gyro calibration offset correctly zeroes out baseline resting wrist angle', () => {
  // Resting wrist tilted at gamma=12, beta=8
  const result = calculateGyroVector(12.5, 8.2, 12.0, 8.0, 3.5);
  // delta is 0.5 and 0.2 which is inside deadzone (mag < 3.5)
  assert.equal(result.x, 0);
  assert.equal(result.y, 0);
});

test('distance calculates 2D Euclidean distance accurately', () => {
  assert.equal(distance(0, 0, 30, 40), 50);
  assert.equal(distance(10, 10, 10, 10), 0);
});

test('isBerryCollected correctly detects collision within radius', () => {
  assert.equal(isBerryCollected(100, 100, 115, 100, 25), true);
  assert.equal(isBerryCollected(100, 100, 150, 100, 25), false);
});

test('calculatePoints handles double points buff and combo multiplier', () => {
  // Base 10 points without buff or combo
  assert.equal(calculatePoints(10, false, 1.0, 0), 10);

  // Base 10 points with double points buff
  assert.equal(calculatePoints(10, true, 1.0, 0), 20);

  // Snorlax 1.5x multiplier on base 20 points
  assert.equal(calculatePoints(20, false, 1.5, 0), 30);

  // Base 10 points with 5 combo (+50%)
  assert.equal(calculatePoints(10, false, 1.0, 5), 15);
});

test('pickRandomBerryType returns a valid berry type', () => {
  const berry = pickRandomBerryType(0.01);
  assert.ok(['oran', 'cheri', 'pecha', 'sitrus', 'lum', 'golden'].includes(berry));
});

test('evaluateAchievements unlocks First Berry on initial pickup', () => {
  const emptyStats: PlayerStats = {
    berriesCollected: 1,
    totalScore: 10,
    stepsWalked: 5,
    distanceTraveled: 20,
    comboCount: 1,
    lastBerryTime: Date.now()
  };

  const { updatedList, newlyUnlocked } = evaluateAchievements(INITIAL_ACHIEVEMENTS, {
    stats: emptyStats,
    lastBerryType: 'oran',
    usedGyroCount: 1,
    uniquePokemonCount: 1
  });

  const firstBerry = updatedList.find((a) => a.id === 'first_berry');
  assert.ok(firstBerry?.unlocked, 'First berry achievement must be unlocked');
  assert.equal(newlyUnlocked.some((a) => a.id === 'first_berry'), true);
});

test('evaluateAchievements unlocks Golden Berry when golden berry is collected', () => {
  const stats: PlayerStats = {
    berriesCollected: 5,
    totalScore: 350,
    stepsWalked: 30,
    distanceTraveled: 120,
    comboCount: 1,
    lastBerryTime: Date.now()
  };

  const { updatedList, newlyUnlocked } = evaluateAchievements(INITIAL_ACHIEVEMENTS, {
    stats,
    lastBerryType: 'golden',
    usedGyroCount: 5,
    uniquePokemonCount: 1
  });

  const goldenAch = updatedList.find((a) => a.id === 'golden_berry');
  assert.ok(goldenAch?.unlocked, 'Golden berry achievement must unlock');
  assert.equal(newlyUnlocked.some((a) => a.id === 'golden_berry'), true);
});
