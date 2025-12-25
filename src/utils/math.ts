// Helper to generate jitter
const randomJitter = (scale: number) => (Math.random() - 0.5) * scale

// Generate positions for foliage (Points)
export const generateTreePositions = (count: number) => {
    // Let's assume the component passes a sufficient number (e.g. 5000 -> 8000).

    const targetPos = new Float32Array(count * 3)
    const chaosPos = new Float32Array(count * 3)

    // Updated Spiral Parameters for a slightly denser look
    const height = 15
    const baseRadius = 7
    const spiralTurns = 20
    const yOffset = 2

    for (let i = 0; i < count; i++) {
        // --- Target: Spiral Cone (Permanent Structure) ---
        const t = i / count

        // Height: Linear down
        const y = (1 - t) * height - (height / 2) + yOffset

        // Radius: Linear expansion (Cone)
        const tRadius = t * baseRadius

        // Angle: Spiral
        const angle = t * Math.PI * 2 * spiralTurns

        // Jitter for volume (Thickness) - Reduced for clearer spiral
        const jitterRadius = randomJitter(0.75) // Increased thickness
        const jitterY = randomJitter(0.2)

        const r = Math.max(0, tRadius + jitterRadius)

        const tx = Math.cos(angle) * r
        const targetY = y + jitterY
        const tz = Math.sin(angle) * r

        targetPos[i * 3] = tx
        targetPos[i * 3 + 1] = targetY
        targetPos[i * 3 + 2] = tz

        // Chaos: STATIC TREE ANCHOR (User Request)
        // The tree itself does NOT scatter. It stays as the central pillar.
        chaosPos[i * 3] = tx + randomJitter(0.1)
        chaosPos[i * 3 + 1] = targetY + randomJitter(0.1)
        chaosPos[i * 3 + 2] = tz + randomJitter(0.1)
    }

    return { targetPos, chaosPos }
}

export const generateOrnamentPositions = (count: number) => {
    const targetPos = new Float32Array(count * 3)
    const chaosPos = new Float32Array(count * 3)

    const randomJitter = (scale: number) => (Math.random() - 0.5) * scale

    const height = 15
    const baseRadius = 7
    const spiralTurns = 20
    const yOffset = 2

    for (let i = 0; i < count; i++) {
        // Target: On the spiral "branches"
        // Bias t towards 1 (bottom) to reduce density at top (where spiral is tight)
        // Using sqrt(random) creates a linear distribution proportional to radius/arc-length
        const t = Math.sqrt(Math.random())

        const y = (1 - t) * height - (height / 2) + yOffset
        const tRadius = t * baseRadius
        const angle = t * Math.PI * 2 * spiralTurns

        // Add some thickness to the band
        const r = tRadius + randomJitter(1.0)

        const tx = Math.cos(angle) * r
        const targetY = y + randomJitter(0.5)
        const tz = Math.sin(angle) * r

        targetPos[i * 3] = tx
        targetPos[i * 3 + 1] = targetY
        targetPos[i * 3 + 2] = tz

        // Chaos: Soft Radial Float - INCREASED DISTANCE
        // Push outwards from center significantly to avoid blocking photos
        const len = Math.sqrt(tx * tx + tz * tz) || 1
        const nx = tx / len
        const nz = tz / len

        // Much wider spread: 25 to 65 units out
        const expansion = 25.0 + Math.random() * 40.0

        chaosPos[i * 3] = tx + nx * expansion
        chaosPos[i * 3 + 1] = targetY + randomJitter(10.0) // More vertical spread too
        chaosPos[i * 3 + 2] = tz + nz * expansion
    }

    return { targetPos, chaosPos }
}

export const lerp = (v0: number, v1: number, t: number) => {
    return v0 * (1 - t) + v1 * t
}
