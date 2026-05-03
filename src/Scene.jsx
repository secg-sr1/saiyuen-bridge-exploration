/* eslint-disable react/no-unknown-property */

import { Suspense } from 'react';
import { styled } from '@mui/material/styles';
import { useEffect, useRef, useState } from 'react';
import { useLoader, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera, Html, useProgress } from '@react-three/drei';
import { setGl } from './utils/screenshot';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import {
  CanvasTexture,
  RepeatWrapping,
  BufferAttribute,
  MeshStandardMaterial,
  Color,
  Box3,
  Vector3,
  MathUtils,
} from 'three';

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

// Material preset table — module-level so it's not re-created on every render
const PRESETS = {
  granite:     null,
  concrete:    { color: 0xc0bdb8, roughness: 0.85, metalness: 0    },
  limestone:   { color: 0xe8dcc8, roughness: 0.88, metalness: 0    },
  marble:      { color: 0xf2f0ee, roughness: 0.35, metalness: 0.05 },
  steel:       { color: 0x8899aa, roughness: 0.25, metalness: 0.9  },
  wood:        { color: 0x8b5e3c, roughness: 0.95, metalness: 0    },
  gold:        { color: 0xd4af37, roughness: 0.2,  metalness: 1.0  },
  jade:        { color: 0x4a8c6a, roughness: 0.5,  metalness: 0.1  },
  pumpkin:     { color: 0xc05a00, roughness: 0.82, metalness: 0    },
  oogie:       { color: 0xb89a60, roughness: 0.97, metalness: 0    },
  sandworm:    { color: 0xd2be84, roughness: 0.99, metalness: 0    },
  jack:        { mapFn: () => jackStripe('#080810', '#eceef8'),   roughness: 0.86, metalness: 0    },
  jacknight:   { mapFn: () => jackStripe('#05071a', '#90b8d8'),   roughness: 0.84, metalness: 0    },
  jackpurple:  { mapFn: () => jackStripe('#120820', '#c8a4e8'),   roughness: 0.85, metalness: 0    },
  beetle:      { mapFn: () => beetleStripe('#0a0a0a', '#e4e4d8'), roughness: 0.90, metalness: 0    },
  beetlegreen: { mapFn: () => beetleStripe('#070e05', '#78cc42'), roughness: 0.84, metalness: 0.04 },
  beetlered:   { mapFn: () => beetleStripe('#0d0404', '#c83818'), roughness: 0.87, metalness: 0    },
};

// GLB URL arrays — sorted alphabetically so index 0 = _01, index 1 = _02, etc.
const _floorGlob   = import.meta.glob('./assets/glb-models/floor/*.glb',    { eager: true, query: '?url', import: 'default' });
const _archGlob    = import.meta.glob('./assets/glb-models/arch/*.glb',     { eager: true, query: '?url', import: 'default' });
const _handrailGlob = import.meta.glob('./assets/glb-models/handrail/*.glb', { eager: true, query: '?url', import: 'default' });

const _floorUrls    = Object.entries(_floorGlob).sort(([a],[b])=>a.localeCompare(b)).map(([,u])=>u);
const _archUrls     = Object.entries(_archGlob).sort(([a],[b])=>a.localeCompare(b)).map(([,u])=>u);
const _handrailUrls = Object.entries(_handrailGlob).sort(([a],[b])=>a.localeCompare(b)).map(([,u])=>u);

