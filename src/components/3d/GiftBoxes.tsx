import { useRef, useMemo } from 'react'
import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'
import { useStore } from '../../store/useStore'

const GiftBoxes = () => {
    const boxRef = useRef<THREE.InstancedMesh>(null)
    const ribbonRef = useRef<THREE.InstancedMesh>(null)
    const ribbonRef2 = useRef<THREE.InstancedMesh>(null)
    const bowRef = useRef<THREE.InstancedMesh>(null)

    const count = 240 // Double count for dense ring
    const treeState = useStore(state => state.treeState)

    const boxesData = useMemo(() => {
        const data = []
        // Reference Match Palette (Warm Classic Luxury)
        // Green: Forest/Pine Green
        // Red: Warm Tomato/Vermilion Red
        // Gold: Yellow/Orange Gold box
        const palette = [
            '#2E5936', // Forest Green (Reference) - Weight 1
            '#2E5936', // Forest Green (Duplicate for weight)
            '#228B22', // Forest Green (Lighter)
            '#006400', // Dark Green
            '#B22222', // Firebrick/Warm Red (Reference)
            '#DAA520', // Goldenrod (Reference Box) - Reduced count
            '#800000', // Maroon (Darker Red accent)
            // Removed Chocolate to bias towards Green/Red/Gold
        ]

        // High Contrast Satin Ribbons (Reference: Bright Gold & Red)
        const ribbonPalette = [
            '#FFD700', // Bright Yellow Gold
            '#FF4500', // Orange Red
            '#F0E68C', // Khaki/Light Gold
        ]

        for (let i = 0; i < count; i++) {
            // 1. Position: STRICT OUTER RING
            // Tree base radius ~8. We start at 9.5 to be safe.
            // Range: 9.5 to 14.5
            const angle = Math.random() * Math.PI * 2

            // Bias distribution: More gifts closer to the tree base (inner ring), fewer far out
            const rBias = Math.pow(Math.random(), 2.0) // 0..1, biased to 0
            const r = 8.0 + (rBias * 5.0) // 8.0 to 13.0 (Touching the tree)

            const x = Math.cos(angle) * r
            const z = Math.sin(angle) * r

            // Height Logic: "Piled" look
            // Inner gifts can be stacked higher. Outer gifts low.
            // Height falls off as radius increases.
            // Max height at r=9.5 is ~2.5 units. Min height at r=14 is 0.
            const heightFactor = 1.0 - ((r - 9.5) / 5.0) // 1.0 at inner, 0.0 at outer
            const randomStack = Math.random() * 2.5 * heightFactor

            // Base floor level. If tree is at 0, floor is likely -10? 
            // In typical scenes here, center is (0,0,0). 
            // Previous code used y=-6. Let's stick to a low base.
            // Adjust to align with tree base visually. 
            // We'll use y = -9.0 as the floor (assuming tree base is near there).
            // Actually, let's play safe: check `math.ts` defaults or similar.
            // Previously `y = -6.0`. 
            const floorY = -8.0
            const y = floorY + randomStack

            // Chaos Position: SPHERICAL SCATTER
            const rChaos = 20 + Math.random() * 30 // Radius 20-50
            const theta = Math.random() * Math.PI * 2
            const phi = Math.acos(2 * Math.random() - 1)

            const chaos = new THREE.Vector3(
                rChaos * Math.sin(phi) * Math.cos(theta),
                rChaos * Math.sin(phi) * Math.sin(theta),
                rChaos * Math.cos(phi)
            )

            // Shape Variety
            const shapeType = Math.random()
            let sx = 1, sy = 1, sz = 1
            if (shapeType < 0.4) {
                // Flat (Shirt box)
                sx = 1.6; sy = 0.5; sz = 1.2;
            } else if (shapeType < 0.7) {
                // Tall Cube
                sx = 0.8; sy = 1.2; sz = 0.8;
            } else {
                // Cube
                sx = 1.0; sy = 1.0; sz = 1.0;
            }

            // Random global scale variation (S/M/L)
            const globalScale = 0.8 + Math.random() * 0.6 // 0.8 to 1.4
            sx *= globalScale; sy *= globalScale; sz *= globalScale;

            const rotY = Math.random() * Math.PI * 2

            // Colors
            const boxColorHex = palette[Math.floor(Math.random() * palette.length)]
            const ribbonColorHex = ribbonPalette[Math.floor(Math.random() * ribbonPalette.length)]

            data.push({
                target: new THREE.Vector3(x, y, z),
                chaos: chaos,
                scale: new THREE.Vector3(sx, sy, sz),
                rotation: new THREE.Euler(0, rotY, 0),
                color: new THREE.Color(boxColorHex),
                ribbonColor: new THREE.Color(ribbonColorHex)
            })
        }
        return data
    }, [])

    const dummy = useMemo(() => new THREE.Object3D(), [])

    useFrame((state, delta) => {
        if (!boxRef.current || !ribbonRef.current || !ribbonRef2.current || !bowRef.current) return

        const isFormed = treeState === 'FORMED'

        const speed = 2.0 / 1.5 // Consistent speed

        for (let i = 0; i < count; i++) {
            const d = boxesData[i]
            // const targetPos = isFormed ? d.target : d.chaos // Unused

            // Get current position from matrix
            boxRef.current.getMatrixAt(i, dummy.matrix)
            dummy.position.setFromMatrixPosition(dummy.matrix)

            if (!isFormed) {
                // Add Drift to the target position itself before lerping? 
                // No, 'd.chaos' is static. We need to add an offset to the LERP target.
                const time = state.clock.elapsedTime
                const driftX = Math.sin(time * 0.3 + i) * 5.0
                const driftY = Math.cos(time * 0.2 + i) * 2.0
                const driftZ = Math.sin(time * 0.4 + i) * 5.0

                // We construct a dynamic target
                const driftTarget = d.chaos.clone().add(new THREE.Vector3(driftX, driftY, driftZ))
                dummy.position.lerp(driftTarget, delta * speed)

                // Continuous Tumble - DISABLED (User request: drift only, no rotation)
                // dummy.rotation.x += delta * 0.5
                // dummy.rotation.y += delta * 0.3
                // dummy.rotation.z += delta * 0.1
            } else {
                dummy.position.lerp(d.target, delta * speed)
            }

            // Rotation & Scale (if formed, reset rot via lerp? No, standard logic)
            if (isFormed) {
                dummy.rotation.copy(d.rotation)
                // Maybe ease rotation back?
                // For now, snap seems okay or add lerp if needed in future
            }
            dummy.scale.copy(d.scale)

            dummy.updateMatrix()
            boxRef.current.setMatrixAt(i, dummy.matrix)
            boxRef.current.setColorAt(i, d.color)

            // Ribbon Config
            const ribbonThick = 0.08
            const ribbonPop = 0.01

            // 2. Ribbon 1
            // Need to update position based on the animated dummy position
            const currentPos = dummy.position.clone()
            const currentRot = dummy.rotation.clone()

            dummy.position.copy(currentPos)
            dummy.rotation.copy(currentRot)
            dummy.scale.set(ribbonThick, d.scale.y + ribbonPop, d.scale.z + ribbonPop)
            dummy.updateMatrix()
            ribbonRef.current.setMatrixAt(i, dummy.matrix)
            ribbonRef.current.setColorAt(i, d.ribbonColor)

            // 3. Ribbon 2
            dummy.position.copy(currentPos)
            dummy.rotation.copy(currentRot)
            dummy.scale.set(d.scale.x + ribbonPop, d.scale.y + ribbonPop, ribbonThick)
            dummy.updateMatrix()
            ribbonRef2.current.setMatrixAt(i, dummy.matrix)
            ribbonRef2.current.setColorAt(i, d.ribbonColor)

            // 4. Bow
            dummy.position.copy(currentPos).add(new THREE.Vector3(0, d.scale.y * 0.5, 0).applyEuler(currentRot))
            dummy.rotation.copy(currentRot)
            const bowSize = Math.min(d.scale.x, d.scale.z) * 0.5
            dummy.scale.set(bowSize, bowSize * 0.6, bowSize)

            dummy.updateMatrix()
            bowRef.current.setMatrixAt(i, dummy.matrix)
            bowRef.current.setColorAt(i, d.ribbonColor)
        }

        boxRef.current.instanceMatrix.needsUpdate = true
        if (boxRef.current.instanceColor) boxRef.current.instanceColor.needsUpdate = true

        ribbonRef.current.instanceMatrix.needsUpdate = true
        if (ribbonRef.current.instanceColor) ribbonRef.current.instanceColor.needsUpdate = true

        ribbonRef2.current.instanceMatrix.needsUpdate = true
        if (ribbonRef2.current.instanceColor) ribbonRef2.current.instanceColor.needsUpdate = true

        bowRef.current.instanceMatrix.needsUpdate = true
        if (bowRef.current.instanceColor) bowRef.current.instanceColor.needsUpdate = true
    })

    const boxGeometry = useMemo(() => new THREE.BoxGeometry(1, 1, 1), [])

    // Bow Geometry: "Knot" shape
    // A Dodecahedron is okay, but maybe a low poly sphere or TorusKnot?
    // TorusKnot looks complex enough for a bow from distance.
    const bowGeometry = useMemo(() => new THREE.TorusKnotGeometry(0.5, 0.2, 32, 4), [])

    const boxMaterial = useMemo(() => new THREE.MeshStandardMaterial({
        roughness: 0.2,
        metalness: 0.1,
    }), [])

    const ribbonMaterial = useMemo(() => new THREE.MeshStandardMaterial({
        roughness: 0.3,
        metalness: 0.8, // Silk/Satin logic
        emissiveIntensity: 0.2,
    }), [])

    return (
        <group>
            {/* Main Box */}
            <instancedMesh ref={boxRef} args={[boxGeometry, boxMaterial, count]} frustumCulled={false} />

            {/* Ribbon 1 */}
            <instancedMesh ref={ribbonRef} args={[boxGeometry, ribbonMaterial, count]} frustumCulled={false} />

            {/* Ribbon 2 (Cross) */}
            <instancedMesh ref={ribbonRef2} args={[boxGeometry, ribbonMaterial, count]} frustumCulled={false} />

            {/* Bow */}
            <instancedMesh ref={bowRef} args={[bowGeometry, ribbonMaterial, count]} frustumCulled={false} />
        </group>
    )
}

export default GiftBoxes
