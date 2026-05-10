/**
 * Batch-optimize all sticks_*.glb files in-place using meshopt compression.
 * Run once after exporting new segment GLBs from Blender.
 *   node scripts/optimize-sticks.mjs
 */
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { dedup, flatten, join, prune } from '@gltf-transform/functions';
import { MeshoptEncoder, MeshoptDecoder } from 'meshoptimizer';
import { createRequire } from 'module';
import { readdir } from 'fs/promises';
import { join as pathJoin } from 'path';
import { fileURLToPath } from 'url';

// meshopt compress helper — loaded lazily from @gltf-transform/functions
const { meshopt } = await import('@gltf-transform/functions');

await MeshoptEncoder.ready;
await MeshoptDecoder.ready;

const io = new NodeIO()
  .registerExtensions(ALL_EXTENSIONS)
  .registerDependencies({
    'meshopt.encoder': MeshoptEncoder,
    'meshopt.decoder': MeshoptDecoder,
  });

const dir = new URL('../src/assets/glb-models/sticks', import.meta.url);
const dirPath = fileURLToPath(dir);

const files = (await readdir(dirPath))
  .filter(f => f.endsWith('.glb'))
  .sort();

console.log(`Optimizing ${files.length} GLB files…`);
const t0 = Date.now();
let totalBefore = 0;
let totalAfter = 0;

for (let i = 0; i < files.length; i++) {
  const file = files[i];
  const filePath = pathJoin(dirPath, file);

  const doc = await io.read(filePath);

  // Get rough size before (via re-write to buffer)
  const before = (await io.writeBinary(doc)).byteLength;
  totalBefore += before;

  await doc.transform(
    dedup(),
    flatten(),
    join(),
    prune(),
    meshopt({ encoder: MeshoptEncoder, level: 'medium' }),
  );

  const out = await io.writeBinary(doc);
  totalAfter += out.byteLength;

  await import('fs').then(({ writeFileSync }) => writeFileSync(filePath, out));

  if ((i + 1) % 100 === 0 || i === files.length - 1) {
    const pct = Math.round(((totalBefore - totalAfter) / totalBefore) * 100);
    console.log(`  [${i + 1}/${files.length}] ${Math.round(totalBefore/1024)}KB → ${Math.round(totalAfter/1024)}KB (−${pct}%)`);
  }
}

const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
const pct = Math.round(((totalBefore - totalAfter) / totalBefore) * 100);
console.log(`\nDone in ${elapsed}s: ${Math.round(totalBefore/1024)}KB → ${Math.round(totalAfter/1024)}KB (−${pct}%)`);
