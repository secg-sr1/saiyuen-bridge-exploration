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
import CameraAltOutlinedIcon from '@mui/icons-material/CameraAltOutlined';
import MapOutlinedIcon from '@mui/icons-material/MapOutlined';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';

import { useStore } from '../store/useStore';
import { sendMessage } from '../agent/bridgeAgent';
import { captureScreenshot } from '../utils/screenshot';
import { getUIText } from '../content/uiText';
import { track } from '../utils/analytics';

const TOUR_PROMPT = {
  en: 'Start a guided tour of the Saiyuen Bridge. Use move_camera, highlight_part, toggle_layer, set_explode, set_lighting and set_opacity tools as you narrate each step. Cover: 1) overview and history, 2) the foundation arch, 3) upper deck and railings, 4) construction sequence (explode view), 5) cultural meaning. End with the bridge reassembled and lighting restored to day.',
  zh: '開始西苑橋的導覽。在講解每個步驟時，使用 move_camera、highlight_part、toggle_layer、set_explode、set_lighting 和 set_opacity 工具。依序介紹：1) 整體概覽與歷史，2) 基礎拱橋，3) 橋面與欄杆，4) 建造順序（爆炸視圖），5) 文化意義。最後恢復橋樑組合狀態並還原為日間光線。請用繁體中文講解。',
};

