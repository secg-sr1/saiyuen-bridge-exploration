/* eslint-disable react/no-unknown-property */

import { styled } from '@mui/material/styles';
import { useEffect, useLayoutEffect, useRef, useState, Suspense } from 'react';
import { useLoader, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera, Html, useProgress, Environment, useTexture } from '@react-three/drei';
import { setGl } from './utils/screenshot';
import { QueuedGLTFLoader } from './utils/QueuedGLTFLoader';
import {
  CanvasTexture,
  RepeatWrapping,
  BufferAttribute,
  MeshStandardMaterial,
  Color,
  Box3,
  Vector3,
  MathUtils,
  ACESFilmicToneMapping,
  SRGBColorSpace,
} from 'three';

import concreteAlbedoUrl from './assets/glb-models/concrete.png';
import metalAlbedoUrl from './assets/glb-models/metal.png';

// Module-level stripe texture cache — created lazily, reused across renders
const _texCache = {};

// blue (low stress) → cyan → green → yellow → orange → red (high stress)
function heatColor(t) {
  t = Math.max(0, Math.min(1, t));
  if (t < 0.25) { const f = t / 0.25;         return [0,           f,           1]; }
  if (t < 0.50) { const f = (t - 0.25) / 0.25; return [0,           1,           1 - f]; }
  if (t < 0.75) { const f = (t - 0.50) / 0.25; return [f,           1,           0]; }
  const f = (t - 0.75) / 0.25;               return [1,           1 - f,       0];
}

function jackStripe(bgHex, stripeHex, repeat = 10) {
  const key = `jack|${bgHex}|${stripeHex}`;
  if (_texCache[key]) return _texCache[key];
  const size = 128;
  const canvas = document.createElement('canvas');
  canvas.width = size; canvas.height = size;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = bgHex;
  ctx.fillRect(0, 0, size, size);
  ctx.fillStyle = stripeHex;
  for (let x = 0; x < size; x += 20) ctx.fillRect(x, 0, 3, size);
  const tex = new CanvasTexture(canvas);
  tex.wrapS = tex.wrapT = RepeatWrapping;
  tex.repeat.set(repeat, repeat);
  _texCache[key] = tex;
  return tex;
}

