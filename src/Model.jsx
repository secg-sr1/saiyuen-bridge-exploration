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
} from '@mui/material';
import { createTheme, ThemeProvider } from '@mui/material/styles';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import CloseIcon from '@mui/icons-material/Close';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import OpenInFullIcon from '@mui/icons-material/OpenInFull';
import ShareIcon from '@mui/icons-material/Share';
import Slider from 'react-slick';
import 'slick-carousel/slick/slick.css';
import 'slick-carousel/slick/slick-theme.css';
import { useStore } from './store/useStore.jsx';
import AgentChat from './components/AgentChat.jsx';
import BridgeDesignerPanel from './components/BridgeDesignerPanel.jsx';
import OldFilmLightbox from './components/OldFilmLightbox.jsx';
import { getUIText } from './content/uiText.js';
import { track } from './utils/analytics';
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
  const showHandrail = useStore(state => state.showHandrail);
  const setShowHandrail = useStore(state => state.setShowHandrail);
  const selectedFloor = useStore(state => state.selectedFloor);
  const setSelectedFloor = useStore(state => state.setSelectedFloor);
  const selectedArch = useStore(state => state.selectedArch);
  const setSelectedArch = useStore(state => state.setSelectedArch);
  const selectedHandrail = useStore(state => state.selectedHandrail);
  const setSelectedHandrail = useStore(state => state.setSelectedHandrail);
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
  const triggerAssemble = useStore(state => state.triggerAssemble);

  const activeSlide = useStore(state => state.activeCarouselSlide);
  const setActiveSlide = useStore(state => state.setActiveCarouselSlide);

  const [feedback, setFeedback] = useState(null);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [lightboxItem, setLightboxItem] = useState(null); // { url, label }
  const [cameraNotice, setCameraNotice] = useState(null);

  const sliderRef = useRef();
  const videoBgRef = useRef(null);
  const cameraStreamRef = useRef(null);
  const setCameraFeedAvailable = useStore(state => state.setCameraFeedAvailable);
  const text = getUIText(language);

  useEffect(() => {
    const dismissed = window.localStorage.getItem(ONBOARDING_STORAGE_KEY) === 'true';
    setShowOnboarding(!dismissed);
  }, []);

  // Live device camera behind the transparent WebGL canvas (also drives `captureComposite` / designer AR).
  useEffect(() => {
    let cancelled = false;
    const stop = () => {
      cameraStreamRef.current?.getTracks().forEach((t) => t.stop());
      cameraStreamRef.current = null;
      const el = videoBgRef.current;
      if (el) el.srcObject = null;
      setCameraFeedAvailable(false);
    };

    if (!navigator.mediaDevices?.getUserMedia) {
      const t = getUIText(useStore.getState().language);
      setCameraNotice(`${t.model.cameraUnavailableTitle} ${t.model.cameraUnavailableBody}`);
      return () => { cancelled = true; stop(); };
    }

    const tryStream = async (constraints) => {
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      if (cancelled) {
        stream.getTracks().forEach((t) => t.stop());
        return false;
      }
      cameraStreamRef.current = stream;
      const el = videoBgRef.current;
      if (el) {
        el.srcObject = stream;
        await el.play().catch(() => {});
      }
      setCameraFeedAvailable(true);
      setCameraNotice(null);
      return true;
    };

    (async () => {
      try {
        await tryStream({ video: { facingMode: { ideal: 'environment' } }, audio: false });
      } catch {
        try {
          await tryStream({ video: true, audio: false });
        } catch {
          if (!cancelled) {
            setCameraFeedAvailable(false);
            const t = getUIText(useStore.getState().language);
            setCameraNotice(`${t.model.cameraUnavailableTitle} ${t.model.cameraUnavailableBody}`);
          }
        }
      }
    })();

    return () => {
      cancelled = true;
      stop();
    };
  }, [setCameraFeedAvailable]);

  useEffect(() => {
    sliderRef.current?.slickGoTo(activeSlide);
  }, [activeSlide]);

  const closeOnboarding = () => {
    window.localStorage.setItem(ONBOARDING_STORAGE_KEY, 'true');
    setShowOnboarding(false);
  };

  const openMode = (mode) => {
    closeOnboarding();
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

      {/* Full-viewport camera + WebGL: fixed inset matches #root height (avoids 100vh vs 100% mobile seam / “duplicated” strip). */}
      <Box
        sx={{
          position: 'fixed',
          inset: 0,
          zIndex: 0,
          overflow: 'hidden',
          contain: 'strict',
        }}
      >
        <Box
          component="video"
          id="videoBackground"
          ref={videoBgRef}
          muted
          playsInline
          autoPlay
          sx={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            objectPosition: 'center center',
            zIndex: 0,
            pointerEvents: 'none',
            backgroundColor: '#0a0a0a',
          }}
        />
        <Box
          sx={{
            position: 'absolute',
            inset: 0,
            zIndex: 1,
            pointerEvents: 'auto',
          }}
        >
          <Suspense fallback={<LoadingOverlay label={text.model.cameraLoading} />}>
            <Canvas
              gl={{ alpha: true, antialias: true, preserveDrawingBuffer: true }}
              style={{
                width: '100%',
                height: '100%',
                display: 'block',
                touchAction: 'none',
              }}
              onCreated={({ gl, scene }) => {
                gl.setClearColor(0x000000, 0);
                scene.background = null;
              }}
              onPointerMissed={() => setSelectedPart(null)}
            >
              <Scene />
            </Canvas>
          </Suspense>
        </Box>
      </Box>

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

      {/* Info FAB — bottom right */}
      {!agentChatOpen && !designerOpen && !showAccordion && (
      <Box sx={{ position: 'fixed', bottom: 8, right: 16, zIndex: 10000 }}>
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
      )}

      {/* Designer FAB — bottom center */}
      {!agentChatOpen && !designerOpen && !showAccordion && (
      <Box sx={{ position: 'fixed', bottom: 8, left: '50%', transform: 'translateX(-50%)', zIndex: 10000 }}>
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
      )}

      {/* Editorial info panel */}
      {showAccordion && (
        <>
          {/* Dim backdrop on desktop */}
          <Box
            onClick={() => setShowAccordion(false)}
            sx={{
              display: { xs: 'none', sm: 'block' },
              position: 'fixed', inset: 0, zIndex: 9998,
              bgcolor: 'rgba(0,0,0,0.35)',
              animation: 'fadeIn 0.2s ease',
              '@keyframes fadeIn': { from: { opacity: 0 }, to: { opacity: 1 } },
            }}
          />

          <Box sx={{
            position: 'fixed',
            top: 0,
            right: 0,
            bottom: 0,
            width: { xs: '100%', sm: '400px', md: '420px' },
            bgcolor: 'rgba(246,244,241,0.88)',
            backdropFilter: 'blur(14px)',
            WebkitBackdropFilter: 'blur(14px)',
            color: '#111111',
            zIndex: 9999,
            overflowY: 'auto',
            overflowX: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            fontFamily: FONT_HEAD,
            borderLeft: { xs: 'none', sm: '1px solid #E2DFDB' },
            animation: 'slideInRight 0.24s ease-out',
            '@keyframes slideInRight': {
              from: { opacity: 0, transform: 'translateX(24px)' },
              to:   { opacity: 1, transform: 'translateX(0)' },
            },
            '&::-webkit-scrollbar': { width: '3px' },
            '&::-webkit-scrollbar-track': { bgcolor: 'transparent' },
            '&::-webkit-scrollbar-thumb': { bgcolor: '#D0CEC9' },
          }}>

            {/* ── Nav header ── */}
            <Box sx={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              px: 3, py: 2,
              borderBottom: '1px solid #E2DFDB',
              flexShrink: 0,
            }}>
              <Typography sx={{
                fontFamily: FONT_HEAD, fontWeight: 800, fontSize: 12,
                letterSpacing: '0.14em', textTransform: 'uppercase', color: '#111',
              }}>
                ARCH_BRIDGE
              </Typography>
              <Box sx={{ display: 'flex', gap: 3, alignItems: 'center' }}>
                <Typography sx={{
                  fontFamily: FONT_HEAD, fontWeight: 400, fontSize: 11,
                  letterSpacing: '0.1em', textTransform: 'uppercase', color: '#999',
                  cursor: 'pointer', transition: 'color 0.15s',
                  '&:hover': { color: '#111' },
                }}>
                  WORKS
                </Typography>
                <Typography
                  onClick={() => setShowAccordion(false)}
                  sx={{
                    fontFamily: FONT_HEAD, fontWeight: 400, fontSize: 11,
                    letterSpacing: '0.1em', textTransform: 'uppercase', color: '#999',
                    cursor: 'pointer', transition: 'color 0.15s',
                    '&:hover': { color: '#111' },
                  }}
                >
                  CLOSE
                </Typography>
              </Box>
            </Box>

            {/* ── Breadcrumb ── */}
            <Box sx={{ px: 3, pt: 3, pb: 0.5 }}>
              <Typography sx={{
                fontFamily: FONT_HEAD, fontWeight: 400, fontSize: 10,
                letterSpacing: '0.12em', textTransform: 'uppercase', color: '#BBBBBB',
              }}>
                INDEX / 005
              </Typography>
            </Box>

            {/* ── Title ── */}
            <Box sx={{ px: 3, pt: 1.25, pb: 2.5 }}>
              <Typography sx={{
                fontFamily: FONT_HEAD, fontWeight: 800,
                fontSize: 'clamp(38px, 10vw, 52px)',
                lineHeight: 0.92, textTransform: 'uppercase',
                letterSpacing: '-0.025em', color: '#111',
              }}>
                SAIYUEN<br />BRIDGE
              </Typography>
            </Box>

            <Box sx={{ mx: 3, borderTop: '1px solid #E2DFDB' }} />

            {/* ── Metadata ── */}
            <Box sx={{ px: 3, pt: 1.75, pb: 0.5 }}>
              <Typography sx={{
                fontFamily: FONT_HEAD, fontWeight: 400, fontSize: 11,
                letterSpacing: '0.07em', textTransform: 'uppercase', color: '#999',
              }}>
                STRUCTURAL ANALYSIS / ID: 482
              </Typography>
            </Box>
            <Box sx={{ px: 3, pb: 2, display: 'flex', gap: 2, alignItems: 'center' }}>
              {['COMPLETED', 'STEEL-CONCRETE HYBRID'].map((tag, i) => (
                <Typography key={tag} sx={{
                  fontFamily: FONT_HEAD, fontWeight: 400, fontSize: 11,
                  letterSpacing: '0.07em', textTransform: 'uppercase',
                  color: '#BBBBBB',
                  ...(i === 0 && { '&::after': { content: '"  /"', ml: 1, color: '#DDDDDD' } }),
                }}>
                  {tag}
                </Typography>
              ))}
            </Box>

            <Box sx={{ mx: 3, borderTop: '1px solid #E2DFDB' }} />

            {/* ── Render carousel ── */}
            <Box sx={{ mt: 3, mx: 3, mb: 3 }}>
              <Box sx={{ position: 'relative', overflow: 'hidden', border: '1px solid #E2DFDB' }}>
                <Slider ref={sliderRef} {...sliderSettings}>
                  {SLIDE_IMAGES.map((src, i) => (
                    <Box
                      key={i}
                      onClick={() => setLightboxItem({ url: src, label: text.model.slideLabels?.[i] ?? '' })}
                      sx={{ cursor: 'zoom-in', position: 'relative', '&:hover .zoom-hint': { opacity: 1 } }}
                    >
                      <Box
                        component="img"
                        src={src}
                        sx={{
                          width: '100%', height: 224,
                          objectFit: 'cover', display: 'block',
                          filter: 'grayscale(6%) contrast(1.04)',
                          transition: 'filter 0.2s ease',
                          '&:hover': { filter: 'grayscale(18%) contrast(1.08) brightness(0.9)' },
                        }}
                      />
                      <Box className="zoom-hint" sx={{
                        position: 'absolute', inset: 0, pointerEvents: 'none',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        bgcolor: 'rgba(0,0,0,0.18)', opacity: 0, transition: 'opacity 0.2s ease',
                      }}>
                        <OpenInFullIcon sx={{ fontSize: 18, color: 'rgba(255,255,255,0.8)' }} />
                      </Box>
                    </Box>
                  ))}
                </Slider>
                <Box sx={{
                  position: 'absolute', bottom: 10, right: 12, pointerEvents: 'none',
                  bgcolor: 'rgba(0,0,0,0.45)', px: 1, py: 0.25,
                }}>
                  <Typography sx={{
                    fontFamily: FONT_HEAD, fontWeight: 500, fontSize: 9,
                    letterSpacing: '0.14em', textTransform: 'uppercase',
                    color: 'rgba(255,255,255,0.72)',
                  }}>
                    VISUAL REVISION 2.5
                  </Typography>
                </Box>
              </Box>

              {/* Slide labels */}
              <Box sx={{ display: 'flex', gap: 2.5, mt: 1.75, overflowX: 'auto', '&::-webkit-scrollbar': { display: 'none' } }}>
                {text.model.slideLabels.map((label, i) => (
                  <Typography
                    key={label}
                    onClick={() => handleChipClick(i)}
                    sx={{
                      fontFamily: FONT_HEAD, fontWeight: activeSlide === i ? 700 : 400,
                      fontSize: 10, letterSpacing: '0.08em', textTransform: 'uppercase',
                      color: activeSlide === i ? '#111' : '#BBBBBB',
                      borderBottom: activeSlide === i ? '1px solid #111' : '1px solid transparent',
                      pb: 0.25, cursor: 'pointer', flexShrink: 0,
                      transition: 'color 0.15s, border-color 0.15s',
                      '&:hover': { color: '#111' },
                    }}
                  >
                    {label}
                  </Typography>
                ))}
              </Box>
            </Box>

            {/* ── Bridge Information ── */}
            <Box sx={{ px: 3, pb: 3 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2.5 }}>
                <Typography sx={{
                  fontFamily: FONT_HEAD, fontWeight: 700, fontSize: 15,
                  textTransform: 'uppercase', letterSpacing: '0.05em', color: '#111', lineHeight: 1.25,
                }}>
                  BRIDGE<br />INFORMATION
                </Typography>
                <Typography sx={{
                  fontFamily: FONT_HEAD, fontWeight: 400, fontSize: 10,
                  textTransform: 'uppercase', letterSpacing: '0.1em',
                  color: '#BBBBBB', lineHeight: 1.5, textAlign: 'right',
                  cursor: 'pointer', transition: 'color 0.15s',
                  '&:hover': { color: '#111' },
                }}>
                  VIEW<br />DETAILS
                </Typography>
              </Box>

              <Typography sx={{
                fontFamily: FONT_HEAD, fontWeight: 400, fontSize: 14,
                lineHeight: 1.8, color: '#444444', mb: 3,
              }}>
                The Saiyuen Bridge stands as a testament to structural minimalism.
                Designed with a continuous girder system, it spans 450 meters
                across the valley floor, utilizing high-performance concrete and
                post-tensioned steel cables.
              </Typography>

              {/* Specs */}
              {[
                { label: 'LENGTH',      value: '450M' },
                { label: 'MAX HEIGHT',  value: '32M' },
                { label: 'COMPLETED',   value: 'SEPT 2023' },
              ].map(({ label, value }) => (
                <Box key={label} sx={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  py: 1.25, borderBottom: '1px solid #EEECE8',
                }}>
                  <Typography sx={{
                    fontFamily: FONT_HEAD, fontWeight: 400, fontSize: 11,
                    letterSpacing: '0.07em', textTransform: 'uppercase', color: '#AAAAAA',
                  }}>
                    {label}
                  </Typography>
                  <Typography sx={{
                    fontFamily: FONT_HEAD, fontWeight: 700, fontSize: 11,
                    letterSpacing: '0.07em', textTransform: 'uppercase', color: '#111',
                  }}>
                    {value}
                  </Typography>
                </Box>
              ))}
            </Box>

            <Box sx={{ mx: 3, borderTop: '1px solid #E2DFDB', mb: 3 }} />

            {/* ── Elements ── */}
            <Box sx={{ px: 3, mb: 3 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2.5 }}>
                <Typography sx={{
                  fontFamily: FONT_HEAD, fontWeight: 700, fontSize: 15,
                  textTransform: 'uppercase', letterSpacing: '0.05em', color: '#111',
                }}>
                  ELEMENTS
                </Typography>
                <Typography sx={{
                  fontFamily: FONT_HEAD, fontWeight: 400, fontSize: 10,
                  textTransform: 'uppercase', letterSpacing: '0.1em', color: '#BBBBBB',
                }}>
                  03 COMPONENTS
                </Typography>
              </Box>

              {[
                { label: text.model.baseTitle,      active: showBase,      onToggle: () => setShowBase(!showBase) },
                { label: text.model.structureTitle,  active: showStructure, onToggle: () => setShowStructure(!showStructure) },
                { label: 'Handrail',                 active: showHandrail,  onToggle: () => setShowHandrail(!showHandrail) },
              ].map(({ label, active, onToggle }) => (
                <Box
                  key={label}
                  onClick={onToggle}
                  sx={{
                    display: 'flex', alignItems: 'center', gap: 1.5,
                    py: 1.25, borderBottom: '1px solid #EEECE8',
                    cursor: 'pointer',
                    '&:hover .el-name': { color: '#111' },
                  }}
                >
                  <Typography sx={{
                    fontFamily: FONT_HEAD, fontWeight: 400, fontSize: 13,
                    color: '#CCCCCC', lineHeight: 1, userSelect: 'none', flexShrink: 0,
                  }}>
                    ›
                  </Typography>
                  <Typography
                    className="el-name"
                    sx={{
                      fontFamily: FONT_HEAD,
                      fontWeight: active ? 600 : 400,
                      fontSize: 12, flex: 1,
                      letterSpacing: '0.04em', textTransform: 'uppercase',
                      color: active ? '#111' : '#999999',
                      transition: 'color 0.15s',
                    }}
                  >
                    {label}
                  </Typography>
                  <Box sx={{
                    width: 7, height: 7, borderRadius: '50%', flexShrink: 0,
                    bgcolor: active ? '#111111' : '#E2DFDB',
                    transition: 'background-color 0.15s',
                  }} />
                </Box>
              ))}
            </Box>

            <Box sx={{ mx: 3, borderTop: '1px solid #E2DFDB', mb: 3 }} />

            {/* ── Geometry variant selectors ── */}
            <Box sx={{ px: 3, mb: 3 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2.5 }}>
                <Typography sx={{
                  fontFamily: FONT_HEAD, fontWeight: 700, fontSize: 15,
                  textTransform: 'uppercase', letterSpacing: '0.05em', color: '#111',
                }}>
                  GEOMETRY
                </Typography>
                <Typography sx={{
                  fontFamily: FONT_HEAD, fontWeight: 400, fontSize: 10,
                  textTransform: 'uppercase', letterSpacing: '0.1em', color: '#BBBBBB',
                }}>
                  VARIANTS
                </Typography>
              </Box>

              {[
                { label: 'FLOOR',    count: 13, value: selectedFloor,    onChange: setSelectedFloor },
                { label: 'ARCH',     count: 48, value: selectedArch,     onChange: setSelectedArch },
                { label: 'HANDRAIL', count: 80, value: selectedHandrail, onChange: setSelectedHandrail },
              ].map(({ label, count, value, onChange }) => (
                <Box key={label} sx={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  py: 1.25, borderBottom: '1px solid #EEECE8',
                }}>
                  <Typography sx={{
                    fontFamily: FONT_HEAD, fontWeight: 400, fontSize: 11,
                    letterSpacing: '0.07em', textTransform: 'uppercase', color: '#AAAAAA',
                  }}>
                    {label}
                  </Typography>
                  <Box
                    component="select"
                    value={value}
                    onChange={(e) => onChange(Number(e.target.value))}
                    sx={{
                      fontFamily: FONT_HEAD, fontWeight: 700, fontSize: 11,
                      letterSpacing: '0.06em', color: '#111',
                      bgcolor: 'transparent', border: 'none', outline: 'none',
                      cursor: 'pointer', textTransform: 'uppercase',
                    }}
                  >
                    {Array.from({ length: count }, (_, i) => i + 1).map(n => (
                      <option key={n} value={n}>
                        {String(n).padStart(2, '0')} / {String(count).padStart(2, '0')}
                      </option>
                    ))}
                  </Box>
                </Box>
              ))}
            </Box>

            <Box sx={{ mx: 3, borderTop: '1px solid #E2DFDB', mb: 3 }} />

            {/* ── Film ── */}
            <Box sx={{ px: 3, mb: 3 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2.5 }}>
                <Typography sx={{
                  fontFamily: FONT_HEAD, fontWeight: 700, fontSize: 15,
                  textTransform: 'uppercase', letterSpacing: '0.05em', color: '#111',
                }}>
                  FILM
                </Typography>
                <Typography sx={{
                  fontFamily: FONT_HEAD, fontWeight: 400, fontSize: 10,
                  textTransform: 'uppercase', letterSpacing: '0.1em', color: '#BBBBBB',
                }}>
                  01:43 PLAYTIME
                </Typography>
              </Box>
              <Box sx={{ border: '1px solid #E2DFDB', overflow: 'hidden' }}>
                <Box
                  component="video"
                  src="https://github.com/secg-sr1/saiyuen-alpha/raw/refs/heads/main/public/bridge-01-video.mp4"
                  loop muted controls
                  sx={{ width: '100%', display: 'block', filter: 'grayscale(6%) contrast(1.04)' }}
                />
              </Box>
            </Box>

            {/* ── Action buttons ── */}
            <Box sx={{ px: 3, mb: 3, display: 'flex', flexDirection: 'column', gap: 1 }}>
              <Box
                component="button"
                onClick={triggerAssemble}
                sx={{
                  width: '100%', py: 1.75,
                  bgcolor: '#111111', color: '#F6F4F1',
                  border: '1px solid #111111',
                  fontFamily: FONT_HEAD, fontWeight: 700, fontSize: 11,
                  letterSpacing: '0.14em', textTransform: 'uppercase',
                  cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                  transition: 'background-color 0.2s, color 0.2s',
                  '&:hover': { bgcolor: '#c00100', borderColor: '#c00100', color: '#fff' },
                }}
              >
                <Box component="span" sx={{ fontSize: 13, lineHeight: 1 }}>▶</Box>
                ASSEMBLE
              </Box>
              <Box
                component="button"
                sx={{
                  width: '100%', py: 1.75,
                  bgcolor: 'transparent', color: '#111',
                  border: '1px solid #111111',
                  fontFamily: FONT_HEAD, fontWeight: 600, fontSize: 11,
                  letterSpacing: '0.12em', textTransform: 'uppercase',
                  cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  transition: 'background-color 0.2s, color 0.2s',
                  '&:hover': { bgcolor: '#111111', color: '#F6F4F1' },
                }}
              >
                DOWNLOAD SPECIFICATIONS
              </Box>
              <Box
                component="button"
                onClick={handleShare}
                sx={{
                  width: '100%', py: 1.75,
                  bgcolor: 'transparent', color: '#555',
                  border: '1px solid #CCCCCC',
                  fontFamily: FONT_HEAD, fontWeight: 400, fontSize: 11,
                  letterSpacing: '0.12em', textTransform: 'uppercase',
                  cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  transition: 'border-color 0.2s, color 0.2s',
                  '&:hover': { borderColor: '#111', color: '#111' },
                }}
              >
                CONTACT LEAD ARCHITECT
              </Box>
            </Box>

            {/* ── Footer ── */}
            <Box sx={{
              px: 3, pt: 2.5, pb: 4,
              borderTop: '1px solid #E2DFDB',
              mt: 'auto', position: 'relative',
              flexShrink: 0,
            }}>
              <Typography sx={{
                fontFamily: FONT_HEAD, fontWeight: 400, fontSize: 9,
                lineHeight: 1.7, color: '#CCCCCC',
                letterSpacing: '0.04em', textTransform: 'uppercase',
                maxWidth: '68%',
              }}>
                ARCH_BRIDGE INDEX IS A CURATED REPOSITORY OF GLOBAL INFRASTRUCTURE.
                ALL DATA IS VERIFIED FOR STRUCTURAL INTEGRITY BY THE 2024
                INTERNATIONAL BRIDGE COUNCIL.
              </Typography>
              <Typography sx={{
                position: 'absolute', bottom: 20, right: 20,
                fontFamily: FONT_HEAD, fontWeight: 800, fontSize: 32,
                color: '#ECEAE6', letterSpacing: '-0.03em', lineHeight: 1,
                userSelect: 'none',
              }}>
                AB 01
              </Typography>
              <Typography sx={{
                fontFamily: FONT_HEAD, fontWeight: 400, fontSize: 9,
                color: '#CCCCCC', mt: 2, letterSpacing: '0.04em',
              }}>
                © 2024 ARCH_BRIDGE INDEX
              </Typography>
            </Box>
          </Box>
        </>
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

      <Snackbar
        open={!!cameraNotice}
        autoHideDuration={6000}
        onClose={() => setCameraNotice(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        sx={{ zIndex: 99999 }}
      >
        <Alert severity="info" onClose={() => setCameraNotice(null)}
          sx={{ fontFamily: FONT_LABEL, fontWeight: 400, borderRadius: 0, maxWidth: 420 }}>
          {cameraNotice}
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
            zIndex: 2,
            transition: 'opacity 0.3s ease',
          }}
        />
      )}

      <AgentChat />
      <BridgeDesignerPanel />

      {lightboxItem && (
        <OldFilmLightbox
          url={lightboxItem.url}
          label={lightboxItem.label}
          onClose={() => setLightboxItem(null)}
        />
      )}

    </ThemeProvider>
  );
}
