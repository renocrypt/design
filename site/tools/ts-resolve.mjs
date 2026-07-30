// Lets Node run the app's own modules directly.
//
// App source imports './layout', not './layout.ts', because Vite resolves that.
// Node does not, so anything that wants to exercise real app code from the
// command line — the scene verifier, for one — needs the same resolution rule.
// Usage: node --experimental-strip-types --import ./tools/ts-resolve.mjs <file>

import { registerHooks } from 'node:module';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const EXTS = ['.ts', '.mts', '.mjs', '.js'];

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier.startsWith('.') && !/\.[a-z]+$/i.test(specifier) && context.parentURL) {
      const base = new URL(specifier, context.parentURL);
      for (const ext of EXTS) {
        const candidate = new URL(base.href + ext);
        if (existsSync(fileURLToPath(candidate))) {
          return { url: candidate.href, shortCircuit: true };
        }
      }
    }
    return nextResolve(specifier, context);
  },
});
