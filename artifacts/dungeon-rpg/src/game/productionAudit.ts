// Development-only runtime audit for the production pass; it is tree-shaken from release behavior.
import { equipmentVisualAudit } from './equipmentVisuals';
import { getEncounterPlan } from './encounterPlan';
import { logicalRoomSetpieces } from './logicalRoomSetpieces';
import { isBossRoom } from './chapterRun';
import { roomBibleSpec } from './roomBible';

export type ProductionAuditIssue = {
  severity: 'error' | 'warning';
  system: 'equipment' | 'portal' | 'spawn' | 'room';
  room?: number;
  message: string;
};

function colliderBounds(piece: ReturnType<typeof logicalRoomSetpieces>[number]) {
  if (!piece.collider) return null;
  const scale = piece.scale ?? 1;
  const localWidth = piece.collider[0] * scale;
  const localHeight = piece.collider[1] * scale;
  const angle = piece.rotation ?? 0;
  const cos = Math.abs(Math.cos(angle));
  const sin = Math.abs(Math.sin(angle));
  return {
    x: piece.x,
    z: piece.z,
    halfW: (localWidth * cos + localHeight * sin) / 2,
    halfH: (localWidth * sin + localHeight * cos) / 2,
  };
}

function pointInside(point: { x: number; z: number }, collider: NonNullable<ReturnType<typeof colliderBounds>>, padding = 0.65) {
  return Math.abs(point.x - collider.x) < collider.halfW + padding
    && Math.abs(point.z - collider.z) < collider.halfH + padding;
}

function roomAudit(room: number): ProductionAuditIssue[] {
  const issues: ProductionAuditIssue[] = [];
  const spec = roomBibleSpec(room);
  const pieces = logicalRoomSetpieces(room);
  const colliders = pieces.map(colliderBounds).filter((value): value is NonNullable<typeof value> => Boolean(value));
  const portal = { x: spec.portal.x, z: spec.portal.z < -8 ? -8.5 : spec.portal.z };

  colliders.forEach(collider => {
    if (pointInside(portal, collider, 2.25)) {
      issues.push({ severity: 'error', system: 'portal', room, message: `Portal stage overlaps collider at ${collider.x.toFixed(1)}, ${collider.z.toFixed(1)}` });
    }
  });

  spec.enemySpawns.forEach((spawn, index) => {
    const blocker = colliders.find(collider => pointInside(spawn, collider, 0.55));
    if (blocker) {
      issues.push({ severity: 'error', system: 'spawn', room, message: `Enemy spawn ${index + 1} overlaps a prop collider` });
    }
  });

  pieces.forEach(piece => {
    const wallDecor = /banner|sword_shield/i.test(piece.model);
    if (wallDecor && (piece.y ?? 0) < 1) {
      issues.push({ severity: 'error', system: 'room', room, message: `Wall decoration is not mounted: ${piece.model}` });
    }
    if (piece.model.startsWith('/assets/imported/') && !piece.fallbackModel) {
      issues.push({ severity: 'error', system: 'room', room, message: `Imported prop has no fallback: ${piece.model}` });
    }
  });

  if (!isBossRoom(room)) {
    const encounter = getEncounterPlan(room);
    if (!encounter.length) issues.push({ severity: 'error', system: 'spawn', room, message: 'Non-boss room has no encounter' });
    if (encounter.length > spec.enemySpawns.length) {
      issues.push({ severity: 'warning', system: 'spawn', room, message: `${encounter.length} enemies but only ${spec.enemySpawns.length} authored spawn points` });
    }
  }

  return issues;
}

export function runProductionAudit(): ProductionAuditIssue[] {
  const equipmentIssues: ProductionAuditIssue[] = equipmentVisualAudit().map(message => ({
    severity: 'error',
    system: 'equipment',
    message,
  }));
  return [
    ...equipmentIssues,
    ...Array.from({ length: 20 }, (_, index) => roomAudit(index + 1)).flat(),
  ];
}

export function reportProductionAudit() {
  const issues = runProductionAudit();
  if (!issues.length) {
    console.info('[DungeonVeil audit] equipment, portals, spawns and room props passed');
    return issues;
  }
  const errors = issues.filter(issue => issue.severity === 'error');
  const warnings = issues.filter(issue => issue.severity === 'warning');
  console.groupCollapsed(`[DungeonVeil audit] ${errors.length} errors, ${warnings.length} warnings`);
  issues.forEach(issue => console[issue.severity === 'error' ? 'error' : 'warn'](issue));
  console.groupEnd();
  return issues;
}
