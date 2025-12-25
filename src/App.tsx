import { useRef } from 'react'
import { Canvas } from '@react-three/fiber'
import { Environment, OrbitControls, Stars } from '@react-three/drei'
import { EffectComposer, Bloom } from '@react-three/postprocessing'
import { Suspense } from 'react'
import Foliage from './components/3d/Foliage'
import Ornaments from './components/3d/Ornaments'
import GiftBoxes from './components/3d/GiftBoxes'
import Decorations from './components/3d/Decorations'
import GestureController from './components/ui/GestureController'
import ControlPanel from './components/ui/ControlPanel'
import { useStore } from './store/useStore'
import { useEffect } from 'react'
import BackgroundParticles from './components/3d/BackgroundParticles'
import StarryBackground from './components/3d/StarryBackground'
import InnerSparkles from './components/3d/InnerSparkles'
import { HUDOverlay } from './components/3d/HUDOverlay'
import Star from './components/3d/Star'

function App() {
  return (
    <div className="w-full h-screen bg-christmas-green relative overflow-hidden">



      <Canvas
        camera={{ position: [0, 4, 20], fov: 45 }}
        gl={{ antialias: false, toneMappingExposure: 1.2 }}
        dpr={[1, 2]}
      >
        <Suspense fallback={null}>
          <color attach="background" args={['#050510']} />
          {/* Reduced Star count for stability */}
          <Stars radius={100} depth={50} count={1000} factor={4} saturation={0} fade speed={1} />
          {/* Use 'apartment' for bright home interior reflections */}
          <Environment preset="apartment" background={false} />

          {/* Golden Lighting - Softer Setup */}
          <ambientLight intensity={0.8} color="#D4AF37" /> {/* Reduced from 1.5 */}
          <hemisphereLight groundColor="#222" intensity={1.5} color="#FFD700" />

          {/* Key Light (Strong Warm) */}
          <directionalLight position={[10, 20, 10]} intensity={4.0} color="#FFD700" castShadow />

          {/* Fill Light (Softer Cool/Neutral) */}
          <directionalLight position={[-10, 10, -5]} intensity={2.0} color="#FFE4B5" />

          {/* Back Light / Rim Light (For depth) */}
          <spotLight position={[0, 10, -10]} intensity={3.0} color="#FFFFFF" angle={0.5} penumbra={1} />

          {/* Subtle red fill for festive ambient */}
          <pointLight position={[-10, 5, 10]} intensity={0.8} color="#FF4444" distance={20} decay={2} />

          <Foliage />
          <Ornaments />
          <GiftBoxes />
          <Decorations />
          <Star />
          <InnerSparkles />
          <BackgroundParticles />
          <StarryBackground />
          <HUDOverlay />

          <EffectsWrapper /> {/* Re-enabling Bloom for glow */}
          <ControlsWrapper />
        </Suspense>
      </Canvas>

      <GestureController />
      <ControlPanel />
      <UrlLoader />
    </div>
  )
}

function EffectsWrapper() {
  return (
    <EffectComposer>
      <Bloom luminanceThreshold={0.8} mipmapBlur intensity={0.6} radius={0.5} />
    </EffectComposer>
  )
}

import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

function ControlsWrapper() {
  const controlsRef = useRef<any>(null)
  const cameraRotationTarget = useStore(state => state.cameraRotationTarget)
  const cameraPolarTarget = useStore(state => state.cameraPolarTarget)

  const isRightHandActive = useStore(state => state.isRightHandActive)
  const setCameraRotationTarget = useStore(state => state.setCameraRotationTarget)
  const setCameraPolarTarget = useStore(state => state.setCameraPolarTarget)

  const treeState = useStore(state => state.treeState)

  useFrame((_, delta) => {
    if (controlsRef.current && isRightHandActive) {
      // Hand control overrides everything
      const currentAzimuth = controlsRef.current.getAzimuthalAngle()
      const nextAzimuth = THREE.MathUtils.lerp(currentAzimuth, cameraRotationTarget, delta * 2)
      controlsRef.current.setAzimuthalAngle(nextAzimuth)

      const currentPolar = controlsRef.current.getPolarAngle()
      const nextPolar = THREE.MathUtils.lerp(currentPolar, cameraPolarTarget, delta * 2)
      controlsRef.current.setPolarAngle(nextPolar)
      controlsRef.current.update()
    }
  })

  useEffect(() => {
    const controls = controlsRef.current
    if (!controls) return

    const callback = () => {
      // If hand is NOT active, sync store to current camera position
      // We check useStore.getState().isRightHandActive to avoid closure staleness? 
      // Or just rely on the prop if this effect re-runs? 
      // Better to check specific ref or store directly to avoid re-binding event listener constantly.
      if (!useStore.getState().isRightHandActive) {
        setCameraRotationTarget(controls.getAzimuthalAngle())
        setCameraPolarTarget(controls.getPolarAngle())
      }
    }

    controls.addEventListener('change', callback)
    return () => controls.removeEventListener('change', callback)
  }, [setCameraRotationTarget, setCameraPolarTarget])

  return (
    <OrbitControls
      ref={controlsRef}
      enablePan={false}
      enableDamping={true}
      autoRotate={treeState === 'CHAOS'}
      autoRotateSpeed={0.5} // Slow, natural rotation
      maxPolarAngle={Math.PI / 1.5}
      minPolarAngle={Math.PI / 4}
      minDistance={10}
      maxDistance={40}
    />
  )
}

function UrlLoader() {
  const setPhotos = useStore(state => state.setPhotos)
  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search)
    const id = searchParams.get('id')

    if (id) {
      // New Server-Side Loading
      fetch(`/api/load?id=${id}`)
        .then(res => res.json())
        .then(data => {
          if (data && Array.isArray(data)) {
            setPhotos(data)
          } else {
            console.error("Invalid data format from API")
          }
        })
        .catch(err => console.error("Failed to load preset:", err))
      return
    }

    // Legacy Client-Side Loading (Hash/Query)
    let data = new URLSearchParams(window.location.hash.slice(1)).get('data')
    if (!data) {
      data = searchParams.get('data')
    }
    if (data) {
      try {
        const photos = JSON.parse(atob(decodeURIComponent(data)))
        setPhotos(photos)
      } catch (e) {
        console.error("Failed to load share data", e)
      }
    }
  }, [setPhotos])
  return null
}

export default App
