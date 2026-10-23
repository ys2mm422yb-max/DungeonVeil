# KayKit source package inventory

This document records the KayKit packages that were available in the Replit workspace when the curated runtime selection for Dungeon Veil was prepared.

The complete packages are intentionally **not** committed to this public repository. Only models, direct dependencies, textures, and license files selected for the game are tracked under `attached_assets/kaykit-selected-v1/`.

## Packages available locally in Replit

The following package directories were present below the ignored local `asset-imports/` workspace:

- `KayKit_Dungeon_Pack_1.1_FREE`
- `KayKit_Dungeon_Pack_1.1_EXTRA`
- `KayKit_FantasyWeaponsBits_1.0_FREE`
- `KayKit_FantasyWeaponsBits_1.0_EXTRA`
- `KayKit_Mystery_Monthly_Series_6_(1.1)`
- `KayKit_Skeletons_1.1_FREE`
- `KayKit_Skeletons_1.1_EXTRA`
- `KayKit_Skeletons_1.1_SOURCE`

The repository owner supplied these downloads for the project. The local packages must not be deleted until either the remaining assets have been deliberately reviewed or an independent backup has been made.

## Prepared local runtime library

A web-runtime-only staging library was prepared locally at:

- `asset-imports/kaykit-runtime/`

Recorded state at preparation time:

- 1,532 files
- approximately 117 MB
- allowed staging formats: GLB, GLTF, BIN, PNG, JPG/JPEG, license files, and README files
- excluded from the runtime staging library: FBX, Blender, OBJ, Unity package, and other source/export formats

This local runtime library is ignored by Git and is not part of the public repository.

## Recorded model inventories

Known model counts from the local inventory pass:

- Fantasy Weapons Bits EXTRA: 48 models
- Fantasy Weapons Bits FREE: 31 models
- Mystery Monthly Series 6: 54 models
- Skeletons EXTRA: 29 models
- Skeletons FREE: 19 models

The Dungeon Pack FREE and EXTRA packages contain additional dungeon construction pieces, environmental props, and decoration assets. Their complete model counts were not committed during the first selection pass and must be inventoried before the local source packages are removed.

## Current public selection

The first curated public selection contains 41 principal model entries plus their direct GLTF dependencies, textures, package licenses, and manifests. See `SELECTION.md` for the exact tracked selection.

The remaining locally available models may still be useful for:

- dungeon rooms and modular environment construction
- doors, gates, walls, floors, stairs, pillars, and architectural pieces
- torches, banners, statues, altars, crystals, runes, chests, and other props
- additional weapons and equipment variants
- future enemy, NPC, loot, profile, and drop-model variants

## Preservation and integration rules

- Do not use `git add -f` to publish the ignored complete packages.
- Do not commit ZIP archives, source folders, Blender files, FBX files, Unity packages, or full package mirrors.
- Before using another asset, copy only the required runtime model, its referenced BIN/textures, and the relevant license file into a focused tracked selection.
- Validate GLTF dependencies, loading behavior, memory use, mobile performance, and visual evidence before integration.
- Keep a separate backup of purchased/downloaded source packages before deleting the Replit workspace.
