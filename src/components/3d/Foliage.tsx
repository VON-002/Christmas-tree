import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useStore } from '../../store/useStore'
import { generateTreePositions } from '../../utils/math'

const Foliage = () => {
    const meshRef = useRef<THREE.Points>(null)
    const treeState = useStore(state => state.treeState)

    // Increase count for continuous silky band (Higher Density)
    const count = 50000
    const { targetPos, chaosPos } = useMemo(() => generateTreePositions(count), [])

    // Shader uniforms
    const uniforms = useMemo(() => ({
        uTime: { value: 0 },
        uColorBase: { value: new THREE.Color('#0D5C3B') }, // Deep Green
        uColorTip: { value: new THREE.Color('#4ADE80') }, // Bright Green Tip
        uProgress: { value: 0 }, // 0 = Formed, 1 = Chaos
    }), [])

    useFrame((state, delta) => {
        if (meshRef.current) {
            // Update time
            const material = meshRef.current.material as THREE.ShaderMaterial
            material.uniforms.uTime.value = state.clock.elapsedTime

            // Lerp progress based on state
            const targetProgress = treeState === 'FORMED' ? 1 : 0
            material.uniforms.uProgress.value = THREE.MathUtils.lerp(
                material.uniforms.uProgress.value,
                targetProgress,
                delta * 1.5 // Transition speed
            )
        }
    })

    // GLSL Shaders
    const vertexShader = `
    uniform float uTime;
    uniform float uProgress;
    attribute vec3 chaosPos;
    varying vec2 vUv;
    varying float vHeight;
    varying float vBlink; // Random blink offset

    void main() {
      vUv = uv;
      
      vec3 target = position;
      vec3 chaos = chaosPos;
      
      // Interpolate
      float t = uProgress;
      float ease = t * t * (3.0 - 2.0 * t);
      
      vec3 finalPos = mix(chaos, target, ease);
      
      // Wind / Float effect
      float wind = sin(uTime * 1.5 + finalPos.y * 0.5) * 0.05;
      finalPos.x += wind * ease; 
      
      // Chaos breathing (Subtle)
      if (uProgress < 0.9) {
          finalPos.y += sin(uTime + finalPos.x) * 0.1 * (1.0 - ease); // Reduced from 0.5
          finalPos.x += cos(uTime * 0.8 + finalPos.z) * 0.1 * (1.0 - ease); // Reduced from 0.5
      }
      
      vHeight = finalPos.y; 
      // Generate random blink offset based on position
      vBlink = sin(finalPos.x * 12.0 + finalPos.z * 15.0); 

      vec4 mvPosition = modelViewMatrix * vec4(finalPos, 1.0);
      
      // Distinct Units (Smaller, finer grains)
      gl_PointSize = (60.0 / -mvPosition.z); 
      
      gl_Position = projectionMatrix * mvPosition;
    }
  `

    const fragmentShader = `
    uniform vec3 uColorBase;
    uniform vec3 uColorTip;
    uniform float uTime;
    varying float vHeight;
    varying float vBlink;
    varying vec2 vUv;

    float random(vec2 st) {
        return fract(sin(dot(st.xy, vec2(12.9898,78.233))) * 43758.5453123);
    }

    void main() {
      // SHAPE: Circular / Round
      vec2 coord = gl_PointCoord - vec2(0.5);
      float dist = length(coord); // Euclidean distance for circle

      // Discard outside circle
      if (dist > 0.5) discard;

      // Gradient based on height
      vec3 color = mix(uColorBase, uColorTip, clamp((vHeight + 6.0) / 14.0, 0.0, 1.0));
      
      // Blinking / Pulsing (Weak Glow)
      float pulse = 0.9 + 0.1 * sin(uTime * 2.0 + vBlink * 10.0); // Reduced pulse range
      
      // Sparkle Effect (Faint Shimmer) - Reduced by 50%
      float noiseVal = random(gl_PointCoord + vec2(uTime * 1.0));
      float sparkle = step(0.92, noiseVal) * 0.2; // Reduced from 0.4
      
      // Alpha: Soft edge for "Glowing" look
      // Center is solid, edges fade out
      float alpha = 1.0 - smoothstep(0.2, 0.5, dist);
      
      // Variation: 10% Deep Green with White Halo
      // Use noise on UV or Position to select "special" particles
      float distinctRand = random(vec2(vBlink, vHeight)); // Stable random per particle
      float isDeep = step(0.90, distinctRand); // 10% chance
      
      vec3 finalBase = color;
      if (isDeep > 0.5) {
          finalBase = mix(uColorBase, vec3(0.0, 0.2, 0.1), 0.7); // Darker Green
          
          // Add White Halo at edge
          float halo = smoothstep(0.4, 0.5, dist); 
          finalBase += vec3(1.0) * halo * 0.5; // White rim
      }

      vec3 finalColor = finalBase * pulse + vec3(sparkle);
      
      gl_FragColor = vec4(finalColor, alpha);
    }
  `

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
            </bufferGeometry>
            <shaderMaterial
                uniforms={uniforms}
                vertexShader={vertexShader}
                fragmentShader={fragmentShader}
                transparent={true}
                depthWrite={false}
                blending={THREE.NormalBlending} // Changed from Additive to Normal for less neon
            />
        </points>
    )
}

export default Foliage
