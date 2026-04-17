import { useEffect, useRef, useState } from 'react';
import {
  Alert,
  Box,
  Chip,
  Fab,
  IconButton,
  Snackbar,
  Stack,
  TextField,
  Tooltip,
  Typography,
  useMediaQuery,
} from '@mui/material';
import ChatBubbleOutlineIcon from '@mui/icons-material/ChatBubbleOutline';
import CloseIcon from '@mui/icons-material/Close';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import SendIcon from '@mui/icons-material/Send';
import RestoreIcon from '@mui/icons-material/SettingsBackupRestore';
import MicIcon from '@mui/icons-material/Mic';
import MicOffIcon from '@mui/icons-material/MicOff';
import CameraAltOutlinedIcon from '@mui/icons-material/CameraAltOutlined';
import MapOutlinedIcon from '@mui/icons-material/MapOutlined';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';

import { useStore } from '../store/useStore';
import { sendMessage } from '../agent/bridgeAgent';
import { captureScreenshot } from '../utils/screenshot';
import { getUIText } from '../content/uiText';

const TOUR_PROMPT = {
  en: 'Start a guided tour of the Saiyuen Bridge. Use move_camera, highlight_part, toggle_layer, set_explode, set_lighting and set_opacity tools as you narrate each step. Cover: 1) overview and history, 2) the foundation arch, 3) upper deck and railings, 4) construction sequence (explode view), 5) cultural meaning. End with the bridge reassembled and lighting restored to day.',
  zh: '開始西苑橋的導覽。在講解每個步驟時，使用 move_camera、highlight_part、toggle_layer、set_explode、set_lighting 和 set_opacity 工具。依序介紹：1) 整體概覽與歷史，2) 基礎拱橋，3) 橋面與欄杆，4) 建造順序（爆炸視圖），5) 文化意義。最後恢復橋樑組合狀態並還原為日間光線。請用繁體中文講解。',
};

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

const MATERIAL_REALISTIC    = ['concrete', 'limestone', 'marble', 'steel', 'wood', 'gold', 'jade'];
const MATERIAL_FANTASTICAL  = ['pumpkin', 'oogie', 'sandworm', 'jack', 'jacknight', 'jackpurple', 'beetle', 'beetlegreen', 'beetlered'];
const MATERIAL_LABEL = {
  granite:  { en: 'Granite',   zh: '花崗岩' },
  concrete: { en: 'Concrete',  zh: '混凝土' },
  limestone:{ en: 'Limestone', zh: '石灰石' },
  marble:   { en: 'Marble',    zh: '大理石' },
  steel:    { en: 'Steel',     zh: '鋼鐵'  },
  wood:     { en: 'Wood',      zh: '木材'  },
  gold:     { en: 'Gold',      zh: '黃金'  },
  jade:     { en: 'Jade',      zh: '翡翠'  },
  // Tim Burton — flat colour atmospherics
  pumpkin:    { en: 'Pumpkin',       zh: '南瓜'       }, // NBC Halloween Town
  oogie:      { en: 'Oogie',         zh: '骷髏麻袋'   }, // Oogie Boogie burlap
  sandworm:   { en: 'Sand Worm',     zh: '沙蟲'       }, // Beetlejuice worm
  // Jack Skellington — thin pinstripe suit, three colorways
  jack:       { en: 'Jack',          zh: '傑克(黑白)' },
  jacknight:  { en: 'Jack — Night',  zh: '傑克(午夜藍)' },
  jackpurple: { en: 'Jack — Haunt',  zh: '傑克(幽靈紫)' },
  // Beetlejuice — bold ragged-stripe suit, three colorways
  beetle:     { en: 'Beetlejuice',   zh: '甲蟲汁'     },
  beetlegreen:{ en: 'Beetle — Venom',zh: '甲蟲汁(毒綠)' },
  beetlered:  { en: 'Beetle — Chaos',zh: '甲蟲汁(地獄紅)' },
};

