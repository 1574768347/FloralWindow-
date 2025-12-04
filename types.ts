
export interface Point {
  x: number;
  y: number;
}

export interface Vector {
  x: number;
  y: number;
}

export interface RainDrop {
  id: string;
  char: string;
  x: number;
  y: number;
  velocity: Vector;
  opacity: number;
  size: number;
}

export interface Particle {
  id: string;
  x: number;
  y: number;
  velocity: Vector;
  color: string;
  life: number; // 0 to 1
  decay: number;
  size: number;
  type: 'petal' | 'water' | 'sparkle';
}

export interface Stem {
  id: string;
  points: Point[];
  color: string;
  width: number;
  maxLength: number;
  grown: boolean;
}

export type FlowerType = 'cosmos' | 'rose' | 'lily';

export interface Flower {
  id: string;
  stemId: string;
  x: number;
  y: number; // Tip of the stem
  color: string; // HSL string
  petalCount: number;
  radius: number;
  maxRadius: number;
  state: 'blooming' | 'alive' | 'withered';
  life: number; // Duration in frames
  maxLife: number;
  opacity: number;
  type: FlowerType;
  rotation: number;
}

export interface VaseState {
  x: number;
  y: number;
  width: number;
  height: number;
  waterLevel: number; // 0 to 1
  maxCapacity: number;
  currentVolume: number;
}
