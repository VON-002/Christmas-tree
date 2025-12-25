
import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useStore } from '../../store/useStore'

const StarryBackground = () => {
    const meshRef = useRef<THREE.Points>(null)
    const treeState = useStore(state => state.treeState)

    // Create a lot of particles for the "Starry Sky"
    const count = 2000 // Number of stars

    // Generate positions in a huge sphere/dome around the scene
    const { positions, randoms } = useMemo(() => {
        const pos = new Float32Array(count * 3)
        const rnd = new Float32Array(count)

        for (let i = 0; i < count; i++) {
            // Random direction
            const theta = Math.random() * Math.PI * 2
            const phi = Math.acos(2 * Math.random() - 1)

            // Large radius: 60 - 120 (Background layer)
            const r = 60 + Math.random() * 60

            const x = r * Math.sin(phi) * Math.cos(theta)
            const y = r * Math.sin(phi) * Math.sin(theta)
            const z = r * Math.cos(phi)

            pos[i * 3] = x
            pos[i * 3 + 1] = y
            pos[i * 3 + 2] = z

            rnd[i] = Math.random() // For random twinkling offset
        }
        return { positions: pos, randoms: rnd }
    }, [])

    const uniforms = useMemo(() => ({
        uTime: { value: 0 },
        uOpacity: { value: 0 }, // Controlled by state
    }), [])

    useFrame((state, delta) => {
        if (!meshRef.current) return

        const material = meshRef.current.material as THREE.ShaderMaterial
        material.uniforms.uTime.value = state.clock.elapsedTime

        // Opacity Logic:
        // Visible when "CHAOS" (Scattered), Hidden/Dim when "FORMED"
        // User said: "scattered... looks like starry sky" implies it might appear/enhance on scatter
        // Let's fade it in when scattered.
        const targetOpacity = treeState === 'FORMED' ? 0.3 : 1.0 // Faint when formed, Bright when chaotic

        material.uniforms.uOpacity.value = THREE.MathUtils.lerp(
            material.uniforms.uOpacity.value,
            targetOpacity,
            delta * 1.0
        )

        // Slow rotation of the entire sky
        meshRef.current.rotation.y += delta * 0.02
    })

    const vertexShader = `
        uniform float uTime;
        attribute float aRandom;
        varying float vAlpha;
        
        void main() {
            vec3 pos = position;
            vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
            
            // Size attenuation
            gl_PointSize = (100.0 * aRandom + 50.0) / -mvPosition.z;
            gl_Position = projectionMatrix * mvPosition;
            
            // Twinkle Logic
            float twinkle = sin(uTime * 2.0 + aRandom * 100.0);
            vAlpha = 0.5 + 0.5 * twinkle; // 0.0 to 1.0 range-ish
        }
    `

    const fragmentShader = `
        uniform float uOpacity;
        varying float vAlpha;
        
        void main() {
            // Circular particle
            vec2 coord = gl_PointCoord - vec2(0.5);
            float dist = length(coord);
            if (dist > 0.5) discard;
            
            // Soft glow
            float strength = 1.0 - (dist * 2.0);
            strength = pow(strength, 2.0);
            
            gl_FragColor = vec4(1.0, 1.0, 1.0, strength * vAlpha * uOpacity);
        }
    `

    return (
        <points ref={meshRef}>
            <bufferGeometry>
                <bufferAttribute
                    attach="attributes-position"
                    count={count}
                    array={positions}
                    itemSize={3}
                    args={[positions, 3]}
                />
                <bufferAttribute
                    attach="attributes-aRandom"
                    count={count}
                    array={randoms}
                    itemSize={1}
                    args={[randoms, 1]}
                />
            </bufferGeometry>
            <shaderMaterial
                uniforms={uniforms}
                vertexShader={vertexShader}
                fragmentShader={fragmentShader}
                transparent={true}
                depthWrite={false}
                blending={THREE.AdditiveBlending}
            />
        </points>
    )
}

export default StarryBackground
