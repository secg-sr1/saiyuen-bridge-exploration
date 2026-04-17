/* eslint-disable react/no-unknown-property */

import { styled } from '@mui/material/styles';
import { useEffect, useRef, useState } from 'react';
import { useLoader, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera, Html } from '@react-three/drei';
import { setGl } from './utils/screenshot';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import { CanvasTexture, RepeatWrapping } from 'three';

// Module-level stripe texture cache — created lazily, reused across renders
const _texCache = {};

// Jack Skellington: thin precise pinstripes
function jackStripe(bgHex, stripeHex, repeat = 10) {
  const key = `jack|${bgHex}|${stripeHex}`;
  if (_texCache[key]) return _texCache[key];
  const size = 128;
  const canvas = document.createElement('canvas');
  canvas.width = size; canvas.height = size;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = bgHex;
  ctx.fillRect(0, 0, size, size);
  // Thin crisp stripes: 3px stripe every 20px
  ctx.fillStyle = stripeHex;
  for (let x = 0; x < size; x += 20) ctx.fillRect(x, 0, 3, size);
  const tex = new CanvasTexture(canvas);
  tex.wrapS = tex.wrapT = RepeatWrapping;
  tex.repeat.set(repeat, repeat);
  _texCache[key] = tex;
  return tex;
}

