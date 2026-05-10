import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';

/** Cap parallel GLB fetches/decodes — many segments × parallel tabs saturates slow CDNs and mobile CPUs. */
const MAX_CONCURRENT = 6;

let active = 0;
const waitQueue = [];

function acquireSlot() {
  return new Promise((resolveRelease) => {
    const tryAcquire = () => {
      if (active < MAX_CONCURRENT) {
        active++;
        resolveRelease(() => {
          active--;
          const next = waitQueue.shift();
          if (next) next();
        });
      } else {
        waitQueue.push(tryAcquire);
      }
    };
    tryAcquire();
  });
}

const promiseCache = new Map();

function loadWithQueue(loader, url, onProgress) {
  let pending = promiseCache.get(url);
  if (!pending) {
    pending = (async () => {
      const release = await acquireSlot();
      try {
        return await new Promise((resolve, reject) => {
          GLTFLoader.prototype.load.call(loader, url, resolve, onProgress, reject);
        });
      } finally {
        release();
      }
    })();
    promiseCache.set(url, pending);
  }
  return pending;
}

/**
 * Same as GLTFLoader for react-three-fiber `useLoader`, but serializes loads through a small pool
 * so the bridge’s many segment files do not all compete at once on constrained networks.
 */
export class QueuedGLTFLoader extends GLTFLoader {
  load(url, onLoad, onProgress, onError) {
    loadWithQueue(this, url, onProgress).then(onLoad).catch(onError);
    return undefined;
  }
}
