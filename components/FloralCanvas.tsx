
import React, { useEffect, useRef, useState } from 'react';
import { Point, RainDrop, Stem, Flower, Particle, VaseState, FlowerType } from '../types';

// Smaller, more delicate vase dimensions
const VASE_WIDTH = 100;
const VASE_HEIGHT = 200;
const VASE_OPENING_WIDTH = 80;
const GRAVITY = 0.15;

// Helper to generate random ID
const uuid = () => Math.random().toString(36).substring(2, 9);
// Helper for random range
const random = (min: number, max: number) => Math.random() * (max - min) + min;

// Mono-no-aware palette generator: Muted, natural, soft
const randomColor = (isNight: boolean) => {
    // Bias towards Sakura pinks, whites, faded reds, soft purples
    // Hues: 
    // 330-360 (Pinks/Reds)
    // 0-20 (Reds/Oranges)
    // 200-260 (Blues/Purples for hydrangea vibes)
    
    const roll = Math.random();
    let hue;
    if (roll < 0.4) hue = random(330, 360); // Pinks
    else if (roll < 0.6) hue = random(0, 30); // Faded Reds/Peaches
    else if (roll < 0.9) hue = random(200, 270); // Purples/Blues
    else hue = random(40, 60); // Pale Yellows

    // Lower saturation for that "wabi-sabi" faded look
    const s = isNight ? random(40, 60) : random(30, 60);
    // Higher lightness for pastel/delicate feel
    const l = isNight ? random(60, 75) : random(70, 90);
    
    return `hsl(${hue}, ${s}%, ${l}%)`;
};

