import OpenAI from 'openai';
import { useStore } from '../store/useStore';
import { generateBridgeDesigns } from './bridgeDesigner';

const client = new OpenAI({
  apiKey: import.meta.env.VITE_OPENAI_API_KEY,
  dangerouslyAllowBrowser: true,
});

const PARK_KNOWLEDGE_EN = `
About Saiyuen Camping Adventure Park (www.saiyuen.com):
- Location: Cheung Chau island, Hong Kong
- Contact: +852 2981 1010 | booking@saiyuen.com
- Accommodation (40+ options): Sunset Vista dome tents (~300 sq ft on ~3,000 sq ft lawn), African Safari Tents (up to 9 guests), Mongolian Ger (up to 4), Geodesic Dome / star-gazing (up to 4), Native American Teepee (up to 12), Fantasy tents, Oasis, Wild Camping, Bamboo Cabin
- Adventure activities: Tree Top Canopy Walk (Hong Kong's only ACCT-certified canopy walk & ziplines), Climbing Monkeys, Brave Cube, Junior Abseiling, Bubble Soccer, Disc Golf, Barrier Archery Combat
- Fun activities: Lawn games (KUBB, Ladder Ball, Molkky, Cornhole), board games, model boats, goat pen, bubble waffle workshop, beggar's chicken cooking, arts & crafts, aquaponics field study, ant research with University of Hong Kong
- Group services: team building, day camps (Little Farmer programme, Wild Adventure Challenge), venue hire for weddings, conferences, banquets, MICE events
- Booking: via website or book-directonline.com/properties/saiyuen
`;

const PARK_KNOWLEDGE_ZH = `
關於西苑露營探險公園（www.saiyuen.com）：
- 地點：香港長洲島
- 聯絡：+852 2981 1010 | booking@saiyuen.com
- 住宿（逾40種選擇）：落日景觀球形帳篷（約300平方呎，草坪約3,000平方呎）、非洲狩獵帳篷（最多9人）、蒙古包（最多4人）、觀星球形帳篷（最多4人）、美洲原住民帳篷（最多12人）、夢幻帳篷、綠洲、野外露營、竹屋
- 探險活動：樹頂天篷步道（香港唯一ACCT認證高空繩網及滑索）、攀爬猴子、勇敢方塊、初級繩降、泡泡足球、飛碟高爾夫、弓箭障礙戰
- 趣味活動：草地遊戲（KUBB、梯球、Molkky、玉米洞）、桌遊、模型船、羊仔欄、雞蛋仔工作坊、叫化雞烹飪、手工藝、魚菜共生實地考察、與香港大學合作的螞蟻研究
- 團體服務：團隊建立活動、夏日/日營（小農夫課程、野外挑戰）、婚宴、會議、MICE場地租用
- 訂票：網站或 book-directonline.com/properties/saiyuen
`;

const SYSTEM_PROMPT_EN = `You are an expert AR guide for the Saiyuen Bridge (西苑橋) in Sai Kung Country Park, Hong Kong. You help visitors understand this historic pedestrian bridge through an interactive 3D visualization.

About the Saiyuen Bridge:
- Location: Sai Kung Country Park, New Territories, Hong Kong
- Type: Traditional stone pedestrian arch bridge
- Historical significance: One of Hong Kong's historic rural bridges, connecting villages in the Sai Kung area
- Cultural meaning: 象徵著過去與未來的連接 — "a symbol of connection between past and future"
- Construction: Built from local granite stone using traditional masonry techniques
- The bridge spans a natural stream in the country park, surrounded by lush forest
- It is a protected heritage structure reflecting the rural character of Sai Kung

The 3D model has two toggleable layers:
- Base: The foundation layer — stone piers, arch voussoirs, and lower structural elements that transfer load to the ground
- Structure: The upper deck and railings — the walkable surface, parapet walls, and guardrails

You can control the 3D visualization and help visitors explore the bridge. Keep answers concise (2–4 sentences) and engaging. Use the tools naturally as part of your explanation.

Camera viewpoints: front, side-left, side-right, rear, top (bird's eye), angle-front, angle-side.
Explode distance: 0 = assembled, 0.5–1.5 = separated. Restore to 0 after explaining.
Opacity: 1.0 = opaque, 0.25–0.5 = X-ray. Restore to 1.0 after explaining.
Lighting: day = bright natural, dusk = warm golden, night = dark blue ambient.
Materials: use set_material to change the bridge surface. Realistic: granite (restore), concrete, limestone, marble, steel, wood, gold, jade. Tim Burton atmospherics: pumpkin (NBC Halloween Town orange), oogie (Oogie Boogie burlap), sandworm (Beetlejuice desert worm). Jack Skellington pinstripe suit textures: jack (black/white), jacknight (deep navy/ice blue), jackpurple (deep purple/lavender). Beetlejuice bold ragged-stripe suit textures: beetle (black/dirty-white), beetlegreen (black/sickly lime), beetlered (black/hellfire red). Restore to granite after exploring.
Annotations: use place_annotation to label specific architectural features while explaining them. Clear with clear_annotations when done.

When the seen-topics list in the context includes a topic, do NOT re-explain it. Instead build on it or suggest what to explore next.
Respond in English.

${PARK_KNOWLEDGE_EN}`;

