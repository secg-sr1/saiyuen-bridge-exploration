import { Box, Chip } from '@mui/material';
import ViewInArIcon from '@mui/icons-material/ViewInAr';

const C = {
  primaryDeep: '#c00100',
  primaryGlow: 'rgba(192,1,0,0.35)',
  primary:     '#ffb4a8',
};
const FONT_LABEL = "'Space Grotesk', monospace";

export default function ARView({ onClose }) {
  return (
    <Box sx={{ position: 'fixed', inset: 0, zIndex: 99999, bgcolor: '#000' }}>

      <iframe
        src="/ar.html"
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', border: 'none', display: 'block' }}
        allow="camera; microphone"
        title="AR View"
      />

      {/* Only the exit chip — no SELF here */}
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
