/**
 * Authoritative Coordinate Transformation & 3D Proximity Engine
 * Based on PROJECT.md §F6, §F9 and MoleScene3D.tsx:147-193.
 */

export interface Vector2D {
  x: number;
  y: number;
}

export interface Vector3D {
  x: number;
  y: number;
  z: number;
}

export interface ViewportRect {
  left: number;
  top: number;
  width: number;
  height: number;
}

export class CoordinateEngine {
  // 9 Mole Hole Coordinates on XZ ground plane (from MoleScene3D.tsx:147-157)
  public static readonly HOLE_COORDS: ReadonlyArray<Vector3D> = [
    { x: -2.3, y: -0.5, z: -2.2 }, // Hole 0: Top-Left
    { x: 0.0,  y: -0.5, z: -2.2 }, // Hole 1: Top-Center
    { x: 2.3,  y: -0.5, z: -2.2 }, // Hole 2: Top-Right
    { x: -2.3, y: -0.5, z: 0.0 },  // Hole 3: Mid-Left
    { x: 0.0,  y: -0.5, z: 0.0 },  // Hole 4: Center
    { x: 2.3,  y: -0.5, z: 0.0 },  // Hole 5: Mid-Right
    { x: -2.3, y: -0.5, z: 2.2 },  // Hole 6: Bot-Left
    { x: 0.0,  y: -0.5, z: 2.2 },  // Hole 7: Bot-Center
    { x: 2.3,  y: -0.5, z: 2.2 },  // Hole 8: Bot-Right
  ];

  public static readonly DEFAULT_MARGIN = 0.12;
  public static readonly MAX_HIT_RADIUS = 1.35;

  /**
   * Applies deadzone margin calibration and clamps to [0.0, 1.0].
   */
  public static mapWithMargin(v: number, margin = CoordinateEngine.DEFAULT_MARGIN): number {
    const clamped = Math.max(margin, Math.min(1.0 - margin, v));
    return (clamped - margin) / (1.0 - 2.0 * margin);
  }

  /**
   * Self-mirroring: horizontal flip for selfie camera proprioception.
   */
  public static mirrorX(rawX: number): number {
    return 1.0 - rawX;
  }

  /**
   * Transforms raw camera landmark coordinates to calibrated [0.0, 1.0] normalized space.
   */
  public static toNormalizedCoords(
    rawX: number,
    rawY: number,
    margin = CoordinateEngine.DEFAULT_MARGIN
  ): Vector2D {
    const normX = this.mapWithMargin(this.mirrorX(rawX), margin);
    const normY = this.mapWithMargin(rawY, margin);
    return { x: normX, y: normY };
  }

  /**
   * Maps calibrated normalized coords [0.0, 1.0] to Three.js Normalized Device Coordinates (NDC) [-1.0, 1.0].
   * In Three.js, Y increases upward, whereas screen/image Y increases downward.
   */
  public static toNDCCoords(normX: number, normY: number): Vector2D {
    const ndcX = normX * 2.0 - 1.0;
    const ndcY = -(normY * 2.0 - 1.0); // equivalent to 1.0 - 2.0 * normY
    return { x: ndcX, y: ndcY };
  }

  /**
   * Maps calibrated normalized coords to client screen viewport pixels.
   */
  public static toViewportPixels(
    normX: number,
    normY: number,
    rect: ViewportRect
  ): Vector2D {
    return {
      x: rect.left + normX * rect.width,
      y: rect.top + normY * rect.height,
    };
  }

  /**
   * Simplified direct perspective ground plane raycasting.
   * Camera at (0, 7.5, 6.5) looking at (0, 0, 0), ground plane at y = -0.5.
   * Maps NDC (x, y) to ground plane (hitX, hitZ).
   */
  public static raycastToGround(ndcX: number, ndcY: number): { x: number; z: number } {
    // Camera parameters matching Three.js MoleScene3D.tsx
    const camPos = { x: 0.0, y: 7.5, z: 6.5 };
    const groundY = -0.5;

    // View frustum approximate forward/right/up vectors
    // Ray direction derived from NDC
    // For NDC (0, 0), ray hits table center (0, 0)
    // Scale factors tuned to frustum boundaries at y = -0.5
    const spanX = 3.6;
    const spanZ = 3.4;

    const hitX = ndcX * spanX;
    const hitZ = -ndcY * spanZ;

    return { x: hitX, z: hitZ };
  }

  /**
   * Finds the closest hole to the given hit coordinate within maxHitRadius.
   */
  public static findClosestHole(
    hitPoint: { x: number; z: number },
    maxRadius = CoordinateEngine.MAX_HIT_RADIUS
  ): { holeIndex: number; distance: number } | null {
    let closestDist = Infinity;
    let closestHoleIdx = -1;

    for (let i = 0; i < this.HOLE_COORDS.length; i++) {
      const hole = this.HOLE_COORDS[i];
      const dist = Math.hypot(hitPoint.x - hole.x, hitPoint.z - hole.z);
      if (dist < maxRadius && dist < closestDist) {
        closestDist = dist;
        closestHoleIdx = i;
      }
    }

    if (closestHoleIdx === -1) {
      return null;
    }

    return { holeIndex: closestHoleIdx, distance: closestDist };
  }

  /**
   * Computes the raw camera coordinates that correspond to targeting a specific hole index.
   */
  public static getHoleTargetCameraCoords(holeIndex: number): Vector2D {
    const hole = this.HOLE_COORDS[holeIndex];
    const spanX = 3.6;
    const spanZ = 3.4;

    // Inverse raycast
    const ndcX = Math.max(-1.0, Math.min(1.0, hole.x / spanX));
    const ndcY = Math.max(-1.0, Math.min(1.0, -hole.z / spanZ));

    // Inverse NDC
    const normX = (ndcX + 1.0) / 2.0;
    const normY = (1.0 - ndcY) / 2.0;

    // Inverse margin & mirroring
    const margin = CoordinateEngine.DEFAULT_MARGIN;
    const preMarginX = normX * (1.0 - 2.0 * margin) + margin;
    const rawX = 1.0 - preMarginX;
    const rawY = normY * (1.0 - 2.0 * margin) + margin;

    return { x: rawX, y: rawY };
  }
}
