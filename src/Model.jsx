/* eslint-disable react/prop-types */
import { Suspense, useEffect, useRef, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import Scene from './Scene.jsx';
import {
  Alert,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Box,
  Button,
  Card,
  CardMedia,
  CardActions,
  Checkbox,
  Chip,
  CircularProgress,
  CssBaseline,
  Fab,
  FormControlLabel,
  IconButton,
  Snackbar,
  Stack,
  TextField,
  Tooltip,
  Typography,
  useMediaQuery,
} from '@mui/material';
import { createTheme, ThemeProvider } from '@mui/material/styles';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import PersonOutlineIcon from '@mui/icons-material/PersonOutline';
import ViewInArIcon from '@mui/icons-material/ViewInAr';
import CloseIcon from '@mui/icons-material/Close';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import GradientIcon from '@mui/icons-material/Gradient';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import LayersIcon from '@mui/icons-material/Layers';
import OpenInFullIcon from '@mui/icons-material/OpenInFull';
import PushPinOutlinedIcon from '@mui/icons-material/PushPinOutlined';
import ShareIcon from '@mui/icons-material/Share';
import Slider from 'react-slick';
import 'slick-carousel/slick/slick.css';
import 'slick-carousel/slick/slick-theme.css';
import { useStore } from './store/useStore.jsx';
import AgentChat from './components/AgentChat.jsx';
import ARView from './components/ARView.jsx';
import BridgeDesignerPanel from './components/BridgeDesignerPanel.jsx';
import ConstructionTimeline from './components/ConstructionTimeline.jsx';
import OldFilmLightbox from './components/OldFilmLightbox.jsx';
import { getUIText } from './content/uiText.js';
import '@fontsource/manrope/300.css';
import '@fontsource/manrope/400.css';
import '@fontsource/manrope/500.css';
import '@fontsource/manrope/600.css';
import '@fontsource/manrope/700.css';

// Obsidian Decay palette
const C = {
  surface:        '#131313',
  surfaceHigh:    '#2a2a2a',
  surfaceLowest:  '#0e0e0e',
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

const ONBOARDING_STORAGE_KEY = 'saiyuen-onboarding-dismissed';

const theme = createTheme({
  breakpoints: { values: { xs: 0, sm: 834, md: 1080, lg: 1920, xl: 2060 } },
  typography: { fontFamily: FONT_HEAD },
});

const SLIDE_IMAGES = [
  'https://github.com/secg-sr1/saiyuen-alpha/blob/main/public/brige-01-render-00.png?raw=true',
  'https://github.com/secg-sr1/saiyuen-alpha/blob/main/public/brige-01-render-01.png?raw=true',
  'https://github.com/secg-sr1/saiyuen-alpha/blob/main/public/bridge-02-00.png?raw=true',
];

function LoadingOverlay({ label }) {
  return (
    <Box sx={{
      position: 'fixed', inset: 0,
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      bgcolor: C.surface, gap: 3, zIndex: 99999,
    }}>
      {/* Red accent line at top */}
      <Box sx={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, bgcolor: C.primaryDeep }} />
      <CircularProgress sx={{ color: C.primaryDeep }} size={32} thickness={2} />
      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.5 }}>
        <Typography sx={{
          color: C.onSurfaceDim, fontFamily: FONT_LABEL, fontWeight: 500,
          fontSize: 'clamp(10px, 2vw, 12px)', letterSpacing: '0.2em', textTransform: 'uppercase',
        }}>
          {label}
        </Typography>
        <Box sx={{ width: 120, height: 1, bgcolor: C.outline }} />
      </Box>
    </Box>
  );
}