// Export so Model.jsx can show counts in the UI without re-importing globs
export const FLOOR_COUNT    = _floorUrls.length;
export const ARCH_COUNT     = _archUrls.length;
export const HANDRAIL_COUNT = _handrailUrls.length;

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
function BridgePartModel({ url, selected, opacity, materialId, heatmapActive }) {
  const gltf = useLoader(GLTFLoader, url);
  const origMats = useRef(null);

  // Capture original material properties; inject a default material when missing or black
  useEffect(() => {
    const DEFAULT_MAT = new MeshStandardMaterial({ color: new Color(0.75, 0.75, 0.75), roughness: 0.7, metalness: 0.1 });
    const saved = [];
    gltf.scene.traverse((child) => {
      if (!child.isMesh) return;
      // Assign default material when none is present
      if (!child.material) child.material = DEFAULT_MAT.clone();
      const mats = Array.isArray(child.material) ? child.material : [child.material];
      mats.forEach(mat => {
        // Lighten meshes that came in with a pure-black color (no texture)
        if (!mat.map && mat.color && mat.color.r < 0.05 && mat.color.g < 0.05 && mat.color.b < 0.05) {
          mat.color.setRGB(0.75, 0.75, 0.75);
          mat.roughness = 0.7;
          mat.metalness = 0.1;
        }
        saved.push({ mat, color: mat.color.clone(), roughness: mat.roughness, metalness: mat.metalness, map: mat.map ?? null });
      });
    });
    origMats.current = saved;
  }, [gltf.scene]);

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
    const preset = PRESETS[materialId] ?? null;
    origMats.current.forEach(({ mat, color, roughness, metalness, map }) => {
      if (preset === null) {
        mat.color.copy(color); mat.roughness = roughness; mat.metalness = metalness; mat.map = map;
      } else if (preset.mapFn) {
        mat.map = preset.mapFn(); mat.color.setHex(0xffffff);
        mat.roughness = preset.roughness; mat.metalness = preset.metalness;
      } else {
        mat.map = null; mat.color.setHex(preset.color);
        mat.roughness = preset.roughness; mat.metalness = preset.metalness;
      }
      mat.needsUpdate = true;
    });
  }, [materialId, heatmapActive, gltf.scene]);

  return <primitive object={gltf.scene} />;
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
  const assembleKey     = useStore(state => state.assembleKey);

  const { gl, camera, scene, get } = useThree();
  useEffect(() => { setGl(gl); }, [gl]);

  const cameraRef      = useRef();
  const controlsRef    = useRef();
  const dirLightRef    = useRef();
  const ambLightRef    = useRef();
  const pointerDownPos = useRef({ x: 0, y: 0 });
  const structureGroupRef    = useRef();
  const animatedExplodeRef   = useRef(0);

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
      day:   { dirColor: 0xffffff, dirIntensity: 1.5, ambColor: 0xffffff, ambIntensity: 0.5 },
      dusk:  { dirColor: 0xff8844, dirIntensity: 1.1, ambColor: 0xff6633, ambIntensity: 0.35 },
      night: { dirColor: 0x4466aa, dirIntensity: 0.4, ambColor: 0x223366, ambIntensity: 0.2 },
    };
    const cfg = LIGHTING[lightingMode] || LIGHTING.day;
    if (dirLightRef.current) {
      dirLightRef.current.color.setHex(cfg.dirColor);
      dirLightRef.current.intensity = cfg.dirIntensity;
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
      animatedExplodeRef.current += (targetY - animatedExplodeRef.current) * 0.06;
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

      <directionalLight ref={dirLightRef} position={[1, 1, 1]} intensity={1.5} />
      <ambientLight ref={ambLightRef} intensity={0.5} />

      {/* Floor / base layer — all segments rendered together */}
      {(showBase || (timelineStep !== null && timelineStep >= 1)) && (
        <group position={MODEL_OFFSET} onPointerDown={handlePointerDown} onClick={handlePartClick('base')}>
          <group ref={floorAssembleRef}>
            {_floorUrls.map((url) => (
              <Suspense key={url} fallback={null}>
                <BridgePartModel
                  url={url}
                  selected={selectedPart === 'base'}
                  opacity={effectiveFloorOpacity}
                  materialId={baseMaterial}
                  heatmapActive={heatmapActive}
                />
              </Suspense>
            ))}
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
            {_archUrls.map((url) => (
              <Suspense key={url} fallback={null}>
                <BridgePartModel
                  url={url}
                  selected={selectedPart === 'structure'}
                  opacity={effectiveArchOpacity}
                  materialId={structureMaterial}
                  heatmapActive={heatmapActive}
                />
              </Suspense>
            ))}
          </group>
        </group>
      )}

      {/* Handrail layer — all segments rendered together */}
      {(showHandrail || (timelineStep !== null && timelineStep >= 3)) && (
        <group position={MODEL_OFFSET} onPointerDown={handlePointerDown} onClick={handlePartClick('handrail')}>
          <group ref={handrailAssembleRef}>
            {_handrailUrls.map((url) => (
              <Suspense key={url} fallback={null}>
                <BridgePartModel
                  url={url}
                  selected={selectedPart === 'handrail'}
                  opacity={effectiveHandrailOpacity}
                  materialId={handrailMaterial}
                  heatmapActive={heatmapActive}
                />
              </Suspense>
            ))}
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
