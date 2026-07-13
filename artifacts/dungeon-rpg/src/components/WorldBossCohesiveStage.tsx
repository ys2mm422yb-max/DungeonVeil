import React, { useEffect, useState } from 'react';
import { WorldBossPerspectiveStage } from './WorldBossPerspectiveStage';
import { installWorldBossVisualRuntimePatch } from './worldBossVisualRuntimePatch';

type Props = React.ComponentProps<typeof WorldBossPerspectiveStage>;

export function WorldBossCohesiveStage(props: Props) {
  const [patchReady, setPatchReady] = useState(false);

  useEffect(() => {
    let active = true;
    void installWorldBossVisualRuntimePatch()
      .catch(error => console.warn('World boss visual runtime patch failed', error))
      .finally(() => {
        if (active) setPatchReady(true);
      });
    return () => {
      active = false;
    };
  }, []);

  if (!patchReady) return null;
  return <WorldBossPerspectiveStage {...props} />;
}
