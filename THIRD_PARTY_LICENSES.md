# Third-Party Licenses and Notices

Dungeon Veil includes third-party software and assets. They remain governed by their own licenses and are not covered by the proprietary project license.

This notice describes the directly used runtime/build dependencies and the currently integrated external asset set. Transitive package details remain recorded in the workspace lockfile and installed package metadata.

## KayKit asset

### KayKit Character Pack: Skeletons 1.1

- Creator/distributor: Kay Lousberg
- Integrated runtime asset: `artifacts/dungeon-rpg/public/assets/kaykit-controlled/Necromancer.glb`
- License: Creative Commons Zero 1.0 Universal (CC0-1.0)
- Preserved source notice: `artifacts/dungeon-rpg/public/assets/kaykit-controlled/LICENSE-KAYKIT-SKELETONS.txt`

The original KayKit notice is retained beside the runtime model and is the authoritative asset notice.

## Three.js runtime

- Project: Three.js
- Version pinned by the build: 0.180.0
- License: MIT
- Runtime path: `artifacts/dungeon-rpg/public/assets/vendor/three/`
- Preserved license path in built/runtime output: `artifacts/dungeon-rpg/public/assets/vendor/three/LICENSE`

The local runtime includes Three.js core and selected official addons such as GLTFLoader, FBXLoader, NURBS utilities, BufferGeometryUtils and SkeletonUtils. Included upstream helper modules remain under their upstream notices.

## Direct JavaScript dependencies

The application package manifest is `artifacts/dungeon-rpg/package.json`. Direct external packages currently declared there include:

### MIT License

- React and React DOM
- Vite and `@vitejs/plugin-react`
- Radix UI React packages
- TanStack React Query
- Tailwind CSS, Tailwind Typography and Tailwind Vite integration
- React Hook Form and `@hookform/resolvers`
- Zod
- Framer Motion
- date-fns
- clsx
- cmdk
- Embla Carousel React
- input-otp
- next-themes
- React Day Picker
- react-icons
- react-resizable-panels
- Recharts
- Sonner
- tailwind-merge
- tw-animate-css
- Vaul

### Apache License 2.0

- class-variance-authority

### ISC License

- lucide-react

### The Unlicense

- wouter

### Workspace-local packages

Packages under the `@workspace/` namespace are part of this repository/workspace and are governed by the root proprietary license unless a package states otherwise.

## License-text availability

Full dependency license texts are supplied by their respective package distributions and package metadata. The package manager lockfile pins the resolved dependency graph. Runtime asset licenses that must ship with deployed files are preserved at their relevant asset paths.

## No endorsement

Names of third-party projects and creators are used only for attribution and license compliance. Their inclusion does not imply endorsement of Dungeon Veil, and Dungeon Veil does not claim ownership of third-party material.

## Corrections

If a third-party notice is incomplete or inaccurate, open an issue in this repository so the notice can be corrected without changing the underlying third-party license rights.
