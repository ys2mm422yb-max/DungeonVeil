import type { EquipmentDefinition, EquipmentId } from './metaProgression';

type PresentationOverride = {
  nameDe?: string;
  nameEn?: string;
  descriptionDe?: string;
  descriptionEn?: string;
};

const OVERRIDES: Partial<Record<EquipmentId, PresentationOverride>> = {
  'frost-bow': {
    nameDe: 'Frostarmbrust',
    nameEn: 'Frost Crossbow',
    descriptionDe: 'Frostpfeil I und +3 Reichweite pro Stufe',
    descriptionEn: 'Ice Arrow I and +3 range per level',
  },
  'splinter-bow': {
    nameDe: 'Splitter-Handarmbrust',
    nameEn: 'Splinter Hand Crossbow',
    descriptionDe: 'Durchschlag I und +2 Angriff pro Stufe',
    descriptionEn: 'Piercing I and +2 attack per level',
  },
  'frost-quiver': {
    descriptionDe: 'Frostpfeil I, +1 Angriff je Stufe und Frost hält 20 % länger',
    descriptionEn: 'Ice Arrow I, +1 attack per level and frost lasts 20% longer',
  },
  'frost-grimoire': {
    descriptionDe: 'Frostpfeil I, gefrorene Tode explodieren und -2 % Dash-Abklingzeit je Stufe',
    descriptionEn: 'Ice Arrow I, frozen deaths explode and -2% dash cooldown per level',
  },
  'rune-quiver': {
    descriptionDe: 'Abpraller I, +8 Reichweite je Stufe und Kettentreffer verursachen 8 % Zusatzschaden',
    descriptionEn: 'Ricochet I, +8 range per level and chain hits deal 8% bonus damage',
  },
  'ritual-shard': {
    nameDe: 'Ritualgrimoire',
    nameEn: 'Ritual Grimoire',
    descriptionDe: 'Abpraller I; jeder dritte Kettentreffer erzeugt einen Ritualimpuls',
    descriptionEn: 'Ricochet I; every third chain hit creates a ritual pulse',
  },
  'splinter-quiver': {
    descriptionDe: 'Durchschlag I, +8 Reichweite je Stufe und Durchschlagstreffer verursachen 10 % Zusatzschaden',
    descriptionEn: 'Piercing I, +8 range per level and piercing hits deal 10% bonus damage',
  },
  'ash-amulet': {
    nameDe: 'Aschenkapsel',
    nameEn: 'Ash Capsule',
    descriptionDe: '+3 Angriff und +2 Leben pro Stufe',
    descriptionEn: '+3 attack and +2 health per level',
  },
  'veil-eye': {
    nameDe: 'Schleierstab',
    nameEn: 'Veil Wand',
    descriptionDe: '+5 % Angriff und -3 % Dash-Abklingzeit pro Stufe',
    descriptionEn: '+5% attack and -3% dash cooldown per level',
  },
};

function clarifyGermanItemLevel(value: string): string {
  return value.replace(/pro Stufe/g, 'je Ausrüstungslevel').replace(/je Stufe/g, 'je Ausrüstungslevel');
}

function clarifyEnglishItemLevel(value: string): string {
  return value.replace(/per level/g, 'per equipment level');
}

export function equipmentPresentation(definition: EquipmentDefinition) {
  const override = OVERRIDES[definition.id];
  return {
    nameDe: override?.nameDe ?? definition.nameDe,
    nameEn: override?.nameEn ?? definition.nameEn,
    descriptionDe: clarifyGermanItemLevel(override?.descriptionDe ?? definition.descriptionDe),
    descriptionEn: clarifyEnglishItemLevel(override?.descriptionEn ?? definition.descriptionEn),
  };
}
