/* eslint-disable react/prop-types */
import { useEffect, useRef, useState } from 'react';
import {
  Alert,
  Box,
  CircularProgress,
  Chip,
  IconButton,
  Slider,
  Snackbar,
  Stack,
  Tooltip,
  Typography,
  useMediaQuery,
} from '@mui/material';
import ImageSlider from 'react-slick';
import 'slick-carousel/slick/slick.css';
import 'slick-carousel/slick/slick-theme.css';
import CloseIcon from '@mui/icons-material/Close';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import OpenInFullIcon from '@mui/icons-material/OpenInFull';
import RefreshIcon from '@mui/icons-material/Refresh';
import AddPhotoAlternateOutlinedIcon from '@mui/icons-material/AddPhotoAlternateOutlined';
import CameraAltOutlinedIcon from '@mui/icons-material/CameraAltOutlined';

import { useStore } from '../store/useStore';
import { generateBridgeDesigns, generateFromLandscape, DESIGN_STYLES, LIGHTING_MODES } from '../agent/bridgeDesigner';
import { captureComposite } from '../utils/screenshot';
import { getUIText } from '../content/uiText';
import OldFilmLightbox from './OldFilmLightbox';
import { track } from '../utils/analytics';

const C = {
  bg:          '#F6F4F1',
  surface:     '#FFFFFF',
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

const hudBorder = { border: `1px solid ${C.border}` };
const sharp = { borderRadius: 0 };

function SkeletonCard() {
  return (
    <Box sx={{ width: '100%', ...sharp, overflow: 'hidden', border: `1px solid ${C.border}` }}>
      <Box sx={{
        height: 210, bgcolor: C.chip,
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', gap: 1.75,
      }}>
        <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center' }}>
          {[0, 1, 2].map(i => (
            <Box key={i} sx={{
              width: 5, height: 5, bgcolor: C.inkFaint, borderRadius: '50%',
              animation: 'dotBounce 1.2s ease-in-out infinite',
              animationDelay: `${i * 0.2}s`,
              '@keyframes dotBounce': {
                '0%, 80%, 100%': { transform: 'scale(0.6)', opacity: 0.3 },
                '40%': { transform: 'scale(1)', opacity: 1 },
              },
            }} />
          ))}
        </Box>
        <Typography sx={{
          fontFamily: FONT_HEAD, fontWeight: 400, fontSize: 10,
          letterSpacing: '0.12em', textTransform: 'uppercase', color: C.inkFaint,
        }}>
          GENERATING
        </Typography>
      </Box>
      <Box sx={{ px: 1.5, py: 1, borderTop: `1px solid ${C.border}`, bgcolor: C.surface }}>
        <Box sx={{ height: 7, width: '38%', bgcolor: C.borderLight }} />
      </Box>
    </Box>
  );
}

function DesignCard({ option, isSelected, isRegenerating, onSelect, onRegenerate, onExpand, regenerateTooltip }) {
  return (
    <Box
      sx={{ width: '100%', position: 'relative', ...sharp, overflow: 'hidden', cursor: 'pointer' }}
      onClick={() => onSelect(option)}
    >
      {/* Image */}
      <Box sx={{ position: 'relative', overflow: 'hidden', '&:hover .expand-hint': { opacity: 1 } }}>
        <Box
          component="img"
          src={option.url}
          alt={option.label}
          onClick={(e) => { e.stopPropagation(); onExpand(option); }}
          sx={{
            width: '100%', height: 210, objectFit: 'cover', display: 'block',
            filter: 'grayscale(8%) contrast(1.04)',
            transition: 'filter 0.2s ease',
            '&:hover': { filter: 'grayscale(18%) contrast(1.08) brightness(0.88)' },
            cursor: 'zoom-in',
          }}
        />
        <Box className="expand-hint" sx={{
          position: 'absolute', inset: 0, pointerEvents: 'none',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          bgcolor: 'rgba(0,0,0,0.18)', opacity: 0, transition: 'opacity 0.2s ease',
        }}>
          <OpenInFullIcon sx={{ fontSize: 18, color: 'rgba(255,255,255,0.85)' }} />
        </Box>
      </Box>

      {/* Lighting tag — top left */}
      <Box sx={{
        position: 'absolute', top: 8, left: 8,
        bgcolor: 'rgba(0,0,0,0.52)', backdropFilter: 'blur(6px)',
        px: 0.75, py: 0.25,
      }}>
        <Typography sx={{ fontFamily: FONT_HEAD, fontSize: 8, color: 'rgba(255,255,255,0.82)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
          {option.lightingLabel}
        </Typography>
      </Box>

      {/* Selected check — top right */}
      {isSelected && !isRegenerating && (
        <Box sx={{ position: 'absolute', top: 8, right: 8, bgcolor: C.ink, display: 'flex', p: 0.35 }}>
          <CheckCircleIcon sx={{ fontSize: 12, color: '#fff' }} />
        </Box>
      )}

      {/* Footer */}
      <Box sx={{
        px: 1.5, py: 1,
        bgcolor: isSelected ? C.chip : C.surface,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        borderTop: `1px solid ${isSelected ? C.ink : C.border}`,
        transition: 'border-color 0.15s, background-color 0.15s',
      }}>
        <Typography sx={{
          fontFamily: FONT_HEAD, fontWeight: isSelected ? 700 : 400, fontSize: 11,
          color: isSelected ? C.ink : C.inkMuted,
          letterSpacing: '0.05em', textTransform: 'uppercase',
        }}>
          {option.label}
        </Typography>
        <Tooltip title={regenerateTooltip} placement="top">
          <IconButton
            size="small"
            onClick={(e) => { e.stopPropagation(); onRegenerate(option); }}
            disabled={isRegenerating}
            sx={{ p: 0.4, ...sharp, color: C.inkFaint, '&:hover': { color: C.ink, bgcolor: C.chip } }}
          >
            <RefreshIcon sx={{ fontSize: 13 }} />
          </IconButton>
        </Tooltip>
      </Box>

      {/* Regenerating overlay */}
      {isRegenerating && (
        <Box sx={{
          position: 'absolute', inset: 0, bgcolor: 'rgba(246,244,241,0.78)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <CircularProgress size={22} sx={{ color: C.inkMuted }} />
        </Box>
      )}
    </Box>
  );
}

function HistoryThumb({ item, isActive, onClick, onExpand }) {
  return (
    <Tooltip title={`${item.label} — ${item.lightingLabel}`} placement="top">
      <Box
        onClick={onClick}
        onDoubleClick={(e) => { e.stopPropagation(); onExpand(item); }}
        sx={{
          width: 52, height: 36, flexShrink: 0, ...sharp, overflow: 'hidden',
          cursor: 'pointer', border: `1px solid ${isActive ? C.ink : C.border}`,
          transition: 'border-color 0.15s',
          '&:hover': { borderColor: C.inkMuted },
          position: 'relative',
        }}
      >
        <Box
          component="img"
          src={item.url}
          alt={item.label}
          sx={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', filter: 'grayscale(10%)' }}
        />
      </Box>
    </Tooltip>
  );
}

export default function BridgeDesignerPanel() {
  const designerOpen = useStore(s => s.designerOpen);
  const setDesignerOpen = useStore(s => s.setDesignerOpen);
  const isGeneratingDesigns = useStore(s => s.isGeneratingDesigns);
  const setIsGeneratingDesigns = useStore(s => s.setIsGeneratingDesigns);
  const regeneratingDesignId = useStore(s => s.regeneratingDesignId);
  const setRegeneratingDesignId = useStore(s => s.setRegeneratingDesignId);
  const designOptions = useStore(s => s.designOptions);
  const setDesignOptions = useStore(s => s.setDesignOptions);
  const updateDesignOption = useStore(s => s.updateDesignOption);
  const selectedDesign = useStore(s => s.selectedDesign);
  const setSelectedDesign = useStore(s => s.setSelectedDesign);
  const designBlendOpacity = useStore(s => s.designBlendOpacity);
  const setDesignBlendOpacity = useStore(s => s.setDesignBlendOpacity);
  const designConfig = useStore(s => s.designConfig);
  const setDesignConfig = useStore(s => s.setDesignConfig);
  const designHistory = useStore(s => s.designHistory);
  const addToDesignHistory = useStore(s => s.addToDesignHistory);
  const uploadedLandscape = useStore(s => s.uploadedLandscape);
  const setUploadedLandscape = useStore(s => s.setUploadedLandscape);
  const agentChatOpen = useStore(s => s.agentChatOpen);
  const setAgentChatOpen = useStore(s => s.setAgentChatOpen);
  const showAccordion = useStore(s => s.showAccordion);
  const setShowAccordion = useStore(s => s.setShowAccordion);
  const cameraFeedAvailable = useStore(s => s.cameraFeedAvailable);
  const selfieOn = useStore(s => s.selfieOn);
  const language = useStore(s => s.language);

  const isMobile = useMediaQuery('(max-width:834px)');
  const fileInputRef = useRef(null);
  const designSliderRef = useRef(null);
  const text = getUIText(language);

  const [pendingStyles, setPendingStyles] = useState(designConfig.styleIds);
  const [pendingLighting, setPendingLighting] = useState(designConfig.lighting);
  const [isAnalysing, setIsAnalysing] = useState(false);
  const [captureSource, setCaptureSource] = useState(null);
  const [feedback, setFeedback] = useState(null);
  const [lightboxItem, setLightboxItem] = useState(null);
  const [activeDesignSlide, setActiveDesignSlide] = useState(0);

  useEffect(() => {
    if (designerOpen) track('designer_opened');
  }, [designerOpen]);

  useEffect(() => {
    setActiveDesignSlide(0);
    designSliderRef.current?.slickGoTo(0);
  }, [designOptions]);

  const toggleStyle = (id) => {
    setPendingStyles(prev =>
      prev.includes(id)
        ? prev.length > 1 ? prev.filter(s => s !== id) : prev
        : [...prev, id]
    );
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    track('photo_uploaded');
    const reader = new FileReader();
    reader.onload = (ev) => {
      setUploadedLandscape(ev.target?.result);
      setCaptureSource('upload');
    };
    reader.onerror = () => {
      setFeedback({ severity: 'error', message: text.designer.fileReadFailed });
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleCaptureAR = () => {
    if (!cameraFeedAvailable) {
      setFeedback({ severity: 'warning', message: text.designer.captureArUnavailable });
      return;
    }

    const dataUrl = captureComposite();
    if (!dataUrl) {
      setFeedback({ severity: 'error', message: text.designer.captureFailed });
      return;
    }

    track('ar_captured');
    setUploadedLandscape(dataUrl);
    setCaptureSource('ar');
  };

  const handleGenerate = () => {
    track('design_generated', { styles: pendingStyles.join(','), lighting: pendingLighting, from_photo: !!uploadedLandscape });
    setDesignConfig({ styleIds: pendingStyles, lighting: pendingLighting });
    setDesignOptions([]);
    setIsGeneratingDesigns(true);

    let generation;
    if (uploadedLandscape) {
      setIsAnalysing(true);
      generation = generateFromLandscape(uploadedLandscape, pendingStyles, pendingLighting, selfieOn)
        .finally(() => setIsAnalysing(false));
    } else {
      generation = generateBridgeDesigns(pendingStyles, pendingLighting, selfieOn);
    }

    generation
      .then(options => {
        setDesignOptions(options);
        setIsGeneratingDesigns(false);
        addToDesignHistory(options);
      })
      .catch(() => {
        setIsGeneratingDesigns(false);
        setIsAnalysing(false);
        setFeedback({ severity: 'error', message: text.designer.generationFailed });
      });
  };

  const handleRegenerate = (option) => {
    track('design_regenerated', { style: option.id });
    setRegeneratingDesignId(option.id);
    generateBridgeDesigns([option.id], pendingLighting)
      .then(([fresh]) => {
        updateDesignOption(fresh);
        addToDesignHistory([fresh]);
        if (selectedDesign?.id === option.id) setSelectedDesign(fresh);
        setRegeneratingDesignId(null);
      })
      .catch(() => {
        setRegeneratingDesignId(null);
        setFeedback({ severity: 'error', message: text.designer.regenerationFailed });
      });
  };

  const handleSelectCard = (option) => {
    const isDeselect = selectedDesign?.id === option.id;
    if (!isDeselect) track('design_selected', { style: option.id, label: option.label });
    setSelectedDesign(isDeselect ? null : option);
  };

  // ── Mini bar (panel closed, design active) ────────────────────────────────
  if (!designerOpen) {
    if (!selectedDesign) return null;
    if (isMobile && (agentChatOpen || showAccordion)) return null;

    return (
      <>
        <Box sx={{
          position: 'fixed', bottom: 68, left: '50%', transform: 'translateX(-50%)',
          zIndex: 9997,
          bgcolor: 'rgba(246,244,241,0.88)',
          backdropFilter: 'blur(14px)',
          WebkitBackdropFilter: 'blur(14px)',
          border: `1px solid ${C.border}`,
          ...sharp,
          px: 1.5, py: 0.75,
          display: 'flex', alignItems: 'center', gap: 1.25,
          width: 'min(92vw, 380px)',
          boxShadow: '0 4px 24px rgba(0,0,0,0.12)',
          animation: 'miniSlide 0.2s ease-out',
          '@keyframes miniSlide': {
            from: { opacity: 0, transform: 'translateX(-50%) translateY(6px)' },
            to:   { opacity: 1, transform: 'translateX(-50%) translateY(0)' },
          },
        }}>
          <Box component="img" src={selectedDesign.url} alt={selectedDesign.label}
            sx={{ width: 48, height: 32, objectFit: 'cover', flexShrink: 0, filter: 'grayscale(10%)', border: `1px solid ${C.border}` }} />
          <Typography sx={{ fontFamily: FONT_HEAD, fontWeight: 600, fontSize: 10,
            color: C.ink, whiteSpace: 'nowrap', flexShrink: 0, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
            {selectedDesign.label}
          </Typography>
          <Slider
            value={Math.round(designBlendOpacity * 100)}
            onChange={(_, v) => setDesignBlendOpacity(v / 100)}
            min={10} max={100} size="small" sx={{
              flex: 1, color: C.ink,
              '& .MuiSlider-thumb': { width: 12, height: 12, bgcolor: C.ink, ...sharp },
              '& .MuiSlider-rail': { bgcolor: C.border },
            }}
          />
          <Typography sx={{ fontFamily: FONT_HEAD, fontWeight: 400, fontSize: 10,
            color: C.inkMuted, minWidth: 26, textAlign: 'right', flexShrink: 0 }}>
            {Math.round(designBlendOpacity * 100)}%
          </Typography>
          <Tooltip title={text.designer.miniBarViewDesigns} placement="top">
            <IconButton size="small" onClick={() => { setDesignerOpen(true); setAgentChatOpen(false); setShowAccordion(false); }}
              sx={{ color: C.inkMuted, p: 0.5, flexShrink: 0, ...sharp,
                '&:hover': { color: C.ink, bgcolor: C.chip } }}>
              <OpenInFullIcon sx={{ fontSize: 13 }} />
            </IconButton>
          </Tooltip>
          <Tooltip title={text.designer.miniBarClearOverlay} placement="top">
            <IconButton size="small" onClick={() => setSelectedDesign(null)}
              sx={{ color: C.inkFaint, p: 0.5, flexShrink: 0, ...sharp,
                '&:hover': { color: C.ink } }}>
              <CloseIcon sx={{ fontSize: 13 }} />
            </IconButton>
          </Tooltip>
        </Box>

        <Snackbar
          open={!!feedback}
          autoHideDuration={2400}
          onClose={() => setFeedback(null)}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
          sx={{ zIndex: 10001 }}
        >
          <Alert severity={feedback?.severity ?? 'info'} onClose={() => setFeedback(null)} sx={{ fontFamily: FONT_LABEL, ...sharp }}>
            {feedback?.message}
          </Alert>
        </Snackbar>
      </>
    );
  }

  // ── Full panel ────────────────────────────────────────────────────────────
  const anyBusy = isGeneratingDesigns || !!regeneratingDesignId || isAnalysing;
  const statusLabel = isAnalysing
    ? text.designer.statusAnalysing
    : regeneratingDesignId
      ? text.designer.statusRefreshing
      : text.designer.statusGenerating;

  return (
    <>
      <Box sx={{
        position: 'fixed',
        bottom: { xs: 0, sm: '9%' },
        left: { xs: 0, sm: '50%' },
        transform: { xs: 'none', sm: 'translateX(-50%)' },
        width: { xs: '100%', sm: 'min(94vw, 860px)' },
        maxHeight: { xs: '72vh', sm: 'none' },
        zIndex: 9998,
        display: 'flex', flexDirection: 'column',
      }}>
      <Box sx={{
        flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden',
        ...sharp,
        bgcolor: 'rgba(246,244,241,0.88)',
        backdropFilter: 'blur(14px)',
        WebkitBackdropFilter: 'blur(14px)',
        border: `1px solid ${C.border}`,
        boxShadow: '0 8px 40px rgba(0,0,0,0.14)',
        animation: 'panelSlide 0.22s ease-out',
        '@keyframes panelSlide': {
          from: { opacity: 0, transform: 'translateY(12px)' },
          to:   { opacity: 1, transform: 'translateY(0)' },
        },
      }}>

        {/* Header */}
        <Box sx={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          px: 3, py: 2,
          borderBottom: `1px solid ${C.border}`,
        }}>
          <Stack direction="row" alignItems="center" spacing={1.5}>
            <AutoAwesomeIcon sx={{ color: C.inkMuted, fontSize: 14 }} />
            <Typography sx={{ fontFamily: FONT_HEAD, fontWeight: 800, fontSize: 12,
              color: C.ink, letterSpacing: '0.14em', textTransform: 'uppercase' }}>
              {text.designer.title}
            </Typography>
            {anyBusy && (
              <Box sx={{
                px: 1, py: 0.25,
                bgcolor: C.chip, border: `1px solid ${C.border}`,
              }}>
                <Typography sx={{ fontFamily: FONT_HEAD, fontSize: 9, color: C.inkMuted, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                  {statusLabel}
                </Typography>
              </Box>
            )}
          </Stack>

          <Typography
            onClick={() => setDesignerOpen(false)}
            sx={{
              fontFamily: FONT_HEAD, fontWeight: 400, fontSize: 11,
              letterSpacing: '0.1em', textTransform: 'uppercase',
              color: C.inkMuted, cursor: 'pointer', transition: 'color 0.15s',
              '&:hover': { color: C.ink },
            }}
          >
            CLOSE
          </Typography>
        </Box>

        {/* Body */}
        <Box sx={{
          p: 3, pb: { xs: 'max(16px, env(safe-area-inset-bottom))', sm: 3 },
          display: 'flex', flexDirection: 'column', gap: 2.5,
          overflowY: 'auto', flex: 1,
          '&::-webkit-scrollbar': { width: '3px' },
          '&::-webkit-scrollbar-thumb': { bgcolor: C.border },
        }}>
          <Box>
            <input ref={fileInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleFileChange} />

            {/* Landscape reference */}
            {uploadedLandscape ? (
              <Stack direction="row" alignItems="center" spacing={1.5} sx={{
                mb: 2.5, p: 1.5,
                bgcolor: C.surface, border: `1px solid ${C.border}`,
              }}>
                <Box component="img" src={uploadedLandscape} alt="Landscape reference"
                  sx={{ width: 80, height: 52, objectFit: 'cover', flexShrink: 0, filter: 'grayscale(10%)', border: `1px solid ${C.borderLight}` }} />
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography sx={{ fontFamily: FONT_HEAD, fontWeight: 700, fontSize: 11,
                    color: C.ink, mb: 0.25, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                    {captureSource === 'ar' ? text.designer.usingArCapture : text.designer.usingPhoto}
                  </Typography>
                  <Typography sx={{ fontFamily: FONT_HEAD, fontWeight: 400, fontSize: 12, color: C.inkMuted, lineHeight: 1.6 }}>
                    {text.designer.usingPhotoBody}
                  </Typography>
                </Box>
                <Tooltip title={text.common.remove} placement="left">
                  <IconButton size="small"
                    onClick={() => { setUploadedLandscape(null); setCaptureSource(null); }}
                    sx={{ color: C.inkFaint, flexShrink: 0, ...sharp, '&:hover': { color: C.ink } }}>
                    <CloseIcon sx={{ fontSize: 14 }} />
                  </IconButton>
                </Tooltip>
              </Stack>
            ) : (
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ mb: 2.5 }}>
                <Stack direction="row" alignItems="center" spacing={1.25} flexGrow={1}
                  onClick={() => fileInputRef.current?.click()}
                  sx={{
                    p: 1.5, cursor: 'pointer',
                    border: `1px dashed ${C.border}`, bgcolor: C.surface,
                    transition: 'border-color 0.15s',
                    '&:hover': { borderColor: C.inkMuted },
                  }}>
                  <AddPhotoAlternateOutlinedIcon sx={{ color: C.inkFaint, fontSize: 18, flexShrink: 0 }} />
                  <Box>
                    <Typography sx={{ fontFamily: FONT_HEAD, fontWeight: 600, fontSize: 11,
                      color: C.inkSub, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                      {text.designer.uploadPhoto}
                    </Typography>
                    <Typography sx={{ fontFamily: FONT_HEAD, fontWeight: 400, fontSize: 11, color: C.inkFaint }}>
                      {text.designer.uploadPhotoBody}
                    </Typography>
                  </Box>
                </Stack>
                <Stack direction="row" alignItems="center" spacing={1.25} flexGrow={1}
                  onClick={handleCaptureAR}
                  sx={{
                    p: 1.5, cursor: 'pointer',
                    border: `1px dashed ${C.border}`, bgcolor: C.surface,
                    opacity: cameraFeedAvailable ? 1 : 0.5,
                    transition: 'border-color 0.15s',
                    '&:hover': { borderColor: C.inkMuted },
                  }}>
                  <CameraAltOutlinedIcon sx={{ color: C.inkFaint, fontSize: 18, flexShrink: 0 }} />
                  <Box>
                    <Typography sx={{ fontFamily: FONT_HEAD, fontWeight: 600, fontSize: 11,
                      color: C.inkSub, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                      {text.designer.captureArView}
                    </Typography>
                    <Typography sx={{ fontFamily: FONT_HEAD, fontWeight: 400, fontSize: 11, color: C.inkFaint }}>
                      {cameraFeedAvailable ? text.designer.captureArViewBody : text.designer.captureArUnavailable}
                    </Typography>
                  </Box>
                </Stack>
              </Stack>
            )}

            {/* Style */}
            <Typography sx={{ fontFamily: FONT_HEAD, fontWeight: 400, fontSize: 10,
              color: C.inkFaint, letterSpacing: '0.12em', textTransform: 'uppercase', mb: 1 }}>
              {text.designer.styleLabel}
            </Typography>
            <Stack direction="row" flexWrap="wrap" gap={0.75} sx={{ mb: 2 }}>
              {DESIGN_STYLES.map(s => {
                const on = pendingStyles.includes(s.id);
                return (
                  <Box
                    key={s.id}
                    onClick={() => toggleStyle(s.id)}
                    sx={{
                      px: 1.5, py: 0.6, cursor: 'pointer',
                      bgcolor: on ? C.ink : C.surface,
                      color: on ? '#fff' : C.inkSub,
                      border: `1px solid ${on ? C.ink : C.border}`,
                      transition: 'background-color 0.15s, color 0.15s, border-color 0.15s',
                      '&:hover': { borderColor: C.ink, color: on ? '#fff' : C.ink },
                    }}
                  >
                    <Typography sx={{ fontFamily: FONT_HEAD, fontWeight: on ? 700 : 400, fontSize: 11, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                      {text.designer.styleLabels?.[s.id] ?? s.label}
                    </Typography>
                  </Box>
                );
              })}
            </Stack>

            {/* Lighting */}
            <Stack direction="row" alignItems="center" gap={0.75} flexWrap="wrap">
              <Typography sx={{ fontFamily: FONT_HEAD, fontWeight: 400, fontSize: 10,
                color: C.inkFaint, letterSpacing: '0.12em', textTransform: 'uppercase', mr: 0.5 }}>
                {text.designer.lightingLabel}
              </Typography>
              {LIGHTING_MODES.map(l => {
                const on = pendingLighting === l.id;
                return (
                  <Box
                    key={l.id}
                    onClick={() => setPendingLighting(l.id)}
                    sx={{
                      px: 1.5, py: 0.6, cursor: 'pointer',
                      bgcolor: on ? C.chip : C.surface,
                      color: on ? C.ink : C.inkMuted,
                      border: `1px solid ${on ? C.ink : C.border}`,
                      transition: 'background-color 0.15s, border-color 0.15s',
                      '&:hover': { borderColor: C.ink, color: C.ink },
                    }}
                  >
                    <Typography sx={{ fontFamily: FONT_HEAD, fontWeight: on ? 700 : 400, fontSize: 11, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                      {text.designer.lightingLabels?.[l.id] ?? l.label}
                    </Typography>
                  </Box>
                );
              })}
            </Stack>

            {/* Generate CTA */}
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 1.5 }}>
              <Box
                component="button"
                onClick={handleGenerate}
                disabled={anyBusy}
                sx={{
                  display: 'flex', alignItems: 'center', gap: 0.75,
                  px: 2, py: 0.85,
                  bgcolor: anyBusy ? C.chip : C.ink, color: anyBusy ? C.inkFaint : '#fff',
                  border: `1px solid ${anyBusy ? C.border : C.ink}`,
                  fontFamily: FONT_HEAD, fontWeight: 700, fontSize: 11,
                  letterSpacing: '0.1em', textTransform: 'uppercase',
                  cursor: anyBusy ? 'default' : 'pointer',
                  transition: 'background-color 0.15s',
                  '&:hover:not(:disabled)': { bgcolor: '#333' },
                  '&:disabled': { opacity: 0.45 },
                }}
              >
                <AutoAwesomeIcon sx={{ fontSize: 13 }} />
                {uploadedLandscape ? text.designer.generateForPhoto(pendingStyles.length) : text.designer.generate(pendingStyles.length)}
              </Box>
            </Box>
          </Box>

          {/* Design carousel */}
          {(designOptions.length > 0 || isGeneratingDesigns) && (
            <Box>
              <Box sx={{ border: `1px solid ${C.border}`, ...sharp, overflow: 'hidden' }}>
                {isGeneratingDesigns && designOptions.length === 0 ? (
                  <SkeletonCard />
                ) : (
                  <ImageSlider
                    ref={designSliderRef}
                    dots={false}
                    arrows={false}
                    infinite={false}
                    speed={300}
                    slidesToShow={1}
                    slidesToScroll={1}
                    beforeChange={(_, next) => setActiveDesignSlide(next)}
                  >
                    {designOptions.map(option => (
                      <DesignCard
                        key={option.id}
                        option={option}
                        isSelected={selectedDesign?.id === option.id}
                        isRegenerating={regeneratingDesignId === option.id}
                        onSelect={handleSelectCard}
                        onRegenerate={handleRegenerate}
                        onExpand={(opt) => setLightboxItem({ url: opt.url, label: opt.label })}
                        regenerateTooltip={text.designer.regenerateStyle}
                      />
                    ))}
                  </ImageSlider>
                )}
              </Box>

              {/* Slide labels — like info panel */}
              {designOptions.length > 1 && (
                <Box sx={{ display: 'flex', gap: 2.5, mt: 1.5, overflowX: 'auto', '&::-webkit-scrollbar': { display: 'none' } }}>
                  {designOptions.map((opt, i) => (
                    <Typography
                      key={opt.id}
                      onClick={() => designSliderRef.current?.slickGoTo(i)}
                      sx={{
                        fontFamily: FONT_HEAD, fontWeight: activeDesignSlide === i ? 700 : 400,
                        fontSize: 10, letterSpacing: '0.08em', textTransform: 'uppercase',
                        color: activeDesignSlide === i ? C.ink : C.inkFaint,
                        borderBottom: activeDesignSlide === i ? `1px solid ${C.ink}` : '1px solid transparent',
                        pb: 0.25, cursor: 'pointer', flexShrink: 0,
                        transition: 'color 0.15s, border-color 0.15s',
                        '&:hover': { color: C.inkMuted },
                      }}
                    >
                      {opt.label}
                    </Typography>
                  ))}
                </Box>
              )}
            </Box>
          )}

          {/* Blend slider */}
          {selectedDesign && (
            <Stack direction="row" alignItems="center" spacing={1.5}>
              <Typography sx={{ fontFamily: FONT_HEAD, fontWeight: 400, fontSize: 10,
                color: C.inkFaint, whiteSpace: 'nowrap', letterSpacing: '0.12em', textTransform: 'uppercase' }}>
                {text.designer.blendLabel}
              </Typography>
              <Slider
                value={Math.round(designBlendOpacity * 100)}
                onChange={(_, v) => setDesignBlendOpacity(v / 100)}
                min={10} max={100} size="small"
                sx={{
                  color: C.ink,
                  '& .MuiSlider-thumb': { width: 14, height: 14, bgcolor: C.ink, ...sharp },
                  '& .MuiSlider-rail': { bgcolor: C.border },
                }}
              />
              <Typography sx={{ fontFamily: FONT_HEAD, fontWeight: 400, fontSize: 10,
                color: C.inkSub, minWidth: 30, textAlign: 'right' }}>
                {Math.round(designBlendOpacity * 100)}%
              </Typography>
            </Stack>
          )}

          {/* History */}
          {designHistory.length > 0 && (
            <Box>
              <Typography sx={{ fontFamily: FONT_HEAD, fontWeight: 400, fontSize: 10,
                color: C.inkFaint, letterSpacing: '0.12em', textTransform: 'uppercase', mb: 1 }}>
                {text.designer.historyLabel}
              </Typography>
              <Stack direction="row" spacing={0.75}
                sx={{ overflowX: 'auto', pb: 0.5, '&::-webkit-scrollbar': { display: 'none' } }}>
                {designHistory.map((item, i) => (
                  <HistoryThumb
                    key={`${item.id}-${item.generatedAt ?? i}`}
                    item={item}
                    isActive={selectedDesign?.id === item.id && selectedDesign?.url === item.url}
                    onClick={() => setSelectedDesign(selectedDesign?.url === item.url ? null : item)}
                    onExpand={(it) => setLightboxItem({ url: it.url, label: it.label })}
                  />
                ))}
              </Stack>
            </Box>
          )}
        </Box>
      </Box>
      </Box>

      {lightboxItem && (
        <OldFilmLightbox
          url={lightboxItem.url}
          label={lightboxItem.label}
          onClose={() => setLightboxItem(null)}
        />
      )}

      <Snackbar
        open={!!feedback}
        autoHideDuration={2600}
        onClose={() => setFeedback(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        sx={{ zIndex: 10001 }}
      >
        <Alert severity={feedback?.severity ?? 'info'} onClose={() => setFeedback(null)}
          sx={{ fontFamily: FONT_LABEL, ...sharp }}>
          {feedback?.message}
        </Alert>
      </Snackbar>
    </>
  );
}
