import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'


const Star = () => {
    const meshRef = useRef<THREE.Group>(null)

    useFrame((state, delta) => {
        if (!meshRef.current) return

        // Gentle floating/rotation
        meshRef.current.rotation.y += delta * 0.2

        // Pulse glow (handled via shader or just logic? Let's pulse scale slightly)
        const scale = 1 + Math.sin(state.clock.elapsedTime * 2) * 0.05
        meshRef.current.scale.setScalar(scale)
    })

    // Material Definitions
    const goldMaterial = new THREE.MeshPhysicalMaterial({
        color: "#FFD700", // Golden Yellow
        metalness: 1.0,
        roughness: 0.1,
        emissive: "#FFD700",
        emissiveIntensity: 2.0, // Glowing
        clearcoat: 1.0
    })

    const haloMaterial = new THREE.MeshBasicMaterial({
        color: "#FFF8E7", // Warm antique white
        transparent: true,
        opacity: 0.3,
        side: THREE.BackSide,
        blending: THREE.AdditiveBlending,
        depthWrite: false
    })

    return (
        <group ref={meshRef} position={[0, 11.2, 0]}> {/* Higher than tree tip */}
            {/* 1. Gold Core (The Physical Star) */}
            <group>
                {/* Vertical Arm */}
                <mesh scale={[0.3, 1.8, 0.3]}>
                    <octahedronGeometry args={[1, 0]} />
                    <primitive object={goldMaterial} />
                </mesh>
                {/* Horizontal Arm */}
                <mesh scale={[1.8, 0.3, 0.3]}>
                    <octahedronGeometry args={[1, 0]} />
                    <primitive object={goldMaterial} />
                </mesh>
                {/* Center Core (Fullness) */}
                <mesh scale={[0.5, 0.5, 0.5]}>
                    <octahedronGeometry args={[1, 0]} />
                    <primitive object={goldMaterial} />
                </mesh>
            </group>

            {/* 2. White Halo (The Glow Shell) - Scaled Up Duplicate */}
            <group scale={[1.2, 1.2, 1.2]}>
                {/* Vertical Halo */}
                <mesh scale={[0.35, 1.9, 0.35]}>
                    <octahedronGeometry args={[1, 0]} />
                    <primitive object={haloMaterial} />
                </mesh>
                {/* Horizontal Halo */}
                <mesh scale={[1.9, 0.35, 0.35]}>
                    <octahedronGeometry args={[1, 0]} />
                    <primitive object={haloMaterial} />
                </mesh>
                {/* Center Halo */}
                <mesh scale={[0.6, 0.6, 0.6]}>
                    <octahedronGeometry args={[1, 0]} />
                    <primitive object={haloMaterial} />
                </mesh>
            </group>

            {/* Point Light for surrounding illumination */}
            <pointLight
                color="#FFD700"
                intensity={3}
                distance={8}
                decay={2}
            />
        </group>
    )
}

export default Star
