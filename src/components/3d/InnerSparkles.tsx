
import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useStore } from '../../store/useStore'

const InnerSparkles = () => {
    const meshRef = useRef<THREE.Points>(null)
    const treeState = useStore(state => state.treeState)

    // Number of inner sparkles
    const count = 1500

    const { targetPos, chaosPos, randoms } = useMemo(() => {
        const tPos = new Float32Array(count * 3)
        const cPos = new Float32Array(count * 3)
        const rnd = new Float32Array(count)

        const height = 14 // Slightly smaller than full tree (15)
        const baseRadius = 6 // Slightly smaller than full tree (7)
        const yOffset = 2

        for (let i = 0; i < count; i++) {
            // Random point INSIDE the cone
            // y goes from bottom to top
            const hRatio = Math.random() // 0 to 1
            const y = (1 - hRatio) * height - (height / 2) + yOffset

            // Radius at this height
            const maxR = hRatio * baseRadius

            // Random radius inside (uniform distribution by area: sqrt(random))
            const r = maxR * Math.sqrt(Math.random())
            const theta = Math.random() * Math.PI * 2

            const x = r * Math.cos(theta)
            const z = r * Math.sin(theta)

            tPos[i * 3] = x
            tPos[i * 3 + 1] = y
            tPos[i * 3 + 2] = z

            // Chaos: Scatter outwards with everything else
            // Spherical scatter
            const rChaos = 10 + Math.random() * 20 // Inner sphere
            const phi = Math.acos(2 * Math.random() - 1)
            const theta2 = Math.random() * Math.PI * 2

            cPos[i * 3] = rChaos * Math.sin(phi) * Math.cos(theta2)
            cPos[i * 3 + 1] = rChaos * Math.sin(phi) * Math.sin(theta2)
            cPos[i * 3 + 2] = rChaos * Math.cos(phi)

            rnd[i] = Math.random()
        }
        return { targetPos: tPos, chaosPos: cPos, randoms: rnd }
    }, [])



    useFrame((state, delta) => {
        if (!meshRef.current) return
        const material = meshRef.current.material as THREE.ShaderMaterial
        material.uniforms.uTime.value = state.clock.elapsedTime

        // Lerp factor
        const targetT = treeState === 'FORMED' ? 0 : 1
        material.uniforms.uProgress.value = THREE.MathUtils.lerp(
            material.uniforms.uProgress.value,
            targetT,
            delta * 1.5
        )
    })

    const vertexShader = `
        uniform float uTime;
        uniform float uProgress;
        attribute vec3 chaosPos;
        attribute float aRandom;
        
        void main() {
            vec3 target = position;
            vec3 chaos = chaosPos;
            
            float t = uProgress;
            float ease = t * t * (3.0 - 2.0 * t);
            
            vec3 pos = mix(target, chaos, ease);
            
            // Gentle internal float
            pos.y += sin(uTime + pos.x) * 0.2;
            
            vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
            
            gl_PointSize = (40.0 * aRandom + 20.0) / -mvPosition.z;
            gl_Position = projectionMatrix * mvPosition;
        }
    `

    const fragmentShader = `
        uniform float uTime;
        
        void main() {
            vec2 coord = gl_PointCoord - vec2(0.5);
            float dist = length(coord);
            if (dist > 0.5) discard;
            
            // Sparkle
            float sparkle = 0.5 + 0.5 * sin(uTime * 5.0 + gl_FragCoord.x);
            
            // Greenish Glow code
            vec3 color = vec3(0.2, 1.0, 0.4); // Bright Green
            
            float alpha = (1.0 - smoothstep(0.1, 0.5, dist)) * sparkle * 0.8;
            
            gl_FragColor = vec4(color, alpha);
        }
    `

    const uniforms = useMemo(() => ({
        uTime: { value: 0 },
        uProgress: { value: 0 }
    }), [])

    return (
        <points ref={meshRef}>
            <bufferGeometry>
                <bufferAttribute
                    attach="attributes-position"
                    count={count}
                    array={targetPos}
                    itemSize={3}
                    args={[targetPos, 3]}
                />
                <bufferAttribute
                    attach="attributes-chaosPos"
                    count={count}
                    array={chaosPos}
                    itemSize={3}
                    args={[chaosPos, 3]}
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

export default InnerSparkles
