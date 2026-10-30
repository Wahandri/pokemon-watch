import React, { useState, useEffect, useRef, useCallback } from 'react';
import { GameView, BerryItem, PlayerStats, Achievement, WildPokemon, SaveData } from './game/types';
import { BERRY_DEFINITIONS } from './game/pokemonData';
import { calculatePoints, generateSurroundingBerries, isBerryCollected, distance, calculateGyroVector, Vector2D } from './game/math';
import { MapRenderer } from './game/mapRenderer';
import { sounds } from './game/sound';
import { loadStoredAchievements, saveStoredAchievements, evaluateAchievements } from './game/achievements';
import { WatchFrame } from './components/WatchFrame';
import { CircularHUD } from './components/CircularHUD';
import { TitleScreen } from './components/TitleScreen';
import { PokemonSelector } from './components/PokemonSelector';
import { AchievementsModal } from './components/AchievementsModal';
import { PauseModal } from './components/PauseModal';
import { AchievementToast } from './components/AchievementToast';
import { GyroController } from './components/GyroController';
import { BattleScreen } from './components/BattleScreen';
import { CatchScene } from './components/CatchScene';
import { EvolutionScene } from './components/EvolutionScene';
import { PokedexModal } from './components/PokedexModal';
import {
  Combatant,
  createCombatant,
  resolveTurn,
  resolveEnemyAttack,
  xpForWin,
  xpToNext,
  canEvolve,
  fleeChance,
  species
} from './game/battle';
import { SPECIES_BY_ID } from './game/gen1Data';
import { loadSave, persistSave, createPokemon, SLEEP_MS, isAsleep, wakeCost } from './game/save';
import { updateWilds, spawnWild, MAX_WILDS } from './game/wilds';
import { walkSprite, portraitSprite } from './game/sprites';

const MAX_LEVEL = 50;

interface BattleState {
  player: Combatant;
  enemy: Combatant;
  log: string[];
  phase: 'menu' | 'won' | 'lost';
  wildSpeciesId: number;
  wildLevel: number;
}

interface CatchTarget {
  speciesId: number;
  level: number;
}