// Beetlejuice: wide bold equal stripes with slight ragged edge for that decayed carnival feel
function beetleStripe(bgHex, stripeHex, repeat = 7) {
  const key = `beetle|${bgHex}|${stripeHex}`;
  if (_texCache[key]) return _texCache[key];
  const size = 128;
  const canvas = document.createElement('canvas');
  canvas.width = size; canvas.height = size;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = bgHex;
  ctx.fillRect(0, 0, size, size);
  // Bold alternating bands — stripe ≈ half the gap, chaotic edge via ±1px noise per row
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


// Legacy info card styling kept for future use.
// The `expand` prop only controls rotation and should not reach the DOM.
const ExpandMore = styled(IconButton, {
  shouldForwardProp: (prop) => prop !== 'expand',
})(({ theme }) => ({
  marginLeft: 'auto',
  transition: theme.transitions.create('transform', {
    duration: theme.transitions.duration.shortest,
  }),

  variants: [
    {
      props: ({ expand }) => !expand,
      style: { transform: 'rotate(0deg)' },
    },
    {
      props: ({ expand }) => !!expand,
      style: { transform: 'rotate(180deg)' },
    },
  ],
}));


export default function Scene() {
  const showBase = useStore(state => state.showBase);
  const showStructure = useStore(state => state.showStructure);
  const selectedPart = useStore(state => state.selectedPart);
  const setSelectedPart = useStore(state => state.setSelectedPart);
  const setAgentChatOpen = useStore(state => state.setAgentChatOpen);
  const setCameraAzimuth = useStore(state => state.setCameraAzimuth);
  const cameraTarget = useStore(state => state.cameraTarget);
  const setCameraTarget = useStore(state => state.setCameraTarget);
  const explodeDistance = useStore(state => state.explodeDistance);
  const baseOpacity = useStore(state => state.baseOpacity);
  const structureOpacity = useStore(state => state.structureOpacity);
  const lightingMode = useStore(state => state.lightingMode);
  const annotations = useStore(state => state.annotations);
  const baseMaterial = useStore(state => state.baseMaterial);
  const structureMaterial = useStore(state => state.structureMaterial);
  const timelineStep = useStore(state => state.timelineStep);

  const { gl } = useThree();
  useEffect(() => { setGl(gl); }, [gl]);

  const cameraRef = useRef();
  const controlsRef = useRef();
  const dirLightRef = useRef();
  const ambLightRef = useRef();
  const pointerDownPos = useRef({ x: 0, y: 0 });
  const origMatsBase = useRef(null);
  const origMatsStructure = useRef(null);
  const structureGroupRef = useRef();
  const animatedExplodeRef = useRef(0);

  const [showCard, setShowCard] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const gltf = useLoader(GLTFLoader, 'https://raw.githubusercontent.com/secg-sr1/sai-models/refs/heads/main/bidge-01-base-02.glb');
  const gltfBridge = useLoader(GLTFLoader, 'https://raw.githubusercontent.com/secg-sr1/sai-models/refs/heads/main/bidge-01-structure-02.glb');

  // Emissive highlight: glow the selected part blue, clear others
  useEffect(() => {
    const applyHighlight = (scene, active) => {
      scene.traverse((child) => {
        if (child.isMesh && child.material) {
          const mats = Array.isArray(child.material) ? child.material : [child.material];
          mats.forEach(mat => {
            if (mat.emissive !== undefined) {
              mat.emissive.set(active ? 0x2266cc : 0x000000);
              mat.emissiveIntensity = active ? 0.4 : 0;
            }
          });
        }
      });
    };
    applyHighlight(gltf.scene, selectedPart === 'base');
    applyHighlight(gltfBridge.scene, selectedPart === 'structure');
  }, [selectedPart, gltf.scene, gltfBridge.scene]);

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

  // X-Ray opacity: traverse materials and apply transparency
  // When timeline is active, override with step-derived values
  useEffect(() => {
    const applyOpacity = (scene, opacity) => {
      scene.traverse((child) => {
        if (child.isMesh && child.material) {
          const mats = Array.isArray(child.material) ? child.material : [child.material];
          mats.forEach(mat => {
            mat.transparent = opacity < 1;
            mat.opacity = opacity;
          });
        }
      });
    };
    const effectiveBase = timelineStep === 0 ? 0 : baseOpacity;
    const effectiveStructure =
      timelineStep === 0 || timelineStep === 1 ? 0 :
      timelineStep === 2 ? 0.55 :
      structureOpacity;
    applyOpacity(gltf.scene, effectiveBase);
    applyOpacity(gltfBridge.scene, effectiveStructure);
  }, [baseOpacity, structureOpacity, timelineStep, gltf.scene, gltfBridge.scene]);

  // Store original material properties once per model load (for granite restore)
  useEffect(() => {
    const capture = (scene) => {
      const saved = [];
      scene.traverse((child) => {
        if (child.isMesh && child.material) {
          const mats = Array.isArray(child.material) ? child.material : [child.material];
          mats.forEach(mat => {
            saved.push({ mat, color: mat.color.clone(), roughness: mat.roughness, metalness: mat.metalness, map: mat.map ?? null });
          });
        }
      });
      return saved;
    };
    origMatsBase.current = capture(gltf.scene);
    origMatsStructure.current = capture(gltfBridge.scene);
  }, [gltf.scene, gltfBridge.scene]);

  // Material preset: apply per-layer independently
  useEffect(() => {
    const PRESETS = {
      // Realistic
      granite:     null,
      concrete:    { color: 0xc0bdb8, roughness: 0.85, metalness: 0    },
      limestone:   { color: 0xe8dcc8, roughness: 0.88, metalness: 0    },
      marble:      { color: 0xf2f0ee, roughness: 0.35, metalness: 0.05 },
      steel:       { color: 0x8899aa, roughness: 0.25, metalness: 0.9  },
      wood:        { color: 0x8b5e3c, roughness: 0.95, metalness: 0    },
      gold:        { color: 0xd4af37, roughness: 0.2,  metalness: 1.0  },
      jade:        { color: 0x4a8c6a, roughness: 0.5,  metalness: 0.1  },
      // Fantastical — flat colour (Tim Burton atmospherics)
      pumpkin:     { color: 0xc05a00, roughness: 0.82, metalness: 0    },
      oogie:       { color: 0xb89a60, roughness: 0.97, metalness: 0    },
      sandworm:    { color: 0xd2be84, roughness: 0.99, metalness: 0    },
      // Jack Skellington suit — thin precise pinstripes, three colorways
      jack:        { mapFn: () => jackStripe('#080810', '#eceef8'),   roughness: 0.86, metalness: 0    },
      jacknight:   { mapFn: () => jackStripe('#05071a', '#90b8d8'),   roughness: 0.84, metalness: 0    },
      jackpurple:  { mapFn: () => jackStripe('#120820', '#c8a4e8'),   roughness: 0.85, metalness: 0    },
      // Beetlejuice suit — wide bold ragged stripes, three colorways
      beetle:      { mapFn: () => beetleStripe('#0a0a0a', '#e4e4d8'), roughness: 0.90, metalness: 0    },
      beetlegreen: { mapFn: () => beetleStripe('#070e05', '#78cc42'), roughness: 0.84, metalness: 0.04 },
      beetlered:   { mapFn: () => beetleStripe('#0d0404', '#c83818'), roughness: 0.87, metalness: 0    },
    };

    const applyPreset = (origRef, materialId) => {
      if (!origRef.current) return;
      const preset = PRESETS[materialId] ?? null;
      origRef.current.forEach(({ mat, color, roughness, metalness, map }) => {
        if (preset === null) {
          mat.color.copy(color);
          mat.roughness = roughness;
          mat.metalness = metalness;
          mat.map = map;
        } else if (preset.mapFn) {
          mat.map = preset.mapFn();
          mat.color.setHex(0xffffff);
          mat.roughness = preset.roughness;
          mat.metalness = preset.metalness;
        } else {
          mat.map = null;
          mat.color.setHex(preset.color);
          mat.roughness = preset.roughness;
          mat.metalness = preset.metalness;
        }
        mat.needsUpdate = true;
      });
    };

    applyPreset(origMatsBase, baseMaterial);
    applyPreset(origMatsStructure, structureMaterial);
  }, [baseMaterial, structureMaterial, gltf.scene, gltfBridge.scene]);

  // When entering step 2, snap structure high so it descends visually
  useEffect(() => {
    if (timelineStep === 2 && structureGroupRef.current) {
      animatedExplodeRef.current = 4;
      structureGroupRef.current.position.y = 4;
    }
  }, [timelineStep]);

  // Smoothly animate camera toward agent-directed target position + structure Y
  useFrame(() => {
    // Camera animation (only when a target is active)
    if (cameraTarget && controlsRef.current) {
      const controls = controlsRef.current;
      const camera = controls.object;

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

    // Animate structure group Y toward timeline target or normal explodeDistance
    if (structureGroupRef.current) {
      const targetY =
        timelineStep === 2 ? 2 :
        timelineStep !== null ? 0 :
        explodeDistance;
      animatedExplodeRef.current += (targetY - animatedExplodeRef.current) * 0.06;
      structureGroupRef.current.position.y = animatedExplodeRef.current;
    }
  });

  // Track drag distance to distinguish tap from drag-to-rotate
  const handlePointerDown = (e) => {
    pointerDownPos.current = { x: e.clientX, y: e.clientY };
  };

  const handlePartClick = (part) => (e) => {
    e.stopPropagation();
    const dx = e.clientX - pointerDownPos.current.x;
    const dy = e.clientY - pointerDownPos.current.y;
    if (dx * dx + dy * dy > 25) return; // was a drag (>5px), not a tap
    setSelectedPart(part);
    setAgentChatOpen(true);
  };

  const handleExpandClick = () => setExpanded(!expanded);

  return (
    <>
      <PerspectiveCamera ref={cameraRef} />
      <OrbitControls
        ref={controlsRef}
        makeDefault
        onChange={() => {
          if (controlsRef.current) {
            setCameraAzimuth(controlsRef.current.getAzimuthalAngle());
          }
        }}
        onStart={() => setCameraTarget(null)}
      />

      <directionalLight ref={dirLightRef} position={[1, 1, 1]} intensity={1.5} />
      <ambientLight ref={ambLightRef} intensity={0.5} />

      {(showBase || (timelineStep !== null && timelineStep >= 1)) && (
        <group
          onPointerDown={handlePointerDown}
          onClick={handlePartClick('base')}
        >
          <primitive object={gltf.scene} scale={[0.2, 0.2, 0.2]} />
        </group>
      )}

      {(showStructure || (timelineStep !== null && timelineStep >= 2)) && (
        <group
          ref={structureGroupRef}
          onPointerDown={handlePointerDown}
          onClick={handlePartClick('structure')}
        >
          <primitive object={gltfBridge.scene} scale={[0.2, 0.2, 0.2]} />
        </group>
      )}

      {annotations.map((ann) => (
        <Html key={ann.id} position={ann.position} center>
          <Box sx={{
            px: 1.25, py: 0.5,
            bgcolor: 'rgba(0,0,0,0.72)',
            backdropFilter: 'blur(6px)',
            borderRadius: 2,
            border: '1px solid rgba(255,255,255,0.25)',
            pointerEvents: 'none',
            whiteSpace: 'nowrap',
          }}>
            <Typography sx={{
              color: '#fff', fontFamily: 'Manrope, Arial, sans-serif',
              fontWeight: 500, fontSize: 11,
            }}>
              {ann.label}
            </Typography>
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