/** Fine aggregate bump shared by bridge stone / concrete presets (cached). */
function bridgeNoiseBumpTexture() {
  const key = '_bridgeNoiseBump';
  if (_texCache[key]) return _texCache[key];
  const n = 64;
  const canvas = document.createElement('canvas');
  canvas.width = n;
  canvas.height = n;
  const ctx = canvas.getContext('2d');
  const img = ctx.createImageData(n, n);
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    const v = 105 + Math.random() * 50;
    d[i] = v;
    d[i + 1] = v;
    d[i + 2] = v;
    d[i + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
  const tex = new CanvasTexture(canvas);
  tex.wrapS = tex.wrapT = RepeatWrapping;
  tex.repeat.set(8, 8);
  tex.needsUpdate = true;
  _texCache[key] = tex;
  return tex;
}

const BRIDGE_BUMP = bridgeNoiseBumpTexture();

function beetleStripe(bgHex, stripeHex, repeat = 7) {
  const key = `beetle|${bgHex}|${stripeHex}`;
  if (_texCache[key]) return _texCache[key];
  const size = 128;
  const canvas = document.createElement('canvas');
  canvas.width = size; canvas.height = size;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = bgHex;
  ctx.fillRect(0, 0, size, size);
  ctx.fillStyle = stripeHex;
  const gap = 16, sw = 8;
  for (let x = 0; x < size; x += gap) {
    for (let y = 0; y < size; y += 2) {
      const jitter = Math.round((Math.random() - 0.5) * 1.5);
      ctx.fillRect(x + jitter, y, sw, 2);
    }
  }
  const tex = new CanvasTexture(canvas);
  tex.wrapS = tex.wrapT = RepeatWrapping;
  tex.repeat.set(repeat, repeat);
  _texCache[key] = tex;
  return tex;
}

function seededRandom(seed) {
  const x = Math.sin(seed * 9301 + 49297) * 233280;
  return x - Math.floor(x);
}

const STICK_CONFIGS = [
  // 0: Radial fan — cylindrical spread around Y axis
  (i, n) => {
    const angle = (i / n) * Math.PI * 2;
    const mag   = 5 + seededRandom(i * 3) * 7;
    const y     = (seededRandom(i * 3 + 1) - 0.5) * 8;
    return [Math.cos(angle) * mag, y, Math.sin(angle) * mag];
  },
  // 1: Vortex helix — pieces uncoil into a descending spiral around the bridge axis
  (i, n) => {
    const t      = i / n;
    const angle  = t * Math.PI * 2 * 5 + seededRandom(i * 3) * 0.6;
    const radius = 3 + seededRandom(i * 3 + 1) * 5;
    const y      = (t - 0.5) * 20 + (seededRandom(i * 3 + 2) - 0.5) * 2;
    return [Math.cos(angle) * radius, y, Math.sin(angle) * radius];
  },
  // 2: Orbital rings — sticks orbit in 5 concentric rings at staggered heights
  (i, n) => {
    const ring   = i % 5;
    const angle  = (i / n) * Math.PI * 2 * (ring + 1);
    const radius = 4 + ring * 2;
    const y      = (ring - 2) * 2.5;
    return [Math.cos(angle) * radius, y, Math.sin(angle) * radius];
  },
  // 3: DNA — two interleaved helical strands offset by π
  (i, n) => {
    const t      = i / n;
    const strand = (i % 2) * Math.PI;
    const angle  = t * Math.PI * 2 * 5 + strand;
    const radius = 2.5 + seededRandom(i * 4) * 1.5;
    const y      = (t - 0.5) * 18;
    return [Math.cos(angle) * radius, y, Math.sin(angle) * radius];
  },
  // 4: Pulse — flat horizontal disc, like a shockwave at bridge level
  (i, _n) => {
    const angle  = seededRandom(i * 5)     * Math.PI * 2;
    const radius = 1.5 + Math.sqrt(seededRandom(i * 5 + 1)) * 13;
    const y      = (seededRandom(i * 5 + 2) - 0.5) * 1.5;
    return [Math.cos(angle) * radius, y, Math.sin(angle) * radius];
  },
  // 5: Galaxy — 3-arm logarithmic spiral with slight vertical scatter
  (i, n) => {
    const t      = i / n;
    const arm    = i % 3;
    const angle  = t * Math.PI * 4 + (arm * Math.PI * 2 / 3);
    const radius = 1.5 + t * 10;
    const y      = (seededRandom(i * 4) - 0.5) * 3;
    return [Math.cos(angle) * radius, y, Math.sin(angle) * radius];
  },
  // 6: Wave — pieces spread along a 3D sinusoidal ribbon
  (i, n) => {
    const t = i / n;
    const x = (t - 0.5) * 22;
    const y = Math.sin(t * Math.PI * 5) * 5 + seededRandom(i * 3)     * 1.5;
    const z = Math.cos(t * Math.PI * 3) * 4 + seededRandom(i * 3 + 1) * 1.5;
    return [x, y, z];
  },
  // 7: Grid — perfect 3D matrix, 10×10×10 spacing
  (i, _n) => {
    const d = 10;
    const x = (i % d)                    - d / 2 + 0.5;
    const y = (Math.floor(i / d) % d)    - d / 2 + 0.5;
    const z =  Math.floor(i / (d * d))   - d / 2 + 0.5;
    return [x * 1.6, y * 1.6, z * 1.6];
  },
  // 8: Cone — wide base, tapers to tip at top
  (i, n) => {
    const t      = i / n;
    const angle  = seededRandom(i * 6)     * Math.PI * 2;
    const y      = t * 14 - 3;
    const radius = (1 - t) * 10 + 0.3 + seededRandom(i * 6 + 1) * 1.5;
    return [Math.cos(angle) * radius, y, Math.sin(angle) * radius];
  },
  // 9: Shell — pieces arranged on the surface of a hollow sphere
  (i, _n) => {
    const theta = seededRandom(i * 11 + 1) * Math.PI * 2;
    const phi   = Math.acos(2 * seededRandom(i * 11 + 2) - 1);
    const r     = 8 + seededRandom(i * 11 + 3) * 2;
    return [Math.sin(phi) * Math.cos(theta) * r, Math.cos(phi) * r, Math.sin(phi) * Math.sin(theta) * r];
  },
  // 10: Tornado — tight base spiraling up to wide mouth
  (i, n) => {
    const t      = i / n;
    const angle  = t * Math.PI * 2 * 7 + seededRandom(i * 3) * 0.4;
    const y      = t * 14 - 7;
    const radius = t * 9 + 0.4 + seededRandom(i * 3 + 1) * 1.2;
    return [Math.cos(angle) * radius, y, Math.sin(angle) * radius];
  },
  // 11: Torus — pieces distributed on a donut surface
  (i, n) => {
    const u = (i / n) * Math.PI * 2;
    const v = seededRandom(i * 5) * Math.PI * 2;
    const R = 7, r = 3;
    return [
      (R + r * Math.cos(v)) * Math.cos(u),
      r * Math.sin(v),
      (R + r * Math.cos(v)) * Math.sin(u),
    ];
  },
  // 12: Fibonacci — golden angle phyllotaxis (sunflower viewed from above)
  (i, _n) => {
    const golden = Math.PI * (3 - Math.sqrt(5));
    const angle  = i * golden;
    const radius = Math.sqrt(i) * 0.55;
    const y      = (seededRandom(i * 3) - 0.5) * 4;
    return [Math.cos(angle) * radius, y, Math.sin(angle) * radius];
  },
  // 13: Butterfly — two symmetric wings spreading from center
  (i, _n) => {
    const side   = i % 2 === 0 ? 1 : -1;
    const angle  = seededRandom(i * 4)     * Math.PI;
    const spread = 3 + seededRandom(i * 4 + 1) * 7;
    const y      = (seededRandom(i * 4 + 2) - 0.3) * 8;
    return [side * Math.cos(angle) * spread, y, Math.sin(angle) * spread * 0.65];
  },
  // 14: Column — tall thin vertical stack
  (i, n) => {
    const t      = i / n;
    const angle  = seededRandom(i * 6)     * Math.PI * 2;
    const radius = seededRandom(i * 6 + 1) * 2;
    const y      = (t - 0.5) * 26;
    return [Math.cos(angle) * radius, y, Math.sin(angle) * radius];
  },
  // 15: Pyramid — wide base tapering to tip
  (i, n) => {
    const t      = i / n;
    const angle  = seededRandom(i * 4)     * Math.PI * 2;
    const y      = t * 12 - 2;
    const radius = (1 - t) * 10 + 0.3 + seededRandom(i * 4 + 1) * 1.5;
    return [Math.cos(angle) * radius, y, Math.sin(angle) * radius];
  },
  // 16: Mobius — pieces on the surface of a Möbius strip
  (i, n) => {
    const u     = (i / n) * Math.PI * 2;
    const v     = (seededRandom(i * 3) - 0.5) * 3;
    const R     = 6;
    const twist = u / 2;
    return [
      (R + v * Math.cos(twist)) * Math.cos(u),
      v * Math.sin(twist),
      (R + v * Math.cos(twist)) * Math.sin(u),
    ];
  },
  // 17: Helix X4 — four interleaved helical strands
  (i, n) => {
    const t      = i / n;
    const strand = (i % 4) * (Math.PI / 2);
    const angle  = t * Math.PI * 2 * 4 + strand;
    const radius = 3 + seededRandom(i * 4) * 2;
    const y      = (t - 0.5) * 16;
    return [Math.cos(angle) * radius, y, Math.sin(angle) * radius];
  },
  // 18: Starburst — 12 radiating arms
  (i, _n) => {
    const rays  = 12;
    const ray   = i % rays;
    const angle = (ray / rays) * Math.PI * 2;
    const dist  = 2 + seededRandom(i * 4)     * 10;
    const y     = (seededRandom(i * 4 + 1) - 0.5) * 6;
    const jit   = (seededRandom(i * 4 + 2) - 0.5) * 1.2;
    return [Math.cos(angle) * dist + jit, y, Math.sin(angle) * dist + jit];
  },
  // 19: Cloud — organic sine-noise displacement
  (i, _n) => {
    const x = Math.sin(i * 0.10) * 3 + Math.sin(i * 0.37) * 4 + seededRandom(i * 3)     * 2.5;
    const y = Math.cos(i * 0.13) * 3 + Math.cos(i * 0.29) * 3 + seededRandom(i * 3 + 1) * 2.5;
    const z = Math.sin(i * 0.07) * 3 + Math.cos(i * 0.41) * 4 + seededRandom(i * 3 + 2) * 2.5;
    return [x, y, z];
  },
  // 20: Whirlpool — tightening spiral draining downward
  (i, n) => {
    const t      = i / n;
    const angle  = t * Math.PI * 2 * 6;
    const radius = (1 - t) * 10 + 0.4 + seededRandom(i * 3) * 1.2;
    const y      = -t * 10 + seededRandom(i * 3 + 1) * 1.2;
    return [Math.cos(angle) * radius, y, Math.sin(angle) * radius];
  },
  // 21: Ripple — concentric rings at staggered heights like water rings
  (i, _n) => {
    const ring   = Math.floor(seededRandom(i * 3)     * 9);
    const angle  = seededRandom(i * 3 + 1) * Math.PI * 2;
    const radius = 1.2 + ring * 1.6 + seededRandom(i * 3 + 2) * 0.7;
    const y      = (ring - 4) * 0.8 + seededRandom(i * 3 + 3) * 0.6;
    return [Math.cos(angle) * radius, y, Math.sin(angle) * radius];
  },
  // 22: Cross — pieces cluster along the 3 world axes
  (i, _n) => {
    const axis = i % 3;
    const dir  = seededRandom(i * 3)     > 0.5 ? 1 : -1;
    const dist = 2 + seededRandom(i * 3 + 1) * 9;
    const p1   = (seededRandom(i * 3 + 2) - 0.5) * 1.5;
    const p2   = (seededRandom(i * 3 + 3) - 0.5) * 1.5;
    if (axis === 0) return [dir * dist, p1, p2];
    if (axis === 1) return [p1, dir * dist, p2];
    return [p1, p2, dir * dist];
  },
  // 23: Implode — very tight cluster, barely separated (near-assembled look)
  (i, _n) => {
    const theta = seededRandom(i * 23 + 1) * Math.PI * 2;
    const phi   = Math.acos(2 * seededRandom(i * 23 + 2) - 1);
    const mag   = 0.3 + seededRandom(i * 23 + 3) * 1.5;
    return [Math.sin(phi) * Math.cos(theta) * mag, Math.cos(phi) * mag, Math.sin(phi) * Math.sin(theta) * mag];
  },
  // 24: Zigzag — pieces stacked in 6 alternating horizontal planes
  (i, _n) => {
    const layer  = i % 6;
    const angle  = seededRandom(i * 4)     * Math.PI * 2;
    const radius = 2 + seededRandom(i * 4 + 1) * 7;
    const y      = (layer - 2.5) * 3 + (seededRandom(i * 4 + 2) - 0.5) * 0.8;
    return [Math.cos(angle) * radius, y, Math.sin(angle) * radius];
  },
  // 25: Comet — teardrop elongated along one axis, denser at the head
  (i, n) => {
    const t     = Math.pow(i / n, 2);
    const angle = seededRandom(i * 5)     * Math.PI * 2;
    const cone  = t * 6 + seededRandom(i * 5 + 1) * 2;
    const z     = -t * 18 + seededRandom(i * 5 + 2) * 2;
    return [Math.cos(angle) * cone, Math.sin(angle) * cone, z];
  },

  // 26: Deep Lattice — 3D volumetric grid, box filled with regular nodes
  (i, _n) => {
    const cx = 18, cy = 8, cz = 7;
    const col  = i % cx;
    const row  = Math.floor(i / cx) % cy;
    const dep  = Math.floor(i / (cx * cy)) % cz;
    return [(col - cx / 2 + 0.5) * 1.5, (row - cy / 2 + 0.5) * 2.2, (dep - cz / 2 + 0.5) * 2.8];
  },

  // 27: Gridshell — sticks on a doubly-curved saddle (hyperbolic paraboloid)
  (i, _n) => {
    const cols = 30;
    const col  = i % cols;
    const row  = Math.floor(i / cols);
    const u    = (col / (cols - 1) - 0.5) * 11;
    const v    = (row / 29 - 0.5) * 11;
    return [u, u * v * 0.2, v];
  },

  // 28: Micro — sub-unit sphere, almost zero separation (tighter than Implode)
  (i, _n) => {
    const theta = seededRandom(i * 31 + 5) * Math.PI * 2;
    const phi   = Math.acos(2 * seededRandom(i * 31 + 6) - 1);
    const mag   = 0.04 + seededRandom(i * 31 + 7) * 0.45;
    return [Math.sin(phi) * Math.cos(theta) * mag, Math.cos(phi) * mag, Math.sin(phi) * Math.sin(theta) * mag];
  },

  // 41: Breathe — uniform tiny outward expansion, like the structure inhaling
  (i, _n) => {
    const theta = seededRandom(i * 7) * Math.PI * 2;
    const phi   = Math.acos(2 * seededRandom(i * 7 + 1) - 1);
    const mag   = 0.35 + seededRandom(i * 7 + 2) * 0.25;
    return [Math.sin(phi) * Math.cos(theta) * mag, Math.cos(phi) * mag, Math.sin(phi) * Math.sin(theta) * mag];
  },

  // 42: Drift — all sticks shift gently in +X like a soft lateral wind
  (i, _n) => {
    const dx = 0.5 + seededRandom(i * 11 + 2) * 1.0;
    const dy = (seededRandom(i * 11)     - 0.5) * 0.7;
    const dz = (seededRandom(i * 11 + 1) - 0.5) * 0.7;
    return [dx, dy, dz];
  },

  // 43: Settle — sticks sag slightly downward, gravity pulling them by a whisker
  (i, _n) => {
    const dx = (seededRandom(i * 17)     - 0.5) * 0.5;
    const dz = (seededRandom(i * 17 + 1) - 0.5) * 0.5;
    const dy = -(0.3 + seededRandom(i * 17 + 2) * 1.1);
    return [dx, dy, dz];
  },

  // 44: Quake — strong lateral XZ jitter, minimal vertical displacement
  (i, _n) => {
    const dx = (seededRandom(i * 29)     - 0.5) * 1.6;
    const dy = (seededRandom(i * 29 + 1) - 0.5) * 0.35;
    const dz = (seededRandom(i * 29 + 2) - 0.5) * 1.3;
    return [dx, dy, dz];
  },

  // 45: Clusters — sticks flock into 6 tight micro-pods arranged in a ring
  (i, _n) => {
    const k     = 6;
    const c     = i % k;
    const theta = (c / k) * Math.PI * 2;
    const R     = 1.5;
    const cx    = Math.cos(theta) * R;
    const cz    = Math.sin(theta) * R;
    const cy    = (c % 2) * 0.7 - 0.35;
    return [
      cx + (seededRandom(i * 13)     - 0.5) * 0.45,
      cy + (seededRandom(i * 13 + 1) - 0.5) * 0.45,
      cz + (seededRandom(i * 13 + 2) - 0.5) * 0.45,
    ];
  },

  // 46: Crease — bilateral fold: left side drifts left, right side drifts right
  (i, _n) => {
    const side = seededRandom(i * 41) > 0.5 ? 1 : -1;
    const dx   = side * (0.4 + seededRandom(i * 41 + 1) * 0.9);
    const dy   = (seededRandom(i * 41 + 2) - 0.5) * 0.6;
    const dz   = (seededRandom(i * 41 + 3) - 0.5) * 0.6;
    return [dx, dy, dz];
  },

  // 47: Mist — flat horizontal cloud, nearly planar, wide XZ spread, thin in Y
  (i, _n) => {
    const theta  = seededRandom(i * 19) * Math.PI * 2;
    const radius = 0.25 + seededRandom(i * 19 + 1) * 2.2;
    const dy     = (seededRandom(i * 19 + 2) - 0.5) * 0.3;
    return [Math.cos(theta) * radius, dy, Math.sin(theta) * radius];
  },

  // 48: Incline — mist disc tilted 30° forward (rotation around X axis)
  (i, _n) => {
    const theta  = seededRandom(i * 19) * Math.PI * 2;
    const r      = 0.25 + seededRandom(i * 19 + 1) * 2.2;
    const flat   = (seededRandom(i * 19 + 2) - 0.5) * 0.3;
    const a      = Math.PI / 6;
    return [
      Math.cos(theta) * r,
      flat * Math.cos(a) - Math.sin(theta) * r * Math.sin(a),
      flat * Math.sin(a) + Math.sin(theta) * r * Math.cos(a),
    ];
  },

  // 49: Tilt — mist disc tilted 45° (halfway between horizontal and vertical)
  (i, _n) => {
    const theta  = seededRandom(i * 19) * Math.PI * 2;
    const r      = 0.25 + seededRandom(i * 19 + 1) * 2.2;
    const flat   = (seededRandom(i * 19 + 2) - 0.5) * 0.3;
    const a      = Math.PI / 4;
    return [
      Math.cos(theta) * r,
      flat * Math.cos(a) - Math.sin(theta) * r * Math.sin(a),
      flat * Math.sin(a) + Math.sin(theta) * r * Math.cos(a),
    ];
  },

  // 50: Veil — disc rotated 90°: stands vertical in the XY plane, thin in Z
  (i, _n) => {
    const theta  = seededRandom(i * 19) * Math.PI * 2;
    const r      = 0.25 + seededRandom(i * 19 + 1) * 2.2;
    const flat   = (seededRandom(i * 19 + 2) - 0.5) * 0.3;
    return [Math.cos(theta) * r, Math.sin(theta) * r, flat];
  },

  // 51: Curtain — disc rotated 90° around Z: vertical plane in YZ, thin in X
  (i, _n) => {
    const theta  = seededRandom(i * 19) * Math.PI * 2;
    const r      = 0.25 + seededRandom(i * 19 + 1) * 2.2;
    const flat   = (seededRandom(i * 19 + 2) - 0.5) * 0.3;
    return [flat, Math.cos(theta) * r, Math.sin(theta) * r];
  },

  // 52: Fan — 8 thin blade-strips, each blade rotated around Y at equal intervals
  (i, _n) => {
    const blades = 8;
    const b      = i % blades;
    const a      = (b / blades) * Math.PI;
    const lx     = (seededRandom(i * 23)     - 0.5) * 4.5;
    const ly     = (seededRandom(i * 23 + 1) - 0.5) * 1.1;
    const lz     = (seededRandom(i * 23 + 2) - 0.5) * 0.22;
    return [
      lx * Math.cos(a) + lz * Math.sin(a),
      ly,
      -lx * Math.sin(a) + lz * Math.cos(a),
    ];
  },

  // 53: Gyro — disc tilt precesses continuously with stick index (0 → horizontal, n → vertical)
  (i, n) => {
    const theta  = seededRandom(i * 19) * Math.PI * 2;
    const r      = 0.25 + seededRandom(i * 19 + 1) * 2.2;
    const flat   = (seededRandom(i * 19 + 2) - 0.5) * 0.3;
    const a      = (i / n) * Math.PI;
    return [
      Math.cos(theta) * r * Math.cos(a) - flat * Math.sin(a),
      Math.cos(theta) * r * Math.sin(a) + flat * Math.cos(a),
      Math.sin(theta) * r,
    ];
  },
];

export const STICK_CONFIG_NAMES = [
  'RADIAL',    'VORTEX',     'ORBITAL',    'DNA',        'PULSE',
  'GALAXY',    'WAVE',       'GRID',       'CONE',       'SHELL',
  'TORNADO',   'TORUS',      'FIBONACCI',  'BUTTERFLY',  'COLUMN',
  'PYRAMID',   'MOBIUS',     'HELIX X4',   'STARBURST',  'CLOUD',
  'WHIRLPOOL', 'RIPPLE',     'CROSS',      'IMPLODE',    'ZIGZAG',
  'COMET',     'DEEP LATTICE','GRIDSHELL', 'MICRO',      'BREATHE',
  'DRIFT',     'SETTLE',     'QUAKE',      'CLUSTERS',   'CREASE',
  'MIST',      'INCLINE',    'TILT',       'VEIL',       'CURTAIN',
  'FAN',       'GYRO',
];

// Material preset table — PBR fields use MeshStandardMaterial clearcoat / envMapIntensity (three r152+).
const PRESETS = {
  granite: {
    color: 0xbab4ad,
    roughness: 0.9,
    metalness: 0.04,
    envMapIntensity: 0.40,
    clearcoat: 0.04,
    clearcoatRoughness: 0.70,
    bumpScale: 0.055,
  },
  concrete: {
    color: 0xbeb9b3,
    roughness: 0.82,
    metalness: 0.03,
    envMapIntensity: 0.28,
    clearcoat: 0.02,
    clearcoatRoughness: 0.85,
    bumpScale: 0.048,
  },
  limestone: {
    color: 0xe5dcc8,
    roughness: 0.86,
    metalness: 0.02,
    envMapIntensity: 0.32,
    clearcoat: 0.02,
    clearcoatRoughness: 0.80,
    bumpScale: 0.05,
  },
  marble: {
    color: 0xf4f2ef,
    roughness: 0.32,
    metalness: 0.06,
    envMapIntensity: 0.65,
    clearcoat: 0.12,
    clearcoatRoughness: 0.48,
    bumpScale: 0.022,
  },
  steel: {
    color: 0x8a9bab,
    roughness: 0.22,
    metalness: 0.88,
    envMapIntensity: 0.85,
    clearcoat: 0.22,
    clearcoatRoughness: 0.38,
    bumpScale: 0.012,
  },
  wood:        { color: 0x8b5e3c, roughness: 0.92, metalness: 0,    envMapIntensity: 0.22, clearcoat: 0.02, clearcoatRoughness: 0.90, bumpScale: 0.06 },
  gold:        { color: 0xd4af37, roughness: 0.20,  metalness: 1.0, envMapIntensity: 0.90,  clearcoat: 0.12, clearcoatRoughness: 0.32, bumpScale: 0.01 },
  jade:        { color: 0x4a8c6a, roughness: 0.50,  metalness: 0.10, envMapIntensity: 0.42,  clearcoat: 0.08,  clearcoatRoughness: 0.55,  bumpScale: 0.02 },
  pumpkin:     { color: 0xc05a00, roughness: 0.82, metalness: 0,    envMapIntensity: 0.22,  clearcoat: 0.02, clearcoatRoughness: 0.90, bumpScale: 0.04 },
  oogie:       { color: 0xb89a60, roughness: 0.97, metalness: 0,    envMapIntensity: 0.18, clearcoat: 0.01, clearcoatRoughness: 0.95, bumpScale: 0.05 },
  sandworm:    { color: 0xd2be84, roughness: 0.99, metalness: 0,    envMapIntensity: 0.20, clearcoat: 0.01, clearcoatRoughness: 0.95, bumpScale: 0.05 },
  jack:        { mapFn: () => jackStripe('#080810', '#eceef8'),   roughness: 0.86, metalness: 0    },
  jacknight:   { mapFn: () => jackStripe('#05071a', '#90b8d8'),   roughness: 0.84, metalness: 0    },
  jackpurple:  { mapFn: () => jackStripe('#120820', '#c8a4e8'),   roughness: 0.85, metalness: 0    },
  beetle:      { mapFn: () => beetleStripe('#0a0a0a', '#e4e4d8'), roughness: 0.90, metalness: 0    },
  beetlegreen: { mapFn: () => beetleStripe('#070e05', '#78cc42'), roughness: 0.84, metalness: 0.04 },
  beetlered:   { mapFn: () => beetleStripe('#0d0404', '#c83818'), roughness: 0.87, metalness: 0    },
};

// GLB URL arrays — sorted alphabetically so index 0 = _01, index 1 = _02, etc.
const _matGlob = import.meta.glob('./assets/glb-models/material/*.png', { eager: true, query: '?url', import: 'default' });
const _matUrls = Object.entries(_matGlob).sort(([a],[b]) => a.localeCompare(b)).map(([,u]) => u);
export const CUSTOM_MATERIALS = [
  { id: 'anodized-aluminum', label: 'Anodized Aluminum', url: _matUrls[0] },
  { id: 'charred-wood',      label: 'Charred Wood',      url: _matUrls[1] },
  { id: 'rice-paper',        label: 'Rice Paper',         url: _matUrls[2] },
  { id: 'soft-fabric',       label: 'Soft Fabric',        url: _matUrls[3] },
  { id: 'dark-stone',        label: 'Dark Stone',         url: _matUrls[4] },
  { id: 'microcement',       label: 'Microcement',        url: _matUrls[5] },
  { id: 'kkuma-wood',        label: 'Kkuma Wood',         url: _matUrls[6] },
];

const _floorGlob    = import.meta.glob('./assets/glb-models/floor/*.glb',    { eager: true, query: '?url', import: 'default' });
const _handrailGlob = import.meta.glob('./assets/glb-models/handrail/*.glb', { eager: true, query: '?url', import: 'default' });
// Optional: one merged mesh — avoids hundreds of HTTP requests for each stick segment (export from Blender to this path).
const _sticksCombinedGlob = import.meta.glob('./assets/glb-models/sticks/sticks_combined.glb', { eager: true, query: '?url', import: 'default' });
// Per-segment GLBs under `sticks/` (used only when `sticks_combined.glb` is absent).
const _sticksGlob   = import.meta.glob('./assets/glb-models/sticks/**/*.glb', { eager: true, query: '?url', import: 'default' });

const _floorUrls    = Object.entries(_floorGlob).sort(([a],[b])=>a.localeCompare(b)).map(([,u])=>u);
const _handrailUrls = Object.entries(_handrailGlob).sort(([a],[b])=>a.localeCompare(b)).map(([,u])=>u);
const _sticksCombinedUrls = Object.entries(_sticksCombinedGlob).sort(([a],[b])=>a.localeCompare(b)).map(([,u])=>u);
const _sticksSegmentUrls = Object.entries(_sticksGlob)
  .filter(([path]) => !path.includes('sticks_combined'))
  .sort(([a],[b])=>a.localeCompare(b))
  .map(([,u])=>u);
// Structure layer: prefer sticks/sticks_combined.glb if present; else load each segment GLB under sticks/.
const _structureUrls = _sticksCombinedUrls.length > 0 ? _sticksCombinedUrls : _sticksSegmentUrls;

// Export so Model.jsx can show counts in the UI without re-importing globs
export const FLOOR_COUNT     = _floorUrls.length;
export const STRUCTURE_COUNT = _structureUrls.length;
export const HANDRAIL_COUNT  = _handrailUrls.length;

// World-space offset that brings the models (whose GLB origin is at ~x=-25)
// to the scene origin so the camera can see them at default position.
// Derived from floor_01 bounding-box center: (-24.97, -0.60, -1.60) at native scale.
const MODEL_OFFSET = [25.0, 0.6, 1.6];

// Side elevation: camera on +World Z, looking at bridge center. Span is treated as
// primarily along ±X (matches shifted GLBs); deck reads horizontal with Y-up.
const DEFAULT_VIEW_DIR = new Vector3(0, 0, 1);

// ~85–90% of viewport width filled (margin < 1 = tighter on screen).
const DEFAULT_FRAME_MARGIN = 1.1;

const _fitSize = new Vector3();
const _fitCenter = new Vector3();
const _fitEye = new Vector3();

/**
 * Distance for a side-on +Z camera: fit the box’s X extent to horizontal FOV and
 * Y to vertical FOV (elevation / profile view, minimal “wide angle” feel).
 */
function distanceToFrameSideElevation(camera, size, margin = DEFAULT_FRAME_MARGIN) {
  const vFov = MathUtils.degToRad(camera.fov);
  const aspect = Math.max(camera.aspect || 1, 0.0001);
  const hFov = 2 * Math.atan(Math.tan(vFov / 2) * aspect);
  const halfX = size.x * 0.5;
  const halfY = size.y * 0.5;
  const dY = halfY / Math.tan(vFov * 0.5);
  const dX = halfX / Math.tan(hFov * 0.5);
  return margin * Math.max(dX, dY);
}

/**
 * Place camera & orbit target from a world AABB. Always ends with `controls.update()`
 * so OrbitControls’ spherical state matches the camera (do not mix in `camera.lookAt`).
 */
function applyOrbitFrame(camera, controls, box, viewDir = DEFAULT_VIEW_DIR, margin = DEFAULT_FRAME_MARGIN) {
  if (!controls || box.isEmpty()) return;
  box.getCenter(_fitCenter);
  box.getSize(_fitSize);
  const dist = distanceToFrameSideElevation(camera, _fitSize, margin);
  _fitEye.copy(viewDir).normalize().multiplyScalar(dist);
  camera.up.set(0, 1, 0);
  camera.position.copy(_fitCenter).add(_fitEye);
  controls.target.copy(_fitCenter);
  const near = Math.max(0.01, dist * 0.002);
  const far = Math.max(dist * 40, _fitSize.length() * 8 + dist);
  camera.near = near;
  camera.far = far;
  camera.updateProjectionMatrix();
  controls.update();
}

import {
  Card,
  CardHeader,
  CardMedia,
  CardActions,
  Collapse,
  CardContent,
  Typography,
  Box,
  IconButton,
} from '@mui/material';

import FavoriteIcon from '@mui/icons-material/Favorite';
import ShareIcon from '@mui/icons-material/Share';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import CloseIcon from '@mui/icons-material/Close';

import '@fontsource/manrope/300.css';
import '@fontsource/manrope/400.css';
import '@fontsource/manrope/500.css';
import '@fontsource/manrope/700.css';

import { useStore } from './store/useStore';

/** UV tile repeat for deck texture — increase if planks look oversized in world units */
const FLOOR_DECK_MAP_REPEAT = 3;
/** Brushed metal tiles along U more than V so horizontal grain reads at handrail UV scale */
const HANDRAIL_METAL_REPEAT_U = 5;
const HANDRAIL_METAL_REPEAT_V = 2;

const ExpandMore = styled(IconButton, {
  shouldForwardProp: (prop) => prop !== 'expand',
})(({ theme }) => ({
  marginLeft: 'auto',
  transition: theme.transitions.create('transform', {
    duration: theme.transitions.duration.shortest,
  }),
  variants: [
    { props: ({ expand }) => !expand, style: { transform: 'rotate(0deg)' } },
    { props: ({ expand }) => !!expand, style: { transform: 'rotate(180deg)' } },
  ],
}));

// ─── BridgePartModel ────────────────────────────────────────────────────────
// Loads one GLB and manages all per-model effects (highlight, opacity, material,
// heatmap). Wrap in <Suspense> so variant switches don't blank the other parts.
function BridgePartModel({ url, selected, opacity, materialId, heatmapActive, deckColorMap, railColorMap, archWhiteGloss, customMap }) {
  const gltf = useLoader(QueuedGLTFLoader, url);
  const origMats = useRef(null);

  const isPBR = (mat) => mat?.isMeshStandardMaterial || mat?.isMeshPhysicalMaterial;

  // Capture original material properties; inject a default material when missing or black
  useEffect(() => {
    const DEFAULT_MAT = new MeshStandardMaterial({ color: new Color(0.75, 0.75, 0.75), roughness: 0.7, metalness: 0.1 });
    DEFAULT_MAT.bumpMap = BRIDGE_BUMP;
    DEFAULT_MAT.bumpScale = 0.042;
    DEFAULT_MAT.envMapIntensity = 0.45;
    const saved = [];
    gltf.scene.traverse((child) => {
      if (!child.isMesh) return;
      // Assign default material when none is present
      if (!child.material) child.material = DEFAULT_MAT.clone();
      const mats = Array.isArray(child.material) ? child.material : [child.material];
      mats.forEach((mat) => {
        if (deckColorMap && 'map' in mat) {
          mat.map = deckColorMap;
          if (mat.color) mat.color.setRGB(1, 1, 1);
        } else if (railColorMap && 'map' in mat) {
          mat.map = railColorMap;
          if (mat.color) mat.color.setRGB(1, 1, 1);
          if (isPBR(mat)) {
            mat.metalness = 0.97;
            mat.roughness = 0.28;
            mat.envMapIntensity = 0.72;
            mat.clearcoat = 0.10;
            mat.clearcoatRoughness = 0.45;
            mat.bumpMap = null;
            mat.bumpScale = 0;
          }
        } else if (archWhiteGloss) {
          if ('map' in mat) mat.map = null;
          if (mat.color) mat.color.setRGB(0.95, 0.91, 0.85);
          if (isPBR(mat)) {
            mat.metalness = 0.0;
            mat.roughness = 0.48;
            mat.envMapIntensity = 0.35;
            mat.clearcoat = 0.06;
            mat.clearcoatRoughness = 0.70;
            mat.bumpMap = BRIDGE_BUMP;
            mat.bumpScale = 0.028;
          }
        }
        // Lighten meshes that came in with a pure-black color (no texture)
        if (!mat.map && mat.color && mat.color.r < 0.05 && mat.color.g < 0.05 && mat.color.b < 0.05) {
          mat.color.setRGB(0.75, 0.75, 0.75);
          mat.roughness = 0.7;
          mat.metalness = 0.1;
        }
        if (isPBR(mat)) {
          if (!mat.bumpMap && !railColorMap && !archWhiteGloss) {
            mat.bumpMap = BRIDGE_BUMP;
            mat.bumpScale = 0.042;
          }
          if (mat.envMapIntensity === undefined) mat.envMapIntensity = 1;
          if (mat.clearcoat === undefined) mat.clearcoat = 0;
          if (mat.clearcoatRoughness === undefined) mat.clearcoatRoughness = 0;
        }
        saved.push({
          mat,
          color: mat.color.clone(),
          roughness: mat.roughness,
          metalness: mat.metalness,
          map: mat.map ?? null,
          pbr: isPBR(mat),
          bumpMap: isPBR(mat) ? mat.bumpMap : null,
          bumpScale: isPBR(mat) ? mat.bumpScale : 1,
          envMapIntensity: isPBR(mat) ? (mat.envMapIntensity ?? 1) : 1,
          clearcoat: isPBR(mat) ? (mat.clearcoat ?? 0) : 0,
          clearcoatRoughness: isPBR(mat) ? (mat.clearcoatRoughness ?? 0) : 0,
        });
      });
    });
    origMats.current = saved;
  }, [gltf.scene, deckColorMap, railColorMap, archWhiteGloss]);

  // Emissive highlight for selected part
  useEffect(() => {
    gltf.scene.traverse((child) => {
      if (!child.isMesh || !child.material) return;
      const mats = Array.isArray(child.material) ? child.material : [child.material];
      mats.forEach(mat => {
        if (mat.emissive !== undefined) {
          mat.emissive.set(selected ? 0x2266cc : 0x000000);
          mat.emissiveIntensity = selected ? 0.4 : 0;
        }
      });
    });
  }, [selected, gltf.scene]);

  // X-Ray opacity
  useEffect(() => {
    gltf.scene.traverse((child) => {
      if (!child.isMesh || !child.material) return;
      const mats = Array.isArray(child.material) ? child.material : [child.material];
      mats.forEach(mat => { mat.transparent = opacity < 1; mat.opacity = opacity; });
    });
  }, [opacity, gltf.scene]);

  // Structural stress heatmap — per-vertex coloring with this model's Y range
  useEffect(() => {
    if (!heatmapActive) {
      gltf.scene.traverse(child => {
        if (!child.isMesh) return;
        if (child.geometry.attributes.color) child.geometry.deleteAttribute('color');
        const mats = Array.isArray(child.material) ? child.material : [child.material];
        mats.forEach(mat => {
          mat.vertexColors = false;
          mat.emissive?.setRGB(0, 0, 0);
          mat.emissiveIntensity = 0;
          mat.needsUpdate = true;
        });
      });
      return;
    }

    let minY = Infinity, maxY = -Infinity;
    gltf.scene.traverse(child => {
      if (!child.isMesh) return;
      const pos = child.geometry.attributes.position;
      if (!pos) return;
      for (let i = 0; i < pos.count; i++) {
        const y = pos.getY(i);
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    });
    const range = maxY - minY || 1;

    gltf.scene.traverse(child => {
      if (!child.isMesh) return;
      const pos = child.geometry.attributes.position;
      if (!pos) return;
      const colors = new Float32Array(pos.count * 3);
      let sumY = 0;
      for (let i = 0; i < pos.count; i++) {
        const y = pos.getY(i);
        sumY += y;
        const t = 1 - (y - minY) / range;
        const [r, g, b] = heatColor(t);
        colors[i * 3] = r; colors[i * 3 + 1] = g; colors[i * 3 + 2] = b;
      }
      child.geometry.setAttribute('color', new BufferAttribute(colors, 3));
      const centroidT = 1 - (sumY / pos.count - minY) / range;
      const [er, eg, eb] = heatColor(centroidT);
      const mats = Array.isArray(child.material) ? child.material : [child.material];
      mats.forEach(mat => {
        mat.vertexColors = true;
        mat.emissive?.setRGB(er * 0.45, eg * 0.45, eb * 0.45);
        mat.emissiveIntensity = 1;
        mat.needsUpdate = true;
      });
    });
  }, [heatmapActive, gltf.scene]);

  // Material preset — runs after origMats capture (React effect source order)
  useEffect(() => {
    if (heatmapActive || !origMats.current) return;
    if (customMap) {
      origMats.current.forEach(({ mat }) => {
        mat.map = customMap;
        mat.color.setRGB(1, 1, 1);
        mat.needsUpdate = true;
      });
      return;
    }
    const preset = PRESETS[materialId] ?? null;
    origMats.current.forEach((entry) => {
      const {
        mat, color, roughness, metalness, map, pbr,
        bumpMap: savedBump, bumpScale: savedBumpScale,
        envMapIntensity: savedEnv, clearcoat: savedCc, clearcoatRoughness: savedCcr,
      } = entry;

      const applyPBRMaps = (bump, bumpScale, envI, cc, ccr) => {
        if (!pbr || !isPBR(mat)) return;
        mat.bumpMap = bump;
        mat.bumpScale = bumpScale ?? 1;
        mat.envMapIntensity = envI ?? 1;
        mat.clearcoat = cc ?? 0;
        mat.clearcoatRoughness = ccr ?? 0;
      };

      if (preset === null) {
        mat.color.copy(color);
        mat.roughness = roughness;
        mat.metalness = metalness;
        mat.map = map;
        applyPBRMaps(savedBump, savedBumpScale, savedEnv, savedCc, savedCcr);
      } else if (preset.mapFn) {
        mat.map = preset.mapFn();
        mat.color.setHex(0xffffff);
        mat.roughness = preset.roughness;
        mat.metalness = preset.metalness;
        applyPBRMaps(null, 1, 0.55, 0, 0);
      } else {
        if (deckColorMap) mat.map = deckColorMap;
        else if (railColorMap) mat.map = railColorMap;
        else mat.map = null;
        if (archWhiteGloss) {
          mat.map = null;
          mat.color.setHex(0xf2e9dc);
          mat.roughness = Math.max(preset.roughness * 0.72, 0.42);
          mat.metalness = 0.0;
          applyPBRMaps(
            BRIDGE_BUMP,
            0.028,
            Math.min(preset.envMapIntensity ?? 0.35, 0.42),
            Math.min(preset.clearcoat ?? 0, 0.08),
            Math.max(preset.clearcoatRoughness ?? 0.70, 0.65),
          );
        } else {
          mat.color.setHex(preset.color);
          let r = preset.roughness;
          let m = preset.metalness;
          if (railColorMap) {
            m = Math.max(m, 0.94);
            r = Math.min(r, 0.32);
          }
          mat.roughness = r;
          mat.metalness = m;
          const railShine = !!railColorMap;
          applyPBRMaps(
            railShine ? null : BRIDGE_BUMP,
            railShine ? 0 : (preset.bumpScale ?? 0.045),
            railShine ? Math.max(preset.envMapIntensity ?? 0.72, 0.80) : (preset.envMapIntensity ?? 1),
            railShine ? Math.max(preset.clearcoat ?? 0, 0.08) : (preset.clearcoat ?? 0),
            railShine ? 0.45 : (preset.clearcoatRoughness ?? 0),
          );
        }
      }
      mat.needsUpdate = true;
    });
  }, [materialId, heatmapActive, gltf.scene, deckColorMap, railColorMap, archWhiteGloss, customMap]);

  return <primitive object={gltf.scene} />;
}

/** Each stick segment gets its own <group> so it can be individually positioned during the explosion. */
function ExplodingStructureParts({ structureUrls, selected, opacity, materialId, heatmapActive, customMap }) {
  const partGroupRefs      = useRef([]);
  const explosionVel       = useRef(0);
  const explosionProg      = useRef(0);
  const prevTriggerKey     = useRef(0);
  const isExplodedRef      = useRef(false);

  // Two direction sets for cross-fading between configs — both start at config 0
  const dirsFrom           = useRef(structureUrls.map((_, i) => STICK_CONFIGS[0](i, structureUrls.length)));
  const dirsTo             = useRef(structureUrls.map((_, i) => STICK_CONFIGS[0](i, structureUrls.length)));
  const morphProg          = useRef(1);   // 1 = fully at dirsTo, no pending transition
  const morphVel           = useRef(0);
  const prevConfigIndex    = useRef(0);

  useFrame(() => {
    // ── Explode toggle ──────────────────────────────────────────────────────
    const freshTrigger = useStore.getState().explodeTriggerKey;
    if (freshTrigger !== prevTriggerKey.current) {
      prevTriggerKey.current = freshTrigger;
      isExplodedRef.current  = !isExplodedRef.current;
      if (isExplodedRef.current) explosionVel.current = 0.55;
    }
    const explodeTarget = isExplodedRef.current ? 1.0 : 0.0;
    explosionVel.current  += (explodeTarget - explosionProg.current) * 0.055;
    explosionVel.current  *= 0.83;
    explosionProg.current += explosionVel.current;

    // ── Config morph ────────────────────────────────────────────────────────
    const freshConfig = useStore.getState().stickConfigIndex;
    if (freshConfig !== prevConfigIndex.current) {
      prevConfigIndex.current = freshConfig;
      // Snapshot the current interpolated positions as the new "from"
      const m = morphProg.current;
      dirsFrom.current = dirsTo.current.map((to, i) => {
        const from = dirsFrom.current[i] || [0, 0, 0];
        return [
          from[0] + (to[0] - from[0]) * m,
          from[1] + (to[1] - from[1]) * m,
          from[2] + (to[2] - from[2]) * m,
        ];
      });
      // Compute new target directions
      const cfg = STICK_CONFIGS[freshConfig % STICK_CONFIGS.length];
      dirsTo.current   = structureUrls.map((_, i) => cfg(i, structureUrls.length));
      morphProg.current = 0;
      morphVel.current  = 0;
    }
    // Smooth spring toward morph target (no bounce — higher damping)
    morphVel.current  += (1 - morphProg.current) * 0.06;
    morphVel.current  *= 0.85;
    morphProg.current  = Math.min(1, morphProg.current + morphVel.current);

    // ── Per-stick positions ─────────────────────────────────────────────────
    const p = Math.max(0, explosionProg.current);
    const m = morphProg.current;
    partGroupRefs.current.forEach((ref, i) => {
      if (!ref) return;
      const from = dirsFrom.current[i] || [0, 0, 0];
      const to   = dirsTo.current[i]   || [0, 0, 0];
      ref.position.set(
        (from[0] + (to[0] - from[0]) * m) * p,
        (from[1] + (to[1] - from[1]) * m) * p,
        (from[2] + (to[2] - from[2]) * m) * p,
      );
    });
  });

  return (
    <>
      {structureUrls.map((url, i) => (
        <group key={url} ref={el => { partGroupRefs.current[i] = el; }}>
          <Suspense fallback={null}>
            <BridgePartModel
              url={url}
              selected={selected}
              opacity={opacity}
              materialId={materialId}
              heatmapActive={heatmapActive}
              archWhiteGloss
              customMap={customMap}
            />
          </Suspense>
        </group>
      ))}
    </>
  );
}

/** Loads all custom material textures once; passes the active one into ExplodingStructureParts. */
function StructureWithTextures({ activeMatId, ...props }) {
  const maps = useTexture(CUSTOM_MATERIALS.map(m => m.url));
  useLayoutEffect(() => {
    maps.forEach(map => {
      map.wrapS = map.wrapT = RepeatWrapping;
      map.repeat.set(6, 6);
      map.flipY = false;
      map.needsUpdate = true;
    });
  }, [maps]);
  const idx = CUSTOM_MATERIALS.findIndex(m => m.id === activeMatId);
  return <ExplodingStructureParts {...props} customMap={idx >= 0 ? maps[idx] : null} />;
}

/** Loads shared concrete albedo once, applies to every floor GLB (step 9 at runtime vs. Blender bake). */
function FloorPartsWithDeckTexture({ floorUrls, selected, opacity, materialId, heatmapActive }) {
  const deckMap = useTexture(concreteAlbedoUrl);
  useLayoutEffect(() => {
    deckMap.wrapS = deckMap.wrapT = RepeatWrapping;
    deckMap.repeat.set(FLOOR_DECK_MAP_REPEAT, FLOOR_DECK_MAP_REPEAT);
    deckMap.flipY = false;
    deckMap.needsUpdate = true;
  }, [deckMap]);
  return (
    <>
      {floorUrls.map((url) => (
        <Suspense key={url} fallback={null}>
          <BridgePartModel
            url={url}
            selected={selected}
            opacity={opacity}
            materialId={materialId}
            heatmapActive={heatmapActive}
            deckColorMap={deckMap}
          />
        </Suspense>
      ))}
    </>
  );
}

/** Brushed stainless albedo + high metalness / env reflections for all handrail GLBs */

function HandrailPartsWithMetalTexture({ handrailUrls, selected, opacity, materialId, heatmapActive }) {
  const metalMap = useTexture(metalAlbedoUrl);
  useLayoutEffect(() => {
    metalMap.wrapS = metalMap.wrapT = RepeatWrapping;
    metalMap.repeat.set(HANDRAIL_METAL_REPEAT_U, HANDRAIL_METAL_REPEAT_V);
    metalMap.flipY = false;
    metalMap.needsUpdate = true;
  }, [metalMap]);
  return (
    <>
      {handrailUrls.map((url) => (
        <Suspense key={url} fallback={null}>
          <BridgePartModel
            url={url}
            selected={selected}
            opacity={opacity}
            materialId={materialId}
            heatmapActive={heatmapActive}
            railColorMap={metalMap}
          />
        </Suspense>
      ))}
    </>
  );
}

// ─── Scene ──────────────────────────────────────────────────────────────────
export default function Scene() {
  const showBase        = useStore(state => state.showBase);
  const showStructure   = useStore(state => state.showStructure);
  const showHandrail    = useStore(state => state.showHandrail);
  const selectedPart    = useStore(state => state.selectedPart);
  const setSelectedPart = useStore(state => state.setSelectedPart);
  const setAgentChatOpen = useStore(state => state.setAgentChatOpen);
  const setCameraAzimuth = useStore(state => state.setCameraAzimuth);
  const cameraTarget    = useStore(state => state.cameraTarget);
  const setCameraTarget = useStore(state => state.setCameraTarget);
  const explodeDistance = useStore(state => state.explodeDistance);
  const baseOpacity     = useStore(state => state.baseOpacity);
  const structureOpacity = useStore(state => state.structureOpacity);
  const handrailOpacity = useStore(state => state.handrailOpacity);
  const lightingMode    = useStore(state => state.lightingMode);
  const annotations     = useStore(state => state.annotations);
  const removeAnnotation = useStore(state => state.removeAnnotation);
  const baseMaterial    = useStore(state => state.baseMaterial);
  const structureMaterial = useStore(state => state.structureMaterial);
  const handrailMaterial = useStore(state => state.handrailMaterial);
  const timelineStep    = useStore(state => state.timelineStep);
  const annotationMode  = useStore(state => state.annotationMode);
  const setAnnotationMode = useStore(state => state.setAnnotationMode);
  const setPendingAnnotation = useStore(state => state.setPendingAnnotation);
  const heatmapActive   = useStore(state => state.heatmapActive);
  const selectedFloor   = useStore(state => state.selectedFloor);
  const selectedArch    = useStore(state => state.selectedArch);
  const selectedHandrail = useStore(state => state.selectedHandrail);
  const assembleKey             = useStore(state => state.assembleKey);
  const structureCustomMaterial = useStore(state => state.structureCustomMaterial);
  const redLedActive            = useStore(state => state.redLedActive);

  const { gl, camera, scene, get } = useThree();
  useEffect(() => { setGl(gl); }, [gl]);

  useEffect(() => {
    gl.outputColorSpace = SRGBColorSpace;
    gl.toneMapping = ACESFilmicToneMapping;
    gl.toneMappingExposure = 0.82;
  }, [gl]);

  const cameraRef      = useRef();
  const controlsRef    = useRef();
  const dirLightRef    = useRef();
  const fillLightRef   = useRef();
  const ambLightRef    = useRef();
  const pointerDownPos = useRef({ x: 0, y: 0 });
  const structureGroupRef    = useRef();
  const animatedExplodeRef   = useRef(0);
  const explodeVelocityRef   = useRef(0);

  // Assembly animation refs
  const floorAssembleRef     = useRef();
  const handrailAssembleRef  = useRef();
  const assembleFloorYRef    = useRef(0);
  const assembleArchYRef     = useRef(0);
  const assembleHandrailYRef = useRef(0);
  const assembleFrameRef     = useRef(-1);   // -1 = idle, 0+ = frame counter
  const prevAssembleKeyRef   = useRef(0);    // last seen assembleKey, checked in useFrame
  const autoAssembleDoneRef  = useRef(false);// fires the on-load animation once
  const userOrbitedRef       = useRef(false);// true once user has grabbed the camera

  const [showCard, setShowCard] = useState(false);
  const [expanded, setExpanded] = useState(false);

  // Derive per-layer effective opacity from store + timeline
  const effectiveFloorOpacity    = timelineStep === 0 ? 0 : baseOpacity;
  const effectiveArchOpacity     =
    timelineStep === 0 || timelineStep === 1 ? 0 :
    timelineStep === 2 ? 0.55 :
    structureOpacity;
  const effectiveHandrailOpacity = timelineStep !== null && timelineStep < 3 ? 0 : handrailOpacity;

  // Lighting mode: adjust light color/intensity per mode
  useEffect(() => {
    const LIGHTING = {
      day:   { dirColor: 0xfff8f0, dirIntensity: 0.82, ambColor: 0xffffff, ambIntensity: 0.20, fillColor: 0xd8eaf8, fillIntensity: 0.14 },
      dusk:  { dirColor: 0xff7733, dirIntensity: 1.10, ambColor: 0xff5522, ambIntensity: 0.30, fillColor: 0x7733aa, fillIntensity: 0.20 },
      night: { dirColor: 0x4466cc, dirIntensity: 0.42, ambColor: 0x112255, ambIntensity: 0.20, fillColor: 0x223388, fillIntensity: 0.12 },
    };
    const cfg = LIGHTING[lightingMode] || LIGHTING.day;
    if (dirLightRef.current) {
      dirLightRef.current.color.setHex(cfg.dirColor);
      dirLightRef.current.intensity = cfg.dirIntensity;
    }
    if (fillLightRef.current) {
      fillLightRef.current.color.setHex(cfg.fillColor);
      fillLightRef.current.intensity = cfg.fillIntensity;
    }
    if (ambLightRef.current) {
      ambLightRef.current.color.setHex(cfg.ambColor);
      ambLightRef.current.intensity = cfg.ambIntensity;
    }
  }, [lightingMode]);

  // When entering step 2, snap structure high so it descends visually
  useEffect(() => {
    if (timelineStep === 2 && structureGroupRef.current) {
      animatedExplodeRef.current = 4;
      structureGroupRef.current.position.y = 4;
    }
  }, [timelineStep]);


  // Smoothly animate camera toward agent-directed target + structure Y
  useFrame(() => {
    // ── Auto-assembly on first load ──────────────────────────────────────────
    // Fire once after *all* GLBs finish (DefaultLoadingManager via drei's useProgress).
    // Using "first mesh only" was non-deterministic: whichever file loaded first
    // changed timing, camera snap, and the post-assemble bounding box fit.
    if (!autoAssembleDoneRef.current) {
      const { active, loaded, total } = useProgress.getState();
      const assetsSettled = total > 0 && loaded === total && !active;
      let mc = 0;
      scene.traverse(obj => { if (obj.isMesh) mc++; });
      if (assetsSettled && mc > 0) {
        autoAssembleDoneRef.current = true;

        // Final camera pose once, while layers are still assembled (before scatter).
        // Fitting after the animation caused a visible "land then move" second motion.
        if (!userOrbitedRef.current && controlsRef.current) {
          scene.updateMatrixWorld(true);
          const box = new Box3();
          scene.traverse(obj => { if (obj.isMesh) box.expandByObject(obj); });
          if (!box.isEmpty()) {
            applyOrbitFrame(get().camera, controlsRef.current, box, DEFAULT_VIEW_DIR, DEFAULT_FRAME_MARGIN);
          }
        }

        assembleFloorYRef.current    = -15;
        assembleArchYRef.current     = 18;
        assembleHandrailYRef.current = -10;
        assembleFrameRef.current     = 0;
        if (floorAssembleRef.current)    floorAssembleRef.current.position.y    = -15;
        if (handrailAssembleRef.current) handrailAssembleRef.current.position.y = -10;
      }
    }

    // ── ASSEMBLE button re-trigger ───────────────────────────────────────────
    const freshKey = useStore.getState().assembleKey;
    if (freshKey !== prevAssembleKeyRef.current && freshKey > 0) {
      prevAssembleKeyRef.current   = freshKey;
      if (!userOrbitedRef.current && controlsRef.current) {
        scene.updateMatrixWorld(true);
        const box = new Box3();
        scene.traverse(obj => { if (obj.isMesh) box.expandByObject(obj); });
        if (!box.isEmpty()) {
          applyOrbitFrame(get().camera, controlsRef.current, box, DEFAULT_VIEW_DIR, DEFAULT_FRAME_MARGIN);
        }
      }
      assembleFloorYRef.current    = -15;
      assembleArchYRef.current     = 18;
      assembleHandrailYRef.current = -10;
      assembleFrameRef.current     = 0;
      if (floorAssembleRef.current)    floorAssembleRef.current.position.y    = -15;
      if (handrailAssembleRef.current) handrailAssembleRef.current.position.y = -10;
    }

    if (cameraTarget && controlsRef.current) {
      const controls = controlsRef.current;
      const camera   = controls.object;
      const dx = camera.position.x - controls.target.x;
      const dy = camera.position.y - controls.target.y;
      const dz = camera.position.z - controls.target.z;
      const radius = Math.sqrt(dx * dx + dy * dy + dz * dz);
      const { azimuth, polar } = cameraTarget;
      const tx = controls.target.x + radius * Math.sin(polar) * Math.sin(azimuth);
      const ty = controls.target.y + radius * Math.cos(polar);
      const tz = controls.target.z + radius * Math.sin(polar) * Math.cos(azimuth);
      camera.position.x += (tx - camera.position.x) * 0.07;
      camera.position.y += (ty - camera.position.y) * 0.07;
      camera.position.z += (tz - camera.position.z) * 0.07;
      camera.lookAt(controls.target);
      const dist = Math.sqrt(
        (camera.position.x - tx) ** 2 +
        (camera.position.y - ty) ** 2 +
        (camera.position.z - tz) ** 2
      );
      if (dist < 0.02) setCameraTarget(null);
    }

    if (structureGroupRef.current) {
      const targetY =
        timelineStep === 2 ? 2 :
        timelineStep !== null ? 0 :
        explodeDistance;

      explodeVelocityRef.current += (targetY - animatedExplodeRef.current) * 0.07;
      explodeVelocityRef.current *= 0.80;
      animatedExplodeRef.current += explodeVelocityRef.current;

      const assemblyOffset = assembleFrameRef.current >= 0 ? assembleArchYRef.current : 0;
      structureGroupRef.current.position.y = animatedExplodeRef.current + assemblyOffset;
    }

    // Inverse-explode assembly — all three parts collapse simultaneously.
    // Lerp rate 0.03 gives ~2.5 s of visible motion (ease-out, starts fast, slows to rest).
    const fc = assembleFrameRef.current;
    if (fc >= 0) {
      assembleFrameRef.current += 1;
      const L = 0.03;

      if (floorAssembleRef.current) {
        assembleFloorYRef.current += (0 - assembleFloorYRef.current) * L;
        floorAssembleRef.current.position.y = assembleFloorYRef.current;
      }
      assembleArchYRef.current += (0 - assembleArchYRef.current) * L;
      if (handrailAssembleRef.current) {
        assembleHandrailYRef.current += (0 - assembleHandrailYRef.current) * L;
        handrailAssembleRef.current.position.y = assembleHandrailYRef.current;
      }

      if (fc > 120 &&
          Math.abs(assembleFloorYRef.current) < 0.06 &&
          Math.abs(assembleArchYRef.current) < 0.06 &&
          Math.abs(assembleHandrailYRef.current) < 0.06) {
        assembleFrameRef.current = -1;
        assembleFloorYRef.current = 0;
        assembleArchYRef.current = 0;
        assembleHandrailYRef.current = 0;
        if (floorAssembleRef.current)    floorAssembleRef.current.position.y    = 0;
        if (handrailAssembleRef.current) handrailAssembleRef.current.position.y = 0;
      }
    }
  });

  const handlePointerDown = (e) => {
    pointerDownPos.current = { x: e.clientX, y: e.clientY };
  };

  const handlePartClick = (part) => (e) => {
    e.stopPropagation();
    const dx = e.clientX - pointerDownPos.current.x;
    const dy = e.clientY - pointerDownPos.current.y;
    if (dx * dx + dy * dy > 25) return;

    if (annotationMode) {
      setPendingAnnotation({
        position: [e.point.x, e.point.y, e.point.z],
        screenX: e.clientX,
        screenY: e.clientY,
      });
      setAnnotationMode(false);
      return;
    }

    setSelectedPart(part);
    setAgentChatOpen(true);
  };

  const handleExpandClick = () => setExpanded(!expanded);

  return (
    <>
      <PerspectiveCamera ref={cameraRef} makeDefault fov={36} near={0.05} far={100000} />
      <OrbitControls
        ref={controlsRef}
        makeDefault
        enableDamping={false}
        onChange={() => {
          if (controlsRef.current) {
            setCameraAzimuth(controlsRef.current.getAzimuthalAngle());
          }
        }}
        onStart={() => { setCameraTarget(null); userOrbitedRef.current = true; }}
      />

      <Suspense fallback={null}>
        <Environment preset="studio" environmentIntensity={0.32} background={false} />
      </Suspense>
      <hemisphereLight args={[0xd4eaf8, 0x221e1c, 0.14]} />
      <directionalLight ref={dirLightRef} castShadow={false} position={[14, 22, 10]} intensity={0.82} />
      <directionalLight ref={fillLightRef} castShadow={false} position={[-10, 6, -8]} intensity={0.14} color={0xd8eaf8} />
      <ambientLight ref={ambLightRef} intensity={0.34} />

      {redLedActive && (
        <>
          <pointLight position={[18, 2.8, 1.6]} color={0xff1200} intensity={12} distance={38} decay={2} />
          <pointLight position={[32, 2.8, 1.6]} color={0xff1200} intensity={12} distance={38} decay={2} />
        </>
      )}

      {/* Floor / base layer — all segments rendered together */}
      {(showBase || (timelineStep !== null && timelineStep >= 1)) && (
        <group position={MODEL_OFFSET} onPointerDown={handlePointerDown} onClick={handlePartClick('base')}>
          <group ref={floorAssembleRef}>
            <Suspense fallback={null}>
              <FloorPartsWithDeckTexture
                floorUrls={_floorUrls}
                selected={selectedPart === 'base'}
                opacity={effectiveFloorOpacity}
                materialId={baseMaterial}
                heatmapActive={heatmapActive}
              />
            </Suspense>
          </group>
        </group>
      )}

      {/* Arch / structure layer — outer group holds the position offset,
          inner group (structureGroupRef) holds the Y-explode animation */}
      {(showStructure || (timelineStep !== null && timelineStep >= 2)) && (
        <group position={MODEL_OFFSET}>
          <group
            ref={structureGroupRef}
            onPointerDown={handlePointerDown}
            onClick={handlePartClick('structure')}
          >
            <Suspense fallback={null}>
              <StructureWithTextures
                activeMatId={structureCustomMaterial}
                structureUrls={_structureUrls}
                selected={selectedPart === 'structure'}
                opacity={effectiveArchOpacity}
                materialId={structureMaterial}
                heatmapActive={heatmapActive}
              />
            </Suspense>
          </group>
        </group>
      )}

      {/* Handrail layer — all segments rendered together */}
      {(showHandrail || (timelineStep !== null && timelineStep >= 3)) && (
        <group position={MODEL_OFFSET} onPointerDown={handlePointerDown} onClick={handlePartClick('handrail')}>
          <group ref={handrailAssembleRef}>
            <Suspense fallback={null}>
              <HandrailPartsWithMetalTexture
                handrailUrls={_handrailUrls}
                selected={selectedPart === 'handrail'}
                opacity={effectiveHandrailOpacity}
                materialId={handrailMaterial}
                heatmapActive={heatmapActive}
              />
            </Suspense>
          </group>
        </group>
      )}

      {annotations.map((ann) => (
        <Html key={ann.id} position={ann.position} center>
          <Box sx={{
            display: 'flex', alignItems: 'center', gap: '6px',
            px: '10px', py: '4px',
            bgcolor: 'rgba(13,13,13,0.88)',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(96,62,57,0.6)',
            borderLeft: '2px solid #c00100',
            borderRadius: 0,
            pointerEvents: 'auto',
            whiteSpace: 'nowrap',
            cursor: 'default',
          }}>
            <Typography sx={{
              color: '#ffb4a8', fontFamily: "'Space Grotesk', monospace",
              fontWeight: 500, fontSize: 10, letterSpacing: '0.06em',
            }}>
              {ann.label}
            </Typography>
            <Box
              onClick={() => removeAnnotation(ann.id)}
              sx={{
                color: 'rgba(229,226,225,0.3)', cursor: 'pointer',
                fontSize: 10, lineHeight: 1, userSelect: 'none',
                '&:hover': { color: '#ffb4a8' },
              }}
            >
              ✕
            </Box>
          </Box>
        </Html>
      ))}

      {showCard && (
        <Html position={[0, 1, 0]}>
          <Box sx={{
            position: 'absolute',
            top: '80%',
            left: '30%',
            zIndex: 9999,
            backgroundColor: 'white',
            padding: 1,
            borderRadius: 3,
            opacity: 0.9,
            animation: 'cardIn 0.22s ease-out forwards',
            '@keyframes cardIn': {
              from: { opacity: 0, transform: 'scale(0.92) translateY(8px)' },
              to: { opacity: 0.9, transform: 'scale(1) translateY(0)' },
            },
          }}>
            <Card sx={{ width: 350, boxShadow: 3 }}>
              <CardHeader
                action={
                  <IconButton aria-label="close" onClick={() => setShowCard(false)}>
                    <CloseIcon />
                  </IconButton>
                }
                title="Saiyuen"
                subheader="Bridge"
              />
              <CardMedia
                component="iframe"
                src="https://www.youtube.com/embed/4FOmQkFgicQ?si=wVke1zASp0fnVN3K"
                title="YouTube video"
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                sx={{ height: 200 }}
              />
              <CardContent />
              <CardActions disableSpacing>
                <IconButton><FavoriteIcon /></IconButton>
                <IconButton aria-label="share"><ShareIcon /></IconButton>
                <ExpandMore expand={expanded} onClick={handleExpandClick} aria-expanded={expanded} aria-label="show more">
                  <ExpandMoreIcon />
                </ExpandMore>
              </CardActions>
              <Collapse in={expanded} timeout="auto" unmountOnExit>
                <CardContent>
                  <Typography sx={{ fontWeight: 200, fontSize: '16px' }}>
                    - 象徵著過去與未來的連接。
                  </Typography>
                </CardContent>
              </Collapse>
            </Card>
          </Box>
        </Html>
      )}
    </>
  );
}