export const FloralCanvas: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // UI State
  const [isNight, setIsNight] = useState(false);

  // Simulation State Refs
  const rainDrops = useRef<RainDrop[]>([]);
  const stems = useRef<Stem[]>([]);
  const flowers = useRef<Flower[]>([]);
  const particles = useRef<Particle[]>([]);
  
  // Interaction State
  const isDrawing = useRef(false);
  const currentStemId = useRef<string | null>(null);

  // Vase State
  const vase = useRef<VaseState>({
    x: 0, 
    y: 0,
    width: VASE_WIDTH,
    height: VASE_HEIGHT,
    waterLevel: 0,
    maxCapacity: 5000, // Reduced capacity for smaller vase
    currentVolume: 0,
  });

  // Keep track of night mode in ref for animation loop
  const isNightRef = useRef(isNight);
  useEffect(() => { isNightRef.current = isNight; }, [isNight]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Handle Resize
    const resize = () => {
      if (containerRef.current && canvas) {
        canvas.width = containerRef.current.clientWidth;
        canvas.height = containerRef.current.clientHeight;
        
        // Center the vase
        vase.current.x = canvas.width / 2;
        vase.current.y = canvas.height - 80; // Bottom pivot point
      }
    };
    window.addEventListener('resize', resize);
    resize();

    // --- Input Handlers ---
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key.length === 1) {
        rainDrops.current.push({
          id: uuid(),
          char: e.key,
          x: random(0, canvas.width),
          y: -20,
          velocity: { x: 0, y: random(3, 6) }, // Slower, gentler rain
          opacity: 0, // Start invisible and fade in
          size: random(14, 20)
        });
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    // --- Drawing Functions ---

    const drawVase3D = (vx: number, vy: number, width: number, height: number, volumeRatio: number) => {
        const topY = vy - height;
        const bottomY = vy;
        const halfWidth = width / 2;
        const topHalfWidth = VASE_OPENING_WIDTH / 2;
        const perspectiveY = 10; // Flatter perspective for a more graphic/simple look

        // 1. Back Glass (Interior)
        ctx.save();
        // Muted glass colors
        ctx.fillStyle = isNightRef.current ? 'rgba(20, 20, 30, 0.4)' : 'rgba(200, 210, 220, 0.2)';
        ctx.strokeStyle = isNightRef.current ? 'rgba(100, 100, 120, 0.2)' : 'rgba(255, 255, 255, 0.4)';
        ctx.lineWidth = 1;
        
        ctx.beginPath();
        // Left curve (Gentler curve for a simpler vase)
        ctx.moveTo(vx - topHalfWidth, topY);
        ctx.bezierCurveTo(vx - width * 0.55, topY + height * 0.2, vx - halfWidth, bottomY - perspectiveY, vx - halfWidth, bottomY);
        // Bottom Ellipse (Back half)
        ctx.ellipse(vx, bottomY, halfWidth, perspectiveY, 0, 0, Math.PI); 
        // Right curve
        ctx.bezierCurveTo(vx + width * 0.55, topY + height * 0.2, vx + topHalfWidth, bottomY - perspectiveY, vx + topHalfWidth, topY);
        // Top Rim (Back half)
        ctx.ellipse(vx, topY, topHalfWidth, perspectiveY, 0, Math.PI, 0);
        ctx.fill();
        ctx.stroke();

        // 2. Water
        if (volumeRatio > 0) {
            const waterHeight = height * volumeRatio;
            const waterSurfaceY = bottomY - waterHeight;
            
            // Calculate width at water level
            const progress = waterHeight / height;
            // Less bulging
            const currentWidthScale = 1 + Math.sin(progress * Math.PI) * 0.05; 
            const currentHalfWidth = (halfWidth * (1-progress) + topHalfWidth * progress) * currentWidthScale;

            ctx.save();
            // Clip to vase shape
            ctx.beginPath();
            ctx.moveTo(vx - topHalfWidth, topY);
            ctx.bezierCurveTo(vx - width * 0.55, topY + height * 0.2, vx - halfWidth, bottomY - perspectiveY, vx - halfWidth, bottomY);
            ctx.ellipse(vx, bottomY, halfWidth, perspectiveY, 0, 0, Math.PI);
            ctx.bezierCurveTo(vx + halfWidth, bottomY - perspectiveY, vx + width * 0.55, topY + height * 0.2, vx + topHalfWidth, topY);
            ctx.closePath();
            ctx.clip();

            // Draw Water Body - Darker, deeper water for mystery
            const waterColor = isNightRef.current ? 'rgba(20, 30, 50, 0.6)' : 'rgba(170, 190, 210, 0.5)';
            ctx.fillStyle = waterColor;
            ctx.beginPath();
            ctx.rect(0, waterSurfaceY, canvas.width, height);
            ctx.fill();

            // Water Surface (Top Ellipse)
            ctx.beginPath();
            ctx.ellipse(vx, waterSurfaceY, currentHalfWidth, perspectiveY * 0.9, 0, 0, Math.PI * 2);
            ctx.fillStyle = isNightRef.current ? 'rgba(40, 50, 80, 0.4)' : 'rgba(200, 220, 240, 0.4)';
            ctx.fill();
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
            ctx.stroke();
            ctx.restore();
        }
        ctx.restore();
    };

    const drawVaseFront = (vx: number, vy: number, width: number, height: number) => {
        const topY = vy - height;
        const bottomY = vy;
        const halfWidth = width / 2;
        const topHalfWidth = VASE_OPENING_WIDTH / 2;
        const perspectiveY = 10;

        ctx.save();
        // Front Glass Highlights - More subtle
        const grad = ctx.createLinearGradient(vx - halfWidth, topY, vx + halfWidth, bottomY);
        grad.addColorStop(0, 'rgba(255,255,255,0)');
        grad.addColorStop(0.3, 'rgba(255,255,255,0.02)');
        grad.addColorStop(0.5, 'rgba(255,255,255,0)');
        grad.addColorStop(0.7, 'rgba(255,255,255,0.05)'); 
        grad.addColorStop(1, 'rgba(255,255,255,0)');
        
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.moveTo(vx - topHalfWidth, topY);
        ctx.bezierCurveTo(vx - width * 0.55, topY + height * 0.2, vx - halfWidth, bottomY - perspectiveY, vx - halfWidth, bottomY);
        ctx.ellipse(vx, bottomY, halfWidth, perspectiveY, 0, 0, Math.PI); 
        ctx.bezierCurveTo(vx + halfWidth, bottomY - perspectiveY, vx + width * 0.55, topY + height * 0.2, vx + topHalfWidth, topY);
        ctx.closePath();
        ctx.fill();

        // Rim Highlight
        ctx.beginPath();
        ctx.ellipse(vx, topY, topHalfWidth, perspectiveY, 0, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // Soft Reflection
        ctx.beginPath();
        ctx.moveTo(vx + halfWidth * 0.3, topY + 30);
        ctx.quadraticCurveTo(vx + halfWidth * 0.4, vy - 40, vx + halfWidth * 0.2, vy - 20);
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
        ctx.lineWidth = 3;
        ctx.lineCap = 'round';
        ctx.stroke();

        ctx.restore();
    };

    const drawFlower = (flower: Flower) => {
        ctx.save();
        ctx.translate(flower.x, flower.y);
        ctx.rotate(flower.rotation);
        
        ctx.globalAlpha = flower.opacity;
        // Soft bloom at night
        if (isNightRef.current) {
            ctx.shadowColor = flower.color;
            ctx.shadowBlur = 15;
            ctx.globalCompositeOperation = 'screen';
        }

        ctx.fillStyle = flower.color;
        
        if (flower.type === 'cosmos') {
            for (let i = 0; i < flower.petalCount; i++) {
                ctx.save();
                ctx.rotate((Math.PI * 2 * i) / flower.petalCount);
                ctx.beginPath();
                const w = flower.radius * 0.35; // Narrower petals
                const l = flower.radius;
                
                ctx.moveTo(0, 0);
                ctx.quadraticCurveTo(w, l * 0.6, w * 0.6, l);
                ctx.quadraticCurveTo(0, l * 0.9, -w * 0.6, l);
                ctx.quadraticCurveTo(-w, l * 0.6, 0, 0);
                ctx.fill();
                ctx.restore();
            }
            // Center
            ctx.fillStyle = isNightRef.current ? 'rgba(255,255,200,0.8)' : 'rgba(255,250,220,0.8)'; 
            ctx.beginPath();
            ctx.arc(0, 0, flower.radius * 0.2, 0, Math.PI * 2);
            ctx.fill();
        } 
        else if (flower.type === 'lily') {
            const petals = 6;
            for (let i = 0; i < petals; i++) {
                ctx.save();
                ctx.rotate((Math.PI * 2 * i) / petals);
                ctx.beginPath();
                const w = flower.radius * 0.3;
                const l = flower.radius * 1.1;
                ctx.moveTo(0, 0);
                ctx.bezierCurveTo(w, l * 0.4, w * 0.2, l * 0.9, 0, l);
                ctx.bezierCurveTo(-w * 0.2, l * 0.9, -w, l * 0.4, 0, 0);
                
                // Solid pale color for flat aesthetic
                ctx.fill();
                ctx.restore();
            }
        } 
        else if (flower.type === 'rose') {
            const layers = 3;
            let currentRadius = flower.radius;
            // Less detailed, more abstract rose
            for (let l = 0; l < layers; l++) {
                const petalsInLayer = 3 + l;
                const r = currentRadius * (1 - l * 0.25);
                ctx.fillStyle = flower.color;
                ctx.globalAlpha = flower.opacity * (1 - l * 0.1); 
                
                for(let p = 0; p < petalsInLayer; p++) {
                    ctx.save();
                    const angleOffset = l;
                    ctx.rotate((Math.PI * 2 * p) / petalsInLayer + angleOffset + flower.rotation);
                    ctx.beginPath();
                    ctx.arc(r * 0.5, 0, r * 0.5, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.restore();
                }
            }
        }

        ctx.restore();
    };


    // --- Game Loop ---
    let animationFrameId: number;

    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const isNight = isNightRef.current;
      const vx = vase.current.x;
      const vy = vase.current.y;
      
      // 1. Background - Mono-no-aware (Atmospheric, desaturated)
      const grad = ctx.createLinearGradient(0, 0, 0, canvas.height);
      if (isNight) {
        // Deep Indigo/Charcoal
        grad.addColorStop(0, '#0f1016'); 
        grad.addColorStop(1, '#1e1b30'); 
      } else {
        // Overcast, Misty, Pale Blue-Gray
        grad.addColorStop(0, '#c7cdd9'); 
        grad.addColorStop(1, '#e8ecf2'); 
      }
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Celestial Body - More subtle
      if (isNight) {
          // Pale, cold moon
          ctx.fillStyle = '#eef2ff';
          ctx.shadowColor = 'rgba(255, 255, 255, 0.3)';
          ctx.shadowBlur = 80;
          ctx.beginPath();
          ctx.arc(120, 120, 30, 0, Math.PI * 2);
          ctx.fill();
          ctx.shadowBlur = 0;
      } else {
          // Diffused Sun (Cloudy day)
          ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
          ctx.shadowColor = 'rgba(255, 255, 255, 0.8)';
          ctx.shadowBlur = 100;
          ctx.beginPath();
          ctx.arc(canvas.width - 120, 100, 60, 0, Math.PI * 2);
          ctx.fill();
          ctx.shadowBlur = 0;
      }

      // 2. Vase Back & Water
      const volumeRatio = vase.current.currentVolume / vase.current.maxCapacity;
      drawVase3D(vx, vy, vase.current.width, vase.current.height, volumeRatio);

      // 3. Stems - Desaturated, thin, elegant
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      
      stems.current.forEach(stem => {
        if (stem.points.length < 2) return;
        ctx.beginPath();
        // Desaturated olive/brownish greens
        ctx.strokeStyle = isNight ? '#2f3e30' : '#576658'; 
        ctx.lineWidth = Math.max(1, stem.width * 0.8); // Thinner stems
        ctx.moveTo(stem.points[0].x, stem.points[0].y);
        for (let i = 1; i < stem.points.length; i++) {
            const p = stem.points[i];
            ctx.lineTo(p.x, p.y);
        }
        ctx.stroke();
      });

      // 4. Vase Front (Glass Overlay)
      drawVaseFront(vx, vy, vase.current.width, vase.current.height);

      // 5. Rain - Thinner, more melancholic
      ctx.font = '16px serif'; // Serif font for elegance
      ctx.textAlign = 'center';
      
      for (let i = rainDrops.current.length - 1; i >= 0; i--) {
        const drop = rainDrops.current[i];
        
        drop.velocity.y += 0.02; // Less gravity acceleration
        drop.y += drop.velocity.y;
        drop.x += drop.velocity.x;
        if (drop.opacity < 1) drop.opacity += 0.05;

        // Subtle rain color
        ctx.fillStyle = isNight ? 'rgba(200, 210, 255, 0.6)' : 'rgba(100, 120, 140, 0.6)';
        
        ctx.globalAlpha = drop.opacity * 0.8;
        ctx.fillText(drop.char, drop.x, drop.y);
        ctx.globalAlpha = 1;

        // Collision Vase Top
        const topY = vy - vase.current.height;
        const hitVaseX = drop.x > vx - VASE_OPENING_WIDTH/2 && drop.x < vx + VASE_OPENING_WIDTH/2;
        const hitVaseY = drop.y > topY && drop.y < topY + 20;

        if (hitVaseX && hitVaseY) {
            rainDrops.current.splice(i, 1);
            if (vase.current.currentVolume < vase.current.maxCapacity) {
                vase.current.currentVolume += 30; // Fill slower
            } else {
                 for(let k=0; k<2; k++) {
                    particles.current.push({
                        id: uuid(),
                        x: drop.x,
                        y: topY,
                        velocity: { x: random(-1.5, 1.5), y: random(-1, -2) },
                        color: isNight ? 'rgba(160, 180, 220, 0.5)' : 'rgba(120, 140, 160, 0.5)',
                        life: 1,
                        decay: 0.015,
                        size: random(1, 3),
                        type: 'water'
                    });
                 }
            }
            continue;
        }

        if (drop.y > canvas.height) rainDrops.current.splice(i, 1);
      }

      // 6. Flowers
      for (let i = flowers.current.length - 1; i >= 0; i--) {
        const flower = flowers.current[i];
        
        if (flower.state === 'blooming') {
            flower.radius += (flower.maxRadius - flower.radius) * 0.03; // Slower bloom
            if (Math.abs(flower.maxRadius - flower.radius) < 0.5) flower.state = 'alive';
        } else if (flower.state === 'alive') {
            flower.life++;
            // Gentle sway
            flower.rotation += Math.sin(Date.now() * 0.001 + flower.x) * 0.002;
            
            if (flower.life > flower.maxLife) flower.state = 'withered';
        } else if (flower.state === 'withered') {
            // Very slow decay, fading out gently
            flower.opacity -= 0.001; 
            
            // Generate falling petals (Sakura blizzard effect)
            if (Math.random() < 0.05 || flower.opacity <= 0.1) {
                const numPetals = 1; // One by one
                for (let p = 0; p < numPetals; p++) {
                    particles.current.push({
                        id: uuid(),
                        x: flower.x + random(-15, 15),
                        y: flower.y + random(-15, 15),
                        velocity: { x: random(-1, 1), y: random(0.5, 1.5) }, // Drift slowly down
                        color: flower.color,
                        life: 1,
                        decay: random(0.003, 0.008), // Long life particles
                        size: random(2, 5),
                        type: 'petal'
                    });
                }
                if (flower.opacity <= 0) {
                     flowers.current.splice(i, 1);
                     const stemIndex = stems.current.findIndex(s => s.id === flower.stemId);
                     if (stemIndex !== -1) stems.current.splice(stemIndex, 1);
                }
            }
        }
        
        drawFlower(flower);
      }

      // 7. Particles (Petals & Water)
      for (let i = particles.current.length - 1; i >= 0; i--) {
        const p = particles.current[i];
        p.life -= p.decay;
        
        if (p.type === 'petal') {
            // Floating physics for petals
            p.x += Math.sin(Date.now() * 0.002 + p.id.charCodeAt(0)) * 0.5 + p.velocity.x * 0.5;
            p.y += p.velocity.y * 0.5; // Fall slow
            p.velocity.y += 0.005; 
        } else {
            // Standard gravity for water
            p.velocity.y += GRAVITY * 0.5;
            p.x += p.velocity.x;
            p.y += p.velocity.y;
        }

        if (p.life <= 0 || p.y > canvas.height + 50) {
            particles.current.splice(i, 1);
            continue;
        }

        ctx.globalAlpha = p.life * 0.8;
        ctx.fillStyle = p.color;
        
        ctx.beginPath();
        if (p.type === 'petal') {
             // Rotate petals as they fall
             const rotation = Date.now() * 0.005 + p.x * 0.1;
             const px = p.x;
             const py = p.y;
             const size = p.size;
             
             ctx.save();
             ctx.translate(px, py);
             ctx.rotate(rotation);
             ctx.ellipse(0, 0, size, size * 0.5, 0, 0, Math.PI * 2);
             ctx.fill();
             ctx.restore();
        } else {
             ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
             ctx.fill();
        }
        ctx.globalAlpha = 1;
      }

      // 8. Window Sill / Environment Overlay - Minimalist Japanese style
      ctx.save();
      const sillY = canvas.height - 50;
      
      // Top face of sill (Wood texture color)
      ctx.fillStyle = isNight ? '#26201b' : '#d4cdc5'; // Dark wood vs Light wood
      ctx.beginPath();
      ctx.rect(0, sillY, canvas.width, 15);
      ctx.fill();

      // Front face
      ctx.fillStyle = isNight ? '#1a1612' : '#c5beb6';
      ctx.beginPath();
      ctx.rect(0, sillY + 15, canvas.width, 35);
      ctx.fill();

      // Soft Shadow under vase
      ctx.fillStyle = 'rgba(0,0,0,0.2)';
      ctx.beginPath();
      ctx.ellipse(vx, sillY + 8, vase.current.width / 2.5, 3, 0, 0, Math.PI * 2);
      ctx.fill();

      // Window Frame Outline (Very thin, elegant)
      ctx.strokeStyle = isNight ? '#0f1016' : '#ffffff';
      ctx.lineWidth = 15;
      ctx.strokeRect(0,0, canvas.width, canvas.height);
      
      // Inner line for frame
      ctx.strokeStyle = 'rgba(0,0,0,0.1)';
      ctx.lineWidth = 1;
      ctx.strokeRect(15, 15, canvas.width - 30, canvas.height - 30);
      
      ctx.restore();

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener('resize', resize);
      window.removeEventListener('keydown', handleKeyDown);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <div 
        ref={containerRef} 
        className="w-full h-screen relative cursor-crosshair select-none overflow-hidden"
    >
        {/* Minimalist UI */}
        <div className="absolute top-6 left-6 z-10 flex gap-4">
            <div className={`px-6 py-4 rounded-sm backdrop-blur-sm border-l-2 shadow-sm transition-colors duration-1000 ${isNight ? 'bg-slate-900/40 text-gray-300 border-indigo-900/50' : 'bg-white/40 text-gray-600 border-gray-400/50'}`}>
                <h1 className="text-lg font-serif tracking-widest mb-1 opacity-90">物哀</h1>
                <p className="text-xs font-serif opacity-70 tracking-wide">
                    Create life with touch, rain with keys.
                </p>
            </div>
            
            <button 
                onClick={() => setIsNight(!isNight)}
                className={`h-12 w-12 rounded-full flex items-center justify-center text-xl transition-all duration-1000 opacity-80 hover:opacity-100 ${isNight ? 'text-indigo-200' : 'text-orange-300'}`}
                title="Toggle Time"
            >
                {isNight ? '☾' : '☼'}
            </button>
        </div>
        
        <canvas
            ref={canvasRef}
            onPointerDown={(e) => {
                canvasRef.current?.setPointerCapture(e.pointerId);
                const rect = canvasRef.current?.getBoundingClientRect();
                if(!rect) return;
                const x = e.clientX - rect.left;
                const y = e.clientY - rect.top;
                
                isDrawing.current = true;
                const newStem: Stem = {
                    id: uuid(),
                    points: [{ x, y }],
                    color: '#166534', 
                    width: random(1.5, 3), // Thinner stems
                    maxLength: random(100, 300),
                    grown: false
                };
                stems.current.push(newStem);
                currentStemId.current = newStem.id;
            }}
            onPointerMove={(e) => {
                if (!isDrawing.current || !currentStemId.current || !canvasRef.current) return;
                const rect = canvasRef.current.getBoundingClientRect();
                const x = e.clientX - rect.left;
                const y = e.clientY - rect.top;

                const stem = stems.current.find(s => s.id === currentStemId.current);
                if (stem && !stem.grown) {
                    const lastPoint = stem.points[stem.points.length - 1];
                    const dist = Math.hypot(x - lastPoint.x, y - lastPoint.y);
                    if (dist > 5) {
                         stem.points.push({ x, y });
                    }
                }
            }}
            onPointerUp={() => {
                 if (isDrawing.current && currentStemId.current) {
                    const stem = stems.current.find(s => s.id === currentStemId.current);
                    if (stem) {
                        stem.grown = true;
                        const lastPoint = stem.points[stem.points.length - 1];
                        const flowerTypes: FlowerType[] = ['cosmos', 'rose', 'lily'];
                        const type = flowerTypes[Math.floor(Math.random() * flowerTypes.length)];
                        
                        flowers.current.push({
                            id: uuid(),
                            stemId: stem.id,
                            x: lastPoint.x,
                            y: lastPoint.y,
                            color: randomColor(isNightRef.current),
                            petalCount: type === 'lily' ? 6 : Math.floor(random(5, 9)),
                            radius: 0,
                            maxRadius: random(20, 45), // Smaller, modest flowers
                            state: 'blooming',
                            life: 0,
                            maxLife: random(600, 1200), // Longer contemplative life
                            opacity: 1,
                            type: type,
                            rotation: random(0, Math.PI * 2)
                        });
                    }
                }
                isDrawing.current = false;
                currentStemId.current = null;
            }}
            className="block w-full h-full touch-none"
        />
    </div>
  );
};
