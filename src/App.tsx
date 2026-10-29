import React, { useState, useEffect, useRef, useCallback } from 'react';
import { GameView, PokemonInfo, BerryItem, PlayerStats, Achievement } from './game/types';
import { POKEMON_LIST, BERRY_DEFINITIONS } from './game/pokemonData';
import { calculatePoints, generateSurroundingBerries, isBerryCollected, distance, Vector2D } from './game/math';
import { MapRenderer } from './game/mapRenderer';
import { sounds } from './game/sound';
import { loadStoredAchievements, saveStoredAchievements, evaluateAchievements } from './game/achievements';
import { WatchFrame } from './components/WatchFrame';
import { CircularHUD } from './components/CircularHUD';
import { TitleScreen } from './components/TitleScreen';
import { PokemonSelector } from './components/PokemonSelector';
import { AchievementsModal } from './components/AchievementsModal';
import { InstallGuideModal } from './components/InstallGuideModal';
import { PauseModal } from './components/PauseModal';
import { AchievementToast } from './components/AchievementToast';
import { GyroController } from './components/GyroController';

export default function App() {
  // Game Flow State
  const [gameView, setGameView] = useState<GameView>('title');
  const [selectedPokemon, setSelectedPokemon] = useState<PokemonInfo>(POKEMON_LIST[0]);
  const [isWatchBezelVisible, setIsWatchBezelVisible] = useState<boolean>(true);

  // Modals
  const [showPokemonSelector, setShowPokemonSelector] = useState<boolean>(false);
  const [showAchievementsModal, setShowAchievementsModal] = useState<boolean>(false);
  const [showInstallGuide, setShowInstallGuide] = useState<boolean>(false);
  const [unlockedToast, setUnlockedToast] = useState<Achievement | null>(null);
  const [isMuted, setIsMuted] = useState<boolean>(() => sounds.getMuted());

  // Achievements
  const [achievements, setAchievements] = useState<Achievement[]>(() => loadStoredAchievements());
  const usedPokemonIdsRef = useRef<Set<number>>(new Set([POKEMON_LIST[0].id]));
  const usedGyroCountRef = useRef<number>(0);

  // Live Gameplay Player State
  const [stats, setStats] = useState<PlayerStats>({
    berriesCollected: 0,
    totalScore: 0,
    stepsWalked: 0,
    distanceTraveled: 0,
    comboCount: 0,
    lastBerryTime: 0
  });

  // Gyro Tilt values for UI indicator
  const [gyroTilt, setGyroTilt] = useState<{ gamma: number; beta: number }>({ gamma: 0, beta: 0 });
  const [isGyroActive, setIsGyroActive] = useState<boolean>(false);

  // Canvas Refs & Simulation State
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rendererRef = useRef<MapRenderer>(new MapRenderer());

  // Mutable Game Physics Refs (Decoupled from 60Hz React re-renders)
  const playerPosRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const playerVelRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const playerFacingLeftRef = useRef<boolean>(false);
  const isMovingRef = useRef<boolean>(false);
  const walkDistanceRef = useRef<number>(0);
  const berriesRef = useRef<BerryItem[]>([]);
  const statsRef = useRef<PlayerStats>(stats);
  statsRef.current = stats;

  const gameViewRef = useRef<GameView>(gameView);
  gameViewRef.current = gameView;

  const selectedPokemonRef = useRef<PokemonInfo>(selectedPokemon);
  selectedPokemonRef.current = selectedPokemon;

  // Keyboard state
  const keysPressed = useRef<Set<string>>(new Set());

  // Gyro input vector
  const gyroVectorRef = useRef<Vector2D>({ x: 0, y: 0 });

  // Preload initial sprites
  useEffect(() => {
    POKEMON_LIST.slice(0, 10).forEach((p) => {
      rendererRef.current.preloadSprite(p.spriteUrl);
    });
  }, []);

  // Sync document.body.dataset.state for Ultra Mode lifecycle
  useEffect(() => {
    document.body.dataset.state = gameView;
  }, [gameView]);

  // Autostart URL parameter check (?autostart=1)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('autostart') === '1') {
      startGame();
    }
  }, []);

  // Keyboard input handlers
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      keysPressed.current.add(e.code);

      // Mute toggle with M
      if (e.code === 'KeyM') {
        e.preventDefault();
        const next = sounds.toggleMute();
        setIsMuted(next);
      }

      // Start game from title with Space or Enter
      if ((e.code === 'Space' || e.code === 'Enter') && gameViewRef.current === 'title') {
        e.preventDefault();
        startGame();
      }

      // Pause toggle
      if ((e.code === 'Escape' || e.code === 'KeyP') && gameViewRef.current === 'playing') {
        e.preventDefault();
        pauseGame();
      } else if ((e.code === 'Escape' || e.code === 'KeyP') && gameViewRef.current === 'paused') {
        e.preventDefault();
        resumeGame();
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      keysPressed.current.delete(e.code);
    };

    const handleBlur = () => {
      keysPressed.current.clear();
      gyroVectorRef.current = { x: 0, y: 0 };
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('blur', handleBlur);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('blur', handleBlur);
    };
  }, []);

  // Game control routines
  const startGame = useCallback(() => {
    playerPosRef.current = { x: 0, y: 0 };
    playerVelRef.current = { x: 0, y: 0 };
    berriesRef.current = generateSurroundingBerries([], 0, 0, 24, 450);
    setGameView('playing');
    usedPokemonIdsRef.current.add(selectedPokemonRef.current.id);
  }, []);

  const pauseGame = useCallback(() => {
    setGameView('paused');
  }, []);

  const resumeGame = useCallback(() => {
    setGameView('playing');
  }, []);

  const restartGame = useCallback(() => {
    setStats({
      berriesCollected: 0,
      totalScore: 0,
      stepsWalked: 0,
      distanceTraveled: 0,
      comboCount: 0,
      lastBerryTime: 0
    });
    startGame();
  }, [startGame]);

  const handleStepCount = useCallback(() => {
    setStats((prev) => ({
      ...prev,
      stepsWalked: prev.stepsWalked + 1
    }));
  }, []);

  // Check achievements against current stats
  const triggerAchievementCheck = useCallback((lastBerryType?: any, isGyroUsed?: boolean) => {
    if (isGyroUsed) {
      usedGyroCountRef.current += 1;
    }
    const current = achievements;
    const { updatedList, newlyUnlocked } = evaluateAchievements(current, {
      stats: statsRef.current,
      lastBerryType,
      usedGyroCount: usedGyroCountRef.current,
      uniquePokemonCount: usedPokemonIdsRef.current.size
    });

    if (newlyUnlocked.length > 0) {
      setAchievements(updatedList);
      saveStoredAchievements(updatedList);
      setUnlockedToast(newlyUnlocked[0]);
    }
  }, [achievements]);

  // Main 60 FPS Game Loop
  useEffect(() => {
    let animId: number;
    let lastTime = performance.now();
    let stepAccumulator = 0;

    const tick = (now: number) => {
      const rawDt = (now - lastTime) / 1000;
      lastTime = now;
      const dt = Math.min(rawDt, 0.05); // Clamped simulation step

      if (gameViewRef.current === 'playing' && canvasRef.current) {
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');

        if (ctx) {
          const poke = selectedPokemonRef.current;
          const currentStats = statsRef.current;

          // 1. Process movement inputs: Keyboard + Gyro
          let moveX = gyroVectorRef.current.x;
          let moveY = gyroVectorRef.current.y;

          if (keysPressed.current.has('KeyA') || keysPressed.current.has('ArrowLeft')) moveX -= 1;
          if (keysPressed.current.has('KeyD') || keysPressed.current.has('ArrowRight')) moveX += 1;
          if (keysPressed.current.has('KeyW') || keysPressed.current.has('ArrowUp')) moveY -= 1;
          if (keysPressed.current.has('KeyS') || keysPressed.current.has('ArrowDown')) moveY += 1;

          // Normalize composite movement
          const inputMag = Math.hypot(moveX, moveY);
          let dirX = 0;
          let dirY = 0;
          if (inputMag > 0.05) {
            dirX = (moveX / inputMag) * Math.min(1.0, inputMag);
            dirY = (moveY / inputMag) * Math.min(1.0, inputMag);
          }

          const hasSpeedBuff = !!(currentStats.activeBuff?.type === 'speed' && currentStats.activeBuff.expiresAt > Date.now());
          const hasMagnetBuff = !!(currentStats.activeBuff?.type === 'magnet' && currentStats.activeBuff.expiresAt > Date.now());
          const speedMultiplier = (hasSpeedBuff ? 1.5 : 1.0) * poke.speed;
          const moveSpeed = 160 * speedMultiplier;

          // Update position
          const stepDist = inputMag > 0.05 ? moveSpeed * dt : 0;
          playerPosRef.current.x += dirX * moveSpeed * dt;
          playerPosRef.current.y += dirY * moveSpeed * dt;

          if (dirX !== 0) {
            playerFacingLeftRef.current = dirX < 0;
          }
          isMovingRef.current = inputMag > 0.05;
          walkDistanceRef.current += stepDist;

          // Virtual Pedometer integration from distance
          if (stepDist > 0) {
            stepAccumulator += stepDist;
            if (stepAccumulator >= 32) {
              stepAccumulator = 0;
              setStats((prev) => ({
                ...prev,
                stepsWalked: prev.stepsWalked + 1,
                distanceTraveled: prev.distanceTraveled + 1
              }));
            }
          }

          // 2. Berry Magnet pulling & Collisions
          const pX = playerPosRef.current.x;
          const pY = playerPosRef.current.y;
          const effectiveMagnetRadius = hasMagnetBuff ? poke.magnetRadius * 2.2 : poke.magnetRadius;

          const remainingBerries: BerryItem[] = [];
          let collectedCountThisFrame = 0;

          for (const berry of berriesRef.current) {
            const d = distance(pX, pY, berry.x, berry.y);

            // Magnet Attraction
            if (d < effectiveMagnetRadius && d > 20) {
              const pullAngle = Math.atan2(pY - berry.y, pX - berry.x);
              berry.x += Math.cos(pullAngle) * 140 * dt;
              berry.y += Math.sin(pullAngle) * 140 * dt;
            }

            // Collection Check
            if (isBerryCollected(pX, pY, berry.x, berry.y, 24)) {
              collectedCountThisFrame++;
              sounds.playBerryChime(berry.type);

              // Floating score & particles
              const berryDef = BERRY_DEFINITIONS[berry.type];
              const isDoublePoints = currentStats.activeBuff?.type === 'double_points' && currentStats.activeBuff.expiresAt > Date.now();
              const pointsEarned = calculatePoints(
                berry.points,
                isDoublePoints,
                poke.name === 'Snorlax' ? 1.5 : 1.0,
                currentStats.comboCount
              );

              rendererRef.current.addFloatingText(
                `+${pointsEarned}`,
                berry.x,
                berry.y,
                berryDef.color
              );
              rendererRef.current.addBerryBurst(berry.x, berry.y, berryDef.color, 12);

              // Apply Buffs if special berry
              let newBuff = currentStats.activeBuff;
              if (berry.type === 'cheri') {
                newBuff = { type: 'speed', expiresAt: Date.now() + 5000 };
              } else if (berry.type === 'pecha') {
                newBuff = { type: 'magnet', expiresAt: Date.now() + 6000 };
              } else if (berry.type === 'lum') {
                newBuff = { type: 'double_points', expiresAt: Date.now() + 8000 };
              }

              // Update stats
              const nowTime = Date.now();
              const isQuickCombo = nowTime - currentStats.lastBerryTime < 3500;
              const nextCombo = isQuickCombo ? currentStats.comboCount + 1 : 1;

              setStats((prev) => {
                const updated = {
                  ...prev,
                  berriesCollected: prev.berriesCollected + 1,
                  totalScore: prev.totalScore + pointsEarned,
                  activeBuff: newBuff,
                  comboCount: nextCombo,
                  lastBerryTime: nowTime
                };
                statsRef.current = updated;
                return updated;
              });

              // Check achievements
              const usedGyro = Math.hypot(gyroVectorRef.current.x, gyroVectorRef.current.y) > 0.1;
              triggerAchievementCheck(berry.type, usedGyro);
            } else {
              remainingBerries.push(berry);
            }
          }

          // 3. Replenish berries dynamically for infinite world
          berriesRef.current = generateSurroundingBerries(remainingBerries, pX, pY, 24, 460);

          // 4. Render 2D Canvas Scene
          rendererRef.current.render(
            ctx,
            canvas.width,
            canvas.height,
            pX,
            pY,
            playerFacingLeftRef.current,
            isMovingRef.current,
            walkDistanceRef.current,
            poke,
            berriesRef.current,
            dt,
            hasSpeedBuff,
            hasMagnetBuff
          );
        }
      }

      animId = requestAnimationFrame(tick);
    };

    animId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animId);
  }, [triggerAchievementCheck]);

  // Gyro movement vector listener from controller
  const handleGyroMovementChange = useCallback((vec: Vector2D, isHardware: boolean) => {
    gyroVectorRef.current = vec;
    if (isHardware) {
      setIsGyroActive(true);
      setGyroTilt({
        gamma: Math.round(vec.x * 25),
        beta: Math.round(vec.y * 25)
      });
    }
  }, []);

  return (
    <div className="relative w-full h-full min-h-screen bg-slate-950 flex flex-col items-center justify-center">
      {/* Outer Smartwatch Chassis */}
      <WatchFrame
        isWatchBezelVisible={isWatchBezelVisible}
        onToggleBezel={() => setIsWatchBezelVisible(!isWatchBezelVisible)}
        onCrownClick={() => {
          if (gameView === 'playing') pauseGame();
          else if (gameView === 'paused') resumeGame();
        }}
      >
        {/* Circular Display Content Container (466x466 AMOLED) */}
        <div className="relative w-full h-full bg-emerald-950 flex items-center justify-center overflow-hidden">
          {/* Main 2D World Canvas */}
          <canvas
            ref={canvasRef}
            width={466}
            height={466}
            className="w-full h-full object-cover"
          />

          {/* Circular Smartwatch HUD (Only active during playing) */}
          {gameView === 'playing' && (
            <CircularHUD
              stats={stats}
              pokemon={selectedPokemon}
              gyroTilt={gyroTilt}
              isGyroActive={isGyroActive}
              isMuted={isMuted}
              onToggleMute={() => {
                const next = sounds.toggleMute();
                setIsMuted(next);
              }}
              onPause={pauseGame}
              onCalibrateGyro={() => {
                gyroVectorRef.current = { x: 0, y: 0 };
                sounds.playSelect();
              }}
            />
          )}

          {/* Title Screen */}
          {gameView === 'title' && (
            <TitleScreen
              onStartGame={startGame}
              onOpenPokemonSelector={() => setShowPokemonSelector(true)}
              onOpenAchievements={() => setShowAchievementsModal(true)}
              onOpenInstallGuide={() => setShowInstallGuide(true)}
              selectedPokemon={selectedPokemon}
              isMuted={isMuted}
              onToggleMute={() => {
                const nextMuted = sounds.toggleMute();
                setIsMuted(nextMuted);
              }}
            />
          )}

          {/* Pause Modal */}
          {gameView === 'paused' && (
            <PauseModal
              stats={stats}
              currentPokemon={selectedPokemon}
              isMuted={isMuted}
              onToggleMute={() => {
                const nextMuted = sounds.toggleMute();
                setIsMuted(nextMuted);
              }}
              onResume={resumeGame}
              onRestart={restartGame}
              onOpenPokemonSelector={() => setShowPokemonSelector(true)}
              onOpenAchievements={() => setShowAchievementsModal(true)}
              onExitToTitle={() => setGameView('title')}
            />
          )}

          {/* Pokemon Selector Drawer */}
          {showPokemonSelector && (
            <PokemonSelector
              currentPokemon={selectedPokemon}
              onSelect={(p) => {
                setSelectedPokemon(p);
                rendererRef.current.preloadSprite(p.spriteUrl);
                usedPokemonIdsRef.current.add(p.id);
                triggerAchievementCheck();
              }}
              onClose={() => setShowPokemonSelector(false)}
            />
          )}

          {/* Achievements Drawer */}
          {showAchievementsModal && (
            <AchievementsModal
              achievements={achievements}
              onClose={() => setShowAchievementsModal(false)}
            />
          )}

          {/* Installation & Wear OS APK Guide Modal */}
          {showInstallGuide && (
            <InstallGuideModal onClose={() => setShowInstallGuide(false)} />
          )}

          {/* Live Achievement Unlock Banner Toast */}
          <AchievementToast
            achievement={unlockedToast}
            onDismiss={() => setUnlockedToast(null)}
          />
        </div>
      </WatchFrame>

      {/* External Virtual Wrist Tilt Controller (Desktop & Phone Support) */}
      {isWatchBezelVisible && (
        <div className="mt-3 z-30 pointer-events-auto">
          <GyroController
            onMovementChange={handleGyroMovementChange}
            onStepDetected={handleStepCount}
            showTouchControls={true}
          />
        </div>
      )}
    </div>
  );
}
