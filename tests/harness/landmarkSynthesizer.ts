/**
 * Synthetic 21-Landmark 3D Generator for MediaPipe Hands E2E Testing.
 * Conforms to Google MediaPipe Hands 21-point topology.
 */

export interface Landmark3D {
  x: number;
  y: number;
  z: number;
}

export class LandmarkSynthesizer {
  /**
   * Generates an Open Palm (all fingers extended, thumb spread).
   * Resulting pinchRatio > 0.45, curledCount = 0.
   */
  public static createOpenPalm(center = { x: 0.5, y: 0.5, z: 0 }, scale = 0.2): Landmark3D[] {
    const lm: Landmark3D[] = new Array(21);

    // 0: Wrist
    lm[0] = { x: center.x, y: center.y + scale * 0.8, z: center.z };

    // MCP knuckles (base of fingers)
    lm[5] = { x: center.x - scale * 0.35, y: center.y, z: center.z }; // Index MCP
    lm[9] = { x: center.x, y: center.y, z: center.z };                // Middle MCP
    lm[13] = { x: center.x + scale * 0.3, y: center.y + scale * 0.05, z: center.z }; // Ring MCP
    lm[17] = { x: center.x + scale * 0.55, y: center.y + scale * 0.1, z: center.z }; // Pinky MCP

    // Thumb (spread to the left)
    lm[1] = { x: center.x - scale * 0.25, y: center.y + scale * 0.5, z: center.z };
    lm[2] = { x: center.x - scale * 0.45, y: center.y + scale * 0.35, z: center.z };
    lm[3] = { x: center.x - scale * 0.6, y: center.y + scale * 0.2, z: center.z };
    lm[4] = { x: center.x - scale * 0.7, y: center.y + scale * 0.05, z: center.z }; // Thumb Tip

    // Index Finger (extended upwards)
    lm[6] = { x: center.x - scale * 0.35, y: center.y - scale * 0.3, z: center.z };
    lm[7] = { x: center.x - scale * 0.35, y: center.y - scale * 0.55, z: center.z };
    lm[8] = { x: center.x - scale * 0.35, y: center.y - scale * 0.8, z: center.z };  // Index Tip

    // Middle Finger (extended upwards)
    lm[10] = { x: center.x, y: center.y - scale * 0.35, z: center.z };
    lm[11] = { x: center.x, y: center.y - scale * 0.65, z: center.z };
    lm[12] = { x: center.x, y: center.y - scale * 0.9, z: center.z };                // Middle Tip

    // Ring Finger (extended upwards)
    lm[14] = { x: center.x + scale * 0.3, y: center.y - scale * 0.3, z: center.z };
    lm[15] = { x: center.x + scale * 0.3, y: center.y - scale * 0.55, z: center.z };
    lm[16] = { x: center.x + scale * 0.3, y: center.y - scale * 0.8, z: center.z };  // Ring Tip

    // Pinky Finger (extended upwards)
    lm[18] = { x: center.x + scale * 0.55, y: center.y - scale * 0.2, z: center.z };
    lm[19] = { x: center.x + scale * 0.55, y: center.y - scale * 0.4, z: center.z };
    lm[20] = { x: center.x + scale * 0.55, y: center.y - scale * 0.6, z: center.z }; // Pinky Tip

    return lm;
  }