const SYSTEM_PROMPT_ZH = `你是西苑橋（Saiyuen Bridge）的專業AR導覽員，該橋位於香港西貢郊野公園。你通過互動式3D可視化幫助遊客了解這座歷史性行人橋。

關於西苑橋：
- 地點：香港新界西貢郊野公園
- 類型：傳統石砌行人拱橋
- 歷史意義：香港鄉村歷史橋樑之一，連接西貢地區各村莊
- 文化意義：象徵著過去與未來的連接
- 建造：採用當地花崗岩以傳統砌石技術建造
- 橋樑橫跨郊野公園內的天然溪流，四周林木繁盛
- 受保護的歷史建築，體現西貢的鄉村特色

3D模型有兩個可切換圖層：
- 底座（Base）：基礎層——石橋墩、拱券石和將荷載傳至地面的下部結構
- 結構（Structure）：上層甲板和護欄——可行走的橋面、矮牆和欄杆

你可以控制3D可視化，幫助遊客探索此橋。回答要簡潔（2-4句），生動有趣。自然地使用工具輔助說明。

相機視角：front（正面）、side-left（左側）、side-right（右側）、rear（背面）、top（鳥瞰）、angle-front（前方斜視）、angle-side（側面斜視）。
爆炸距離：0=組合狀態，0.5–1.5=分離狀態。說明後恢復為0。
透明度：1.0=不透明，0.25–0.5=X光透視。說明後恢復為1.0。
光線：day=明亮自然光，dusk=暖金色光，night=深藍夜間氛圍。
材質：使用set_material更改橋樑表面材質。真實材質：granite花崗岩（還原）、concrete混凝土、limestone石灰石、marble大理石、steel鋼鐵、wood木材、gold黃金、jade翡翠。提姆波頓氛圍：pumpkin南瓜橘（萬聖城）、oogie粗麻袋、sandworm沙蟲皮。傑克骷髏條紋西裝：jack（黑/白）、jacknight（深藍/冰藍）、jackpurple（深紫/薰衣草）。甲蟲汁粗條紋西裝：beetle（黑/髒白）、beetlegreen（黑/毒綠）、beetlered（黑/地獄紅）。訪客探索完畢後恢復為granite。
標註：使用place_annotation在說明建築特徵時添加3D標籤。完成後用clear_annotations清除。

若seen-topics列表中已包含某主題，請勿重複說明，而是進一步延伸或建議下一個探索點。
請用繁體中文回答。

${PARK_KNOWLEDGE_ZH}`;

// Topics the agent can mark as seen so it doesn't repeat itself
const TOPIC_KEYWORDS = {
  foundation:  ['foundation', 'base', 'pier', 'arch', 'voussoir', 'abutment'],
  structure:   ['structure', 'deck', 'railing', 'parapet', 'walkway', 'guardrail'],
  history:     ['history', 'built', 'heritage', 'historic', 'village', 'rural', 'construction'],
  symbolism:   ['symbol', 'meaning', 'past', 'future', 'connection', '象徵'],
  materials:   ['granite', 'stone', 'masonry', 'material'],
  location:    ['sai kung', 'country park', 'hong kong', 'stream', 'forest'],
};

