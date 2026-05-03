import { useEffect, useRef } from 'react';
import { Box, IconButton, Stack, Tooltip, Typography } from '@mui/material';
import ArrowBackIosNewIcon from '@mui/icons-material/ArrowBackIosNew';
import ArrowForwardIosIcon from '@mui/icons-material/ArrowForwardIos';
import CloseIcon from '@mui/icons-material/Close';
import { useStore } from '../store/useStore';
import { track } from '../utils/analytics';

const C = {
  bg:          '#F6F4F1',
  border:      '#E2DFDB',
  borderLight: '#EEECE8',
  ink:         '#111111',
  inkSub:      '#555555',
  inkMuted:    '#999999',
  inkFaint:    '#BBBBBB',
  chip:        '#EEECE8',
};
const FONT_HEAD  = 'Manrope, Arial, sans-serif';
const FONT_LABEL = 'Manrope, Arial, sans-serif';
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
      width: 'min(92vw, 440px)',
      bgcolor: C.bg,
      border: `1px solid ${C.border}`,
      boxShadow: '0 4px 24px rgba(0,0,0,0.12)',
      ...sharp,
      animation: 'tlSlide 0.22s ease-out',
      '@keyframes tlSlide': {
        from: { opacity: 0, transform: 'translateX(-50%) translateY(8px)' },
        to:   { opacity: 1, transform: 'translateX(-50%) translateY(0)' },
      },
    }}>

      {/* Header */}
      <Box sx={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        px: 2.5, py: 1.75,
        borderBottom: `1px solid ${C.border}`,
      }}>
        <Typography sx={{
          fontFamily: FONT_HEAD, fontWeight: 800, fontSize: 12,
          color: C.ink, letterSpacing: '0.12em', textTransform: 'uppercase',
        }}>
          {language === 'zh' ? '施工時間軸' : 'Construction Timeline'}
        </Typography>

        <Stack direction="row" alignItems="center" spacing={2}>
          <Typography sx={{
            fontFamily: FONT_HEAD, fontWeight: 400, fontSize: 10,
            color: C.inkFaint, letterSpacing: '0.1em', textTransform: 'uppercase',
          }}>
            {timelineStep + 1} / {STEPS.length}
          </Typography>
          <Typography
            onClick={() => setTimelineStep(null)}
            sx={{
              fontFamily: FONT_HEAD, fontWeight: 400, fontSize: 11,
              letterSpacing: '0.1em', textTransform: 'uppercase',
              color: C.inkMuted, cursor: 'pointer', transition: 'color 0.15s',
              '&:hover': { color: C.ink },
            }}
          >
            CLOSE
          </Typography>
        </Stack>
      </Box>

      {/* Step progress bar */}
      <Box sx={{ px: 2.5, pt: 2, display: 'flex', gap: 0.75, alignItems: 'center' }}>
        {STEPS.map((s, i) => (
          <Tooltip key={i} title={language === 'zh' ? s.zh : s.en} placement="top">
            <Box
              onClick={() => setTimelineStep(i)}
              sx={{
                height: 3, flex: 1,
                bgcolor: i <= timelineStep ? C.ink : C.border,
                cursor: 'pointer',
                transition: 'background-color 0.2s ease',
                '&:hover': { bgcolor: i <= timelineStep ? '#333' : C.inkFaint },
              }}
            />
          </Tooltip>
        ))}
      </Box>

      {/* Step content */}
      <Box sx={{ px: 2.5, pt: 2, pb: 0.5 }}>
        <Typography sx={{
          fontFamily: FONT_HEAD, fontWeight: 700, fontSize: 14,
          color: C.ink, letterSpacing: '0.04em', textTransform: 'uppercase', mb: 0.75,
        }}>
          {label}
        </Typography>
        <Typography sx={{
          fontFamily: FONT_HEAD, fontWeight: 400, fontSize: 13,
          color: C.inkSub, lineHeight: 1.75,
        }}>
          {descText}
        </Typography>
      </Box>

      {/* Navigation */}
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ px: 2, pb: 2, pt: 1.5 }}>
        <Tooltip title={language === 'zh' ? '上一步' : 'Previous'} placement="top">
          <span>
            <IconButton
              size="small"
              onClick={() => setTimelineStep(Math.max(0, timelineStep - 1))}
              disabled={timelineStep === 0}
              sx={{
                color: C.inkMuted, ...sharp,
                border: `1px solid ${C.border}`,
                '&:hover': { borderColor: C.ink, color: C.ink },
                '&.Mui-disabled': { opacity: 0.25 },
              }}
            >
              <ArrowBackIosNewIcon sx={{ fontSize: 12 }} />
            </IconButton>
          </span>
        </Tooltip>

        {/* Step labels — hidden on narrow screens to avoid overflow */}
        <Stack direction="row" spacing={0.5} alignItems="center" sx={{ display: { xs: 'none', sm: 'flex' } }}>
          {STEPS.map((s, i) => (
            <Box
              key={i}
              onClick={() => setTimelineStep(i)}
              sx={{
                px: 1, py: 0.35,
                bgcolor: i === timelineStep ? C.chip : 'transparent',
                border: `1px solid ${i === timelineStep ? C.border : 'transparent'}`,
                cursor: 'pointer', ...sharp,
                transition: 'background-color 0.15s',
                '&:hover': { borderColor: C.border, bgcolor: C.chip },
              }}
            >
              <Typography sx={{
                fontFamily: FONT_HEAD, fontSize: 10, fontWeight: i === timelineStep ? 700 : 400,
                color: i === timelineStep ? C.ink : C.inkFaint,
                letterSpacing: '0.06em', textTransform: 'uppercase', whiteSpace: 'nowrap',
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
                color: C.inkMuted, ...sharp,
                border: `1px solid ${C.border}`,
                '&:hover': { borderColor: C.ink, color: C.ink },
                '&.Mui-disabled': { opacity: 0.25 },
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