const C = {
  bg:          '#F6F4F1',
  border:      '#E2DFDB',
  borderLight: '#EEECE8',
  ink:         '#111111',
  inkSub:      '#555555',
  inkMuted:    '#999999',
  inkFaint:    '#BBBBBB',
  chip:        '#EEECE8',
  chipActive:  '#111111',
};
const FONT_HEAD  = 'Manrope, Arial, sans-serif';
const FONT_LABEL = 'Manrope, Arial, sans-serif';
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
  const [feedback, setFeedback] = useState(null);
  const [materialSuggestions, setMaterialSuggestions] = useState({ realistic: [], fantastical: [] });

  const messagesEndRef = useRef(null);
  const lastMessageRef = useRef('');
  const prevAzimuthRef = useRef(0);
  const hintTimeoutRef = useRef(null);

  const isMobile = useMediaQuery('(max-width:834px)');
  const text = getUIText(language);


  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistory, isAgentThinking]);


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
    track('screenshot_captured');
    setFeedback({ severity: 'success', message: text.chat.screenshotSuccess });
  };

  const handleTour = () => {
    setError(null);
    track('guided_tour_started', { language });
    sendMessage(TOUR_PROMPT[language] ?? TOUR_PROMPT.en, { label: text.chat.startTour }).catch((err) => {
      setError(text.chat.agentError);
      console.error(err);
    });
  };

  // Generate 2 realistic + 2 fantastical suggestions whenever the user taps a part
  useEffect(() => {
    if (!selectedPart) { setMaterialSuggestions({ realistic: [], fantastical: [] }); return; }
    track('bridge_part_tapped', { part: selectedPart, language });
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

    track('chat_message_sent', { message_count: chatHistory.length + 1 });
    track('ai_question_asked', { question: msg.slice(0, 150), language });
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
      {/* FAB — hidden when any panel is open */}
      {!agentChatOpen && !designerOpen && !showAccordion && (
        <Box sx={{ position: 'fixed', bottom: 8, left: 16, zIndex: 10000 }}>
          <Tooltip title={text.chat.fabOpen} placement="right">
            <Fab
              size="medium"
              onClick={() => {
                setAgentChatOpen(true);
                track('chat_opened');
                setDesignerOpen(false);
                setShowAccordion(false);
              }}
              sx={{
                ...sharp,
                bgcolor: 'rgba(13,13,13,0.88)',
                color: '#fff',
                backdropFilter: 'blur(12px)',
                border: '1px solid rgba(255,255,255,0.15)',
                boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
                '&:hover': { bgcolor: 'rgba(30,30,30,0.92)' },
              }}
            >
              <ChatBubbleOutlineIcon />
            </Fab>
          </Tooltip>
        </Box>
      )}

      {/* Chat panel */}
      {agentChatOpen && (
        <>
          {/* Backdrop */}
          <Box
            onClick={() => setAgentChatOpen(false)}
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
            top: 0, left: 0, bottom: 0,
            width: { xs: '100%', sm: '400px', md: '420px' },
            bgcolor: 'rgba(246,244,241,0.88)',
            backdropFilter: 'blur(14px)',
            WebkitBackdropFilter: 'blur(14px)',
            color: C.ink,
            zIndex: 9999,
            display: 'flex',
            flexDirection: 'column',
            borderRight: { xs: 'none', sm: `1px solid ${C.border}` },
            animation: 'slideInLeft 0.24s ease-out',
            '@keyframes slideInLeft': {
              from: { opacity: 0, transform: 'translateX(-24px)' },
              to:   { opacity: 1, transform: 'translateX(0)' },
            },
          }}>

            {/* Header */}
            <Box sx={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              px: 3, py: 2,
              borderBottom: `1px solid ${C.border}`,
              flexShrink: 0,
            }}>
              <Typography sx={{
                fontFamily: FONT_HEAD, fontWeight: 800, fontSize: 12,
                letterSpacing: '0.14em', textTransform: 'uppercase', color: C.ink,
              }}>
                {text.chat.title}
              </Typography>
              <Stack direction="row" spacing={2} alignItems="center">
                <Tooltip title={hasToolActivity ? text.chat.restore : text.chat.nothingToRestore} placement="bottom">
                  <Typography
                    onClick={hasToolActivity ? handleRestore : undefined}
                    sx={{
                      fontFamily: FONT_HEAD, fontWeight: 400, fontSize: 11,
                      letterSpacing: '0.1em', textTransform: 'uppercase',
                      color: hasToolActivity ? C.inkMuted : C.inkFaint,
                      cursor: hasToolActivity ? 'pointer' : 'default',
                      transition: 'color 0.15s',
                      '&:hover': { color: hasToolActivity ? C.ink : C.inkFaint },
                    }}
                  >
                    RESTORE
                  </Typography>
                </Tooltip>
                {visibleMessages.length > 0 && (
                  <Typography
                    onClick={() => { track('chat_cleared'); clearChat(); }}
                    sx={{
                      fontFamily: FONT_HEAD, fontWeight: 400, fontSize: 11,
                      letterSpacing: '0.1em', textTransform: 'uppercase',
                      color: C.inkMuted, cursor: 'pointer', transition: 'color 0.15s',
                      '&:hover': { color: C.ink },
                    }}
                  >
                    CLEAR
                  </Typography>
                )}
                <Typography
                  onClick={() => setAgentChatOpen(false)}
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

            {/* Messages */}
            <Box sx={{
              flex: 1, overflowY: 'auto', px: 3, py: 2.5,
              display: 'flex', flexDirection: 'column', gap: 2,
              '&::-webkit-scrollbar': { width: '3px' },
              '&::-webkit-scrollbar-thumb': { bgcolor: C.border },
            }}>
              {/* Empty state */}
              {visibleMessages.length === 0 && (
                <Box>
                  <Typography sx={{
                    fontFamily: FONT_HEAD, fontWeight: 400, fontSize: 14,
                    color: C.inkSub, mb: 3, lineHeight: 1.8,
                  }}>
                    {text.chat.empty}
                  </Typography>

                  <Stack direction="row" spacing={1} sx={{ mb: 2.5 }}>
                    <Box
                      component="button"
                      onClick={handleTour}
                      disabled={isAgentThinking}
                      sx={{
                        display: 'flex', alignItems: 'center', gap: 0.75,
                        px: 1.5, py: 0.75, cursor: 'pointer',
                        bgcolor: 'transparent', color: C.ink,
                        border: `1px solid ${C.border}`,
                        fontFamily: FONT_HEAD, fontWeight: 600, fontSize: 11,
                        letterSpacing: '0.08em', textTransform: 'uppercase',
                        transition: 'border-color 0.15s',
                        '&:hover': { borderColor: C.ink },
                        '&:disabled': { opacity: 0.4, cursor: 'default' },
                      }}
                    >
                      <MapOutlinedIcon sx={{ fontSize: 13 }} />
                      {text.chat.startTour}
                    </Box>
                    <Box
                      component="button"
                      onClick={() => { track('design_bridge_clicked', { language }); handleSend(language === 'zh'
                        ? '為這片景觀產生3個超真實橋樑設計方案，顯示所有風格。'
                        : 'Generate 3 hyperrealistic bridge design alternatives for this landscape. Show all styles.'); }}
                      disabled={isAgentThinking}
                      sx={{
                        display: 'flex', alignItems: 'center', gap: 0.75,
                        px: 1.5, py: 0.75, cursor: 'pointer',
                        bgcolor: 'transparent', color: C.inkMuted,
                        border: `1px solid ${C.border}`,
                        fontFamily: FONT_HEAD, fontWeight: 400, fontSize: 11,
                        letterSpacing: '0.08em', textTransform: 'uppercase',
                        transition: 'border-color 0.15s, color 0.15s',
                        '&:hover': { borderColor: C.ink, color: C.ink },
                        '&:disabled': { opacity: 0.4, cursor: 'default' },
                      }}
                    >
                      <AutoAwesomeIcon sx={{ fontSize: 13 }} />
                      {text.chat.designBridge}
                    </Box>
                  </Stack>

                  <Box sx={{ borderTop: `1px solid ${C.borderLight}`, pt: 2 }}>
                    <Typography sx={{
                      fontFamily: FONT_HEAD, fontWeight: 400, fontSize: 10,
                      letterSpacing: '0.1em', textTransform: 'uppercase',
                      color: C.inkFaint, mb: 1.25,
                    }}>
                      SUGGESTED
                    </Typography>
                    <Stack direction="column" gap={0}>
                      {text.chat.suggestedPrompts.map((prompt) => (
                        <Box
                          key={prompt}
                          onClick={() => handleSend(prompt)}
                          sx={{
                            display: 'flex', alignItems: 'center', gap: 1,
                            py: 1.1, borderBottom: `1px solid ${C.borderLight}`,
                            cursor: 'pointer',
                            '&:hover .prompt-text': { color: C.ink },
                          }}
                        >
                          <Typography sx={{ color: C.inkFaint, fontSize: 13, lineHeight: 1, flexShrink: 0 }}>›</Typography>
                          <Typography
                            className="prompt-text"
                            sx={{
                              fontFamily: FONT_HEAD, fontWeight: 400, fontSize: 13,
                              color: C.inkMuted, transition: 'color 0.15s',
                            }}
                          >
                            {prompt}
                          </Typography>
                        </Box>
                      ))}
                    </Stack>
                  </Box>
                </Box>
              )}

              {/* Message list */}
              {visibleMessages.map((msg, i) => (
                <Box key={i} sx={{ display: 'flex', justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start' }}>
                  {msg._tapLabel ? (
                    <Box sx={{
                      display: 'inline-flex', alignItems: 'center',
                      px: 1.25, py: 0.5,
                      bgcolor: C.chip, border: `1px solid ${C.border}`,
                    }}>
                      <Typography sx={{
                        fontFamily: FONT_HEAD, fontWeight: 500, fontSize: 10,
                        letterSpacing: '0.08em', textTransform: 'uppercase', color: C.inkSub,
                      }}>
                        {text.chat.tappedPrefix} {msg._tapLabel}
                      </Typography>
                    </Box>
                  ) : (
                    <Box sx={{
                      maxWidth: '88%',
                      px: msg.role === 'user' ? 1.5 : 0,
                      py: msg.role === 'user' ? 1 : 0,
                      bgcolor: msg.role === 'user' ? C.chip : 'transparent',
                      border: msg.role === 'user' ? `1px solid ${C.border}` : 'none',
                    }}>
                      <Typography sx={{
                        fontFamily: FONT_HEAD, fontWeight: 400,
                        color: msg.role === 'user' ? C.ink : C.inkSub,
                        fontSize: 13, lineHeight: 1.8, whiteSpace: 'pre-wrap',
                      }}>
                        {msg.content}
                      </Typography>
                    </Box>
                  )}
                </Box>
              ))}

              {/* Thinking indicator */}
              {isAgentThinking && (
                <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center', py: 0.5 }}>
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
              )}

              {/* Error */}
              {error && (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  <Typography sx={{
                    fontFamily: FONT_HEAD, fontWeight: 400, fontSize: 13,
                    color: '#AA0000', lineHeight: 1.7,
                  }}>
                    {error}
                  </Typography>
                  {lastMessageRef.current && (
                    <Box
                      component="button"
                      onClick={() => handleSend(lastMessageRef.current)}
                      disabled={isAgentThinking}
                      sx={{
                        alignSelf: 'flex-start', px: 1.5, py: 0.6,
                        bgcolor: 'transparent', color: C.ink,
                        border: `1px solid ${C.border}`,
                        fontFamily: FONT_HEAD, fontWeight: 600, fontSize: 10,
                        letterSpacing: '0.1em', textTransform: 'uppercase',
                        cursor: 'pointer', transition: 'border-color 0.15s',
                        '&:hover': { borderColor: C.ink },
                      }}
                    >
                      {text.common.retry}
                    </Box>
                  )}
                </Box>
              )}

              {/* Rotation hint */}
              {rotationHint && (
                <Box sx={{
                  alignSelf: 'center', px: 2, py: 0.75,
                  bgcolor: C.chip, border: `1px solid ${C.border}`,
                  animation: 'hintFade 3.5s ease forwards',
                  '@keyframes hintFade': {
                    '0%': { opacity: 0 }, '10%': { opacity: 1 },
                    '80%': { opacity: 1 }, '100%': { opacity: 0 },
                  },
                }}>
                  <Typography sx={{
                    fontFamily: FONT_HEAD, fontWeight: 400, fontSize: 11,
                    color: C.inkMuted, textAlign: 'center', letterSpacing: '0.06em',
                  }}>
                    {rotationHint}
                  </Typography>
                </Box>
              )}

              {/* Material suggestions */}
              {selectedPart && (materialSuggestions.realistic.length > 0 || materialSuggestions.fantastical.length > 0) && (() => {
                const allShown = [...materialSuggestions.realistic, ...materialSuggestions.fantastical];
                const activeMaterial    = selectedPart === 'base' ? baseMaterial    : structureMaterial;
                const setActiveMaterial = selectedPart === 'base' ? setBaseMaterial : setStructureMaterial;
                const MatChip = ({ mat }) => {
                  const active = activeMaterial === mat;
                  return (
                    <Box
                      key={mat}
                      onClick={() => { const next = active ? 'granite' : mat; track('material_selected', { material: next, part: selectedPart }); setActiveMaterial(next); }}
                      sx={{
                        px: 1.25, py: 0.5, cursor: 'pointer',
                        bgcolor: active ? C.ink : C.chip,
                        color: active ? '#fff' : C.inkSub,
                        border: `1px solid ${active ? C.ink : C.border}`,
                        transition: 'background-color 0.15s, color 0.15s',
                        '&:hover': { borderColor: C.ink, color: active ? '#fff' : C.ink },
                      }}
                    >
                      <Typography sx={{ fontFamily: FONT_HEAD, fontWeight: active ? 600 : 400, fontSize: 11, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                        {MATERIAL_LABEL[mat]?.[language] ?? MATERIAL_LABEL[mat]?.en}
                      </Typography>
                    </Box>
                  );
                };
                return (
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, p: 1.5, border: `1px solid ${C.border}`, bgcolor: '#FFFFFF' }}>
                    <Box>
                      <Typography sx={{ fontFamily: FONT_HEAD, fontWeight: 400, fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: C.inkFaint, mb: 0.75 }}>
                        {language === 'zh' ? '材質' : 'MATERIAL'}
                      </Typography>
                      <Stack direction="row" flexWrap="wrap" gap={0.75}>
                        {materialSuggestions.realistic.map(mat => <MatChip key={mat} mat={mat} />)}
                      </Stack>
                    </Box>
                    <Box>
                      <Typography sx={{ fontFamily: FONT_HEAD, fontWeight: 400, fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: C.inkFaint, mb: 0.75 }}>
                        {language === 'zh' ? '奇幻' : 'FANTASTICAL'}
                      </Typography>
                      <Stack direction="row" flexWrap="wrap" gap={0.75}>
                        {materialSuggestions.fantastical.map(mat => <MatChip key={mat} mat={mat} />)}
                      </Stack>
                    </Box>
                    {activeMaterial !== 'granite' && !allShown.includes(activeMaterial) && (
                      <Box
                        component="button"
                        onClick={() => setActiveMaterial('granite')}
                        sx={{
                          alignSelf: 'flex-start', px: 1.25, py: 0.5,
                          bgcolor: 'transparent', color: C.inkMuted,
                          border: `1px solid ${C.border}`,
                          fontFamily: FONT_HEAD, fontWeight: 400, fontSize: 11,
                          letterSpacing: '0.08em', textTransform: 'uppercase',
                          cursor: 'pointer', transition: 'border-color 0.15s',
                          '&:hover': { borderColor: C.ink, color: C.ink },
                        }}
                      >
                        {language === 'zh' ? '還原' : 'RESET'}
                      </Box>
                    )}
                  </Box>
                );
              })()}

              <div ref={messagesEndRef} />
            </Box>

            {/* Input row */}
            <Box sx={{
              px: 3, pt: 2,
              pb: { xs: 'max(16px, env(safe-area-inset-bottom))', sm: 2 },
              borderTop: `1px solid ${C.border}`,
              display: 'flex', gap: 1, alignItems: 'flex-end',
              flexShrink: 0,
            }}>
              <TextField
                multiline
                maxRows={3}
                fullWidth
                size="small"
                placeholder={text.chat.askPlaceholder}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
                disabled={isAgentThinking}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    fontFamily: FONT_HEAD, fontWeight: 400,
                    fontSize: 13, color: C.ink,
                    bgcolor: '#FFFFFF',
                    borderRadius: 0,
                    '& fieldset': { borderColor: C.border, borderRadius: 0 },
                    '&:hover fieldset': { borderColor: C.inkMuted },
                    '&.Mui-focused fieldset': { borderColor: C.ink, borderWidth: '1px' },
                  },
                  '& .MuiInputBase-input::placeholder': {
                    color: C.inkFaint, opacity: 1, fontFamily: FONT_HEAD,
                  },
                }}
              />


              <Tooltip title={text.chat.screenshotTooltip} placement="top">
                <IconButton
                  onClick={handleScreenshot}
                  sx={{
                    ...sharp, p: 1, flexShrink: 0,
                    color: C.inkMuted, border: `1px solid ${C.border}`,
                    '&:hover': { borderColor: C.ink, color: C.ink },
                  }}
                >
                  <CameraAltOutlinedIcon fontSize="small" />
                </IconButton>
              </Tooltip>

              <IconButton
                onClick={() => handleSend()}
                disabled={!input.trim() || isAgentThinking}
                sx={{
                  ...sharp, p: 1, flexShrink: 0,
                  color: input.trim() && !isAgentThinking ? '#fff' : C.inkFaint,
                  bgcolor: input.trim() && !isAgentThinking ? C.ink : 'transparent',
                  border: `1px solid ${input.trim() && !isAgentThinking ? C.ink : C.border}`,
                  transition: 'background-color 0.15s, color 0.15s',
                  '&:hover': { bgcolor: input.trim() && !isAgentThinking ? '#333' : undefined },
                  '&.Mui-disabled': { opacity: 0.3 },
                }}
              >
                <SendIcon fontSize="small" />
              </IconButton>
            </Box>
          </Box>
        </>
      )}

      <Snackbar
        open={!!feedback}
        autoHideDuration={2200}
        onClose={() => setFeedback(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        sx={{ zIndex: 10001 }}
      >
        <Alert severity={feedback?.severity ?? 'success'} onClose={() => setFeedback(null)}
          sx={{ fontFamily: FONT_HEAD, borderRadius: 0 }}>
          {feedback?.message}
        </Alert>
      </Snackbar>
    </>
  );
}