function detectTopics(text) {
  const lower = text.toLowerCase();
  return Object.entries(TOPIC_KEYWORDS)
    .filter(([, kws]) => kws.some(kw => lower.includes(kw)))
    .map(([topic]) => topic);
}

const TOOLS = [
  {
    type: 'function',
    function: {
      name: 'toggle_layer',
      description: 'Show or hide a bridge layer in the 3D visualization.',
      parameters: {
        type: 'object',
        properties: {
          layer: { type: 'string', enum: ['base', 'structure', 'both'] },
          visible: { type: 'boolean' },
        },
        required: ['layer', 'visible'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'navigate_to_slide',
      description: 'Navigate the image carousel to a specific slide.',
      parameters: {
        type: 'object',
        properties: {
          slide: { type: 'integer', minimum: 0, maximum: 2,
            description: '0: first render, 1: second render, 2: instructions' },
        },
        required: ['slide'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'move_camera',
      description: 'Animate the camera to the best viewpoint for what you are about to explain.',
      parameters: {
        type: 'object',
        properties: {
          view: { type: 'string',
            enum: ['front', 'side-left', 'side-right', 'rear', 'top', 'angle-front', 'angle-side'] },
        },
        required: ['view'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'set_explode',
      description: 'Separate bridge layers vertically to show construction sequence. Use 0 to reassemble.',
      parameters: {
        type: 'object',
        properties: {
          distance: { type: 'number', minimum: 0, maximum: 2,
            description: '0 = assembled, 1.0 = clearly separated' },
        },
        required: ['distance'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'set_opacity',
      description: 'Make a layer semi-transparent (X-Ray). Restore to 1.0 after explaining.',
      parameters: {
        type: 'object',
        properties: {
          layer: { type: 'string', enum: ['base', 'structure'] },
          opacity: { type: 'number', minimum: 0.1, maximum: 1,
            description: '1.0 = opaque, 0.3 = semi-transparent' },
        },
        required: ['layer', 'opacity'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'highlight_part',
      description: "Highlight a part of the bridge to draw attention to it.",
      parameters: {
        type: 'object',
        properties: {
          part: { type: 'string', enum: ['base', 'structure', 'none'] },
        },
        required: ['part'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'place_annotation',
      description: 'Place a floating 3D label on a named architectural feature of the bridge.',
      parameters: {
        type: 'object',
        properties: {
          label: { type: 'string', description: 'Short label text, e.g. "Keystone", "拱頂石"' },
          feature: {
            type: 'string',
            enum: ['keystone', 'arch', 'left-pier', 'right-pier', 'deck-center', 'left-railing', 'right-railing', 'left-abutment', 'right-abutment'],
            description: 'Named architectural feature to attach the pin to',
          },
        },
        required: ['label', 'feature'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'clear_annotations',
      description: 'Remove all annotation pins from the 3D scene.',
      parameters: { type: 'object', properties: {} },
    },
  },
  {
    type: 'function',
    function: {
      name: 'generate_bridge_designs',
      description:
        'Generate hyperrealistic AI images of bridge design alternatives set in the Saiyuen landscape. ' +
        'Opens an interactive design gallery so the visitor can compare options and blend the chosen design over the real camera view. ' +
        'Call this whenever the user asks to see design options, imagine alternative bridges, or visualize different styles.',
      parameters: {
        type: 'object',
        properties: {
          styles: {
            type: 'array',
            items: { type: 'string', enum: ['stone-arch', 'concrete', 'steel-glass', 'timber', 'ancient', 'biophilic', 'bamboo'] },
            description: 'Which styles to generate. Pass an empty array to use the user\'s current selection. Suggest 2–3 contrasting styles.',
          },
          lighting: {
            type: 'string',
            enum: ['dawn', 'midday', 'golden', 'night'],
            description: 'Lighting mood for all generated images. Match the current scene lightingMode when possible.',
          },
        },
        required: ['styles', 'lighting'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'set_lighting',
      description: 'Change the scene lighting mood to match your narration.',
      parameters: {
        type: 'object',
        properties: {
          mode: { type: 'string', enum: ['day', 'dusk', 'night'],
            description: 'day = bright natural, dusk = warm golden, night = dark blue' },
        },
        required: ['mode'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'set_material',
      description: 'Change the surface material of one or both bridge layers. Use granite to restore. Apply to the layer the visitor just tapped when context is clear.',
      parameters: {
        type: 'object',
        properties: {
          material: {
            type: 'string',
            enum: ['granite', 'concrete', 'limestone', 'marble', 'steel', 'wood', 'gold', 'jade', 'pumpkin', 'oogie', 'sandworm', 'jack', 'jacknight', 'jackpurple', 'beetle', 'beetlegreen', 'beetlered'],
            description: 'granite = original stone (restore), concrete, limestone, marble, steel, wood, gold, jade; Tim Burton atmospherics: pumpkin = NBC Halloween Town orange, oogie = Oogie Boogie burlap, sandworm = Beetlejuice desert worm; Jack Skellington pinstripe suit: jack = black/white, jacknight = deep navy/ice blue, jackpurple = deep purple/lavender; Beetlejuice bold ragged-stripe suit: beetle = black/dirty-white, beetlegreen = black/sickly lime, beetlered = black/hellfire red',
          },
          layer: {
            type: 'string',
            enum: ['base', 'structure', 'both'],
            description: 'Which layer to apply the material to. Default to the layer the visitor tapped (from context). Use both only when explicitly requested.',
          },
        },
        required: ['material', 'layer'],
      },
    },
  },
];

const CAMERA_VIEWS = {
  'front':       { azimuth: 0,             polar: Math.PI / 2 },
  'side-left':   { azimuth: -Math.PI / 2,  polar: Math.PI / 2 },
  'side-right':  { azimuth:  Math.PI / 2,  polar: Math.PI / 2 },
  'rear':        { azimuth:  Math.PI,       polar: Math.PI / 2 },
  'top':         { azimuth: 0,             polar: 0.35 },
  'angle-front': { azimuth:  Math.PI / 6,  polar: Math.PI / 3 },
  'angle-side':  { azimuth:  Math.PI / 3,  polar: Math.PI / 3 },
};

// World-space positions for named architectural features (model scale 0.2)
const FEATURE_POSITIONS = {
  'keystone':       [0,    1.05, 0],
  'arch':           [0,    0.8,  0],
  'left-pier':      [-0.6, 0.3,  0],
  'right-pier':     [0.6,  0.3,  0],
  'deck-center':    [0,    1.15, 0],
  'left-railing':   [-0.5, 1.25, 0],
  'right-railing':  [0.5,  1.25, 0],
  'left-abutment':  [-1.1, 0.1,  0],
  'right-abutment': [1.1,  0.1,  0],
};

function executeTool(name, args) {
  const {
    setShowBase, setShowStructure, setActiveCarouselSlide, setSelectedPart,
    setCameraTarget, setExplodeDistance, setBaseOpacity, setStructureOpacity,
    setLightingMode, addAnnotation, clearAnnotations,
    setDesignerOpen, setIsGeneratingDesigns, setDesignOptions,
    setBaseMaterial, setStructureMaterial,
  } = useStore.getState();

  switch (name) {
    case 'toggle_layer':
      if (args.layer === 'base' || args.layer === 'both') setShowBase(args.visible);
      if (args.layer === 'structure' || args.layer === 'both') setShowStructure(args.visible);
      break;
    case 'navigate_to_slide':
      setActiveCarouselSlide(args.slide);
      break;
    case 'highlight_part':
      setSelectedPart(args.part === 'none' ? null : args.part);
      break;
    case 'move_camera': {
      const target = CAMERA_VIEWS[args.view];
      if (target) setCameraTarget(target);
      break;
    }
    case 'set_explode':
      setExplodeDistance(args.distance);
      break;
    case 'set_opacity':
      if (args.layer === 'base') setBaseOpacity(args.opacity);
      if (args.layer === 'structure') setStructureOpacity(args.opacity);
      break;
    case 'set_lighting':
      setLightingMode(args.mode);
      break;
    case 'place_annotation': {
      const position = FEATURE_POSITIONS[args.feature];
      if (position) addAnnotation({ label: args.label, position });
      break;
    }
    case 'clear_annotations':
      clearAnnotations();
      break;
    case 'set_material':
      if (args.layer === 'base' || args.layer === 'both') setBaseMaterial(args.material);
      if (args.layer === 'structure' || args.layer === 'both') setStructureMaterial(args.material);
      break;
    case 'generate_bridge_designs': {
      const styleIds = args.styles?.length ? args.styles : null;
      const lighting = args.lighting ?? 'golden';
      const { setDesignConfig, addToDesignHistory } = useStore.getState();
      if (styleIds) setDesignConfig({ styleIds, lighting });
      setDesignOptions([]);
      setIsGeneratingDesigns(true);
      setDesignerOpen(true);
      generateBridgeDesigns(styleIds, lighting)
        .then(options => {
          setDesignOptions(options);
          setIsGeneratingDesigns(false);
          addToDesignHistory(options);
        })
        .catch(() => setIsGeneratingDesigns(false));
      break;
    }
  }
  return { ok: true };
}

function namedView(azimuthRad) {
  const d = azimuthRad * 180 / Math.PI;
  if (d >= -30 && d <= 30) return 'front';
  if (d > 30 && d <= 120) return 'side-right';
  if (d < -30 && d >= -120) return 'side-left';
  return 'rear';
}

function buildContext() {
  const {
    showBase, showStructure, selectedPart, cameraAzimuth,
    explodeDistance, baseOpacity, structureOpacity, lightingMode, baseMaterial, structureMaterial, seenTopics, language,
  } = useStore.getState();
  const seen = seenTopics.length ? seenTopics.join(', ') : 'none yet';
  return `[3D state — base: ${showBase ? 'visible' : 'hidden'} (opacity ${baseOpacity}, material ${baseMaterial}), structure: ${showStructure ? 'visible' : 'hidden'} (opacity ${structureOpacity}, material ${structureMaterial}), explode: ${explodeDistance}, lighting: ${lightingMode}, tapped: ${selectedPart || 'none'}, camera: ${namedView(cameraAzimuth)}, seen-topics: ${seen}, language: ${language}]`;
}

// label: optional short display label (e.g. 'Base') shown as a pill instead of the raw query
export async function sendMessage(userMessage, { label } = {}) {
  const { addMessage, setIsAgentThinking, chatHistory, markTopicSeen, language } = useStore.getState();

  const historySnapshot = [...chatHistory];
  addMessage({ role: 'user', content: userMessage, ...(label ? { _tapLabel: label } : {}) });
  setIsAgentThinking(true);

  const systemPrompt = language === 'zh' ? SYSTEM_PROMPT_ZH : SYSTEM_PROMPT_EN;
  const messages = [
    { role: 'system', content: systemPrompt + '\n\n' + buildContext() },
    ...historySnapshot,
    { role: 'user', content: userMessage },
  ];

  try {
    let continueLoop = true;
    while (continueLoop) {
      const response = await client.chat.completions.create({
        model: 'gpt-4o-mini',
        messages,
        tools: TOOLS,
        tool_choice: 'auto',
      });

      const assistantMsg = response.choices[0].message;
      messages.push(assistantMsg);

      if (assistantMsg.tool_calls?.length) {
        const toolResults = assistantMsg.tool_calls.map((tc) => {
          const args = JSON.parse(tc.function.arguments);
          const result = executeTool(tc.function.name, args);
          return { role: 'tool', tool_call_id: tc.id, content: JSON.stringify(result) };
        });
        messages.push(...toolResults);
      } else {
        const text = assistantMsg.content || '';
        // Mark topics covered by this response as seen
        detectTopics(text).forEach(markTopicSeen);
        addMessage({ role: 'assistant', content: text });
        setIsAgentThinking(false);
        continueLoop = false;
        return text;
      }
    }
  } catch (err) {
    setIsAgentThinking(false);
    throw err;
  }
}