  /**
   * Generates a Closed Fist (fingers curled into palm, thumb wrapped).
   * Resulting curledCount = 4 (Index, Middle, Ring, Pinky), fist trigger active.
   */
  public static createClosedFist(center = { x: 0.5, y: 0.5, z: 0 }, scale = 0.2): Landmark3D[] {
    const lm = this.createOpenPalm(center, scale);
    const H_scale = scale * 0.8; // wrist to middle MCP distance

    // Curl Index finger: tip (8) very close to MCP (5)
    lm[6] = { x: lm[5].x, y: lm[5].y + scale * 0.15, z: center.z + scale * 0.1 };
    lm[7] = { x: lm[5].x, y: lm[5].y + scale * 0.25, z: center.z + scale * 0.1 };
    lm[8] = { x: lm[5].x, y: lm[5].y + scale * 0.15, z: center.z + scale * 0.05 }; // dist ≈ 0.15*scale/H_scale = 0.18 < 0.45

    // Curl Middle finger: tip (12) very close to MCP (9)
    lm[10] = { x: lm[9].x, y: lm[9].y + scale * 0.15, z: center.z + scale * 0.1 };
    lm[11] = { x: lm[9].x, y: lm[9].y + scale * 0.25, z: center.z + scale * 0.1 };
    lm[12] = { x: lm[9].x, y: lm[9].y + scale * 0.15, z: center.z + scale * 0.05 }; // dist ≈ 0.18 < 0.45

    // Curl Ring finger: tip (16) very close to MCP (13)
    lm[14] = { x: lm[13].x, y: lm[13].y + scale * 0.15, z: center.z + scale * 0.1 };
    lm[15] = { x: lm[13].x, y: lm[13].y + scale * 0.25, z: center.z + scale * 0.1 };
    lm[16] = { x: lm[13].x, y: lm[13].y + scale * 0.15, z: center.z + scale * 0.05 }; // dist ≈ 0.18 < 0.45

    // Curl Pinky finger: tip (20) very close to MCP (17)
    lm[18] = { x: lm[17].x, y: lm[17].y + scale * 0.15, z: center.z + scale * 0.1 };
    lm[19] = { x: lm[17].y, y: lm[17].y + scale * 0.25, z: center.z + scale * 0.1 };
    lm[20] = { x: lm[17].x, y: lm[17].y + scale * 0.15, z: center.z + scale * 0.05 }; // dist ≈ 0.18 < 0.45

    // Thumb tucked across knuckles
    lm[4] = { x: lm[9].x, y: lm[9].y + scale * 0.1, z: center.z - scale * 0.05 };

    return lm;
  }

  /**
   * Generates a Pinch Gesture between Thumb Tip (4) and Index Tip (8).
   * @param pinchRatioTarget - desired pinchRatio (default: 0.12, well under 0.22 trigger threshold)
   */
  public static createPinch(
    center = { x: 0.5, y: 0.5, z: 0 },
    scale = 0.2,
    pinchRatioTarget = 0.12
  ): Landmark3D[] {
    const lm = this.createOpenPalm(center, scale);
    const H_scale = scale * 0.8;
    const targetDist = pinchRatioTarget * H_scale;

    // Contact point around index tip area
    const contactX = center.x - scale * 0.2;
    const contactY = center.y - scale * 0.6;

    // Place Index Tip (8) and Thumb Tip (4) targetDist apart
    lm[8] = { x: contactX, y: contactY, z: center.z };
    lm[4] = { x: contactX - targetDist, y: contactY, z: center.z };

    return lm;
  }

  /**
   * Generates a hand pose with an exact number of curled fingers (0 to 4).
   * Useful for testing hysteresis thresholds (curledCount >= 3 to trigger, <= 1 to release).
   */
  public static createCurledCountPose(
    curledCount: number,
    center = { x: 0.5, y: 0.5, z: 0 },
    scale = 0.2
  ): Landmark3D[] {
    const lm = this.createOpenPalm(center, scale);

    const curlFinger = (mcpIdx: number, tipIdx: number) => {
      lm[tipIdx] = {
        x: lm[mcpIdx].x,
        y: lm[mcpIdx].y + scale * 0.15,
        z: center.z + scale * 0.05,
      };
    };

    if (curledCount >= 1) curlFinger(5, 8);   // Index
    if (curledCount >= 2) curlFinger(9, 12);  // Middle
    if (curledCount >= 3) curlFinger(13, 16); // Ring
    if (curledCount >= 4) curlFinger(17, 20); // Pinky

    return lm;
  }

  /**
   * Generates landmarks at the extreme edge or beyond the frame boundaries.
   */
  public static createEdgePose(rawX: number, rawY: number, scale = 0.15): Landmark3D[] {
    return this.createOpenPalm({ x: rawX, y: rawY, z: 0 }, scale);
  }

  /**
   * Adds controlled Gaussian/uniform noise to landmarks to simulate low-light sensor jitter.
   */
  public static addNoise(landmarks: Landmark3D[], jitterAmount = 0.03): Landmark3D[] {
    return landmarks.map(p => ({
      x: p.x + (Math.random() * 2 - 1) * jitterAmount,
      y: p.y + (Math.random() * 2 - 1) * jitterAmount,
      z: p.z + (Math.random() * 2 - 1) * (jitterAmount * 0.5),
    }));
  }
}
