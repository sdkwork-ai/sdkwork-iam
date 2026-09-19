// SDKWORK-CLIENT-APP-SURFACES-GENERATED: do not edit by hand; regenerate with `node scripts/materialize-client-app-surfaces.mjs`.
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import { App } from './App';
import { loadRuntimeEnv } from './bootstrap/environment';
import { resolveBootstrapRoutes } from './bootstrap/routes';

async function main(): Promise<void> {
  await loadRuntimeEnv();
  const container = document.getElementById('root');
  if (!container) throw new Error('sdkwork-iam-h5: #root container is missing');
  const routes = resolveBootstrapRoutes();
  createRoot(container).render(
    <StrictMode>
      <App routes={routes} />
    </StrictMode>,
  );
}

void main();
