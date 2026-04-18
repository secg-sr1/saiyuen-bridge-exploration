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

// Obsidian Decay palette tokens
const C = {
  surface:       '#131313',
  surfaceLow:    '#1c1b1b',
  surfaceMid:    '#201f1f',
  surfaceHigh:   '#2a2a2a',
  surfaceLowest: '#0e0e0e',
  outline:       'rgba(96,62,57,0.5)',      // outline-variant at half opacity
  outlineStrong: '#b18780',                  // outline
  primary:       '#ffb4a8',                  // warm salmon signal
  primaryDeep:   '#c00100',                  // inverse-primary — CTA red
  primaryGlow:   'rgba(192,1,0,0.35)',
  onSurface:     '#e5e2e1',
  onSurfaceDim:  'rgba(229,226,225,0.45)',
  onSurfaceFaint:'rgba(229,226,225,0.25)',
};

const FONT_HEAD = 'Manrope, Arial, sans-serif';
const FONT_LABEL = "'Space Grotesk', monospace";

// Shared sx helpers
const hudBorder = { border: `1px solid ${C.outline}` };
const sharp = { borderRadius: 0 };

function SkeletonCard() {
  return (
    <Box sx={{
      flex: '1 1 0', minWidth: 200,
      ...sharp, overflow: 'hidden',
      ...hudBorder,
      bgcolor: C.surfaceLowest,
    }}>
      <Box sx={{
        height: 130, display: 'flex', alignItems: 'center', justifyContent: 'center',
        animation: 'shimmer 1.6s ease-in-out infinite',
        '@keyframes shimmer': { '0%,100%': { opacity: 0.35 }, '50%': { opacity: 0.7 } },
      }}>
        <CircularProgress size={22} sx={{ color: 'rgba(192,1,0,0.5)' }} />
      </Box>
      <Box sx={{ p: 1.25 }}>
        <Box sx={{ height: 9, width: '55%', ...sharp, bgcolor: C.surfaceHigh }} />
      </Box>
    </Box>
  );
}

