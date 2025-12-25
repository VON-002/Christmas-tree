
import { useRef, useMemo, useLayoutEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useStore } from '../../store/useStore'
import { generateOrnamentPositions } from '../../utils/math'

// Function to generate a 6-point snowflake shape
const createSnowflakeShape = () => {
    const shape = new THREE.Shape()
    // Create a 6-point star / snowflake silhouette
    const outerRadius = 0.5
    const innerRadius = 0.15
    const points = 6

    for (let i = 0; i < points * 2; i++) {
        const radius = i % 2 === 0 ? outerRadius : innerRadius
        const angle = (i / (points * 2)) * Math.PI * 2
        const x = Math.cos(angle) * radius
        const y = Math.sin(angle) * radius
        if (i === 0) shape.moveTo(x, y)
        else shape.lineTo(x, y)
    }
    shape.closePath()
    return shape
}

const OrnamentGroup = ({ count, color, scale, weight, type }: { count: number, color: string, scale: number, weight: number, type: 'ball' | 'box' | 'light' | 'snowflake' | 'gingerbread' }) => {
    const meshRef = useRef<THREE.InstancedMesh>(null)
    const treeState = useStore(state => state.treeState)

    // Positions (Standard logic for ornaments, overridden for Snowflakes)
    const { targetPos, chaosPos } = useMemo(() => {
        // Generate base spiral positions for everyone
        const { targetPos: baseTarget, chaosPos: baseChaos } = generateOrnamentPositions(count)

        if (type === 'snowflake') {
            // "Like ornaments" -> Follow the spiral structure
            // "Around the tree" -> Push them outwards radially
            // We take the structure from generateOrnamentPositions and add a radial offset.

            const modTarget = new Float32Array(baseTarget.length)
            const modChaos = new Float32Array(baseChaos.length)

            for (let i = 0; i < count; i++) {
                // 1. Get base position
                const x = baseTarget[i * 3]
                const y = baseTarget[i * 3 + 1]
                const z = baseTarget[i * 3 + 2]

                // 2. Calculate direction from center (0, y, 0)
                const r = Math.sqrt(x * x + z * z) || 1
                const nx = x / r
                const nz = z / r

                // 3. Push Outward (Modified: Interwoven in Gaps)
                // Range: -2.0 (Deep inside) to +1.0 (Surface).
                const push = -2.0 + Math.random() * 3.0

                modTarget[i * 3] = x + (nx * push)
                modTarget[i * 3 + 1] = y + (Math.random() - 0.5) * 2.0 // More vertical spread to find y-gaps
                modTarget[i * 3 + 2] = z + (nz * push)

                // Chaos can remain random far out
                modChaos[i * 3] = (Math.random() - 0.5) * 50
                modChaos[i * 3 + 1] = (Math.random() - 0.5) * 50
                modChaos[i * 3 + 2] = (Math.random() - 0.5) * 50
            }
            return { targetPos: modTarget, chaosPos: modChaos }
        }
        return { targetPos: baseTarget, chaosPos: baseChaos }
    }, [count, type])

    const dummy = useMemo(() => new THREE.Object3D(), [])

    useLayoutEffect(() => {
        if (meshRef.current) {
            for (let i = 0; i < count; i++) {
                dummy.position.set(chaosPos[i * 3], chaosPos[i * 3 + 1], chaosPos[i * 3 + 2])
                dummy.updateMatrix()
                meshRef.current.setMatrixAt(i, dummy.matrix)
            }
            meshRef.current.instanceMatrix.needsUpdate = true
        }
    }, [chaosPos, count, dummy])

    useFrame((state, delta) => {
        if (!meshRef.current) return

        const isFormed = treeState === 'FORMED'
        const speed = 2.0 / weight
        const time = state.clock.elapsedTime

        let needsUpdate = false

        for (let i = 0; i < count; i++) {
            meshRef.current.getMatrixAt(i, dummy.matrix)
            dummy.position.setFromMatrixPosition(dummy.matrix)

            let targetX = isFormed ? targetPos[i * 3] : chaosPos[i * 3]
            let targetY = isFormed ? targetPos[i * 3 + 1] : chaosPos[i * 3 + 1]
            let targetZ = isFormed ? targetPos[i * 3 + 2] : chaosPos[i * 3 + 2]

            // CHAOS DRIFT: Slowly move when scattered
            if (!isFormed) {
                const offsetTime = time * 0.2 + i * 0.1
                targetX += Math.sin(offsetTime) * 2.0
                targetY += Math.cos(offsetTime * 0.8) * 1.5
                targetZ += Math.sin(offsetTime * 1.2) * 2.0
            }

            // Snowflake Float Logic
            if (isFormed && type === 'snowflake') {
                // ... same as before
                targetY += Math.sin(time * 0.5 + i) * 0.5
                dummy.rotation.z += delta * 0.2
                dummy.rotation.x += delta * 0.1
            }

            const target = new THREE.Vector3(targetX, targetY, targetZ)
            const dist = dummy.position.distanceTo(target)

            if (dist > 0.05 || !isFormed || (type === 'snowflake' && isFormed)) {
                // Always update when chaotic for drift
                dummy.position.lerp(target, delta * speed)

                if (!isFormed) {
                    // Continuous Chaos Rotation
                    dummy.rotation.x += delta * 0.5
                    dummy.rotation.y += delta * 0.3
                    dummy.rotation.z += delta * 0.1
                } else if (type !== 'snowflake') {
                    // Ornaments stabilize
                    dummy.rotation.x = THREE.MathUtils.lerp(dummy.rotation.x, 0, delta * speed)
                    dummy.rotation.z = THREE.MathUtils.lerp(dummy.rotation.z, 0, delta * speed)
                }

                dummy.scale.setScalar(scale)
                dummy.updateMatrix()
                meshRef.current.setMatrixAt(i, dummy.matrix)
                needsUpdate = true
            }
        }

        if (needsUpdate || !isFormed) {
            // Force update if chaos (for continuous drift)
            meshRef.current.instanceMatrix.needsUpdate = true
        }
    })

    const geometry = useMemo(() => {
        if (type === 'box') return new THREE.BoxGeometry(1, 1, 1)
        if (type === 'light') return new THREE.SphereGeometry(0.5, 8, 8)

        if (type === 'snowflake') {
            const shape = createSnowflakeShape()
            const extrudeSettings = {
                steps: 1,
                depth: 0.1, // Thin
                bevelEnabled: true,
                bevelThickness: 0.02,
                bevelSize: 0.02,
                bevelSegments: 2
            }
            return new THREE.ExtrudeGeometry(shape, extrudeSettings)
        }

        if (type === 'gingerbread') return new THREE.CylinderGeometry(1, 1, 0.2, 5)
        return new THREE.SphereGeometry(1, 32, 32)
    }, [type])

    const material = useMemo(() => {
        if (type === 'light') return new THREE.MeshStandardMaterial({
            color: color,
            emissive: color,
            emissiveIntensity: 3,
            toneMapped: false
        })
        if (type === 'snowflake') return new THREE.MeshStandardMaterial({
            color: '#FFFFFF',
            emissive: '#FFFFFF',
            emissiveIntensity: 0.4, // Low glow
            roughness: 0.2, // Icy
            metalness: 0.1,
            transparent: true,
            opacity: 0.9,
            side: THREE.DoubleSide
        })
        if (type === 'gingerbread') return new THREE.MeshStandardMaterial({
            color: color,
            roughness: 0.9,
            metalness: 0.0,
        })

        // Luxury Ball Material (Physical) - TRUMP LUXURY
        return new THREE.MeshPhysicalMaterial({
            color: color,
            roughness: 0.0, // Mirror finish
            metalness: 1.0, // Pure Metal
            clearcoat: 1.0,
            clearcoatRoughness: 0.0,
            envMapIntensity: 2.5, // Reduced from 5.0 (Too Bright)
            reflectivity: 1.0,
        })
    }, [type, color])

    return (
        <instancedMesh ref={meshRef} args={[geometry, material, count]} />
    )
}

const Ornaments = () => {
    return (
        <group>
            {/* Gold Balls - Warm Gold (Slightly Darker) */}
            <OrnamentGroup count={260} color="#E6C200" scale={0.35} weight={1.2} type="ball" />
            {/* Red Balls - Warm Red (Slightly Darker) */}
            <OrnamentGroup count={226} color="#C41E3A" scale={0.4} weight={1.1} type="ball" />

            {/* Lights (Glow) - Warmer */}
            <OrnamentGroup count={150} color="#FDFBD3" scale={0.08} weight={0.5} type="light" />

            {/* Snowflakes - 6-point, Floating, Larger for shape visibility */}
            {/* Reduced count to avoid clutter, increased scale for visibility */}
            <OrnamentGroup count={80} color="#FFFFFF" scale={0.4} weight={0.6} type="snowflake" />

            {/* Gingerbread - Sparse accents */}
            <OrnamentGroup count={40} color="#8B4513" scale={0.3} weight={1.5} type="gingerbread" />
        </group>
    )
}

export default Ornaments