export default function Model() {
  const showBase = useStore(state => state.showBase);
  const setShowBase = useStore(state => state.setShowBase);
  const showStructure = useStore(state => state.showStructure);
  const setShowStructure = useStore(state => state.setShowStructure);
  const setSelectedPart = useStore(state => state.setSelectedPart);
  const selectedDesign = useStore(state => state.selectedDesign);
  const designBlendOpacity = useStore(state => state.designBlendOpacity);
  const agentChatOpen = useStore(state => state.agentChatOpen);
  const setAgentChatOpen = useStore(state => state.setAgentChatOpen);
  const designerOpen = useStore(state => state.designerOpen);
  const setDesignerOpen = useStore(state => state.setDesignerOpen);
  const showAccordion = useStore(state => state.showAccordion);
  const setShowAccordion = useStore(state => state.setShowAccordion);
  const language = useStore(state => state.language);
  const setLanguage = useStore(state => state.setLanguage);
  const setCameraFeedAvailable = useStore(state => state.setCameraFeedAvailable);
  const timelineStep = useStore(state => state.timelineStep);
  const setTimelineStep = useStore(state => state.setTimelineStep);
  const annotationMode = useStore(state => state.annotationMode);
  const setAnnotationMode = useStore(state => state.setAnnotationMode);
  const pendingAnnotation = useStore(state => state.pendingAnnotation);
  const setPendingAnnotation = useStore(state => state.setPendingAnnotation);
  const addAnnotation = useStore(state => state.addAnnotation);
  const heatmapActive = useStore(state => state.heatmapActive);
  const setHeatmapActive = useStore(state => state.setHeatmapActive);

  const activeSlide = useStore(state => state.activeCarouselSlide);
  const setActiveSlide = useStore(state => state.setActiveCarouselSlide);

  const [arMode, setArMode] = useState(false);
  const selfieOn    = useStore(state => state.selfieOn);
  const setSelfieOn = useStore(state => state.setSelfieOn);
  const selfieStreamRef = useRef(null);
  const selfieVideoRef  = useRef(null);
  const [feedback, setFeedback] = useState(null);
  const [cameraReady, setCameraReady] = useState(false);
  const [showHint, setShowHint] = useState(true);
  const [cameraUnavailable, setCameraUnavailable] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [annotationLabel, setAnnotationLabel] = useState('');
  const [lightboxItem, setLightboxItem] = useState(null); // { url, label }

  const sliderRef = useRef();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const text = getUIText(language);
  const isMobileDevice = typeof navigator !== 'undefined' && /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);

  useEffect(() => {
    let activeStream = null;

    const attachStream = async (stream) => {
      activeStream = stream;
      const video = document.getElementById('videoBackground');
      if (video) {
        video.srcObject = stream;
        await video.play();
      }
      setCameraFeedAvailable(true);
      setCameraUnavailable(false);
      setCameraReady(true);
    };

    const requestCamera = async () => {
      if (!navigator.mediaDevices?.getUserMedia) {
        setCameraFeedAvailable(false);
        setCameraUnavailable(true);
        setCameraReady(true);
        return;
      }

      const attempts = [
        { video: { facingMode: { ideal: 'environment' } } },
        { video: { facingMode: 'environment' } },
        { video: true },
      ];

      for (const constraints of attempts) {
        try {
          const stream = await navigator.mediaDevices.getUserMedia(constraints);
          await attachStream(stream);
          return;
        } catch {
          if (constraints === attempts[attempts.length - 1]) {
            setCameraFeedAvailable(false);
            setCameraUnavailable(true);
            setCameraReady(true);
          }
        }
      }
    };

    requestCamera();

    return () => {
      activeStream?.getTracks().forEach((track) => track.stop());
    };
  }, [setCameraFeedAvailable]);

  useEffect(() => {
    const timer = setTimeout(() => setShowHint(false), 3500);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const dismissed = window.localStorage.getItem(ONBOARDING_STORAGE_KEY) === 'true';
    setShowOnboarding(!dismissed);
  }, []);

  useEffect(() => {
    sliderRef.current?.slickGoTo(activeSlide);
  }, [activeSlide]);

  useEffect(() => {
    const video = document.getElementById('videoBackground');
    if (!video) return;
    if (arMode) video.pause();
    else video.play().catch(() => {});
  }, [arMode]);

  useEffect(() => {
    let cancelled = false;
    if (selfieOn) {
      navigator.mediaDevices
        .getUserMedia({ video: { facingMode: 'user' }, audio: false })
        .then(stream => {
          if (cancelled) { stream.getTracks().forEach(t => t.stop()); return; }
          selfieStreamRef.current = stream;
          if (selfieVideoRef.current) {
            selfieVideoRef.current.srcObject = stream;
            selfieVideoRef.current.play().catch(() => {});
          }
        })
        .catch(() => setSelfieOn(false));
    } else {
      if (selfieVideoRef.current) selfieVideoRef.current.srcObject = null;
      selfieStreamRef.current?.getTracks().forEach(t => t.stop());
      selfieStreamRef.current = null;
    }
    return () => { cancelled = true; };
  }, [selfieOn]);

  const closeOnboarding = () => {
    window.localStorage.setItem(ONBOARDING_STORAGE_KEY, 'true');
    setShowOnboarding(false);
  };

  const openMode = (mode) => {
    closeOnboarding();
    setTimelineStep(null);
    if (mode === 'info')   { setShowAccordion(true);  setAgentChatOpen(false); setDesignerOpen(false); }
    if (mode === 'guide')  { setAgentChatOpen(true);  setShowAccordion(false); setDesignerOpen(false); }
    if (mode === 'design') { setDesignerOpen(true);   setAgentChatOpen(false); setShowAccordion(false); }
  };

  const handleShare = () => {
    navigator.clipboard
      .writeText(window.location.href)
      .then(() => setFeedback({ severity: 'success', message: text.model.shareSuccess }))
      .catch(() => setFeedback({ severity: 'error', message: text.model.shareError }));
  };

  const confirmAnnotation = () => {
    if (!annotationLabel.trim() || !pendingAnnotation) return;
    addAnnotation({ label: annotationLabel.trim(), position: pendingAnnotation.position });
    setPendingAnnotation(null);
    setAnnotationLabel('');
  };

  const cancelAnnotation = () => {
    setPendingAnnotation(null);
    setAnnotationLabel('');
  };

  const handleChipClick = (idx) => {
    setActiveSlide(idx);
    sliderRef.current?.slickGoTo(idx);
  };

  const sliderSettings = {
    dots: false,
    infinite: false,
    speed: 300,
    slidesToShow: 1,
    slidesToScroll: 1,
    arrows: false,
    afterChange: (i) => setActiveSlide(i),
  };

  const onboardingActions = [
    { id: 'info',   title: text.model.onboardingExploreTitle, body: text.model.onboardingExploreBody },
    { id: 'guide',  title: text.model.onboardingGuideTitle,   body: text.model.onboardingGuideBody   },
    { id: 'design', title: text.model.onboardingDesignTitle,  body: text.model.onboardingDesignBody  },
  ];

  // Shared FAB sx factory
  const fabSx = (active, hasSignal = false) => ({
    ...sharp,
    bgcolor: active
      ? C.primaryDeep
      : hasSignal
        ? 'rgba(13,13,13,0.9)'
        : 'rgba(13,13,13,0.88)',
    color: active ? '#fff' : hasSignal ? C.primary : C.onSurfaceDim,
    backdropFilter: 'blur(12px)',
    border: `1px solid ${active ? C.primaryDeep : hasSignal ? C.primaryDeep : C.outline}`,
    boxShadow: active
      ? `0 0 24px ${C.primaryGlow}`
      : hasSignal
        ? `0 0 16px ${C.primaryGlow}`
        : '0 4px 20px rgba(0,0,0,0.6)',
    transition: 'background-color 0.05s steps(1), box-shadow 0.05s steps(1)',
    '&:hover': {
      bgcolor: active ? '#a00000' : 'rgba(192,1,0,0.12)',
      borderColor: C.primaryDeep,
    },
  });

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />

      <video
        id="videoBackground"
        style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'cover', zIndex: -1 }}
        autoPlay
        playsInline
      />

      {/* Selfie PiP — always in DOM, hidden when SELF is off so the ref stays valid for cleanup */}
      <Box sx={{
        display: selfieOn ? 'block' : 'none',
        position: 'fixed', bottom: 20, right: 16,
        width: 108, height: 144,
        zIndex: 9998,
        border: `1px solid ${C.primaryDeep}`,
        boxShadow: `0 0 14px rgba(192,1,0,0.3)`,
        bgcolor: '#0d0d0d',
        overflow: 'hidden',
        '&::before': {
          content: '""', position: 'absolute', top: 0, left: 0,
          width: 12, height: 12,
          borderTop: `2px solid ${C.primaryDeep}`,
          borderLeft: `2px solid ${C.primaryDeep}`,
        },
        '&::after': {
          content: '""', position: 'absolute', bottom: 0, right: 0,
          width: 12, height: 12,
          borderBottom: `2px solid ${C.primaryDeep}`,
          borderRight: `2px solid ${C.primaryDeep}`,
        },
      }}>
        <Box
          component="video"
          ref={selfieVideoRef}
          autoPlay
          playsInline
          muted
          sx={{
            width: '100%', height: '100%',
            objectFit: 'cover',
            transform: 'scaleX(-1)',
            display: 'block',
          }}
        />
      </Box>

      {/* Drag-to-rotate hint */}
      {showHint && cameraReady && !showOnboarding && (
        <Box sx={{
          position: 'fixed', bottom: '15%', left: '50%', transform: 'translateX(-50%)',
          zIndex: 998,
          bgcolor: 'rgba(13,13,13,0.82)', backdropFilter: 'blur(10px)',
          ...sharp,
          px: 3, py: 1.25, pointerEvents: 'none',
          border: `1px solid ${C.outline}`,
          animation: 'hintFade 3.5s ease-out forwards',
          '@keyframes hintFade': {
            '0%':   { opacity: 0 },
            '15%':  { opacity: 1 },
            '75%':  { opacity: 1 },
            '100%': { opacity: 0 },
          },
        }}>
          <Typography sx={{
            color: C.onSurfaceDim, fontFamily: FONT_LABEL, fontWeight: 400,
            fontSize: 'clamp(9px, 2vw, 11px)', whiteSpace: 'nowrap',
            letterSpacing: '0.12em', textTransform: 'uppercase',
          }}>
            {text.model.onboardingHint}
          </Typography>
        </Box>
      )}

      {/* Onboarding modal */}
      {showOnboarding && (
        <Box sx={{
          position: 'fixed', inset: 0, zIndex: 10001,
          bgcolor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', p: 2,
        }}>
          <Box sx={{
            width: 'min(92vw, 760px)',
            ...sharp,
            bgcolor: 'rgba(13,13,13,0.97)',
            border: `1px solid ${C.outline}`,
            borderTop: `2px solid ${C.primaryDeep}`,
            boxShadow: `0 0 60px rgba(192,1,0,0.08)`,
            p: { xs: 2.5, sm: 3.5 },
            position: 'relative',
          }}>
            {/* Top-left corner accent */}
            <Box sx={{ position: 'absolute', top: 0, left: 0, width: 2, height: 40, bgcolor: C.primaryDeep }} />

            <Stack spacing={1} sx={{ pl: 0.5 }}>
              <Typography sx={{
                color: C.onSurface, fontFamily: FONT_HEAD, fontWeight: 800,
                fontSize: 'clamp(18px, 3vw, 26px)', letterSpacing: '-0.04em', textTransform: 'uppercase',
              }}>
                {text.model.onboardingTitle}
              </Typography>
              <Typography sx={{
                color: C.onSurfaceDim, fontFamily: FONT_LABEL, fontWeight: 400,
                lineHeight: 1.7, fontSize: 'clamp(11px, 1.8vw, 13px)',
              }}>
                {text.model.onboardingBody}
              </Typography>
            </Stack>

            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.25} sx={{ mt: 3 }}>
              {onboardingActions.map((item) => (
                <Button
                  key={item.id}
                  onClick={() => openMode(item.id)}
                  sx={{
                    flex: 1, p: 2,
                    ...sharp,
                    border: `1px solid ${C.outline}`,
                    bgcolor: C.surfaceHigh,
                    color: C.onSurface,
                    alignItems: 'flex-start',
                    justifyContent: 'flex-start',
                    textAlign: 'left',
                    textTransform: 'none',
                    transition: 'border-color 0.05s steps(1), background-color 0.05s steps(1)',
                    '&:hover': {
                      bgcolor: 'rgba(192,1,0,0.08)',
                      borderColor: C.primaryDeep,
                    },
                  }}
                >
                  <Stack spacing={0.75} alignItems="flex-start">
                    <Typography sx={{
                      fontFamily: FONT_HEAD, fontWeight: 700, fontSize: 13,
                      textTransform: 'uppercase', letterSpacing: '0.06em', color: C.onSurface,
                    }}>
                      {item.title}
                    </Typography>
                    <Typography sx={{
                      fontFamily: FONT_LABEL, fontWeight: 400, fontSize: 11,
                      lineHeight: 1.6, color: C.onSurfaceDim,
                    }}>
                      {item.body}
                    </Typography>
                  </Stack>
                </Button>
              ))}
            </Stack>

            <Button
              onClick={closeOnboarding}
              sx={{
                mt: 2,
                ...sharp,
                color: C.onSurfaceFaint,
                fontFamily: FONT_LABEL, fontSize: 10,
                letterSpacing: '0.12em', textTransform: 'uppercase',
                '&:hover': { color: C.onSurface, bgcolor: 'transparent' },
              }}
            >
              {text.model.onboardingDismiss}
            </Button>
          </Box>
        </Box>
      )}

      {/* Top-right tool chips: Annotation · Heatmap · Timeline */}
      <Stack direction="row" spacing={0.75} sx={{ position: 'fixed', top: 16, right: 16, zIndex: 9997 }}>

        {/* Annotation pin mode */}
        {(() => {
          const on = annotationMode;
          return (
            <Tooltip title={on ? (language === 'zh' ? '取消標記' : 'Cancel pin') : (language === 'zh' ? '新增標記' : 'Add pin')} placement="bottom">
              <Chip
                icon={<PushPinOutlinedIcon sx={{ fontSize: '13px !important', color: `${on ? '#fff' : C.onSurfaceDim} !important` }} />}
                label={language === 'zh' ? '標記' : 'Pin'}
                size="small"
                onClick={() => setAnnotationMode(!on)}
                sx={{
                  fontFamily: "'Space Grotesk', monospace", fontSize: 10, fontWeight: 500, height: 22, borderRadius: 0,
                  bgcolor: on ? C.primaryDeep : 'rgba(13,13,13,0.82)',
                  color: on ? '#fff' : C.onSurfaceDim,
                  border: `1px solid ${on ? C.primaryDeep : C.outline}`,
                  backdropFilter: 'blur(10px)', letterSpacing: '0.1em', cursor: 'pointer',
                  boxShadow: on ? `0 0 12px ${C.primaryGlow}` : 'none',
                  transition: 'background-color 0.05s steps(1), border-color 0.05s steps(1)',
                  '&:hover': { borderColor: C.primaryDeep, color: on ? '#fff' : C.primary },
                }}
              />
            </Tooltip>
          );
        })()}

        {/* Stress heatmap */}
        {(() => {
          const on = heatmapActive;
          return (
            <Tooltip title={on ? (language === 'zh' ? '關閉熱圖' : 'Hide heatmap') : (language === 'zh' ? '應力熱圖' : 'Stress heatmap')} placement="bottom">
              <Chip
                icon={<GradientIcon sx={{ fontSize: '13px !important', color: `${on ? '#fff' : C.onSurfaceDim} !important` }} />}
                label={language === 'zh' ? '熱圖' : 'Heat'}
                size="small"
                onClick={() => setHeatmapActive(!on)}
                sx={{
                  fontFamily: "'Space Grotesk', monospace", fontSize: 10, fontWeight: 500, height: 22, borderRadius: 0,
                  bgcolor: on ? 'rgba(150,50,0,0.85)' : 'rgba(13,13,13,0.82)',
                  color: on ? '#fff' : C.onSurfaceDim,
                  border: `1px solid ${on ? 'rgba(200,80,0,0.8)' : C.outline}`,
                  backdropFilter: 'blur(10px)', letterSpacing: '0.1em', cursor: 'pointer',
                  boxShadow: on ? '0 0 12px rgba(200,80,0,0.5)' : 'none',
                  transition: 'background-color 0.05s steps(1), border-color 0.05s steps(1)',
                  '&:hover': { borderColor: 'rgba(200,80,0,0.7)', color: on ? '#fff' : C.primary },
                }}
              />
            </Tooltip>
          );
        })()}

        {/* Construction timeline */}
        {(() => {
          const on = timelineStep !== null;
          return (
            <Tooltip title={on ? (language === 'zh' ? '關閉時間軸' : 'Close timeline') : (language === 'zh' ? '施工時間軸' : 'Timeline')} placement="bottom">
              <Chip
                icon={<LayersIcon sx={{ fontSize: '13px !important', color: `${on ? C.primaryDeep : C.onSurfaceDim} !important` }} />}
                label={language === 'zh' ? '時間軸' : 'Timeline'}
                size="small"
                onClick={() => {
                  if (on) { setTimelineStep(null); }
                  else { setTimelineStep(0); setAgentChatOpen(false); setDesignerOpen(false); setShowAccordion(false); }
                }}
                sx={{
                  fontFamily: "'Space Grotesk', monospace", fontSize: 10, fontWeight: 500, height: 22, borderRadius: 0,
                  bgcolor: on ? 'rgba(192,1,0,0.15)' : 'rgba(13,13,13,0.82)',
                  color: on ? C.primaryDeep : C.onSurfaceDim,
                  border: `1px solid ${on ? C.primaryDeep : C.outline}`,
                  backdropFilter: 'blur(10px)', letterSpacing: '0.1em', cursor: 'pointer',
                  boxShadow: on ? `0 0 12px ${C.primaryGlow}` : 'none',
                  transition: 'background-color 0.05s steps(1), border-color 0.05s steps(1)',
                  '&:hover': { borderColor: C.primaryDeep, color: on ? C.primaryDeep : C.primary },
                }}
              />
            </Tooltip>
          );
        })()}
      </Stack>

      {/* Heatmap legend — bottom-right, only when active */}
      {heatmapActive && (
        <Box sx={{
          position: 'fixed', right: 16, bottom: 80, zIndex: 9997,
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.5,
          bgcolor: 'rgba(13,13,13,0.78)', backdropFilter: 'blur(12px)',
          border: '1px solid rgba(255,255,255,0.08)',
          px: 1, py: 1,
        }}>
          <Box sx={{
            fontFamily: "'Space Grotesk', monospace", fontSize: 9, fontWeight: 600,
            color: 'rgba(180,220,255,0.75)', letterSpacing: '0.08em', textTransform: 'uppercase',
          }}>
            {language === 'zh' ? '低' : 'Low'}
          </Box>
          <Box sx={{
            width: 10, height: 80,
            background: 'linear-gradient(to bottom, #00aaff, #00ffcc, #00ff44, #aaff00, #ffee00, #ff7700, #ff2200)',
            borderRadius: 0,
            border: '1px solid rgba(255,255,255,0.06)',
          }} />
          <Box sx={{
            fontFamily: "'Space Grotesk', monospace", fontSize: 9, fontWeight: 600,
            color: 'rgba(255,160,120,0.75)', letterSpacing: '0.08em', textTransform: 'uppercase',
          }}>
            {language === 'zh' ? '高' : 'High'}
          </Box>
          <Box sx={{
            fontFamily: "'Space Grotesk', monospace", fontSize: 8, fontWeight: 400,
            color: 'rgba(229,226,225,0.3)', letterSpacing: '0.06em', textTransform: 'uppercase', mt: 0.25,
          }}>
            {language === 'zh' ? '應力' : 'Stress'}
          </Box>
        </Box>
      )}

      {/* Top-left chips: Language · AR · SELF */}
      <Stack direction="row" spacing={0.75} sx={{ position: 'fixed', top: 16, left: 16, zIndex: 9997 }}>
        <Chip
          label={text.model.languageToggle}
          size="small"
          onClick={() => setLanguage(language === 'zh' ? 'en' : 'zh')}
          sx={{
            fontFamily: FONT_LABEL, fontSize: 10, fontWeight: 500, height: 22,
            ...sharp,
            bgcolor: 'rgba(13,13,13,0.82)', color: C.onSurfaceDim,
            border: `1px solid ${C.outline}`,
            backdropFilter: 'blur(10px)',
            letterSpacing: '0.1em',
            cursor: 'pointer',
            '&:hover': { borderColor: C.outlineStrong, color: C.onSurface },
          }}
        />
        <Chip
          icon={<ViewInArIcon sx={{ fontSize: '13px !important', color: `${arMode ? '#fff' : C.onSurfaceDim} !important` }} />}
          label="AR"
          size="small"
          onClick={() => setArMode(v => !v)}
          sx={{
            fontFamily: FONT_LABEL, fontSize: 10, fontWeight: 500, height: 22, borderRadius: 0,
            bgcolor: arMode ? C.primaryDeep : 'rgba(13,13,13,0.82)',
            color: arMode ? '#fff' : C.onSurfaceDim,
            border: `1px solid ${arMode ? C.primaryDeep : C.outline}`,
            backdropFilter: 'blur(10px)',
            letterSpacing: '0.1em',
            cursor: 'pointer',
            boxShadow: arMode ? `0 0 12px ${C.primaryGlow}` : 'none',
            transition: 'background-color 0.05s steps(1), border-color 0.05s steps(1)',
            '&:hover': { borderColor: C.primaryDeep, color: arMode ? '#fff' : C.primary },
          }}
        />
        <Chip
          icon={<PersonOutlineIcon sx={{ fontSize: '13px !important', color: `${selfieOn ? C.primaryDeep : C.onSurfaceDim} !important` }} />}
          label="SELF"
          size="small"
          onClick={() => setSelfieOn(v => !v)}
          sx={{
            fontFamily: FONT_LABEL, fontSize: 10, fontWeight: 500, height: 22, borderRadius: 0,
            bgcolor: selfieOn ? 'rgba(192,1,0,0.18)' : 'rgba(13,13,13,0.82)',
            color: selfieOn ? C.primaryDeep : C.onSurfaceDim,
            border: `1px solid ${selfieOn ? C.primaryDeep : C.outline}`,
            backdropFilter: 'blur(10px)',
            letterSpacing: '0.1em',
            cursor: 'pointer',
            boxShadow: selfieOn ? `0 0 12px ${C.primaryGlow}` : 'none',
            transition: 'background-color 0.05s steps(1), border-color 0.05s steps(1)',
            '&:hover': { borderColor: C.primaryDeep, color: selfieOn ? C.primaryDeep : C.primary },
          }}
        />
      </Stack>

      {/* Info FAB — bottom right */}
      <Box sx={{
        position: 'fixed',
        bottom: isMobile && (showAccordion || agentChatOpen || designerOpen) ? 'calc(70vh + 12px)' : 8,
        right: 16, zIndex: 10000,
        transition: 'bottom 0.05s steps(1)',
      }}>
        <Tooltip title={showAccordion ? text.model.infoFabClose : text.model.infoFabOpen} placement="left">
          <Fab
            size="medium"
            onClick={() => {
              const next = !showAccordion;
              setShowAccordion(next);
              if (next) { setAgentChatOpen(false); setDesignerOpen(false); }
            }}
            sx={fabSx(showAccordion)}
          >
            {showAccordion ? <CloseIcon /> : <InfoOutlinedIcon />}
          </Fab>
        </Tooltip>
      </Box>

      {/* Designer FAB — bottom center */}
      <Box sx={{
        position: 'fixed',
        bottom: isMobile && (designerOpen || agentChatOpen || showAccordion) ? 'calc(70vh + 12px)' : 8,
        left: '50%', transform: 'translateX(-50%)',
        zIndex: 10000,
        transition: 'bottom 0.05s steps(1)',
      }}>
        <Tooltip title={designerOpen ? text.model.designFabClose : text.model.designFabOpen} placement="top">
          <Box sx={{ position: 'relative' }}>
            <Fab
              size="medium"
              onClick={() => {
                const next = !designerOpen;
                setDesignerOpen(next);
                if (next) { setAgentChatOpen(false); setShowAccordion(false); }
              }}
              sx={fabSx(designerOpen, !!selectedDesign && !designerOpen)}
            >
              {designerOpen ? <CloseIcon /> : <AutoAwesomeIcon />}
            </Fab>
            {/* Active design indicator dot */}
            {selectedDesign && !designerOpen && (
              <Box sx={{
                position: 'absolute', top: 5, right: 5,
                width: 7, height: 7,
                bgcolor: C.primaryDeep,
                boxShadow: `0 0 6px ${C.primaryGlow}`,
              }} />
            )}
          </Box>
        </Tooltip>
      </Box>

      {/* Camera unavailable banner */}
      {cameraUnavailable && isMobileDevice && (
        <Box sx={{
          position: 'fixed', top: 64, left: '50%', transform: 'translateX(-50%)',
          zIndex: 9999, width: 'min(92vw, 520px)',
        }}>
          <Alert
            severity="info"
            sx={{
              fontFamily: FONT_LABEL, ...sharp,
              bgcolor: 'rgba(13,13,13,0.94)', color: C.onSurface,
              border: `1px solid ${C.outline}`,
              borderLeft: `2px solid ${C.primaryDeep}`,
            }}
          >
            <Typography sx={{ fontFamily: FONT_HEAD, fontWeight: 700, fontSize: 12, mb: 0.25,
              textTransform: 'uppercase', letterSpacing: '0.06em', color: C.onSurface }}>
              {text.model.cameraUnavailableTitle}
            </Typography>
            <Typography sx={{ fontFamily: FONT_LABEL, fontWeight: 400, fontSize: 11, color: C.onSurfaceDim }}>
              {text.model.cameraUnavailableBody}
            </Typography>
          </Alert>
        </Box>
      )}

      {/* Info accordion panel */}
      {showAccordion && (
        <Box sx={{
          position: 'fixed',
          bottom: { xs: 0, sm: '9%' },
          right: { xs: 0, sm: '2%' },
          width: { xs: '100%', sm: '40%', md: '30%', lg: '30%' },
          maxHeight: { xs: '70vh', sm: 'none' },
          ...sharp,
          bgcolor: 'rgba(13,13,13,0.95)',
          backdropFilter: 'blur(20px)',
          border: `1px solid ${C.outline}`,
          borderTop: `2px solid ${C.primaryDeep}`,
          boxShadow: `0 0 40px rgba(192,1,0,0.06)`,
          zIndex: 9999,
          overflowY: 'auto', overflowX: 'hidden',
          pb: { xs: 'env(safe-area-inset-bottom)', sm: 0 },
          animation: 'panelSlide 0.18s steps(6)',
          '@keyframes panelSlide': {
            from: { opacity: 0, transform: 'translateY(12px)' },
            to:   { opacity: 1, transform: 'translateY(0)' },
          },
          '&::-webkit-scrollbar': { width: '3px' },
          '&::-webkit-scrollbar-track': { bgcolor: 'transparent' },
          '&::-webkit-scrollbar-thumb': { bgcolor: 'rgba(96,62,57,0.6)' },
        }}>
          {/* Mobile drag handle */}
          <Box sx={{ display: { xs: 'flex', sm: 'none' }, justifyContent: 'center', pt: 1.5, pb: 0.5 }}>
            <Box sx={{ width: 28, height: 2, bgcolor: C.outline }} />
          </Box>

          {/* Info accordion */}
          <Accordion disableGutters sx={{
            bgcolor: 'transparent', color: C.onSurface,
            border: `1px solid ${C.outline}`,
            boxShadow: 'none',
            '&:before': { display: 'none' },
          }}>
            <AccordionSummary
              expandIcon={<ExpandMoreIcon sx={{ color: C.primary }} />}
              sx={{ '&:hover': { bgcolor: 'rgba(192,1,0,0.04)' } }}
            >
              <Typography sx={{
                fontFamily: FONT_HEAD, fontWeight: 700,
                fontSize: 'clamp(11px, 2vw, 13px)',
                textTransform: 'uppercase', letterSpacing: '0.08em', color: C.onSurface,
              }}>
                {text.model.infoTitle}
              </Typography>
            </AccordionSummary>
            <AccordionDetails sx={{ p: 1.5, pt: 0 }}>
              <Card sx={{ ...sharp, bgcolor: 'transparent', border: `1px solid ${C.outline}`, overflow: 'hidden' }}>
                <Slider ref={sliderRef} {...sliderSettings}>
                  {SLIDE_IMAGES.map((src, i) => (
                    <Box
                      key={i}
                      onClick={() => setLightboxItem({ url: src, label: text.model.slideLabels?.[i] ?? '' })}
                      sx={{ cursor: 'zoom-in', position: 'relative', '&:hover .slide-hint': { opacity: 1 } }}
                    >
                      <CardMedia component="img" src={src}
                        sx={{ height: 200, objectFit: 'cover', filter: 'grayscale(10%) contrast(1.05)',
                          transition: 'filter 0.05s steps(1)',
                          '&:hover': { filter: 'grayscale(25%) contrast(1.1) brightness(0.88)' } }} />
                      <Box className="slide-hint" sx={{
                        position: 'absolute', inset: 0, pointerEvents: 'none',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        bgcolor: 'rgba(0,0,0,0.25)', opacity: 0, transition: 'opacity 0.05s steps(1)',
                      }}>
                        <OpenInFullIcon sx={{ fontSize: 20, color: C.primary }} />
                      </Box>
                    </Box>
                  ))}
                </Slider>
                <CardActions disableSpacing sx={{ pt: 1, bgcolor: C.surfaceLowest }}>
                  <Stack direction="row" spacing={0.75} sx={{
                    overflowX: 'auto', flexWrap: 'nowrap', pb: 0.5,
                    '&::-webkit-scrollbar': { display: 'none' },
                  }}>
                    {text.model.slideLabels.map((label, i) => (
                      <Chip
                        key={label}
                        variant="outlined"
                        label={label}
                        onClick={() => handleChipClick(i)}
                        sx={{
                          fontFamily: FONT_LABEL, fontSize: 10, fontWeight: activeSlide === i ? 700 : 400,
                          ...sharp,
                          bgcolor: activeSlide === i ? C.primaryDeep : C.surfaceHigh,
                          color: activeSlide === i ? '#fff' : C.onSurfaceDim,
                          borderColor: activeSlide === i ? C.primaryDeep : C.outline,
                          flexShrink: 0, letterSpacing: '0.06em',
                          transition: 'border-color 0.05s steps(1), background-color 0.05s steps(1)',
                          '&:hover': { bgcolor: activeSlide === i ? '#a00000' : 'rgba(192,1,0,0.08)', borderColor: C.primaryDeep },
                        }}
                      />
                    ))}
                  </Stack>
                </CardActions>
              </Card>
            </AccordionDetails>
          </Accordion>

          {/* Elements accordion */}
          <Accordion disableGutters sx={{
            bgcolor: 'transparent', color: C.onSurface,
            border: `1px solid ${C.outline}`,
            boxShadow: 'none',
            '&:before': { display: 'none' },
          }}>
            <AccordionSummary
              expandIcon={<ExpandMoreIcon sx={{ color: C.primary }} />}
              sx={{ '&:hover': { bgcolor: 'rgba(192,1,0,0.04)' } }}
            >
              <Typography sx={{
                fontFamily: FONT_HEAD, fontWeight: 700,
                fontSize: 'clamp(11px, 2vw, 13px)',
                textTransform: 'uppercase', letterSpacing: '0.08em', color: C.onSurface,
              }}>
                {text.model.elementsTitle}
              </Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Stack spacing={0.5}>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={showBase}
                      onChange={(e) => setShowBase(e.target.checked)}
                      sx={{
                        color: C.outline,
                        '&.Mui-checked': { color: C.primaryDeep },
                        '& .MuiSvgIcon-root': { borderRadius: 0 },
                      }}
                    />
                  }
                  label={(
                    <Box>
                      <Typography sx={{ fontFamily: FONT_HEAD, fontWeight: 600, fontSize: 'clamp(12px, 2vw, 14px)', color: C.onSurface, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                        {text.model.baseTitle}
                      </Typography>
                      <Typography sx={{ fontFamily: FONT_LABEL, fontWeight: 400, fontSize: 'clamp(9px, 1.5vw, 11px)', color: C.onSurfaceDim }}>
                        {text.model.baseBody}
                      </Typography>
                    </Box>
                  )}
                />
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={showStructure}
                      onChange={(e) => setShowStructure(e.target.checked)}
                      sx={{
                        color: C.outline,
                        '&.Mui-checked': { color: C.primaryDeep },
                        '& .MuiSvgIcon-root': { borderRadius: 0 },
                      }}
                    />
                  }
                  label={(
                    <Box>
                      <Typography sx={{ fontFamily: FONT_HEAD, fontWeight: 600, fontSize: 'clamp(12px, 2vw, 14px)', color: C.onSurface, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                        {text.model.structureTitle}
                      </Typography>
                      <Typography sx={{ fontFamily: FONT_LABEL, fontWeight: 400, fontSize: 'clamp(9px, 1.5vw, 11px)', color: C.onSurfaceDim }}>
                        {text.model.structureBody}
                      </Typography>
                    </Box>
                  )}
                />
              </Stack>
            </AccordionDetails>
          </Accordion>

          {/* Video accordion */}
          <Accordion disableGutters sx={{
            bgcolor: 'transparent', color: C.onSurface,
            border: `1px solid ${C.outline}`,
            boxShadow: 'none',
            '&:before': { display: 'none' },
          }}>
            <AccordionSummary
              expandIcon={<ExpandMoreIcon sx={{ color: C.primary }} />}
              sx={{ '&:hover': { bgcolor: 'rgba(192,1,0,0.04)' } }}
            >
              <Typography sx={{
                fontFamily: FONT_HEAD, fontWeight: 700,
                fontSize: 'clamp(11px, 2vw, 13px)',
                textTransform: 'uppercase', letterSpacing: '0.08em', color: C.onSurface,
              }}>
                {text.model.videoTitle}
              </Typography>
            </AccordionSummary>
            <AccordionDetails sx={{ p: 1.5, pt: 0 }}>
              <Card sx={{ ...sharp, bgcolor: 'transparent', border: `1px solid ${C.outline}`, overflow: 'hidden' }}>
                <CardMedia
                  component="video"
                  src="https://github.com/secg-sr1/saiyuen-alpha/raw/refs/heads/main/public/bridge-01-video.mp4"
                  loop muted controls
                  sx={{ filter: 'grayscale(10%) contrast(1.05)' }}
                />
                <CardActions sx={{ bgcolor: C.surfaceLowest, borderTop: `1px solid ${C.outline}` }}>
                  <Tooltip title={text.model.shareTooltip} placement="right">
                    <IconButton aria-label="share" onClick={handleShare}
                      sx={{ ...sharp, color: C.onSurfaceDim, '&:hover': { color: C.primary, bgcolor: 'rgba(192,1,0,0.1)' } }}>
                      <ShareIcon />
                    </IconButton>
                  </Tooltip>
                </CardActions>
              </Card>
            </AccordionDetails>
          </Accordion>
        </Box>
      )}

      <Snackbar
        open={!!feedback}
        autoHideDuration={2500}
        onClose={() => setFeedback(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        sx={{ zIndex: 99999 }}
      >
        <Alert severity={feedback?.severity ?? 'success'} onClose={() => setFeedback(null)}
          sx={{ fontFamily: FONT_LABEL, fontWeight: 400, borderRadius: 0 }}>
          {feedback?.message}
        </Alert>
      </Snackbar>

      {selectedDesign && (
        <Box
          component="img"
          src={selectedDesign.url}
          alt={selectedDesign.label}
          sx={{
            position: 'fixed', inset: 0, width: '100%', height: '100%',
            objectFit: 'cover', pointerEvents: 'none',
            opacity: designBlendOpacity,
            zIndex: 1,
            transition: 'opacity 0.3s ease',
          }}
        />
      )}

      {/* Annotation mode cursor hint */}
      {annotationMode && !pendingAnnotation && (
        <Box sx={{
          position: 'fixed', bottom: 80, left: '50%', transform: 'translateX(-50%)',
          zIndex: 9998, pointerEvents: 'none',
          bgcolor: 'rgba(13,13,13,0.88)', backdropFilter: 'blur(10px)',
          border: `1px solid ${C.outline}`, borderTop: `2px solid ${C.primaryDeep}`,
          px: 2, py: 0.75,
          animation: 'hintFade 4s ease forwards',
          '@keyframes hintFade': { '0%': { opacity: 0 }, '10%': { opacity: 1 }, '80%': { opacity: 1 }, '100%': { opacity: 0 } },
        }}>
          <Typography sx={{ fontFamily: "'Space Grotesk', monospace", fontSize: 10, color: C.onSurfaceDim, letterSpacing: '0.12em', textTransform: 'uppercase' }}>
            {language === 'zh' ? '點擊橋樑模型以放置標記' : 'Tap the bridge model to place a pin'}
          </Typography>
        </Box>
      )}

      {/* Annotation label input */}
      {pendingAnnotation && (() => {
        const PANEL_W = 220;
        const left = Math.min(pendingAnnotation.screenX + 16, (typeof window !== 'undefined' ? window.innerWidth : 400) - PANEL_W - 8);
        const top  = Math.max(8, pendingAnnotation.screenY - 40);
        return (
          <>
            {/* Backdrop — click outside cancels */}
            <Box onClick={cancelAnnotation} sx={{ position: 'fixed', inset: 0, zIndex: 10001 }} />
            <Box
              onClick={e => e.stopPropagation()}
              sx={{
                position: 'fixed', left, top, width: PANEL_W, zIndex: 10002,
                bgcolor: 'rgba(13,13,13,0.97)', backdropFilter: 'blur(16px)',
                border: `1px solid ${C.outline}`, borderTop: `2px solid ${C.primaryDeep}`,
                p: 1.5, borderRadius: 0,
                animation: 'pinIn 0.1s steps(3)',
                '@keyframes pinIn': { from: { opacity: 0, transform: 'translateY(-4px)' }, to: { opacity: 1, transform: 'translateY(0)' } },
              }}
            >
              <Typography sx={{ fontFamily: "'Space Grotesk', monospace", fontSize: 9, color: C.onSurfaceFaint, letterSpacing: '0.15em', textTransform: 'uppercase', mb: 0.75 }}>
                {language === 'zh' ? '輸入標籤' : 'Label this point'}
              </Typography>
              <TextField
                autoFocus
                size="small"
                fullWidth
                placeholder={language === 'zh' ? '標籤名稱...' : 'Label...'}
                value={annotationLabel}
                onChange={e => setAnnotationLabel(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') confirmAnnotation();
                  if (e.key === 'Escape') cancelAnnotation();
                }}
                sx={{
                  mb: 1,
                  '& .MuiOutlinedInput-root': {
                    fontFamily: "'Space Grotesk', monospace", fontSize: 11, color: C.onSurface,
                    bgcolor: C.surfaceLowest, borderRadius: 0,
                    '& fieldset': { borderColor: C.outline, borderRadius: 0 },
                    '&.Mui-focused fieldset': { borderColor: C.primaryDeep, borderWidth: '1px' },
                    '& input::placeholder': { color: C.onSurfaceFaint, opacity: 1 },
                  },
                }}
              />
              <Stack direction="row" spacing={0.75}>
                <Chip
                  label={language === 'zh' ? '放置' : 'Place'}
                  size="small"
                  onClick={confirmAnnotation}
                  disabled={!annotationLabel.trim()}
                  sx={{
                    fontFamily: "'Space Grotesk', monospace", fontSize: 10, fontWeight: 700, borderRadius: 0, cursor: 'pointer',
                    bgcolor: annotationLabel.trim() ? C.primaryDeep : C.surfaceHigh,
                    color: annotationLabel.trim() ? '#fff' : C.onSurfaceFaint,
                    border: `1px solid ${annotationLabel.trim() ? C.primaryDeep : C.outline}`,
                    '&:hover': { bgcolor: annotationLabel.trim() ? '#a00000' : undefined },
                    '&.Mui-disabled': { opacity: 0.35 },
                  }}
                />
                <Chip
                  label={language === 'zh' ? '取消' : 'Cancel'}
                  size="small"
                  onClick={cancelAnnotation}
                  sx={{
                    fontFamily: "'Space Grotesk', monospace", fontSize: 10, borderRadius: 0, cursor: 'pointer',
                    bgcolor: 'transparent', color: C.onSurfaceFaint,
                    border: `1px solid ${C.outline}`,
                    '&:hover': { color: C.onSurface, borderColor: C.outlineStrong },
                  }}
                />
              </Stack>
            </Box>
          </>
        );
      })()}

      <AgentChat />
      <BridgeDesignerPanel />
      <ConstructionTimeline />

      {lightboxItem && (
        <OldFilmLightbox
          url={lightboxItem.url}
          label={lightboxItem.label}
          onClose={() => setLightboxItem(null)}
        />
      )}

      <Suspense fallback={<LoadingOverlay label={text.model.cameraLoading} />}>
        <Canvas
          gl={{ alpha: true, antialias: true, preserveDrawingBuffer: true }}
          style={{ position: 'relative' }}
          onPointerMissed={() => setSelectedPart(null)}
        >
          <Scene />
        </Canvas>
      </Suspense>

      {arMode && <ARView onClose={() => setArMode(false)} />}
    </ThemeProvider>
  );
}