function DesignCard({ option, isSelected, isRegenerating, onSelect, onRegenerate, onExpand, regenerateTooltip }) {
  return (
    <Box sx={{
      flex: '1 1 0', minWidth: 200, position: 'relative',
      ...sharp, overflow: 'hidden',
      border: '1px solid',
      borderColor: isSelected ? C.primaryDeep : C.outline,
      boxShadow: isSelected ? `0 0 24px ${C.primaryGlow}` : 'none',
      cursor: 'pointer',
      transition: 'border-color 0.05s steps(1), box-shadow 0.05s steps(1)',
      '&:hover': { borderColor: isSelected ? C.primaryDeep : C.outlineStrong },
    }}
      onClick={() => onSelect(option)}
    >
      {/* Image — click opens old-film lightbox */}
      <Box sx={{ position: 'relative', overflow: 'hidden', '&:hover .expand-hint': { opacity: 1 } }}>
        <Box
          component="img"
          src={option.url}
          alt={option.label}
          onClick={(e) => { e.stopPropagation(); onExpand(option); }}
          sx={{
            width: '100%', height: 130, objectFit: 'cover', display: 'block',
            filter: 'grayscale(20%) contrast(1.05)',
            transition: 'transform 0.05s steps(1), filter 0.05s steps(1)',
            '&:hover': { transform: 'scale(1.03)', filter: 'grayscale(30%) contrast(1.1) brightness(0.88)' },
            cursor: 'zoom-in',
          }}
        />
        {/* Expand hint overlay */}
        <Box className="expand-hint" sx={{
          position: 'absolute', inset: 0, pointerEvents: 'none',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          bgcolor: 'rgba(0,0,0,0.28)',
          opacity: 0, transition: 'opacity 0.05s steps(1)',
        }}>
          <OpenInFullIcon sx={{ fontSize: 18, color: C.primary, opacity: 0.9 }} />
        </Box>
      </Box>

      {isRegenerating && (
        <Box sx={{
          position: 'absolute', inset: 0, bgcolor: 'rgba(13,13,13,0.7)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <CircularProgress size={24} sx={{ color: C.primary }} />
        </Box>
      )}

      {isSelected && !isRegenerating && (
        <Box sx={{
          position: 'absolute', top: 6, right: 6,
          bgcolor: C.primaryDeep, display: 'flex', p: 0.25,
        }}>
          <CheckCircleIcon sx={{ fontSize: 13, color: '#fff' }} />
        </Box>
      )}

      {/* Lighting label tag — HUD chip style */}
      <Box sx={{
        position: 'absolute', top: 6, left: 6,
        bgcolor: 'rgba(13,13,13,0.75)', backdropFilter: 'blur(8px)',
        px: 0.75, py: 0.2,
        border: `1px solid ${C.outline}`,
      }}>
        <Typography sx={{ fontFamily: FONT_LABEL, fontSize: 8, color: C.primary, letterSpacing: '0.12em', textTransform: 'uppercase' }}>
          {option.lightingLabel}
        </Typography>
      </Box>

      <Box sx={{
        px: 1.25, py: 0.75,
        bgcolor: isSelected ? 'rgba(192,1,0,0.12)' : C.surfaceLowest,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        borderTop: `1px solid ${C.outline}`,
      }}>
        <Typography sx={{
          fontFamily: FONT_HEAD, fontWeight: isSelected ? 700 : 400, fontSize: 11,
          color: isSelected ? C.primary : C.onSurfaceDim,
          letterSpacing: '0.04em',
          textTransform: 'uppercase',
        }}>
          {option.label}
        </Typography>
        <Tooltip title={regenerateTooltip} placement="top">
          <IconButton
            size="small"
            onClick={(e) => { e.stopPropagation(); onRegenerate(option); }}
            disabled={isRegenerating}
            sx={{
              p: 0.4, ...sharp, color: C.onSurfaceFaint,
              '&:hover': { color: C.primary, bgcolor: 'rgba(192,1,0,0.1)' },
            }}
          >
            <RefreshIcon sx={{ fontSize: 13 }} />
          </IconButton>
        </Tooltip>
      </Box>
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
          cursor: 'pointer', border: '1px solid',
          borderColor: isActive ? C.primaryDeep : C.outline,
          boxShadow: isActive ? `0 0 10px ${C.primaryGlow}` : 'none',
          transition: 'border-color 0.05s steps(1)',
          '&:hover': { borderColor: C.outlineStrong, transform: 'scale(1.08)' },
          position: 'relative',
        }}
      >
        <Box
          component="img"
          src={item.url}
          alt={item.label}
          sx={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', filter: 'grayscale(15%)' }}
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
  const language = useStore(s => s.language);

  const isMobile = useMediaQuery('(max-width:834px)');
  const fileInputRef = useRef(null);
  const text = getUIText(language);

  const [pendingStyles, setPendingStyles] = useState(designConfig.styleIds);
  const [pendingLighting, setPendingLighting] = useState(designConfig.lighting);
  const [isAnalysing, setIsAnalysing] = useState(false);
  const [captureSource, setCaptureSource] = useState(null);
  const [feedback, setFeedback] = useState(null);
  const [lightboxItem, setLightboxItem] = useState(null); // { url, label }

  useEffect(() => {
    if (designerOpen) track('designer_opened');
  }, [designerOpen]);

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
      generation = generateFromLandscape(uploadedLandscape, pendingStyles, pendingLighting)
        .finally(() => setIsAnalysing(false));
    } else {
      generation = generateBridgeDesigns(pendingStyles, pendingLighting);
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
          bgcolor: 'rgba(13,13,13,0.92)', backdropFilter: 'blur(16px)',
          border: `1px solid ${C.outline}`,
          borderLeft: `2px solid ${C.primaryDeep}`,
          ...sharp,
          px: 1.5, py: 0.75,
          display: 'flex', alignItems: 'center', gap: 1.25,
          width: 'min(92vw, 380px)',
          boxShadow: `0 0 32px ${C.primaryGlow}`,
          animation: 'miniSlide 0.15s steps(4)',
          '@keyframes miniSlide': {
            from: { opacity: 0, transform: 'translateX(-50%) translateY(6px)' },
            to:   { opacity: 1, transform: 'translateX(-50%) translateY(0)' },
          },
        }}>
          <Box component="img" src={selectedDesign.url} alt={selectedDesign.label}
            sx={{ width: 48, height: 32, objectFit: 'cover', flexShrink: 0, filter: 'grayscale(15%)' }} />
          <Typography sx={{ fontFamily: FONT_LABEL, fontWeight: 500, fontSize: 10,
            color: C.primary, whiteSpace: 'nowrap', flexShrink: 0, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
            {selectedDesign.label}
          </Typography>
          <Slider
            value={Math.round(designBlendOpacity * 100)}
            onChange={(_, v) => setDesignBlendOpacity(v / 100)}
            min={10} max={100} size="small" sx={{
              flex: 1, color: C.primaryDeep,
              '& .MuiSlider-thumb': { width: 12, height: 12, bgcolor: C.primary, ...sharp },
              '& .MuiSlider-rail': { bgcolor: C.surfaceHigh },
            }}
          />
          <Typography sx={{ fontFamily: FONT_LABEL, fontWeight: 400, fontSize: 10,
            color: C.onSurfaceDim, minWidth: 26, textAlign: 'right', flexShrink: 0 }}>
            {Math.round(designBlendOpacity * 100)}%
          </Typography>
          <Tooltip title={text.designer.miniBarViewDesigns} placement="top">
            <IconButton size="small" onClick={() => { setDesignerOpen(true); setAgentChatOpen(false); setShowAccordion(false); }}
              sx={{ color: C.primary, p: 0.5, flexShrink: 0, ...sharp,
                '&:hover': { color: '#fff', bgcolor: 'rgba(192,1,0,0.15)' } }}>
              <OpenInFullIcon sx={{ fontSize: 13 }} />
            </IconButton>
          </Tooltip>
          <Tooltip title={text.designer.miniBarClearOverlay} placement="top">
            <IconButton size="small" onClick={() => setSelectedDesign(null)}
              sx={{ color: C.onSurfaceFaint, p: 0.5, flexShrink: 0, ...sharp,
                '&:hover': { color: C.onSurface } }}>
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
        display: 'flex',
        flexDirection: 'column',
        ...sharp,
        bgcolor: 'rgba(13,13,13,0.94)', backdropFilter: 'blur(22px)',
        border: `1px solid ${C.outline}`,
        borderTop: `2px solid ${C.primaryDeep}`,
        boxShadow: `0 0 40px rgba(192,1,0,0.08)`,
        zIndex: 9998,
        animation: 'panelSlide 0.18s steps(6)',
        '@keyframes panelSlide': {
          from: { opacity: 0, transform: { xs: 'translateY(12px)', sm: 'translateX(-50%) translateY(12px)' } },
          to:   { opacity: 1, transform: { xs: 'translateY(0)',    sm: 'translateX(-50%) translateY(0)' } },
        },
      }}>

        {/* Mobile drag handle */}
        <Box sx={{ display: { xs: 'flex', sm: 'none' }, justifyContent: 'center', pt: 1.5, pb: 0.5 }}>
          <Box sx={{ width: 28, height: 2, bgcolor: C.outline }} />
        </Box>

        {/* Header */}
        <Box sx={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          px: 2, py: 1.25,
          borderBottom: `1px solid ${C.outline}`,
          position: 'relative',
        }}>
          {/* Left accent bar */}
          <Box sx={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 2, bgcolor: C.primaryDeep }} />

          <Stack direction="row" alignItems="center" spacing={1.25} sx={{ pl: 0.5 }}>
            <AutoAwesomeIcon sx={{ color: C.primary, fontSize: 14 }} />
            <Typography sx={{ fontFamily: FONT_HEAD, fontWeight: 800, fontSize: 'clamp(11px,2vw,13px)',
              color: C.onSurface, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
              {text.designer.title}
            </Typography>
            {anyBusy && (
              <Chip
                label={statusLabel}
                size="small" sx={{
                  fontFamily: FONT_LABEL, fontSize: 9, height: 18, ...sharp,
                  bgcolor: 'rgba(192,1,0,0.12)', color: C.primary,
                  border: `1px solid rgba(192,1,0,0.3)`,
                  letterSpacing: '0.08em',
                }}
              />
            )}
          </Stack>

          <Tooltip title={text.common.close} placement="left">
            <IconButton size="small" onClick={() => setDesignerOpen(false)}
              sx={{ color: C.onSurfaceFaint, ...sharp, '&:hover': { color: C.onSurface, bgcolor: 'rgba(192,1,0,0.1)' } }}>
              <CloseIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>

        {/* Body */}
        <Box sx={{ p: 2, pb: { xs: 'max(16px, env(safe-area-inset-bottom))', sm: 2 }, display: 'flex', flexDirection: 'column', gap: 2, overflowY: 'auto', flex: 1, '&::-webkit-scrollbar': { width: '3px' }, '&::-webkit-scrollbar-thumb': { bgcolor: 'rgba(96,62,57,0.6)' } }}>
          <Box>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              style={{ display: 'none' }}
              onChange={handleFileChange}
            />

            {/* Landscape reference */}
            {uploadedLandscape ? (
              <Stack direction="row" alignItems="center" spacing={1.5} sx={{
                mb: 2, p: 1.25,
                bgcolor: 'rgba(192,1,0,0.06)',
                border: `1px solid rgba(192,1,0,0.25)`,
                borderLeft: `2px solid ${C.primaryDeep}`,
              }}>
                <Box
                  component="img"
                  src={uploadedLandscape}
                  alt="Landscape reference"
                  sx={{ width: 80, height: 52, objectFit: 'cover', flexShrink: 0, filter: 'grayscale(20%)' }}
                />
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography sx={{ fontFamily: FONT_LABEL, fontWeight: 700, fontSize: 10,
                    color: C.primary, mb: 0.25, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                    {captureSource === 'ar' ? text.designer.usingArCapture : text.designer.usingPhoto}
                  </Typography>
                  <Typography sx={{ fontFamily: FONT_LABEL, fontWeight: 400, fontSize: 9,
                    color: C.onSurfaceFaint, lineHeight: 1.5 }}>
                    {text.designer.usingPhotoBody}
                  </Typography>
                </Box>
                <Tooltip title={text.common.remove} placement="left">
                  <IconButton size="small"
                    onClick={() => { setUploadedLandscape(null); setCaptureSource(null); }}
                    sx={{ color: C.onSurfaceFaint, flexShrink: 0, ...sharp, '&:hover': { color: C.onSurface } }}>
                    <CloseIcon sx={{ fontSize: 14 }} />
                  </IconButton>
                </Tooltip>
              </Stack>
            ) : (
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ mb: 2 }}>
                {/* Upload photo */}
                <Stack direction="row" alignItems="center" spacing={1} flexGrow={1}
                  onClick={() => fileInputRef.current?.click()}
                  sx={{
                    p: 1.25, cursor: 'pointer',
                    border: `1px dashed ${C.outline}`,
                    transition: 'border-color 0.05s steps(1)',
                    '&:hover': { borderColor: C.outlineStrong, bgcolor: 'rgba(229,226,225,0.02)' },
                  }}>
                  <AddPhotoAlternateOutlinedIcon sx={{ color: C.onSurfaceFaint, fontSize: 18, flexShrink: 0 }} />
                  <Box>
                    <Typography sx={{ fontFamily: FONT_LABEL, fontWeight: 500, fontSize: 10,
                      color: C.onSurfaceDim, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                      {text.designer.uploadPhoto}
                    </Typography>
                    <Typography sx={{ fontFamily: FONT_LABEL, fontWeight: 400, fontSize: 9, color: C.onSurfaceFaint }}>
                      {text.designer.uploadPhotoBody}
                    </Typography>
                  </Box>
                </Stack>

                {/* Capture AR */}
                <Stack direction="row" alignItems="center" spacing={1} flexGrow={1}
                  onClick={handleCaptureAR}
                  sx={{
                    p: 1.25, cursor: 'pointer',
                    border: `1px dashed rgba(192,1,0,0.3)`,
                    opacity: cameraFeedAvailable ? 1 : 0.5,
                    transition: 'border-color 0.05s steps(1)',
                    '&:hover': { borderColor: C.primaryDeep, bgcolor: 'rgba(192,1,0,0.04)' },
                  }}>
                  <CameraAltOutlinedIcon sx={{ color: 'rgba(192,1,0,0.6)', fontSize: 18, flexShrink: 0 }} />
                  <Box>
                    <Typography sx={{ fontFamily: FONT_LABEL, fontWeight: 500, fontSize: 10,
                      color: C.primary, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                      {text.designer.captureArView}
                    </Typography>
                    <Typography sx={{ fontFamily: FONT_LABEL, fontWeight: 400, fontSize: 9, color: C.onSurfaceFaint }}>
                      {cameraFeedAvailable ? text.designer.captureArViewBody : text.designer.captureArUnavailable}
                    </Typography>
                  </Box>
                </Stack>
              </Stack>
            )}

            {/* Style chips */}
            <Typography sx={{ fontFamily: FONT_LABEL, fontWeight: 500, fontSize: 9,
              color: C.onSurfaceFaint, letterSpacing: '0.2em', textTransform: 'uppercase', mb: 0.75 }}>
              {text.designer.styleLabel}
            </Typography>
            <Stack direction="row" flexWrap="wrap" gap={0.75} sx={{ mb: 1.5 }}>
              {DESIGN_STYLES.map(s => {
                const on = pendingStyles.includes(s.id);
                return (
                  <Chip
                    key={s.id}
                    label={text.designer.styleLabels?.[s.id] ?? s.label}
                    size="small"
                    onClick={() => toggleStyle(s.id)}
                    sx={{
                      fontFamily: FONT_LABEL, fontSize: 10, fontWeight: on ? 700 : 400,
                      cursor: 'pointer', ...sharp,
                      bgcolor: on ? 'rgba(192,1,0,0.18)' : C.surfaceHigh,
                      color: on ? C.primary : C.onSurfaceDim,
                      border: '1px solid',
                      borderColor: on ? C.primaryDeep : C.outline,
                      letterSpacing: '0.06em',
                      transition: 'border-color 0.05s steps(1), background-color 0.05s steps(1)',
                      '&:hover': { bgcolor: on ? 'rgba(192,1,0,0.28)' : C.surfaceHigh, borderColor: on ? C.primaryDeep : C.outlineStrong },
                    }}
                  />
                );
              })}
            </Stack>

            {/* Lighting chips */}
            <Stack direction="row" alignItems="center" gap={0.75} flexWrap="wrap">
              <Typography sx={{ fontFamily: FONT_LABEL, fontWeight: 500, fontSize: 9,
                color: C.onSurfaceFaint, letterSpacing: '0.2em', textTransform: 'uppercase', mr: 0.25 }}>
                {text.designer.lightingLabel}
              </Typography>
              {LIGHTING_MODES.map(l => {
                const on = pendingLighting === l.id;
                return (
                  <Chip
                    key={l.id}
                    label={text.designer.lightingLabels?.[l.id] ?? l.label}
                    size="small"
                    onClick={() => setPendingLighting(l.id)}
                    sx={{
                      fontFamily: FONT_LABEL, fontSize: 10, fontWeight: on ? 700 : 400,
                      cursor: 'pointer', ...sharp,
                      bgcolor: on ? 'rgba(177,135,128,0.18)' : C.surfaceHigh,
                      color: on ? C.outlineStrong : C.onSurfaceDim,
                      border: '1px solid',
                      borderColor: on ? C.outlineStrong : C.outline,
                      letterSpacing: '0.06em',
                      transition: 'border-color 0.05s steps(1), background-color 0.05s steps(1)',
                      '&:hover': { borderColor: C.outlineStrong },
                    }}
                  />
                );
              })}
            </Stack>

            {/* Generate CTA — own row, always right-aligned */}
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 0.75 }}>
              <Chip
                icon={<AutoAwesomeIcon sx={{ fontSize: '13px !important',
                  color: anyBusy ? `${C.onSurfaceFaint} !important` : `${C.onSurface} !important` }} />}
                label={uploadedLandscape ? text.designer.generateForPhoto(pendingStyles.length) : text.designer.generate(pendingStyles.length)}
                onClick={handleGenerate}
                disabled={anyBusy}
                sx={{
                  fontFamily: FONT_LABEL, fontSize: 10, fontWeight: 700,
                  cursor: 'pointer', ...sharp,
                  bgcolor: anyBusy ? C.surfaceHigh : C.primaryDeep,
                  color: anyBusy ? C.onSurfaceFaint : '#fff',
                  border: '1px solid',
                  borderColor: anyBusy ? C.outline : C.primaryDeep,
                  letterSpacing: '0.08em', textTransform: 'uppercase',
                  boxShadow: anyBusy ? 'none' : `0 0 16px ${C.primaryGlow}`,
                  '&:hover': { bgcolor: anyBusy ? undefined : '#a00000' },
                  '& .MuiChip-icon': { ml: '6px' },
                  '&.Mui-disabled': { opacity: 0.4 },
                }}
              />
            </Box>
          </Box>

          {/* Design cards */}
          {(designOptions.length > 0 || isGeneratingDesigns) && (
            <Stack direction="row" spacing={1.5}
              sx={{ overflowX: 'auto', pb: 0.5, '&::-webkit-scrollbar': { display: 'none' } }}>
              {isGeneratingDesigns && designOptions.length === 0 ? (
                pendingStyles.map(id => <SkeletonCard key={id} />)
              ) : (
                designOptions.map(option => (
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
                ))
              )}
            </Stack>
          )}

          {/* Blend slider */}
          {selectedDesign && (
            <Stack direction="row" alignItems="center" spacing={1.5}>
              <Typography sx={{ fontFamily: FONT_LABEL, fontWeight: 500, fontSize: 9,
                color: C.onSurfaceFaint, whiteSpace: 'nowrap', letterSpacing: '0.15em', textTransform: 'uppercase' }}>
                {text.designer.blendLabel}
              </Typography>
              <Slider
                value={Math.round(designBlendOpacity * 100)}
                onChange={(_, v) => setDesignBlendOpacity(v / 100)}
                min={10} max={100} size="small"
                sx={{
                  color: C.primaryDeep,
                  '& .MuiSlider-thumb': {
                    width: 14, height: 14,
                    bgcolor: C.primary,
                    ...sharp,
                    boxShadow: `0 0 8px ${C.primaryGlow}`,
                  },
                  '& .MuiSlider-rail': { bgcolor: C.surfaceHigh },
                }}
              />
              <Typography sx={{ fontFamily: FONT_LABEL, fontWeight: 400, fontSize: 10,
                color: C.primary, minWidth: 30, textAlign: 'right' }}>
                {Math.round(designBlendOpacity * 100)}%
              </Typography>
            </Stack>
          )}

          {/* History strip */}
          {designHistory.length > 0 && (
            <Box>
              <Typography sx={{ fontFamily: FONT_LABEL, fontWeight: 500, fontSize: 9,
                color: C.onSurfaceFaint, letterSpacing: '0.2em', textTransform: 'uppercase', mb: 0.75 }}>
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