const PART_QUERIES = {
  base: {
    en: 'The visitor tapped the base/foundation. Move to the best view, highlight it, and explain it.',
    zh: '訪客點擊了基礎/拱橋部分。移動到最佳視角，高亮顯示並用繁體中文解說。',
    labelKey: 'base',
  },
  structure: {
    en: 'The visitor tapped the upper structure. Move to the best view, highlight it, and explain it.',
    zh: '訪客點擊了上部結構。移動到最佳視角，高亮顯示並用繁體中文解說。',
    labelKey: 'structure',
  },
};

function getRotationHint(azimuthRad, text) {
  if (azimuthRad >= -0.52 && azimuthRad <= 0.52) return text.chat.rotationHints.front;
  if ((azimuthRad >= 1.05 && azimuthRad <= 2.09) || (azimuthRad >= -2.09 && azimuthRad <= -1.05)) {
    return text.chat.rotationHints.side;
  }
  if (azimuthRad >= 2.62 || azimuthRad <= -2.62) return text.chat.rotationHints.rear;
  return null;
}

export default function AgentChat() {
  const agentChatOpen = useStore(state => state.agentChatOpen);
  const setAgentChatOpen = useStore(state => state.setAgentChatOpen);
  const chatHistory = useStore(state => state.chatHistory);
  const isAgentThinking = useStore(state => state.isAgentThinking);
  const clearChat = useStore(state => state.clearChat);
  const selectedPart = useStore(state => state.selectedPart);
  const cameraAzimuth = useStore(state => state.cameraAzimuth);
  const setShowBase = useStore(state => state.setShowBase);
  const setShowStructure = useStore(state => state.setShowStructure);
  const setSelectedPart = useStore(state => state.setSelectedPart);
  const setExplodeDistance = useStore(state => state.setExplodeDistance);
  const setBaseOpacity = useStore(state => state.setBaseOpacity);
  const setStructureOpacity = useStore(state => state.setStructureOpacity);
  const clearAnnotations = useStore(state => state.clearAnnotations);
  const language = useStore(state => state.language);
  const setShowAccordion = useStore(state => state.setShowAccordion);
  const showAccordion = useStore(state => state.showAccordion);
  const selectedDesign = useStore(state => state.selectedDesign);
  const setSelectedDesign = useStore(state => state.setSelectedDesign);
  const setDesignerOpen = useStore(state => state.setDesignerOpen);
  const designerOpen = useStore(state => state.designerOpen);
  const baseMaterial = useStore(state => state.baseMaterial);
  const setBaseMaterial = useStore(state => state.setBaseMaterial);
  const structureMaterial = useStore(state => state.structureMaterial);
  const setStructureMaterial = useStore(state => state.setStructureMaterial);

  const showBase = useStore(state => state.showBase);
  const showStructure = useStore(state => state.showStructure);
  const explodeDistance = useStore(state => state.explodeDistance);
  const baseOpacity = useStore(state => state.baseOpacity);
  const structureOpacity = useStore(state => state.structureOpacity);
  const hasToolActivity = !showBase || !showStructure || explodeDistance !== 0 || baseOpacity < 1 || structureOpacity < 1 || !!selectedDesign || baseMaterial !== 'granite' || structureMaterial !== 'granite';

  const [input, setInput] = useState('');
  const [rotationHint, setRotationHint] = useState(null);
  const [error, setError] = useState(null);
  const [isListening, setIsListening] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const [materialSuggestions, setMaterialSuggestions] = useState({ realistic: [], fantastical: [] });

  const messagesEndRef = useRef(null);
  const lastMessageRef = useRef('');
  const prevAzimuthRef = useRef(0);
  const hintTimeoutRef = useRef(null);
  const pendingPartRef = useRef(null);
  const recognitionRef = useRef(null);

  const isMobile = useMediaQuery('(max-width:834px)');
  const text = getUIText(language);

  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  const voiceSupported = !!SpeechRecognition;

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistory, isAgentThinking]);

  useEffect(() => {
    const query = selectedPart && PART_QUERIES[selectedPart];
    if (!query) return;
    if (pendingPartRef.current === selectedPart) return;

    pendingPartRef.current = selectedPart;
    setAgentChatOpen(true);
    setDesignerOpen(false);
    setShowAccordion(false);
    setError(null);

    const label = selectedPart === 'base' ? text.model.baseTitle : text.model.structureTitle;
    const message = query[language] ?? query.en;

    sendMessage(message, { label }).catch((err) => {
      setError(text.chat.agentError);
      console.error(err);
    }).finally(() => {
      pendingPartRef.current = null;
    });
  }, [selectedPart, setAgentChatOpen, setDesignerOpen, setShowAccordion, text.chat.agentError, text.model.baseTitle, text.model.structureTitle]);

  const handleRestore = () => {
    setShowBase(true);
    setShowStructure(true);
    setSelectedPart(null);
    setExplodeDistance(0);
    setBaseOpacity(1);
    setStructureOpacity(1);
    clearAnnotations();
    setSelectedDesign(null);
    setDesignerOpen(false);
    setBaseMaterial('granite');
    setStructureMaterial('granite');
  };

  const handleVoice = () => {
    if (!voiceSupported) return;
    if (isListening) {
      recognitionRef.current?.stop();
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = language === 'zh' ? 'zh-TW' : 'en-US';
    recognition.interimResults = false;
    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => setIsListening(false);
    recognition.onerror = () => setIsListening(false);
    recognition.onresult = (e) => {
      const transcript = e.results[0][0].transcript;
      if (transcript.trim()) handleSend(transcript.trim());
    };
    recognitionRef.current = recognition;
    recognition.start();
  };

  const handleScreenshot = () => {
    const dataUrl = captureScreenshot();
    if (!dataUrl) {
      setFeedback({ severity: 'error', message: text.chat.screenshotError });
      return;
    }

    const link = document.createElement('a');
    link.href = dataUrl;
    link.download = 'saiyuen-bridge.png';
    link.click();
    setFeedback({ severity: 'success', message: text.chat.screenshotSuccess });
  };

  const handleTour = () => {
    setError(null);
    sendMessage(TOUR_PROMPT[language] ?? TOUR_PROMPT.en, { label: text.chat.startTour }).catch((err) => {
      setError(text.chat.agentError);
      console.error(err);
    });
  };

  // Generate 2 realistic + 2 fantastical suggestions whenever the user taps a part
  useEffect(() => {
    if (!selectedPart) { setMaterialSuggestions({ realistic: [], fantastical: [] }); return; }
    const realistic   = [...MATERIAL_REALISTIC].sort(() => Math.random() - 0.5).slice(0, 2);
    const fantastical = [...MATERIAL_FANTASTICAL].sort(() => Math.random() - 0.5).slice(0, 2);
    setMaterialSuggestions({ realistic, fantastical });
  }, [selectedPart]);

  useEffect(() => {
    const delta = Math.abs(cameraAzimuth - prevAzimuthRef.current);
    prevAzimuthRef.current = cameraAzimuth;
    if (delta < 0.3 || !agentChatOpen) return;

    clearTimeout(hintTimeoutRef.current);
    const hint = getRotationHint(cameraAzimuth, text);
    if (hint) {
      setRotationHint(hint);
      hintTimeoutRef.current = setTimeout(() => setRotationHint(null), 3500);
    }

    return () => clearTimeout(hintTimeoutRef.current);
  }, [cameraAzimuth, agentChatOpen, text]);

  const handleSend = async (textValue) => {
    const msg = (textValue ?? input).trim();
    if (!msg || isAgentThinking) return;

    lastMessageRef.current = msg;
    setInput('');
    setError(null);

    try {
      await sendMessage(msg);
    } catch (err) {
      setError(text.chat.agentError);
      console.error(err);
    }
  };

  const visibleMessages = chatHistory.filter(m => m.role !== 'system');

  return (
    <>
      {/* FAB */}
      <Box sx={{
        position: 'fixed',
        bottom: isMobile && (agentChatOpen || showAccordion || designerOpen) ? 'calc(70vh + 12px)' : 8,
        left: 16,
        zIndex: 10000,
        transition: 'bottom 0.05s steps(1)',
      }}>
        <Tooltip title={agentChatOpen ? text.chat.fabClose : text.chat.fabOpen} placement="right">
          <Fab
            size="medium"
            onClick={() => {
              const next = !agentChatOpen;
              setAgentChatOpen(next);
              if (next) {
                setDesignerOpen(false);
                setShowAccordion(false);
              }
            }}
            sx={{
              ...sharp,
              bgcolor: agentChatOpen ? C.primaryDeep : 'rgba(13,13,13,0.88)',
              color: agentChatOpen ? '#fff' : C.primary,
              backdropFilter: 'blur(12px)',
              border: `1px solid ${agentChatOpen ? C.primaryDeep : C.outline}`,
              boxShadow: agentChatOpen
                ? `0 0 24px ${C.primaryGlow}`
                : '0 4px 20px rgba(0,0,0,0.6)',
              transition: 'background-color 0.05s steps(1), box-shadow 0.05s steps(1)',
              '&:hover': {
                bgcolor: agentChatOpen ? '#a00000' : 'rgba(192,1,0,0.12)',
                borderColor: C.primaryDeep,
              },
            }}
          >
            {agentChatOpen ? <CloseIcon /> : <ChatBubbleOutlineIcon />}
          </Fab>
        </Tooltip>
      </Box>

      {/* Chat panel */}
      {agentChatOpen && (
        <Box sx={{
          position: 'fixed',
          bottom: { xs: 0, sm: '9%' },
          left: { xs: 0, sm: '2%' },
          width: { xs: '100%', sm: '40%', md: '30%' },
          maxHeight: { xs: '70vh', sm: '70vh' },
          ...sharp,
          bgcolor: 'rgba(13,13,13,0.95)',
          backdropFilter: 'blur(20px)',
          border: `1px solid ${C.outline}`,
          borderTop: `2px solid ${C.primaryDeep}`,
          boxShadow: `0 0 40px rgba(192,1,0,0.06)`,
          zIndex: 9999,
          display: 'flex',
          flexDirection: 'column',
          animation: 'panelSlide 0.18s steps(6)',
          '@keyframes panelSlide': {
            from: { opacity: 0, transform: 'translateY(12px)' },
            to:   { opacity: 1, transform: 'translateY(0)' },
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
            <Box sx={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 2, bgcolor: C.primaryDeep }} />
            <Typography sx={{
              fontFamily: FONT_HEAD, fontWeight: 800,
              fontSize: 'clamp(11px, 2vw, 13px)',
              color: C.onSurface,
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              pl: 0.5,
            }}>
              {text.chat.title}
            </Typography>
            <Stack direction="row" spacing={0.5} alignItems="center">
              <Tooltip title={hasToolActivity ? text.chat.restore : text.chat.nothingToRestore} placement="left">
                <IconButton
                  size="small"
                  onClick={hasToolActivity ? handleRestore : undefined}
                  sx={{
                    ...sharp,
                    color: hasToolActivity ? C.primary : C.onSurfaceFaint,
                    cursor: hasToolActivity ? 'pointer' : 'default',
                    '&:hover': { color: hasToolActivity ? '#fff' : C.onSurfaceFaint, bgcolor: 'rgba(192,1,0,0.1)' },
                  }}
                >
                  <RestoreIcon fontSize="small" />
                </IconButton>
              </Tooltip>
              {visibleMessages.length > 0 && (
                <Tooltip title={text.chat.clearConversation} placement="left">
                  <IconButton
                    size="small"
                    onClick={clearChat}
                    sx={{ ...sharp, color: C.onSurfaceFaint, '&:hover': { color: C.onSurface, bgcolor: 'rgba(192,1,0,0.1)' } }}
                  >
                    <DeleteOutlineIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              )}
            </Stack>
          </Box>

          {/* Messages */}
          <Box sx={{
            flex: 1, overflowY: 'auto', px: 2, py: 1.5,
            display: 'flex', flexDirection: 'column', gap: 1.5,
            '&::-webkit-scrollbar': { width: '3px' },
            '&::-webkit-scrollbar-thumb': { bgcolor: 'rgba(96,62,57,0.6)' },
          }}>
            {/* Empty state */}
            {visibleMessages.length === 0 && (
              <Box>
                <Typography sx={{
                  fontFamily: FONT_LABEL, fontWeight: 400,
                  fontSize: 'clamp(10px, 1.8vw, 12px)',
                  color: C.onSurfaceDim, mb: 2, lineHeight: 1.7,
                }}>
                  {text.chat.empty}
                </Typography>
                <Stack direction="row" spacing={1} sx={{ mb: 1.5 }}>
                  <Chip
                    icon={<MapOutlinedIcon sx={{ color: `${C.primary} !important`, fontSize: 13 }} />}
                    label={text.chat.startTour}
                    size="small"
                    onClick={handleTour}
                    disabled={isAgentThinking}
                    sx={{
                      fontFamily: FONT_LABEL, fontSize: 10, fontWeight: 500,
                      ...sharp,
                      bgcolor: 'rgba(192,1,0,0.12)', color: C.primary,
                      border: `1px solid rgba(192,1,0,0.3)`,
                      letterSpacing: '0.06em',
                      cursor: 'pointer',
                      '&:hover': { bgcolor: 'rgba(192,1,0,0.22)' },
                    }}
                  />
                  <Chip
                    icon={<AutoAwesomeIcon sx={{ color: `${C.outlineStrong} !important`, fontSize: 13 }} />}
                    label={text.chat.designBridge}
                    size="small"
                    onClick={() => handleSend(language === 'zh'
                      ? '為這片景觀產生3個超真實橋樑設計方案，顯示所有風格。'
                      : 'Generate 3 hyperrealistic bridge design alternatives for this landscape. Show all styles.')}
                    disabled={isAgentThinking}
                    sx={{
                      fontFamily: FONT_LABEL, fontSize: 10, fontWeight: 500,
                      ...sharp,
                      bgcolor: 'rgba(177,135,128,0.1)', color: C.outlineStrong,
                      border: `1px solid rgba(177,135,128,0.3)`,
                      letterSpacing: '0.06em',
                      cursor: 'pointer',
                      '&:hover': { bgcolor: 'rgba(177,135,128,0.2)' },
                    }}
                  />
                </Stack>
                <Stack direction="row" flexWrap="wrap" gap={0.75}>
                  {text.chat.suggestedPrompts.map((prompt) => (
                    <Chip
                      key={prompt}
                      label={prompt}
                      size="small"
                      onClick={() => handleSend(prompt)}
                      sx={{
                        fontFamily: FONT_LABEL, fontSize: 10,
                        ...sharp,
                        bgcolor: C.surfaceHigh, color: C.onSurfaceDim,
                        border: `1px solid ${C.outline}`,
                        cursor: 'pointer',
                        '&:hover': { borderColor: C.outlineStrong, color: C.onSurface },
                      }}
                    />
                  ))}
                </Stack>
              </Box>
            )}

            {/* Message list */}
            {visibleMessages.map((msg, i) => (
              <Box key={i} sx={{ display: 'flex', justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start' }}>
                {msg._tapLabel ? (
                  <Chip
                    label={`${text.chat.tappedPrefix} ${msg._tapLabel}`}
                    size="small"
                    sx={{
                      fontFamily: FONT_LABEL, fontSize: 10, fontWeight: 500,
                      ...sharp,
                      bgcolor: 'rgba(192,1,0,0.12)', color: C.primary,
                      border: `1px solid rgba(192,1,0,0.3)`,
                      letterSpacing: '0.06em',
                    }}
                  />
                ) : (
                  <Box sx={{
                    maxWidth: '85%', px: 1.5, py: 1,
                    ...sharp,
                    bgcolor: msg.role === 'user'
                      ? 'rgba(192,1,0,0.12)'
                      : C.surfaceHigh,
                    border: '1px solid',
                    borderColor: msg.role === 'user'
                      ? 'rgba(192,1,0,0.3)'
                      : C.outline,
                    borderLeft: msg.role === 'user' ? undefined : `2px solid ${C.outline}`,
                  }}>
                    <Typography sx={{
                      fontFamily: FONT_LABEL, fontWeight: 400,
                      color: msg.role === 'user' ? C.primary : C.onSurface,
                      fontSize: 'clamp(10px, 1.8vw, 12px)', lineHeight: 1.7, whiteSpace: 'pre-wrap',
                    }}>
                      {msg.content}
                    </Typography>
                  </Box>
                )}
              </Box>
            ))}

            {/* Thinking indicator */}
            {isAgentThinking && (
              <Box sx={{ display: 'flex', justifyContent: 'flex-start' }}>
                <Box sx={{
                  px: 1.5, py: 1,
                  ...sharp,
                  bgcolor: C.surfaceHigh,
                  border: `1px solid ${C.outline}`,
                  borderLeft: `2px solid ${C.primaryDeep}`,
                }}>
                  <Box sx={{ display: 'flex', gap: 0.6, alignItems: 'center' }}>
                    {[0, 1, 2].map(i => (
                      <Box key={i} sx={{
                        width: 4, height: 4, bgcolor: C.primary,
                        animation: 'dotBounce 1.2s ease-in-out infinite',
                        animationDelay: `${i * 0.2}s`,
                        '@keyframes dotBounce': {
                          '0%, 80%, 100%': { transform: 'scale(0.6)', opacity: 0.3 },
                          '40%': { transform: 'scale(1)', opacity: 1 },
                        },
                      }} />
                    ))}
                  </Box>
                </Box>
              </Box>
            )}

            {/* Error */}
            {error && (
              <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.75 }}>
                <Typography sx={{
                  fontFamily: FONT_LABEL, fontWeight: 400,
                  fontSize: 'clamp(10px, 1.5vw, 11px)',
                  color: C.primary, textAlign: 'center', letterSpacing: '0.06em',
                }}>
                  {error}
                </Typography>
                {lastMessageRef.current && (
                  <Chip
                    label={text.common.retry}
                    size="small"
                    onClick={() => handleSend(lastMessageRef.current)}
                    disabled={isAgentThinking}
                    sx={{
                      fontFamily: FONT_LABEL, fontSize: 10, fontWeight: 500,
                      ...sharp, cursor: 'pointer',
                      bgcolor: 'rgba(192,1,0,0.12)', color: C.primary,
                      border: `1px solid rgba(192,1,0,0.3)`,
                      '&:hover': { bgcolor: 'rgba(192,1,0,0.22)' },
                    }}
                  />
                )}
              </Box>
            )}

            {/* Rotation hint */}
            {rotationHint && (
              <Box sx={{
                alignSelf: 'center', px: 1.5, py: 0.75,
                ...sharp,
                bgcolor: C.surfaceHigh,
                border: `1px solid ${C.outline}`,
                animation: 'hintFade 3.5s ease forwards',
                '@keyframes hintFade': {
                  '0%': { opacity: 0 }, '10%': { opacity: 1 },
                  '80%': { opacity: 1 }, '100%': { opacity: 0 },
                },
              }}>
                <Typography sx={{
                  fontFamily: FONT_LABEL, fontWeight: 400,
                  fontSize: 'clamp(9px, 1.5vw, 10px)',
                  color: C.onSurfaceDim, textAlign: 'center',
                  letterSpacing: '0.08em', textTransform: 'uppercase',
                }}>
                  {rotationHint}
                </Typography>
              </Box>
            )}

            {/* Material suggestions — shown when a part is tapped */}
            {selectedPart && (materialSuggestions.realistic.length > 0 || materialSuggestions.fantastical.length > 0) && (() => {
              const allShown = [...materialSuggestions.realistic, ...materialSuggestions.fantastical];
              const activeMaterial   = selectedPart === 'base' ? baseMaterial   : structureMaterial;
              const setActiveMaterial = selectedPart === 'base' ? setBaseMaterial : setStructureMaterial;
              const MatChip = ({ mat }) => {
                const active = activeMaterial === mat;
                return (
                  <Chip
                    key={mat}
                    label={MATERIAL_LABEL[mat]?.[language] ?? MATERIAL_LABEL[mat]?.en}
                    size="small"
                    onClick={() => setActiveMaterial(active ? 'granite' : mat)}
                    sx={{
                      fontFamily: FONT_LABEL, fontSize: 10, fontWeight: 500,
                      ...sharp,
                      bgcolor: active ? C.outlineStrong : C.surfaceHigh,
                      color: active ? C.surface : C.onSurfaceDim,
                      border: `1px solid ${active ? C.outlineStrong : C.outline}`,
                      letterSpacing: '0.06em', cursor: 'pointer',
                      transition: 'background-color 0.05s steps(1), border-color 0.05s steps(1)',
                      '&:hover': { bgcolor: active ? '#c9a099' : 'rgba(177,135,128,0.15)', borderColor: C.outlineStrong },
                    }}
                  />
                );
              };
              return (
                <Box sx={{
                  px: 1.5, py: 1, ...sharp,
                  bgcolor: C.surfaceLowest,
                  border: `1px solid ${C.outline}`,
                  borderLeft: `2px solid ${C.outlineStrong}`,
                  display: 'flex', flexDirection: 'column', gap: 1,
                }}>
                  {/* Realistic row */}
                  <Box>
                    <Typography sx={{
                      fontFamily: FONT_LABEL, fontWeight: 500, fontSize: 9,
                      color: C.onSurfaceFaint, letterSpacing: '0.12em',
                      textTransform: 'uppercase', mb: 0.5,
                    }}>
                      {language === 'zh' ? '材質' : 'Material'}
                    </Typography>
                    <Stack direction="row" spacing={0.75} flexWrap="wrap" gap={0.5}>
                      {materialSuggestions.realistic.map(mat => <MatChip key={mat} mat={mat} />)}
                    </Stack>
                  </Box>

                  {/* Fantastical row */}
                  <Box>
                    <Typography sx={{
                      fontFamily: FONT_LABEL, fontWeight: 500, fontSize: 9,
                      color: C.onSurfaceFaint, letterSpacing: '0.12em',
                      textTransform: 'uppercase', mb: 0.5,
                    }}>
                      {language === 'zh' ? '奇幻' : 'Fantastical'}
                    </Typography>
                    <Stack direction="row" spacing={0.75} flexWrap="wrap" gap={0.5}>
                      {materialSuggestions.fantastical.map(mat => (
                        <Chip
                          key={mat}
                          label={MATERIAL_LABEL[mat]?.[language] ?? MATERIAL_LABEL[mat]?.en}
                          size="small"
                          onClick={() => setActiveMaterial(activeMaterial === mat ? 'granite' : mat)}
                          sx={{
                            fontFamily: FONT_LABEL, fontSize: 10, fontWeight: 500,
                            ...sharp,
                            bgcolor: activeMaterial === mat ? 'rgba(96,62,57,0.9)' : 'rgba(20,16,16,0.9)',
                            color: activeMaterial === mat ? C.onSurface : C.onSurfaceDim,
                            border: `1px solid ${activeMaterial === mat ? C.outline : 'rgba(96,62,57,0.3)'}`,
                            letterSpacing: '0.06em', cursor: 'pointer',
                            transition: 'background-color 0.05s steps(1), border-color 0.05s steps(1)',
                            '&:hover': { bgcolor: 'rgba(96,62,57,0.5)', borderColor: C.outline },
                          }}
                        />
                      ))}
                    </Stack>
                  </Box>

                  {/* Reset — only if active material isn't in the current suggestion set */}
                  {activeMaterial !== 'granite' && !allShown.includes(activeMaterial) && (
                    <Chip
                      label={language === 'zh' ? '還原' : 'Reset'}
                      size="small"
                      onClick={() => setActiveMaterial('granite')}
                      sx={{
                        fontFamily: FONT_LABEL, fontSize: 10, fontWeight: 500,
                        alignSelf: 'flex-start', ...sharp,
                        bgcolor: 'transparent', color: C.onSurfaceFaint,
                        border: `1px solid ${C.outline}`,
                        letterSpacing: '0.06em', cursor: 'pointer',
                        '&:hover': { color: C.onSurface, borderColor: C.outlineStrong },
                      }}
                    />
                  )}
                </Box>
              );
            })()}

            <div ref={messagesEndRef} />
          </Box>

          {/* Input row */}
          <Box sx={{
            px: 2, pt: 1.25,
            pb: { xs: 'max(10px, env(safe-area-inset-bottom))', sm: 1.25 },
            borderTop: `1px solid ${C.outline}`,
            display: 'flex', gap: 1, alignItems: 'flex-end',
          }}>
            <TextField
              multiline
              maxRows={3}
              fullWidth
              size="small"
              placeholder={isListening ? text.chat.listening : text.chat.askPlaceholder}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              disabled={isAgentThinking || isListening}
              sx={{
                '& .MuiOutlinedInput-root': {
                  fontFamily: FONT_LABEL, fontWeight: 400,
                  fontSize: 'clamp(10px, 1.8vw, 12px)',
                  color: C.onSurface,
                  bgcolor: isListening ? 'rgba(192,1,0,0.06)' : C.surfaceLowest,
                  borderRadius: 0,
                  '& fieldset': {
                    borderColor: isListening ? 'rgba(192,1,0,0.5)' : C.outline,
                    borderRadius: 0,
                  },
                  '&:hover fieldset': {
                    borderColor: isListening ? C.primaryDeep : C.outlineStrong,
                  },
                  '&.Mui-focused fieldset': {
                    borderColor: C.primaryDeep,
                    borderWidth: '1px',
                  },
                },
                '& .MuiInputBase-input::placeholder': {
                  color: isListening ? C.primary : C.onSurfaceFaint,
                  opacity: 1,
                  fontFamily: FONT_LABEL,
                },
              }}
            />

            {/* Voice */}
            {voiceSupported && (
              <Tooltip title={isListening ? text.chat.stopListening : text.chat.speak} placement="top">
                <IconButton
                  onClick={handleVoice}
                  disabled={isAgentThinking}
                  sx={{
                    ...sharp,
                    color: isListening ? C.primary : C.onSurfaceFaint,
                    bgcolor: isListening ? 'rgba(192,1,0,0.12)' : 'transparent',
                    border: '1px solid',
                    borderColor: isListening ? 'rgba(192,1,0,0.4)' : C.outline,
                    p: 1, flexShrink: 0,
                    animation: isListening ? 'micPulse 1s ease-in-out infinite' : 'none',
                    '@keyframes micPulse': {
                      '0%, 100%': { boxShadow: `0 0 0 0 ${C.primaryGlow}` },
                      '50%':      { boxShadow: `0 0 0 5px rgba(192,1,0,0)` },
                    },
                    '&:hover': { bgcolor: 'rgba(192,1,0,0.1)', borderColor: C.primaryDeep },
                  }}
                >
                  {isListening ? <MicOffIcon fontSize="small" /> : <MicIcon fontSize="small" />}
                </IconButton>
              </Tooltip>
            )}

            {/* Screenshot */}
            <Tooltip title={text.chat.screenshotTooltip} placement="top">
              <IconButton
                onClick={handleScreenshot}
                sx={{
                  ...sharp,
                  color: C.onSurfaceFaint,
                  border: `1px solid ${C.outline}`,
                  p: 1, flexShrink: 0,
                  '&:hover': { bgcolor: 'rgba(192,1,0,0.1)', color: C.onSurface, borderColor: C.outlineStrong },
                }}
              >
                <CameraAltOutlinedIcon fontSize="small" />
              </IconButton>
            </Tooltip>

            {/* Send */}
            <IconButton
              onClick={() => handleSend()}
              disabled={!input.trim() || isAgentThinking}
              sx={{
                ...sharp,
                color: input.trim() && !isAgentThinking ? '#fff' : C.onSurfaceFaint,
                bgcolor: input.trim() && !isAgentThinking ? C.primaryDeep : 'transparent',
                border: '1px solid',
                borderColor: input.trim() && !isAgentThinking ? C.primaryDeep : C.outline,
                p: 1, flexShrink: 0,
                boxShadow: input.trim() && !isAgentThinking ? `0 0 12px ${C.primaryGlow}` : 'none',
                transition: 'background-color 0.05s steps(1), border-color 0.05s steps(1)',
                '&:hover': { bgcolor: input.trim() && !isAgentThinking ? '#a00000' : undefined },
                '&.Mui-disabled': { opacity: 0.3 },
              }}
            >
              <SendIcon fontSize="small" />
            </IconButton>
          </Box>
        </Box>
      )}

      <Snackbar
        open={!!feedback}
        autoHideDuration={2200}
        onClose={() => setFeedback(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        sx={{ zIndex: 10001 }}
      >
        <Alert severity={feedback?.severity ?? 'success'} onClose={() => setFeedback(null)}
          sx={{ fontFamily: FONT_LABEL, borderRadius: 0 }}>
          {feedback?.message}
        </Alert>
      </Snackbar>
    </>
  );
}