export default function App() {
  const [save, setSave] = useState<SaveData>(() => loadSave());
  const [gameView, setGameView] = useState<GameView>('title');
  const [isWatchBezelVisible, setIsWatchBezelVisible] = useState<boolean>(
    () => typeof window === 'undefined' || window.innerWidth >= 600
  );

  const [showPokemonSelector, setShowPokemonSelector] = useState(false);
  const [showAchievementsModal, setShowAchievementsModal] = useState(false);
  const [showPokedex, setShowPokedex] = useState(false);
  const [unlockedToast, setUnlockedToast] = useState<Achievement | null>(null);

  const [battle, setBattle] = useState<BattleState | null>(null);
  const [catchTarget, setCatchTarget] = useState<CatchTarget | null>(null);
  const [pendingReward, setPendingReward] = useState<number | null>(null);
  const [evolution, setEvolution] = useState<{ from: number; to: number } | null>(null);
  const [eeveeChoice, setEeveeChoice] = useState<number[] | null>(null);

  const [achievements, setAchievements] = useState<Achievement[]>(() => loadStoredAchievements());
  const usedPokemonIdsRef = useRef<Set<number>>(new Set([save.owned[0]?.speciesId ?? 1]));
  const usedGyroCountRef = useRef<number>(0);

  const [stats, setStats] = useState<PlayerStats>({
    berriesCollected: 0,
    totalScore: 0,
    stepsWalked: 0,
    distanceTraveled: 0,
    comboCount: 0,
    lastBerryTime: 0
  });

  const [gyroTilt, setGyroTilt] = useState({ gamma: 0, beta: 0 });
  const [isGyroActive, setIsGyroActive] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rendererRef = useRef<MapRenderer>(new MapRenderer());

  const playerPosRef = useRef({ x: 0, y: 0 });
  const isMovingRef = useRef(false);
  const playerFacingLeftRef = useRef(false);
  const walkDistanceRef = useRef(0);
  const berriesRef = useRef<BerryItem[]>([]);
  const wildsRef = useRef<WildPokemon[]>([]);
  const spawnTimerRef = useRef(4);

  const statsRef = useRef<PlayerStats>(stats);
  statsRef.current = stats;

  const gameViewRef = useRef<GameView>(gameView);
  gameViewRef.current = gameView;

  const saveRef = useRef(save);
  saveRef.current = save;

  const active = save.owned.find((p) => p.uid === save.activeUid) ?? save.owned[0];
  const activeRef = useRef(active);
  activeRef.current = active;

  const battleRef = useRef<BattleState | null>(battle);
  battleRef.current = battle;

  const blockingRef = useRef(false);
  blockingRef.current = Boolean(battle || catchTarget || evolution || eeveeChoice);

  const keysPressed = useRef<Set<string>>(new Set());
  const gyroVectorRef = useRef<Vector2D>({ x: 0, y: 0 });
  const gyroCalibrationRef = useRef<{ gamma: number; beta: number } | null>(null);
  const lastGyroRef = useRef<{ gamma: number; beta: number }>({ gamma: 0, beta: 0 });

  // Guardar partida
  useEffect(() => {
    persistSave(save);
  }, [save]);

  // En el reloj (sin marco) el GyroController no se monta: leemos aqui los
  // sensores. La primera lectura sirve de calibracion para que el personaje
  // no se mueva solo al abrir la app.
  useEffect(() => {
    if (isWatchBezelVisible) return;

    const handleOrientation = (event: DeviceOrientationEvent) => {
      if (event.beta == null || event.gamma == null) return;

      lastGyroRef.current = { gamma: event.gamma, beta: event.beta };
      if (!gyroCalibrationRef.current) {
        gyroCalibrationRef.current = { gamma: event.gamma, beta: event.beta };
      }

      const calibration = gyroCalibrationRef.current;
      const vector = calculateGyroVector(
        event.gamma,
        event.beta,
        calibration.gamma,
        calibration.beta,
        3.5,
        1.8
      );

      gyroVectorRef.current = vector;
      setIsGyroActive(true);
      setGyroTilt({ gamma: Math.round(event.gamma), beta: Math.round(event.beta) });
    };

    window.addEventListener('deviceorientation', handleOrientation);
    return () => window.removeEventListener('deviceorientation', handleOrientation);
  }, [isWatchBezelVisible]);

  // Precarga de sprites del equipo
  useEffect(() => {
    save.owned.forEach((pokemon) => {
      rendererRef.current.preloadSprite(walkSprite(pokemon.speciesId));
    });
  }, [save.owned]);

  useEffect(() => {
    document.body.dataset.state = gameView;
  }, [gameView]);

  const triggerAchievementCheck = useCallback(
    (lastBerryType?: any, isGyroUsed?: boolean) => {
      if (isGyroUsed) usedGyroCountRef.current += 1;

      const { updatedList, newlyUnlocked } = evaluateAchievements(achievements, {
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
    },
    [achievements]
  );

  const pauseGame = useCallback(() => setGameView('paused'), []);
  const resumeGame = useCallback(() => setGameView('playing'), []);

  const startGame = useCallback(() => {
    playerPosRef.current = { x: 0, y: 0 };
    walkDistanceRef.current = 0;
    wildsRef.current = [];
    spawnTimerRef.current = 5;
    berriesRef.current = generateSurroundingBerries([], 0, 0, 20, 460);
    usedPokemonIdsRef.current.add(activeRef.current.speciesId);
    setGameView('playing');
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('autostart') === '1') {
      startGame();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
    setBattle(null);
    setCatchTarget(null);
    setPendingReward(null);
    startGame();
  }, [startGame]);

  const handleStepCount = useCallback(() => {
    setStats((prev) => ({ ...prev, stepsWalked: prev.stepsWalked + 1 }));
  }, []);

  // --- combate -----------------------------------------------------------

  const canCaptureSpecies = useCallback((speciesId: number) => {
    const current = saveRef.current;
    if (speciesId === 133) {
      const eeveeFamily = current.owned.filter((p) => [133, 134, 135, 136].includes(p.speciesId)).length;
      return eeveeFamily < 3;
    }
    return !current.dexCaught.includes(speciesId);
  }, []);

  const startBattle = useCallback((wild: WildPokemon) => {
    const poke = activeRef.current;
    if (!poke || isAsleep(poke)) return;

    const player = createCombatant(poke.speciesId, poke.level);
    const enemy = createCombatant(wild.speciesId, wild.level, true);

    setSave((prev) =>
      prev.dexSeen.includes(wild.speciesId)
        ? prev
        : { ...prev, dexSeen: [...prev.dexSeen, wild.speciesId] }
    );

    setBattle({
      player,
      enemy,
      log: [`¡Un ${enemy.name} salvaje apareció! (Nv ${enemy.level})`],
      phase: 'menu',
      wildSpeciesId: wild.speciesId,
      wildLevel: wild.level
    });
    sounds.playSelect();
  }, []);

  const startBattleRef = useRef(startBattle);
  startBattleRef.current = startBattle;

  const applyDefeat = useCallback(() => {
    const poke = activeRef.current;
    if (!poke) return;
    const until = Date.now() + SLEEP_MS;

    setSave((prev) => {
      const owned = prev.owned.map((p) => (p.uid === poke.uid ? { ...p, asleepUntil: until } : p));
      const next = owned.find((p) => p.asleepUntil <= Date.now());
      return { ...prev, owned, activeUid: next ? next.uid : prev.activeUid };
    });
  }, []);

  const startEvolution = useCallback((fromId: number, toId: number) => {
    const evolving = activeRef.current;
    if (!evolving) return;

    setSave((prev) => ({
      ...prev,
      owned: prev.owned.map((p) => (p.uid === evolving.uid ? { ...p, speciesId: toId } : p)),
      dexCaught: prev.dexCaught.includes(toId) ? prev.dexCaught : [...prev.dexCaught, toId],
      dexSeen: prev.dexSeen.includes(toId) ? prev.dexSeen : [...prev.dexSeen, toId]
    }));
    setEvolution({ from: fromId, to: toId });
  }, []);

  const applyRewards = useCallback(
    (enemyLevel: number) => {
      const poke = activeRef.current;
      if (!poke) return;

      let level = poke.level;
      let xp = poke.xp + xpForWin(enemyLevel);
      let gained = 0;

      while (level < MAX_LEVEL && xp >= xpToNext(level)) {
        xp -= xpToNext(level);
        level += 1;
        gained += 1;
      }

      setSave((prev) => ({
        ...prev,
        owned: prev.owned.map((p) => (p.uid === poke.uid ? { ...p, level, xp } : p))
      }));

      if (gained > 0) {
        sounds.playLevelUp();
        const evolutions = canEvolve(poke.speciesId, level);
        if (evolutions.length > 0) {
          if (species(poke.speciesId).special === 'eevee') {
            setEeveeChoice(evolutions.map((evo) => evo.to));
          } else {
            startEvolution(poke.speciesId, evolutions[0].to);
          }
        }
      }
    },
    [startEvolution]
  );

  const handleMove = useCallback((moveId: string) => {
    setBattle((current) => {
      if (!current || current.phase !== 'menu') return current;

      const result = resolveTurn(current.player, current.enemy, moveId);
      const log = [...current.log, ...result.events];

      if (result.enemyFainted) {
        log.push(`¡${current.enemy.name} rival se debilitó!`);
        return { ...current, player: result.player, enemy: result.enemy, log, phase: 'won' };
      }
      if (result.playerFainted) {
        log.push(`¡${current.player.name} se debilitó!`);
        return { ...current, player: result.player, enemy: result.enemy, log, phase: 'lost' };
      }
      return { ...current, player: result.player, enemy: result.enemy, log };
    });
  }, []);

  const handleFlee = useCallback(() => {
    const current = battleRef.current;
    if (!current || current.phase !== 'menu') return;

    if (Math.random() < fleeChance(current.player, current.enemy)) {
      setBattle(null);
      spawnTimerRef.current = 5;
      return;
    }

    const result = resolveEnemyAttack(current.player, current.enemy);
    const log = [...current.log, 'No pudiste escapar...', ...result.events];

    if (result.playerFainted) {
      log.push(`¡${current.player.name} se debilitó!`);
      setBattle({ ...current, player: result.player, log, phase: 'lost' });
    } else {
      setBattle({ ...current, player: result.player, log });
    }
  }, []);

  const handleContinue = useCallback(() => {
    const current = battleRef.current;
    if (!current) return;

    setBattle(null);

    if (current.phase === 'lost') {
      applyDefeat();
      return;
    }

    if (canCaptureSpecies(current.wildSpeciesId)) {
      setPendingReward(current.wildLevel);
      setCatchTarget({ speciesId: current.wildSpeciesId, level: current.wildLevel });
    } else {
      applyRewards(current.wildLevel);
    }
  }, [applyDefeat, applyRewards, canCaptureSpecies]);

  const handleCatchDone = useCallback(
    (caught: boolean) => {
      const target = catchTarget;
      setCatchTarget(null);

      if (caught && target) {
        setSave((prev) => ({
          ...prev,
          owned: [...prev.owned, createPokemon(target.speciesId, target.level)],
          dexCaught: prev.dexCaught.includes(target.speciesId)
            ? prev.dexCaught
            : [...prev.dexCaught, target.speciesId]
        }));
      }

      if (pendingReward !== null) {
        applyRewards(pendingReward);
        setPendingReward(null);
      }
    },
    [applyRewards, catchTarget, pendingReward]
  );

  const handleWake = useCallback((uid: string) => {
    setSave((prev) => {
      const pokemon = prev.owned.find((p) => p.uid === uid);
      if (!pokemon) return prev;
      const cost = wakeCost(pokemon.level);
      if (prev.berries < cost) return prev;
      return {
        ...prev,
        berries: prev.berries - cost,
        owned: prev.owned.map((p) => (p.uid === uid ? { ...p, asleepUntil: 0 } : p))
      };
    });
  }, []);

  const handleUseFromDex = useCallback(
    (speciesId: number) => {
      const candidates = saveRef.current.owned.filter((p) => p.speciesId === speciesId);
      if (!candidates.length) return;
      const best = candidates.reduce((a, b) => (b.level > a.level ? b : a));
      handleSelectPokemon(best.uid);
      setShowPokedex(false);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  const handleSelectPokemon = useCallback((uid: string) => {
    const pokemon = saveRef.current.owned.find((p) => p.uid === uid);
    if (pokemon) rendererRef.current.preloadSprite(walkSprite(pokemon.speciesId));
    setSave((prev) => ({ ...prev, activeUid: uid }));
  }, []);

  // --- bucle principal ---------------------------------------------------

  useEffect(() => {
    let animId: number;
    let lastTime = performance.now();
    let stepAccumulator = 0;

    const tick = (now: number) => {
      const rawDt = (now - lastTime) / 1000;
      lastTime = now;
      const dt = Math.min(rawDt, 0.05);

      if (gameViewRef.current === 'playing' && canvasRef.current && !blockingRef.current) {
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');

        if (ctx) {
          const poke = activeRef.current;
          const pokeSpecies = SPECIES_BY_ID[poke.speciesId];
          const currentStats = statsRef.current;

          const magnetRadius = Math.min(80, 45 + pokeSpecies.baseStats.spe / 6);
          const speedMultiplier = Math.min(1.35, Math.max(0.95, 0.95 + (pokeSpecies.baseStats.spe - 45) / 300));

          let moveX = gyroVectorRef.current.x;
          let moveY = gyroVectorRef.current.y;

          if (keysPressed.current.has('KeyA') || keysPressed.current.has('ArrowLeft')) moveX -= 1;
          if (keysPressed.current.has('KeyD') || keysPressed.current.has('ArrowRight')) moveX += 1;
          if (keysPressed.current.has('KeyW') || keysPressed.current.has('ArrowUp')) moveY -= 1;
          if (keysPressed.current.has('KeyS') || keysPressed.current.has('ArrowDown')) moveY += 1;

          const inputMag = Math.hypot(moveX, moveY);
          let dirX = 0;
          let dirY = 0;
          if (inputMag > 0.05) {
            dirX = (moveX / inputMag) * Math.min(1.0, inputMag);
            dirY = (moveY / inputMag) * Math.min(1.0, inputMag);
          }

          const hasSpeedBuff = !!(currentStats.activeBuff?.type === 'speed' && currentStats.activeBuff.expiresAt > Date.now());
          const hasMagnetBuff = !!(currentStats.activeBuff?.type === 'magnet' && currentStats.activeBuff.expiresAt > Date.now());
          const moveSpeed = 160 * speedMultiplier;

          const stepDist = inputMag > 0.05 ? moveSpeed * dt : 0;
          playerPosRef.current.x += dirX * moveSpeed * dt;
          playerPosRef.current.y += dirY * moveSpeed * dt;

          if (dirX !== 0) playerFacingLeftRef.current = dirX < 0;
          isMovingRef.current = inputMag > 0.05;
          walkDistanceRef.current += stepDist;

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

          const pX = playerPosRef.current.x;
          const pY = playerPosRef.current.y;
          const effectiveMagnetRadius = hasMagnetBuff ? magnetRadius * 2.2 : magnetRadius;

          const remainingBerries: BerryItem[] = [];
          let collected = 0;

          for (const berry of berriesRef.current) {
            const d = distance(pX, pY, berry.x, berry.y);

            if (d < effectiveMagnetRadius && d > 20) {
              const pullAngle = Math.atan2(pY - berry.y, pX - berry.x);
              berry.x += Math.cos(pullAngle) * 140 * dt;
              berry.y += Math.sin(pullAngle) * 140 * dt;
            }

            if (isBerryCollected(pX, pY, berry.x, berry.y, 24)) {
              collected += 1;
              sounds.playBerryChime(berry.type);

              const berryDef = BERRY_DEFINITIONS[berry.type];
              const isDoublePoints =
                currentStats.activeBuff?.type === 'double_points' && currentStats.activeBuff.expiresAt > Date.now();
              const pointsEarned = calculatePoints(
                berry.points,
                isDoublePoints,
                pokeSpecies.name === 'Snorlax' ? 1.5 : 1.0,
                currentStats.comboCount
              );

              rendererRef.current.addFloatingText(`+${pointsEarned}`, berry.x, berry.y, berryDef.color);
              rendererRef.current.addBerryBurst(berry.x, berry.y, berryDef.color, 12);

              let newBuff = currentStats.activeBuff;
              if (berry.type === 'cheri') newBuff = { type: 'speed', expiresAt: Date.now() + 5000 };
              else if (berry.type === 'pecha') newBuff = { type: 'magnet', expiresAt: Date.now() + 6000 };
              else if (berry.type === 'lum') newBuff = { type: 'double_points', expiresAt: Date.now() + 8000 };

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

              const usedGyro = Math.hypot(gyroVectorRef.current.x, gyroVectorRef.current.y) > 0.1;
              triggerAchievementCheck(berry.type, usedGyro);
            } else {
              remainingBerries.push(berry);
            }
          }

          if (collected > 0) {
            setSave((prev) => ({ ...prev, berries: prev.berries + collected }));
          }

          berriesRef.current = generateSurroundingBerries(remainingBerries, pX, pY, 20, 460);

          // Salvajes
          const awake = !isAsleep(poke);
          if (awake) {
            wildsRef.current = updateWilds(wildsRef.current, dt, pX, pY);
            spawnTimerRef.current -= dt;

            if (spawnTimerRef.current <= 0 && wildsRef.current.length < MAX_WILDS) {
              const wild = spawnWild(pX, pY, poke.level);
              wildsRef.current = [...wildsRef.current, wild];
              rendererRef.current.preloadSprite(walkSprite(wild.speciesId));
              spawnTimerRef.current = 7 + Math.random() * 4;
            }

            const collided = wildsRef.current.find((w) => Math.hypot(w.x - pX, w.y - pY) < 20);
            if (collided) {
              wildsRef.current = wildsRef.current.filter((w) => w.uid !== collided.uid);
              startBattleRef.current(collided);
            }
          }

          rendererRef.current.render(
            ctx,
            canvas.width,
            canvas.height,
            pX,
            pY,
            playerFacingLeftRef.current,
            isMovingRef.current,
            walkDistanceRef.current,
            poke.speciesId,
            magnetRadius,
            berriesRef.current,
            dt,
            hasSpeedBuff,
            hasMagnetBuff,
            wildsRef.current
          );
        }
      }

      animId = requestAnimationFrame(tick);
    };

    animId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animId);
  }, [triggerAchievementCheck]);

  // Hook de pruebas (?debug=1): permite lanzar combates sin esperar al azar.
  useEffect(() => {
    if (!window.location.search.includes('debug=1')) return;
    (window as any).__poke = {
      battle: (speciesId = 16, level = 3) => {
        setGameView('playing');
        startBattleRef.current({
          uid: 'debug',
          speciesId,
          level,
          x: 0,
          y: 0,
          vx: 0,
          vy: 0,
          targetX: 0,
          targetY: 0,
          repathTimer: 0
        });
      },
      save: () => saveRef.current,
      wilds: () => wildsRef.current.map((w) => ({ species: w.speciesId, level: w.level, x: w.x, y: w.y })),
      spawn: (speciesId = 16, level = 5, dx = 70, dy = 0) => {
        const p = playerPosRef.current;
        wildsRef.current = [...wildsRef.current, {
          uid: 'debug-' + Math.random().toString(36).slice(2),
          speciesId,
          level,
          x: p.x + dx,
          y: p.y + dy,
          vx: 0,
          vy: 0,
          targetX: p.x + dx,
          targetY: p.y + dy,
          repathTimer: 3
        }];
        rendererRef.current.preloadSprite(walkSprite(speciesId));
      },
      player: () => ({ ...playerPosRef.current })
    };
  }, []);

  // --- entrada -----------------------------------------------------------

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      keysPressed.current.add(e.code);

      if ((e.code === 'Space' || e.code === 'Enter') && gameViewRef.current === 'title') {
        e.preventDefault();
        startGame();
      }

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
  }, [pauseGame, resumeGame, startGame]);

  const handleGyroMovementChange = useCallback((vec: Vector2D, isHardware: boolean) => {
    gyroVectorRef.current = vec;
    if (isHardware) {
      setIsGyroActive(true);
      setGyroTilt({ gamma: Math.round(vec.x * 25), beta: Math.round(vec.y * 25) });
    }
  }, []);

  const allAsleep = save.owned.every((p) => isAsleep(p));
  const nextWake = save.owned.reduce(
    (min, p) => (p.asleepUntil > Date.now() ? Math.min(min, p.asleepUntil) : min),
    Infinity
  );

  return (
    <div className="relative w-full h-full min-h-screen bg-slate-950 flex flex-col items-center justify-center">
      <WatchFrame
        isWatchBezelVisible={isWatchBezelVisible}
        onToggleBezel={() => setIsWatchBezelVisible(!isWatchBezelVisible)}
        onCrownClick={() => {
          if (gameView === 'playing') pauseGame();
          else if (gameView === 'paused') resumeGame();
        }}
      >
        <div className="relative w-full h-full bg-emerald-950 flex items-center justify-center overflow-hidden">
          <canvas ref={canvasRef} width={466} height={466} className="w-full h-full object-cover" />

          {gameView === 'playing' && !battle && (
            <CircularHUD
              stats={stats}
              speciesId={active.speciesId}
              level={active.level}
              berries={save.berries}
              gyroTilt={gyroTilt}
              isGyroActive={isGyroActive}
              onPause={pauseGame}
              onCalibrateGyro={() => {
                gyroCalibrationRef.current = { ...lastGyroRef.current };
                gyroVectorRef.current = { x: 0, y: 0 };
                sounds.playSelect();
              }}
            />
          )}

          {/* Aviso de equipo dormido */}
          {gameView === 'playing' && !battle && allAsleep && (
            <div className="watch-safe absolute inset-0 z-30 flex flex-col items-center justify-center gap-2 pointer-events-none">
              <div className="pointer-events-auto bg-slate-950/95 border border-indigo-500/50 rounded-2xl px-3 py-2 text-center shadow-xl">
                <p className="text-[10px] font-bold text-indigo-300">Todo el equipo duerme</p>
                <p className="text-[9px] text-slate-400 mt-0.5">
                  Despierta en {Math.max(0, Math.ceil((nextWake - Date.now()) / 60000))} min
                </p>
                <button
                  onClick={() => setShowPokemonSelector(true)}
                  className="mt-1.5 px-2 py-1 rounded-lg bg-indigo-500 text-slate-950 text-[9px] font-bold active:scale-95"
                >
                  Ver equipo
                </button>
              </div>
            </div>
          )}

          {gameView === 'title' && (
            <TitleScreen
              owned={save.owned}
              activeUid={save.activeUid}
              onSelect={handleSelectPokemon}
              onStartGame={startGame}
              onOpenPokedex={() => setShowPokedex(true)}
              onOpenAchievements={() => setShowAchievementsModal(true)}
            />
          )}

          {gameView === 'paused' && !showPokemonSelector && !showPokedex && !showAchievementsModal && (
            <PauseModal
              stats={stats}
              active={active}
              berries={save.berries}
              onResume={resumeGame}
              onRestart={restartGame}
              onOpenBox={() => setShowPokemonSelector(true)}
              onOpenPokedex={() => setShowPokedex(true)}
              onOpenAchievements={() => setShowAchievementsModal(true)}
              onExitToTitle={() => setGameView('title')}
            />
          )}

          {battle && (
            <BattleScreen
              player={battle.player}
              enemy={battle.enemy}
              log={battle.log}
              phase={battle.phase}
              onMove={handleMove}
              onFlee={handleFlee}
              onContinue={handleContinue}
            />
          )}

          {catchTarget && (
            <CatchScene
              speciesId={catchTarget.speciesId}
              onDone={handleCatchDone}
            />
          )}

          {evolution && (
            <EvolutionScene
              fromId={evolution.from}
              toId={evolution.to}
              onDone={() => setEvolution(null)}
            />
          )}

          {eeveeChoice && (
            <div className="watch-safe absolute inset-0 z-50 bg-slate-950/95 flex flex-col items-center justify-center gap-3 text-white">
              <p className="text-[10px] font-bold text-amber-300 text-center px-4">
                ¿En qué evoluciona Eevee?
              </p>
              <div className="flex items-center gap-2">
                {eeveeChoice.map((id) => (
                  <button
                    key={id}
                    onClick={() => {
                      setEeveeChoice(null);
                      startEvolution(133, id);
                    }}
                    className="flex flex-col items-center gap-1 rounded-xl border border-slate-700 bg-slate-900/80 px-2 py-1.5 active:scale-95"
                  >
                    <img src={portraitSprite(id)} alt={SPECIES_BY_ID[id].name} className="w-10 h-10 object-contain" />
                    <span className="text-[8px] font-bold">{SPECIES_BY_ID[id].name}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {showPokemonSelector && (
            <PokemonSelector
              owned={save.owned}
              activeUid={save.activeUid}
              berries={save.berries}
              onSelect={(uid) => {
                handleSelectPokemon(uid);
                setShowPokemonSelector(false);
              }}
              onWake={handleWake}
              onClose={() => setShowPokemonSelector(false)}
            />
          )}

          {showPokedex && (
            <PokedexModal
              seen={save.dexSeen}
              caught={save.dexCaught}
              owned={save.owned}
              activeUid={save.activeUid}
              onUse={handleUseFromDex}
              onClose={() => setShowPokedex(false)}
            />
          )}

          {showAchievementsModal && (
            <AchievementsModal
              achievements={achievements}
              onClose={() => setShowAchievementsModal(false)}
            />
          )}

          <AchievementToast achievement={unlockedToast} onDismiss={() => setUnlockedToast(null)} />
        </div>
      </WatchFrame>

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
