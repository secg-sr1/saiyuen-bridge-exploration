import { useEffect, useRef } from 'react';
import { Box, IconButton, Stack, Tooltip, Typography } from '@mui/material';
import ArrowBackIosNewIcon from '@mui/icons-material/ArrowBackIosNew';
import ArrowForwardIosIcon from '@mui/icons-material/ArrowForwardIos';
import CloseIcon from '@mui/icons-material/Close';
import { useStore } from '../store/useStore';
import { track } from '../utils/analytics';

const C = {
  surface:        '#131313',
  surfaceHigh:    '#2a2a2a',
  outline:        'rgba(96,62,57,0.5)',
  outlineStrong:  '#b18780',
  primary:        '#ffb4a8',
  primaryDeep:    '#c00100',
  primaryGlow:    'rgba(192,1,0,0.35)',
  onSurface:      '#e5e2e1',
  onSurfaceDim:   'rgba(229,226,225,0.45)',
  onSurfaceFaint: 'rgba(229,226,225,0.22)',
};
const FONT_HEAD  = 'Manrope, Arial, sans-serif';
const FONT_LABEL = "'Space Grotesk', monospace";
const sharp = { borderRadius: 0 };

const STEPS = [
  { en: 'Empty Site',  zh: '空地'    },
  { en: 'Foundation',  zh: '基礎'    },
  { en: 'Arch Rising', zh: '拱橋升起' },
  { en: 'Complete',    zh: '完成'    },
];

const STEP_DESC = [
  { en: 'Before construction began — bare land and river crossing.',         zh: '施工開始前 — 空地與河道。' },
  { en: 'The stone foundation and arch base are laid in position.',           zh: '石造基礎與拱形底座就位。' },
  { en: 'The upper structure descends and locks onto the foundation.',        zh: '上部結構下降，與基礎扣合。' },
  { en: 'Bridge complete — deck, railings, and stonework all in place.',      zh: '橋樑完工 — 橋面、欄杆與石工全部就位。' },
];

