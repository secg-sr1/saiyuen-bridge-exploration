import OpenAI from 'openai';

const client = new OpenAI({
  apiKey: import.meta.env.VITE_OPENAI_API_KEY,
  dangerouslyAllowBrowser: true,
});

const PLACE =
  'Sai Kung Country Park, Hong Kong, lush tropical forest, clear mountain stream, heritage valley landscape, ' +
  'photorealistic, ultra-detailed, 8K, cinematic architectural photography';

const PERSON_DETAIL =
  'one solitary figure walking across the bridge, seen from a tasteful distance, small relative to the structure, ' +
  'back to the viewer, naturally integrated into the scene, adding a sense of human scale';

// Lighting mood injected into every prompt
export const LIGHTING_MODES = [
  { id: 'dawn',   label: 'Dawn',        desc: 'misty early morning dawn, soft pink-blue horizon, gentle mist rising from the water' },
  { id: 'midday', label: 'Midday',      desc: 'bright overhead natural sunlight, crisp clear blue sky, sharp well-defined shadows' },
  { id: 'golden', label: 'Golden Hour', desc: 'warm golden sunset light, long amber shadows, rich glowing atmosphere, sky painted in orange and rose' },
  { id: 'night',  label: 'Night',       desc: 'moonlit night, cool blue ambient glow, stars reflected in dark water, lanterns along the path' },
];

// Six distinct architectural styles
export const DESIGN_STYLES = [
  {
    id: 'stone-arch',
    label: 'Stone Arch',
    desc: 'Traditional granite stone arch pedestrian bridge, weathered natural stone masonry, mossy textures, classic arch form with keystones, timeless heritage character',
  },
  {
    id: 'concrete',
    label: 'Sleek Concrete',
    desc: 'Minimalist white exposed-concrete pedestrian footbridge, clean geometric curves, smooth formwork finish, integrated cable handrails, contemporary Brutalist elegance',
  },
  {
    id: 'steel-glass',
    label: 'Steel & Glass',
    desc: 'Elegant steel cable-stayed pedestrian bridge, transparent tempered-glass walkway deck, tensioned cable stays, slender structural steel pylons, high-tech precision engineering',
  },
  {
    id: 'timber',
    label: 'Timber Beam',
    desc: 'Rustic natural timber beam pedestrian bridge, hand-hewn wooden planks, exposed structural timber trusses, warm grain textures, sustainably sourced hardwood, lanterns on posts',
  },
  {
    id: 'ancient',
    label: 'Ancient Heritage',
    desc: 'Centuries-old moss-covered stone arch bridge, heavily weathered granite, trailing vines and ferns growing from the stone, ancient heritage ruin aesthetic, timeless and organic',
  },
  {
    id: 'biophilic',
    label: 'Biophilic',
    desc: 'Living bridge woven from intertwined living trees and roots, biophilic organic architecture, trunk arches growing across the stream, leaves and flowers blooming from the structure',
  },
  {
    id: 'bamboo',
    label: 'Bamboo',
    desc: 'Elegant pedestrian bridge constructed entirely from giant bamboo poles, traditional Asian bamboo lashing joinery, woven bamboo deck, natural golden-green bamboo culms of varying diameter forming arched trusses, deeply rooted in East Asian craftsmanship',
  },
];

/**
 * Build a rich DALL-E 3 prompt for a given style + lighting combination.
 */
function buildPrompt(style, lighting, withPerson = false) {
  return (
    `Hyperrealistic architectural visualization: ${style.desc}. ` +
    `Setting: ${PLACE}. ` +
    `Lighting: ${lighting.desc}. ` +
    `Composition: wide-angle view showing the bridge spanning the stream with forest on both banks, ` +
    `reflections in the water, photorealistic render quality, no watermarks, no text. ` +
    (withPerson ? `Include ${PERSON_DETAIL}.` : 'No people.')
  );
}

/**
 * Generate bridge design images via DALL-E 3.
 * @param {string[]} styleIds   - array of style ids; null/empty = all
 * @param {string}   lightingId - one of LIGHTING_MODES ids, default 'golden'
 * @returns {Promise<Array<{id, label, url}>>}
 */
export async function generateBridgeDesigns(styleIds = null, lightingId = 'golden', withPerson = false) {
  const lighting = LIGHTING_MODES.find(l => l.id === lightingId) ?? LIGHTING_MODES[2];
  const styles = (styleIds?.length)
    ? DESIGN_STYLES.filter(s => styleIds.includes(s.id))
    : DESIGN_STYLES;

  const results = await Promise.all(
    styles.map(async (style) => {
      const response = await client.images.generate({
        model: 'dall-e-3',
        prompt: buildPrompt(style, lighting, withPerson),
        n: 1,
        size: '1792x1024',
        quality: 'hd',
      });
      return {
        id: style.id,
        label: style.label,
        lightingId,
        lightingLabel: lighting.label,
        url: response.data[0].url,
        generatedAt: Date.now(),
      };
    })
  );

  return results;
}

/**
 * Analyse a landscape photo with GPT-4o vision, then generate bridge designs
 * tailored to that specific landscape via DALL-E 3.
 * @param {string}   imageDataUrl - base64 data URL of the uploaded photo
 * @param {string[]} styleIds     - array of style ids to generate
 * @param {string}   lightingId   - lighting mood id
 * @returns {Promise<Array<{id, label, url, fromPhoto: true}>>}
 */
export async function generateFromLandscape(imageDataUrl, styleIds, lightingId = 'golden', withPerson = false) {
  const lighting = LIGHTING_MODES.find(l => l.id === lightingId) ?? LIGHTING_MODES[2];
  const styles = (styleIds?.length)
    ? DESIGN_STYLES.filter(s => styleIds.includes(s.id))
    : DESIGN_STYLES;

  // Step 1 — GPT-4o vision: extract a precise landscape description for DALL-E 3
  const visionRes = await client.chat.completions.create({
    model: 'gpt-4o',
    max_tokens: 250,
    messages: [{
      role: 'user',
      content: [
        { type: 'image_url', image_url: { url: imageDataUrl } },
        {
          type: 'text',
          text:
            'Analyse this landscape photo for bridge design visualisation. ' +
            'Describe concisely in one paragraph (max 120 words): terrain and topography, ' +
            'water feature (stream / river / gorge — width, depth impression), ' +
            'vegetation and foliage style, colour palette, time of day and lighting conditions, ' +
            'atmospheric mood, and camera perspective angle. ' +
            'Write in third person, present tense. Focus on details useful for generating a photorealistic image.',
        },
      ],
    }],
  });

  const landscapeDesc = visionRes.choices[0].message.content.trim();

  // Step 2 — DALL-E 3: generate each style using the landscape description
  const results = await Promise.all(
    styles.map(async (style) => {
      const prompt =
        `Hyperrealistic architectural visualisation: ${style.desc}. ` +
        `The bridge is placed into this exact landscape: ${landscapeDesc} ` +
        `Lighting mood: ${lighting.desc}. ` +
        `Wide-angle composition showing the bridge naturally integrated into the scene, ` +
        `matching the perspective of the original photo, photorealistic quality, no text, no watermarks. ` +
        (withPerson ? `Include ${PERSON_DETAIL}.` : 'No people.');

      const response = await client.images.generate({
        model: 'dall-e-3',
        prompt,
        n: 1,
        size: '1792x1024',
        quality: 'hd',
      });

      return {
        id: style.id,
        label: style.label,
        lightingId,
        lightingLabel: lighting.label,
        url: response.data[0].url,
        generatedAt: Date.now(),
        fromPhoto: true,
      };
    })
  );

  return results;
}
