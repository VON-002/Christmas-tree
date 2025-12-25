import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

const BackgroundParticles = () => {
    const meshRef = useRef<THREE.Points>(null)
    const count = 500 // Reduced from 2000

    const { positions } = useMemo(() => {
        const pos = new Float32Array(count * 3)
        // const spd = new Float32Array(count) // unused

        for (let i = 0; i < count; i++) {
            // Fill a large volume around the tree
            pos[i * 3] = (Math.random() - 0.5) * 60
            pos[i * 3 + 1] = (Math.random() - 0.5) * 40
            pos[i * 3 + 2] = (Math.random() - 0.5) * 60

            // spd[i] = Math.random() * 0.2 + 0.1
        }
        return { positions: pos }
    }, [])

    useFrame((state) => {
        if (!meshRef.current) return
        const material = meshRef.current.material as THREE.ShaderMaterial
        material.uniforms.uTime.value = state.clock.elapsedTime
    })

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
            </bufferGeometry>
            <shaderMaterial
                vertexShader={`
                    attribute float speed;
                    uniform float uTime;
                    varying float vAlpha;
                    void main() {
                        vec3 pos = position;
                        // Slow float
                        pos.y += sin(uTime * speed + position.x) * 0.5;
                        
                        vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
                        gl_PointSize = (3.0 * speed + 2.0) * (20.0 / -mvPosition.z); // Tiny size
                        gl_Position = projectionMatrix * mvPosition;
                        
                        // Twinkle alpha
                        vAlpha = 0.5 + 0.5 * sin(uTime * 3.0 + position.x * 10.0);
                    }
                `}
                fragmentShader={`
                    varying float vAlpha;
                    void main() {
                        // Circle 
                        vec2 coord = gl_PointCoord - vec2(0.5);
                        float dist = length(coord);
                        if (dist > 0.5) discard;
                        
                        // Golden Dust
                        gl_FragColor = vec4(1.0, 0.84, 0.0, vAlpha * 0.4); // Subtle Gold
                    }
                `}
                uniforms={{ uTime: { value: 0 } }}
                transparent
                depthWrite={false}
                blending={THREE.AdditiveBlending}
            />
        </points>
    )
}

export default BackgroundParticles
