import { BerryItem, PokemonInfo } from './types';
import { BERRY_DEFINITIONS } from './pokemonData';

export interface FloatingText {
  id: string;
  text: string;
  x: number;
  y: number;
  color: string;
  life: number; // 1.0 down to 0
  maxLife: number;
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  size: number;
  life: number;
  maxLife: number;
}

export class MapRenderer {
  private spriteCache: Map<string, HTMLImageElement> = new Map();
  private particles: Particle[] = [];
  private floatingTexts: FloatingText[] = [];
  private grassRustleTimer: number = 0;

  constructor() {}

  public preloadSprite(url: string) {
    if (this.spriteCache.has(url)) return;
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = url;
    this.spriteCache.set(url, img);
  }

  public addFloatingText(text: string, x: number, y: number, color: string = '#fbbf24') {
    this.floatingTexts.push({
      id: Math.random().toString(),
      text,
      x,
      y: y - 10,
      color,
      life: 1.0,
      maxLife: 1.0
    });
  }

  public addBerryBurst(x: number, y: number, color: string, count: number = 10) {
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.5;
      const speed = 40 + Math.random() * 80;
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        color,
        size: 3 + Math.random() * 3,
        life: 0.4 + Math.random() * 0.3,
        maxLife: 0.7
      });
    }
  }

  public addGrassRustle(x: number, y: number) {
    for (let i = 0; i < 4; i++) {
      this.particles.push({
        x: x + (Math.random() - 0.5) * 16,
        y: y + (Math.random() - 0.5) * 10,
        vx: (Math.random() - 0.5) * 30,
        vy: -20 - Math.random() * 30,
        color: '#22c55e',
        size: 3,
        life: 0.3,
        maxLife: 0.3
      });
    }
  }

  public render(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    playerX: number,
    playerY: number,
    playerFacingLeft: boolean,
    isMoving: boolean,
    walkDistance: number,
    activePokemon: PokemonInfo,
    berries: BerryItem[],
    dt: number,
    hasSpeedBuff: boolean,
    hasMagnetBuff: boolean
  ) {
    ctx.save();
    ctx.imageSmoothingEnabled = false;

    // Center camera on player
    const camX = width / 2 - playerX;
    const camY = height / 2 - playerY;

    // 1. Draw Infinite GBA Background Grid
    this.drawGbaTerrain(ctx, width, height, playerX, playerY, camX, camY);

    // 2. Draw Berries
    const now = Date.now();
    for (const berry of berries) {
      // Only draw berries roughly in screen view
      const screenX = berry.x + camX;
      const screenY = berry.y + camY;
      if (screenX < -50 || screenX > width + 50 || screenY < -50 || screenY > height + 50) {
        continue;
      }
      this.drawBerry(ctx, berry, screenX, screenY, now);
    }

    // 3. Draw Player Shadow
    const pScreenX = width / 2;
    const pScreenY = height / 2;
    ctx.fillStyle = 'rgba(15, 23, 42, 0.35)';
    ctx.beginPath();
    ctx.ellipse(pScreenX, pScreenY + 16, 15, 6, 0, 0, Math.PI * 2);
    ctx.fill();

    // 4. Buff visual auras
    if (hasSpeedBuff) {
      ctx.strokeStyle = 'rgba(239, 68, 68, 0.6)';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(pScreenX, pScreenY + 4, 22 + Math.sin(now * 0.01) * 3, 0, Math.PI * 2);
      ctx.stroke();
    }
    if (hasMagnetBuff) {
      ctx.strokeStyle = 'rgba(236, 72, 153, 0.6)';
      ctx.setLineDash([4, 4]);
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(pScreenX, pScreenY + 4, activePokemon.magnetRadius * 0.8, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // 5. Draw Pokémon Sprite
    this.drawPokemon(
      ctx,
      activePokemon,
      pScreenX,
      pScreenY,
      playerFacingLeft,
      isMoving,
      walkDistance
    );

    // 6. Update and draw particles
    this.updateAndDrawParticles(ctx, camX, camY, dt);

    // 7. Update and draw floating score texts
    this.updateAndDrawFloatingTexts(ctx, camX, camY, dt);

    ctx.restore();
  }

  private drawGbaTerrain(
    ctx: CanvasRenderingContext2D,
    viewW: number,
    viewH: number,
    pX: number,
    pY: number,
    camX: number,
    camY: number
  ) {
    const tileSize = 32;
    const startTileX = Math.floor((pX - viewW / 2) / tileSize) - 1;
    const endTileX = Math.ceil((pX + viewW / 2) / tileSize) + 1;
    const startTileY = Math.floor((pY - viewH / 2) / tileSize) - 1;
    const endTileY = Math.ceil((pY + viewH / 2) / tileSize) + 1;

    for (let tx = startTileX; tx <= endTileX; tx++) {
      for (let ty = startTileY; ty <= endTileY; ty++) {
        const drawX = Math.round(tx * tileSize + camX);
        const drawY = Math.round(ty * tileSize + camY);

        // Deterministic terrain type based on coordinate hashes
        const hash = Math.abs(Math.sin(tx * 12.9898 + ty * 78.233) * 43758.5453) % 1;
        const pathHash = Math.abs(Math.sin(Math.floor(tx / 3) * 17.1 + Math.floor(ty / 3) * 31.7) * 1000) % 1;

        // Base grass color with GBA checkerboard nuance
        const isChecker = (tx + ty) % 2 === 0;
        ctx.fillStyle = isChecker ? '#489848' : '#4fa04f';
        ctx.fillRect(drawX, drawY, tileSize, tileSize);

        // Path or special feature
        if (pathHash > 0.82) {
          // Dirt trail tile (GBA route path)
          ctx.fillStyle = '#d4aa6a';
          ctx.fillRect(drawX, drawY, tileSize, tileSize);
          ctx.fillStyle = '#bfa063';
          ctx.fillRect(drawX + 4, drawY + 4, 3, 3);
          ctx.fillRect(drawX + 18, drawY + 14, 2, 2);
        } else if (hash > 0.72) {
          // Tall grass patch (Pokémon wild grass)
          ctx.fillStyle = '#327c32';
          ctx.fillRect(drawX + 2, drawY + 2, tileSize - 4, tileSize - 4);
          ctx.fillStyle = '#276827';
          // Spiky grass blades
          ctx.fillRect(drawX + 6, drawY + 8, 4, 16);
          ctx.fillRect(drawX + 16, drawY + 6, 4, 18);
          ctx.fillRect(drawX + 24, drawY + 10, 4, 14);
        } else if (hash > 0.6) {
          // Flowers (red, blue, or yellow)
          const flowerType = Math.floor(hash * 30) % 3;
          const flowerColor = flowerType === 0 ? '#ef4444' : flowerType === 1 ? '#38bdf8' : '#facc15';
          ctx.fillStyle = flowerColor;
          ctx.fillRect(drawX + 10, drawY + 10, 5, 5);
          ctx.fillRect(drawX + 18, drawY + 16, 4, 4);
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(drawX + 11, drawY + 11, 2, 2);
        } else if (hash < 0.05) {
          // Decorative small GBA stone
          ctx.fillStyle = '#64748b';
          ctx.beginPath();
          ctx.ellipse(drawX + 16, drawY + 16, 6, 4, 0, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }
  }

  private drawBerry(
    ctx: CanvasRenderingContext2D,
    berry: BerryItem,
    screenX: number,
    screenY: number,
    now: number
  ) {
    const def = BERRY_DEFINITIONS[berry.type] || BERRY_DEFINITIONS.oran;
    const bob = Math.sin(now * 0.005 + berry.bobOffset) * 3;

    // Drop shadow
    ctx.fillStyle = 'rgba(15, 23, 42, 0.3)';
    ctx.beginPath();
    ctx.ellipse(screenX, screenY + 10, 8, 4, 0, 0, Math.PI * 2);
    ctx.fill();

    const berryY = screenY + bob;

    // Golden halo glow
    if (berry.type === 'golden') {
      const pulse = (Math.sin(now * 0.008) + 1) * 0.5;
      const grad = ctx.createRadialGradient(screenX, berryY, 2, screenX, berryY, 18 + pulse * 6);
      grad.addColorStop(0, 'rgba(253, 224, 71, 0.7)');
      grad.addColorStop(1, 'rgba(253, 224, 71, 0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(screenX, berryY, 22, 0, Math.PI * 2);
      ctx.fill();
    }

    // Berry Body
    ctx.fillStyle = def.color;
    ctx.beginPath();
    ctx.arc(screenX, berryY, 8, 0, Math.PI * 2);
    ctx.fill();

    // Dark border for pixel GBA pop
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Top Leaf / Stem (Green)
    ctx.fillStyle = '#22c55e';
    ctx.beginPath();
    ctx.moveTo(screenX - 2, berryY - 7);
    ctx.lineTo(screenX + 4, berryY - 12);
    ctx.lineTo(screenX + 2, berryY - 7);
    ctx.fill();

    // Highlight sheen
    ctx.fillStyle = def.glowColor;
    ctx.beginPath();
    ctx.arc(screenX - 3, berryY - 3, 2.5, 0, Math.PI * 2);
    ctx.fill();
  }

  private drawPokemon(
    ctx: CanvasRenderingContext2D,
    pokemon: PokemonInfo,
    x: number,
    y: number,
    facingLeft: boolean,
    isMoving: boolean,
    walkDistance: number
  ) {
    // Walking bob animation
    const bob = isMoving ? Math.sin(walkDistance * 0.15) * 3 : Math.sin(Date.now() * 0.003) * 1.5;
    const drawY = y + bob;

    const img = this.spriteCache.get(pokemon.spriteUrl);

    ctx.save();
    ctx.translate(x, drawY);

    if (facingLeft) {
      ctx.scale(-1, 1);
    }

    if (img && img.complete && img.naturalWidth > 0) {
      // Draw official sprite with pixel scaling (64x64)
      const size = 56;
      ctx.drawImage(img, -size / 2, -size / 2 - 4, size, size);
    } else {
      // Fallback procedural pixel creature representation
      this.drawProceduralPokemon(ctx, pokemon);
    }

    ctx.restore();
  }

  private drawProceduralPokemon(ctx: CanvasRenderingContext2D, pokemon: PokemonInfo) {
    // Procedural cute Pokémon ball avatar
    ctx.fillStyle = pokemon.accentColor;
    ctx.beginPath();
    ctx.arc(0, 0, 16, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Eyes
    ctx.fillStyle = '#0f172a';
    ctx.beginPath();
    ctx.arc(4, -2, 2.5, 0, Math.PI * 2);
    ctx.arc(-4, -2, 2.5, 0, Math.PI * 2);
    ctx.fill();

    // Cheeks
    ctx.fillStyle = '#ef4444';
    ctx.beginPath();
    ctx.arc(8, 3, 2, 0, Math.PI * 2);
    ctx.arc(-8, 3, 2, 0, Math.PI * 2);
    ctx.fill();
  }

  private updateAndDrawParticles(
    ctx: CanvasRenderingContext2D,
    camX: number,
    camY: number,
    dt: number
  ) {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life -= dt;
      if (p.life <= 0) {
        this.particles.splice(i, 1);
        continue;
      }

      p.x += p.vx * dt;
      p.y += p.vy * dt;

      const alpha = Math.max(0, p.life / p.maxLife);
      ctx.fillStyle = p.color;
      ctx.globalAlpha = alpha;
      ctx.fillRect(p.x + camX - p.size / 2, p.y + camY - p.size / 2, p.size, p.size);
    }
    ctx.globalAlpha = 1.0;
  }

  private updateAndDrawFloatingTexts(
    ctx: CanvasRenderingContext2D,
    camX: number,
    camY: number,
    dt: number
  ) {
    ctx.font = 'bold 12px "Press Start 2P", monospace';
    ctx.textAlign = 'center';

    for (let i = this.floatingTexts.length - 1; i >= 0; i--) {
      const ft = this.floatingTexts[i];
      ft.life -= dt;
      if (ft.life <= 0) {
        this.floatingTexts.splice(i, 1);
        continue;
      }

      ft.y -= 25 * dt; // Float upwards
      const alpha = Math.max(0, ft.life / ft.maxLife);

      ctx.save();
      ctx.globalAlpha = alpha;

      // Dark text shadow
      ctx.fillStyle = '#0f172a';
      ctx.fillText(ft.text, ft.x + camX + 1, ft.y + camY + 1);

      ctx.fillStyle = ft.color;
      ctx.fillText(ft.text, ft.x + camX, ft.y + camY);
      ctx.restore();
    }
  }
}