export default function ConstructionTimeline() {
  const timelineStep    = useStore(s => s.timelineStep);
  const setTimelineStep = useStore(s => s.setTimelineStep);
  const language        = useStore(s => s.language);

  const prevStepRef = useRef(null);
  useEffect(() => {
    if (timelineStep !== null && prevStepRef.current === null) {
      track('timeline_opened', { step: timelineStep });
    }
    if (timelineStep !== null && timelineStep !== prevStepRef.current && prevStepRef.current !== null) {
      track('timeline_step_changed', { step: timelineStep, step_name: STEPS[timelineStep]?.en });
      if (timelineStep === STEPS.length - 1) track('timeline_completed');
    }
    prevStepRef.current = timelineStep;
  }, [timelineStep]);

  if (timelineStep === null) return null;

  const step     = STEPS[timelineStep]      ?? STEPS[0];
  const desc     = STEP_DESC[timelineStep]  ?? STEP_DESC[0];
  const label    = language === 'zh' ? step.zh : step.en;
  const descText = language === 'zh' ? desc.zh : desc.en;

  return (
    <Box sx={{
      position: 'fixed',
      bottom: 80,
      left: '50%',
      transform: 'translateX(-50%)',
      zIndex: 9998,
      width: 'min(92vw, 420px)',
      bgcolor: 'rgba(13,13,13,0.96)',
      backdropFilter: 'blur(20px)',
      border: `1px solid ${C.outline}`,
      borderTop: `2px solid ${C.primaryDeep}`,
      boxShadow: `0 0 40px ${C.primaryGlow}`,
      ...sharp,
      animation: 'tlSlide 0.18s steps(6)',
      '@keyframes tlSlide': {
        from: { opacity: 0, transform: 'translateX(-50%) translateY(8px)' },
        to:   { opacity: 1, transform: 'translateX(-50%) translateY(0)' },
      },
    }}>

      {/* Top bar: close + step label */}
      <Box sx={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        px: 1.5, pt: 1, pb: 0.5,
        borderBottom: `1px solid ${C.outline}`,
        position: 'relative',
      }}>
        <Box sx={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 2, bgcolor: C.primaryDeep }} />

        <Typography sx={{
          fontFamily: FONT_HEAD, fontWeight: 800, fontSize: 11,
          color: C.onSurface, letterSpacing: '0.12em', textTransform: 'uppercase', pl: 0.5,
        }}>
          {language === 'zh' ? '施工時間軸' : 'Construction Timeline'}
        </Typography>

        <Stack direction="row" alignItems="center" spacing={0.5}>
          <Typography sx={{
            fontFamily: FONT_LABEL, fontWeight: 700, fontSize: 10,
            color: C.primary, letterSpacing: '0.1em', textTransform: 'uppercase',
          }}>
            {timelineStep + 1} / {STEPS.length}
          </Typography>
          <Tooltip title={language === 'zh' ? '關閉' : 'Close'} placement="top">
            <IconButton size="small" onClick={() => setTimelineStep(null)}
              sx={{ color: C.onSurfaceFaint, ...sharp, '&:hover': { color: C.onSurface } }}>
              <CloseIcon sx={{ fontSize: 14 }} />
            </IconButton>
          </Tooltip>
        </Stack>
      </Box>

      {/* Step indicator dots */}
      <Stack direction="row" spacing={0.75} alignItems="center" justifyContent="center" sx={{ pt: 1.25, px: 1.5 }}>
        {STEPS.map((s, i) => (
          <Tooltip key={i} title={language === 'zh' ? s.zh : s.en} placement="top">
            <Box
              onClick={() => setTimelineStep(i)}
              sx={{
                height: 6,
                width: i === timelineStep ? 28 : 8,
                bgcolor: i === timelineStep ? C.primaryDeep : i < timelineStep ? C.outlineStrong : C.outline,
                ...sharp,
                cursor: 'pointer',
                transition: 'width 0.2s ease, background-color 0.15s ease',
                '&:hover': { bgcolor: i === timelineStep ? C.primaryDeep : C.primary },
              }}
            />
          </Tooltip>
        ))}
      </Stack>

      {/* Step name + description */}
      <Box sx={{ px: 1.75, pt: 1, pb: 0.5 }}>
        <Typography sx={{
          fontFamily: FONT_HEAD, fontWeight: 700, fontSize: 12,
          color: C.primary, letterSpacing: '0.06em', textTransform: 'uppercase', mb: 0.4,
        }}>
          {label}
        </Typography>
        <Typography sx={{
          fontFamily: FONT_LABEL, fontWeight: 400, fontSize: 10,
          color: C.onSurfaceDim, lineHeight: 1.65,
        }}>
          {descText}
        </Typography>
      </Box>

      {/* Prev / Next navigation */}
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ px: 1, pb: 1, pt: 0.5 }}>
        <Tooltip title={language === 'zh' ? '上一步' : 'Previous'} placement="top">
          <span>
            <IconButton
              size="small"
              onClick={() => setTimelineStep(Math.max(0, timelineStep - 1))}
              disabled={timelineStep === 0}
              sx={{
                color: C.primary, ...sharp,
                border: `1px solid ${C.outline}`,
                '&:hover': { bgcolor: 'rgba(192,1,0,0.1)', borderColor: C.primaryDeep },
                '&.Mui-disabled': { opacity: 0.2, borderColor: C.outline },
              }}
            >
              <ArrowBackIosNewIcon sx={{ fontSize: 12 }} />
            </IconButton>
          </span>
        </Tooltip>

        {/* Step name pills */}
        <Stack direction="row" spacing={0.5} alignItems="center">
          {STEPS.map((s, i) => (
            <Box
              key={i}
              onClick={() => setTimelineStep(i)}
              sx={{
                px: 0.75, py: 0.3,
                ...sharp,
                bgcolor: i === timelineStep ? 'rgba(192,1,0,0.15)' : 'transparent',
                border: `1px solid ${i === timelineStep ? C.primaryDeep : 'transparent'}`,
                cursor: 'pointer',
                '&:hover': { borderColor: C.outlineStrong },
              }}
            >
              <Typography sx={{
                fontFamily: FONT_LABEL, fontSize: 9, fontWeight: i === timelineStep ? 700 : 400,
                color: i === timelineStep ? C.primary : C.onSurfaceFaint,
                letterSpacing: '0.08em', textTransform: 'uppercase', whiteSpace: 'nowrap',
              }}>
                {language === 'zh' ? s.zh : s.en}
              </Typography>
            </Box>
          ))}
        </Stack>

        <Tooltip title={language === 'zh' ? '下一步' : 'Next'} placement="top">
          <span>
            <IconButton
              size="small"
              onClick={() => setTimelineStep(Math.min(STEPS.length - 1, timelineStep + 1))}
              disabled={timelineStep === STEPS.length - 1}
              sx={{
                color: C.primary, ...sharp,
                border: `1px solid ${C.outline}`,
                '&:hover': { bgcolor: 'rgba(192,1,0,0.1)', borderColor: C.primaryDeep },
                '&.Mui-disabled': { opacity: 0.2, borderColor: C.outline },
              }}
            >
              <ArrowForwardIosIcon sx={{ fontSize: 12 }} />
            </IconButton>
          </span>
        </Tooltip>
      </Stack>
    </Box>
  );
}
