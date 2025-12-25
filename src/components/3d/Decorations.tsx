import { useRef, useState, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import { Image as DreiImage } from '@react-three/drei'
import * as THREE from 'three'
import { useStore } from '../../store/useStore'

const Polaroid = ({ url, index, total }: { url: string, index: number, total: number }) => {
    const meshRef = useRef<THREE.Group>(null)
    const treeState = useStore((state) => state.treeState)
    const handCursor = useStore((state) => state.handCursor)
    const [hovered, setHover] = useState(false)

    // Chaos position
    const chaosPos = useMemo(() => new THREE.Vector3(
        (Math.random() - 0.5) * 15,
        (Math.random() - 0.5) * 15,
        (Math.random() - 0.5) * 15
    ), [])

    // Target position (Spiral)
    const targetPos = useMemo(() => {
        const h = (index / total) * 10 - 5
        const r = 6 - (h + 5) * 0.3 // Tapered radius
        const angle = index * 0.8
        return new THREE.Vector3(
            Math.cos(angle) * r,
            h,
            Math.sin(angle) * r
        )
    }, [index, total])

    const vecPos = useMemo(() => new THREE.Vector3(), [])

    useFrame((state, delta) => {
        if (!meshRef.current) return

        const isFormed = treeState === 'FORMED'

        // Base Target Calculation
        const target = isFormed ? targetPos : chaosPos
        const baseTarget = target.clone()

        // Magnet Logic (Only when Formed and Hand Active)
        if (isFormed && handCursor.active) {
            vecPos.copy(meshRef.current.position)
            vecPos.project(state.camera)

            // Calculate 2D distance (cursor is -1 to 1, vecPos is -1 to 1)
            const dist = Math.sqrt(Math.pow(vecPos.x - handCursor.x, 2) + Math.pow(vecPos.y - handCursor.y, 2))

            if (dist < 0.2) {
                // Magnet Effect: Pull closer to camera
                const camPos = state.camera.position
                const dirToCam = new THREE.Vector3().subVectors(camPos, baseTarget).normalize()
                baseTarget.add(dirToCam.multiplyScalar(4.0)) // Pull 4 units closer

                // Look at camera
                meshRef.current.lookAt(camPos)

                // Scale Up
                const targetScale = new THREE.Vector3(2.5, 2.5, 2.5)
                meshRef.current.scale.lerp(targetScale, delta * 5)
            } else {
                // Reset Scale
                meshRef.current.scale.lerp(new THREE.Vector3(hovered ? 1.5 : 1, hovered ? 1.5 : 1, hovered ? 1.5 : 1), delta * 5)

                // Face outward from center (0,h,0) when not identifying
                const lookAtPos = new THREE.Vector3(target.x * 2, target.y, target.z * 2)
                const q = new THREE.Quaternion().setFromRotationMatrix(
                    new THREE.Matrix4().lookAt(meshRef.current.position, lookAtPos, new THREE.Vector3(0, 1, 0))
                )
                meshRef.current.quaternion.slerp(q, delta * 2)
            }
        } else {
            // Default Formed Behavior
            if (isFormed) {
                meshRef.current.scale.lerp(new THREE.Vector3(hovered ? 1.5 : 1, hovered ? 1.5 : 1, hovered ? 1.5 : 1), delta * 5)
                const lookAtPos = new THREE.Vector3(target.x * 2, target.y, target.z * 2)
                meshRef.current.lookAt(lookAtPos)
            }
        }

        // Apply Position Lerp
        if (meshRef.current.position.distanceTo(baseTarget) > 0.01) {
            meshRef.current.position.lerp(baseTarget, delta * 2)
        }

        // Chaos Rotation & Scale
        if (!isFormed) {
            // Scale up 40% when scattered (User Request)
            meshRef.current.scale.lerp(new THREE.Vector3(1.4, 1.4, 1.4), delta * 2)

            meshRef.current.rotation.x += delta * 0.2
            meshRef.current.rotation.y += delta * 0.1
        }
    })

    return (
        <group ref={meshRef}
            onPointerOver={() => setHover(true)}
            onPointerOut={() => setHover(false)}
        >
            {/* Frame */}
            <mesh position={[0, 0, -0.01]}>
                <planeGeometry args={[1.2, 1.5]} />
                <meshStandardMaterial color={url === 'placeholder' ? "#222" : "white"} side={THREE.DoubleSide} />
            </mesh>
            {/* Photo Front */}
            {url !== 'placeholder' && (
                <>
                    <DreiImage
                        url={url}
                        scale={[1, 1]}
                        position={[0, 0.1, 0.02]} // Moved slightly forward
                        transparent
                        side={THREE.DoubleSide} // Ensure visibility
                    />
                    <DreiImage
                        url={url}
                        scale={[1, 1]}
                        position={[0, 0.1, -0.02]} // Behind frame
                        rotation={[0, Math.PI, 0]} // Flipped for back viewing
                        transparent
                        side={THREE.DoubleSide}
                    />
                </>
            )}
            {/* Placeholder Text */}
            {url === 'placeholder' && (
                <mesh position={[0, 0.1, 0.01]}>
                    <planeGeometry args={[1, 1]} />
                    <meshBasicMaterial color="#111" />
                </mesh>
            )}
            {/* Caption Area */}
            <mesh position={[0, -0.6, 0.01]}>
                <planeGeometry args={[0.8, 0.1]} />
                <meshBasicMaterial color="#eee" />
            </mesh>
        </group>
    )
}

const Decorations = () => {
    const rawPhotos = useStore(state => state.photos)

    // If no photos, generate 20 placeholders
    const photos = useMemo(() => {
        if (rawPhotos.length > 0) return rawPhotos
        return Array(20).fill('placeholder') // Special flag
    }, [rawPhotos])

    return (
        <group>
            {photos.map((url, i) => (
                <Polaroid key={i} url={url} index={i} total={photos.length} />
            ))}
        </group>
    )
}

export default Decorations
