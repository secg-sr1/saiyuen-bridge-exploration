import { useEffect } from 'react';
import { Box, Typography } from '@mui/material';

const FONT_LABEL = "'Space Grotesk', monospace";

const GRAIN_SVG = `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.82' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`;

export default function OldFilmLightbox({ url, label, onClose }) {
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <Box
      onClick={onClose}
      sx={{
        position: 'fixed', inset: 0, zIndex: 999999,
        bgcolor: 'rgba(0,0,0,0.97)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        cursor: 'pointer',
        animation: 'lbBgIn 0.08s steps(2)',
        '@keyframes lbBgIn': { from: { opacity: 0 }, to: { opacity: 1 } },
      }}
    >
      {/* White projector-lamp flash on entry */}
      <Box sx={{
        position: 'absolute', inset: 0, pointerEvents: 'none',
        bgcolor: 'rgba(255,255,255,0.9)',
        animation: 'projFlash 0.35s steps(1) forwards',
        '@keyframes projFlash': {
          '0%':   { opacity: 1 },
          '14%':  { opacity: 0.4 },
          '28%':  { opacity: 0.15 },
          '100%': { opacity: 0 },
        },
      }} />

      {/* Image frame */}
      <Box
        onClick={(e) => e.stopPropagation()}
        sx={{
          position: 'relative',
          cursor: 'default',
          animation: 'filmEntrance 0.55s steps(11) forwards',
          '@keyframes filmEntrance': {
            '0%':   { transform: 'scale(0.68) rotate(-2.5deg) translateX(6px)',  opacity: 0    },
            '10%':  { transform: 'scale(1.08) rotate(1.6deg)  translateX(-5px)', opacity: 0.65 },
            '20%':  { transform: 'scale(0.92) rotate(-1.1deg) translateX(3px)',  opacity: 0.9  },
            '35%':  { transform: 'scale(1.05) rotate(0.6deg)  translateX(-2px)', opacity: 1    },
            '50%':  { transform: 'scale(0.97) rotate(-0.3deg) translateX(1px)',  opacity: 1    },
            '65%':  { transform: 'scale(1.02) rotate(0.1deg)  translateX(0px)',  opacity: 1    },
            '80%':  { transform: 'scale(0.99) rotate(0deg)    translateX(0px)',  opacity: 1    },
            '100%': { transform: 'scale(1)    rotate(0deg)    translateX(0px)',  opacity: 1    },
          },
        }}
      >
        {/* Image — heavy old-film grade */}
        <Box
          component="img"
          src={url}
          alt={label}
          sx={{
            display: 'block',
            maxWidth: '88vw',
            maxHeight: '80vh',
            objectFit: 'contain',
            filter: 'sepia(65%) contrast(1.22) brightness(0.78) saturate(0.55) hue-rotate(-6deg)',
          }}
        />

        {/* Dense scan lines */}
        <Box sx={{
          position: 'absolute', inset: 0, pointerEvents: 'none',
          background: 'repeating-linear-gradient(0deg, rgba(0,0,0,0.26) 0px, rgba(0,0,0,0.26) 1px, transparent 1px, transparent 2px)',
        }} />

        {/* Heavy animated grain */}
        <Box sx={{
          position: 'absolute', inset: 0, pointerEvents: 'none',
          backgroundImage: GRAIN_SVG,
          backgroundSize: '110px 110px',
          opacity: 0.18,
          animation: 'grainDrift 0.05s steps(1) infinite',
          '@keyframes grainDrift': {
            '0%':   { backgroundPosition: '0px 0px'    },
            '12%':  { backgroundPosition: '-5px 3px'   },
            '25%':  { backgroundPosition: '4px -4px'   },
            '37%':  { backgroundPosition: '-3px -2px'  },
            '50%':  { backgroundPosition: '5px 2px'    },
            '62%':  { backgroundPosition: '-2px 5px'   },
            '75%':  { backgroundPosition: '3px -3px'   },
            '87%':  { backgroundPosition: '-4px 1px'   },
            '100%': { backgroundPosition: '0px 0px'    },
          },
        }} />

        {/* Deep vignette */}
        <Box sx={{
          position: 'absolute', inset: 0, pointerEvents: 'none',
          background: 'radial-gradient(ellipse at center, transparent 30%, rgba(0,0,0,0.55) 68%, rgba(0,0,0,0.92) 100%)',
        }} />

        {/* Warm flicker — more frequent and stronger */}
        <Box sx={{
          position: 'absolute', inset: 0, pointerEvents: 'none',
          background: 'rgba(255,230,160,0.11)',
          animation: 'filmFlicker 0.14s steps(1) infinite',
          '@keyframes filmFlicker': {
            '0%':   { opacity: 0    },
            '72%':  { opacity: 0    },
            '75%':  { opacity: 1    },
            '78%':  { opacity: 0    },
            '85%':  { opacity: 0.7  },
            '88%':  { opacity: 0    },
            '93%':  { opacity: 0.4  },
            '96%':  { opacity: 0    },
            '100%': { opacity: 0    },
          },
        }} />

        {/* Dark flicker — simulates shutter drop */}
        <Box sx={{
          position: 'absolute', inset: 0, pointerEvents: 'none',
          bgcolor: 'rgba(0,0,0,0)',
          animation: 'shutterFlicker 0.22s steps(1) infinite',
          '@keyframes shutterFlicker': {
            '0%':   { opacity: 0   },
            '91%':  { opacity: 0   },
            '92%':  { opacity: 0.4 },
            '93%':  { opacity: 0   },
            '100%': { opacity: 0   },
          },
          background: 'rgba(0,0,0,0.45)',
        }} />

        {/* Vertical film scratch line */}
        <Box sx={{
          position: 'absolute', top: 0, bottom: 0, left: '37%', width: 1, pointerEvents: 'none',
          bgcolor: 'rgba(255,255,220,0.55)',
          animation: 'filmScratch 0.28s steps(1) infinite',
          '@keyframes filmScratch': {
            '0%':   { opacity: 0, left: '37%' },
            '88%':  { opacity: 0, left: '37%' },
            '90%':  { opacity: 1, left: '62%' },
            '92%':  { opacity: 0, left: '62%' },
            '100%': { opacity: 0, left: '37%' },
          },
        }} />

        {/* Film-burn edges — top */}
        <Box sx={{
          position: 'absolute', top: 0, left: 0, right: 0, height: 4, pointerEvents: 'none',
          background: 'linear-gradient(to right, rgba(192,1,0,0.9) 0%, rgba(192,1,0,0.4) 12%, transparent 30%, transparent 70%, rgba(192,1,0,0.4) 88%, rgba(192,1,0,0.9) 100%)',
        }} />
        {/* Film-burn edges — bottom */}
        <Box sx={{
          position: 'absolute', bottom: 0, left: 0, right: 0, height: 4, pointerEvents: 'none',
          background: 'linear-gradient(to right, rgba(192,1,0,0.9) 0%, rgba(192,1,0,0.4) 12%, transparent 30%, transparent 70%, rgba(192,1,0,0.4) 88%, rgba(192,1,0,0.9) 100%)',
        }} />
        {/* Occasional horizontal burn streak */}
        <Box sx={{
          position: 'absolute', left: 0, right: 0, height: 2, top: '22%', pointerEvents: 'none',
          bgcolor: 'rgba(192,1,0,0.35)',
          animation: 'burnStreak 0.6s steps(1) infinite',
          '@keyframes burnStreak': {
            '0%':   { opacity: 0, top: '22%' },
            '94%':  { opacity: 0, top: '22%' },
            '96%':  { opacity: 1, top: '58%' },
            '98%':  { opacity: 0, top: '58%' },
            '100%': { opacity: 0, top: '22%' },
          },
        }} />

        {/* Image label */}
        {label && (
          <Box sx={{
            position: 'absolute', bottom: 10, left: 0, right: 0,
            display: 'flex', justifyContent: 'center', pointerEvents: 'none',
          }}>
            <Typography sx={{
              fontFamily: FONT_LABEL, fontSize: 9, fontWeight: 500,
              color: 'rgba(255,200,170,0.7)',
              letterSpacing: '0.26em', textTransform: 'uppercase',
              bgcolor: 'rgba(0,0,0,0.65)', px: 1.5, py: 0.3,
            }}>
              {label}
            </Typography>
          </Box>
        )}
      </Box>

      {/* Dismiss hint */}
      <Typography sx={{
        position: 'absolute', bottom: 14, right: 18, pointerEvents: 'none',
        fontFamily: FONT_LABEL, fontSize: 8, fontWeight: 400,
        color: 'rgba(229,226,225,0.18)',
        letterSpacing: '0.18em', textTransform: 'uppercase',
      }}>
        ESC / CLICK TO CLOSE
      </Typography>
    </Box>
  );
}
