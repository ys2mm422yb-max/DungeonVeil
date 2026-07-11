# Chapter 1 Room-Bible Implementation

The runtime now consumes one binding source for:

- room name and visual phase
- combat silhouette and hero object
- allowed/forbidden asset families
- enemy formation
- portal staging
- lighting palette
- room shell state

## Four phases

1. Rooms 1-6: inhabited mine
2. Rooms 7-10: abandoned quarters
3. Rooms 11-15: ancient ruins
4. Rooms 16-20: Warden and Veil

The generic side-gallery/depth-zone template has been removed. Floors, perimeter walls, columns, damage state, lighting and setpieces now follow the room bible. The run camera is clamped to the mobile composition, and portal clearance is shared with collision logic.

The equipment preview uses an orthographic camera and computes bounds after the final pose. Crossbows keep a static readable silhouette with only a small vertical bob.