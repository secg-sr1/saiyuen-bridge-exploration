import { create } from "zustand";

export let useStore = create((set) => ({

  value: 'RGB',
  currentValue: () => set(state => ({ value: state.value })),
  setValue: (newValue) => set({ value: newValue }),

  showTrace: false,
  setShowTrace: (show) => set({ showTrace: show }),

  showBase: true,
  setShowBase: (showbase) => set({ showBase: showbase }),

  showStructure: true,
  setShowStructure: (showstructure) => set({ showStructure: showstructure }),

  // Tap-to-Ask: which mesh part the user tapped ('base' | 'structure' | null)
  selectedPart: null,
  setSelectedPart: (part) => set({ selectedPart: part }),

  // Agent chat panel open/close
  agentChatOpen: false,
  setAgentChatOpen: (open) => set({ agentChatOpen: open }),

  // Agent thinking/loading state
  isAgentThinking: false,
  setIsAgentThinking: (thinking) => set({ isAgentThinking: thinking }),

  // Conversation history (OpenAI message format: {role, content})
  chatHistory: [],
  addMessage: (message) => set((state) => ({ chatHistory: [...state.chatHistory, message] })),
  clearChat: () => set({ chatHistory: [], selectedPart: null, seenTopics: [], annotations: [] }),

  // Carousel slide — moved to store so agent can drive it
  activeCarouselSlide: 0,
  setActiveCarouselSlide: (idx) => set({ activeCarouselSlide: idx }),

  // Camera azimuth angle (radians) updated by OrbitControls
  cameraAzimuth: 0,
  setCameraAzimuth: (angle) => set({ cameraAzimuth: angle }),

  // Agent-directed camera: target spherical position to animate toward
  cameraTarget: null,
  setCameraTarget: (target) => set({ cameraTarget: target }),

  // Explode view: offset (world units) applied to structure group Y position
  explodeDistance: 0,
  setExplodeDistance: (d) => set({ explodeDistance: d }),

  // X-Ray opacity for each layer (1 = fully opaque)
  baseOpacity: 1,
  setBaseOpacity: (v) => set({ baseOpacity: v }),
  structureOpacity: 1,
  setStructureOpacity: (v) => set({ structureOpacity: v }),

  // Lighting mode: 'day' | 'dusk' | 'night'
  lightingMode: 'day',
  setLightingMode: (mode) => set({ lightingMode: mode }),

  // Agent memory: set of topic keys the agent has already covered this session
  seenTopics: [],
  markTopicSeen: (topic) => set((state) => ({
    seenTopics: state.seenTopics.includes(topic) ? state.seenTopics : [...state.seenTopics, topic],
  })),
  clearSeenTopics: () => set({ seenTopics: [] }),

  // Screenshot: a data-URL written by Model.jsx, read by AgentChat to trigger download
  screenshotDataUrl: null,
  setScreenshotDataUrl: (url) => set({ screenshotDataUrl: url }),

  // Camera feed availability for UX fallback states
  cameraFeedAvailable: false,
  setCameraFeedAvailable: (available) => set({ cameraFeedAvailable: available }),

  // 3D annotation pins placed by the agent: [{ id, label, position: [x,y,z] }]
  annotations: [],
  addAnnotation: (annotation) => set((state) => ({
    annotations: [...state.annotations, { id: Date.now(), ...annotation }],
  })),
  clearAnnotations: () => set({ annotations: [] }),

  // UI language: 'en' | 'zh'
  language: 'en',
  setLanguage: (lang) => set({ language: lang }),

  // Info panel open/close (moved to store for cross-component mutual exclusion)
  showAccordion: false,
  setShowAccordion: (open) => set({ showAccordion: open }),

  // Bridge Designer: AI-generated design options panel
  designerOpen: false,
  setDesignerOpen: (open) => set({ designerOpen: open }),

  isGeneratingDesigns: false,
  setIsGeneratingDesigns: (v) => set({ isGeneratingDesigns: v }),

  regeneratingDesignId: null,  // id of card being individually regenerated
  setRegeneratingDesignId: (id) => set({ regeneratingDesignId: id }),

  designOptions: [],           // [{ id, label, lightingId, lightingLabel, url, generatedAt }]
  setDesignOptions: (opts) => set({ designOptions: opts }),
  updateDesignOption: (opt) => set((state) => ({
    designOptions: state.designOptions.map(o => o.id === opt.id ? opt : o),
  })),

  selectedDesign: null,        // full design object | null
  setSelectedDesign: (d) => set({ selectedDesign: d }),

  designBlendOpacity: 0.65,
  setDesignBlendOpacity: (v) => set({ designBlendOpacity: v }),

  // User-facing generation config (drives the in-panel configurator)
  designConfig: { styleIds: ['stone-arch', 'concrete', 'steel-glass'], lighting: 'golden' },
  setDesignConfig: (patch) => set((state) => ({
    designConfig: { ...state.designConfig, ...patch },
  })),

  // History of all generated images (newest first, capped at 20)
  designHistory: [],
  addToDesignHistory: (items) => set((state) => ({
    designHistory: [...items, ...state.designHistory].slice(0, 20),
  })),

  // Uploaded landscape photo (base64 data URL) used to tailor DALL-E prompts
  uploadedLandscape: null,
  setUploadedLandscape: (dataUrl) => set({ uploadedLandscape: dataUrl }),

  // Material override per layer ('granite' = original appearance)
  baseMaterial: 'granite',
  setBaseMaterial: (material) => set({ baseMaterial: material }),
  structureMaterial: 'granite',
  setStructureMaterial: (material) => set({ structureMaterial: material }),

}));
