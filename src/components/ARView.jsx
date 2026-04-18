import { useEffect, useMemo } from 'react';
import { Box, Chip } from '@mui/material';
import ViewInArIcon from '@mui/icons-material/ViewInAr';

const C = {
  outline:       'rgba(96,62,57,0.5)',
  onSurfaceDim:  'rgba(229,226,225,0.45)',
  primaryDeep:   '#c00100',
  primaryGlow:   'rgba(192,1,0,0.35)',
};
const FONT_LABEL = "'Space Grotesk', monospace";

// Standalone HTML loaded in an isolated iframe so A-Frame doesn't conflict
// with the React render tree. The iframe gets its own camera stream.
//
// MARKER: currently uses the Hiro preset for testing.
// To switch to the custom X-logo marker:
//   1. Open https://jeromeetienne.github.io/AR.js/three.js/examples/marker-training/examples/generator.html
//   2. Upload public/marker.png → download marker.patt
//   3. Place marker.patt in /public/
//   4. Replace <a-marker preset="hiro"> with:
//      <a-marker type="pattern" url="/marker.patt">
const buildArHtml = () => `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1, user-scalable=no"/>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { overflow: hidden; background: #000; }
    .a-loader-title, #aframe-inspector-link { display: none !important; }
  </style>
  <script src="https://aframe.io/releases/1.6.0/aframe.min.js"></script>
  <script src="https://raw.githack.com/AR-js-org/AR.js/master/aframe/build/aframe-ar.js"></script>
</head>
<body>
  <a-scene
    embedded
    arjs="sourceType: webcam; debugUIEnabled: false; patternRatio: 0.75;"
    vr-mode-ui="enabled: false"
    renderer="antialias: true; logarithmicDepthBuffer: true;"
    loading-screen="enabled: false"
  >
    <a-assets timeout="15000">
      <a-asset-item id="base"      src="https://raw.githubusercontent.com/secg-sr1/sai-models/refs/heads/main/bidge-01-base-02.glb"></a-asset-item>
      <a-asset-item id="structure" src="https://raw.githubusercontent.com/secg-sr1/sai-models/refs/heads/main/bidge-01-structure-02.glb"></a-asset-item>
    </a-assets>

    <a-marker type="pattern" url="/marker.patt">
      <a-entity gltf-model="#base"      scale="0.2 0.2 0.2" position="0 0 0"   animation-mixer="loop: repeat"></a-entity>
      <a-entity gltf-model="#structure" scale="0.2 0.2 0.2" position="0 0.4 0" animation-mixer="loop: repeat"></a-entity>
    </a-marker>

    <a-entity camera></a-entity>
  </a-scene>
</body>
</html>`;

export default function ARView({ onClose }) {
  const blobUrl = useMemo(() => {
    const blob = new Blob([buildArHtml()], { type: 'text/html' });
    return URL.createObjectURL(blob);
  }, []);

  useEffect(() => () => URL.revokeObjectURL(blobUrl), [blobUrl]);

  return (
    <Box sx={{ position: 'fixed', inset: 0, zIndex: 99999, bgcolor: '#000' }}>
      <iframe
        src={blobUrl}
        style={{ width: '100%', height: '100%', border: 'none', display: 'block' }}
        allow="camera; microphone"
        title="AR View"
      />

      {/* Exit chip — top-left, rendered outside the iframe */}
      <Box sx={{ position: 'fixed', top: 16, left: 16, zIndex: 100000 }}>
        <Chip
          icon={<ViewInArIcon sx={{ fontSize: '13px !important', color: `${C.primaryDeep} !important` }} />}
          label="AR"
          size="small"
          onClick={onClose}
          sx={{
            fontFamily: FONT_LABEL, fontSize: 10, fontWeight: 500, height: 22, borderRadius: 0,
            bgcolor: 'rgba(192,1,0,0.18)',
            color: C.primaryDeep,
            border: `1px solid ${C.primaryDeep}`,
            backdropFilter: 'blur(10px)',
            letterSpacing: '0.1em',
            cursor: 'pointer',
            boxShadow: `0 0 12px ${C.primaryGlow}`,
            transition: 'background-color 0.05s steps(1)',
            '&:hover': { bgcolor: 'rgba(192,1,0,0.3)' },
          }}
        />
      </Box>
    </Box>
  );
}
