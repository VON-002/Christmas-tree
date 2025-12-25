import { Text } from '@react-three/drei'
import { useFrame, useThree } from '@react-three/fiber'
import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import { useStore } from '../../store/useStore'

export function CameraFixedOverlay() {
    const { camera } = useThree()
    const groupRef = useRef<THREE.Group>(null)

    // We attach this group to the camera in useEffect?? 
    // No, modifying the scene graph of the camera managed by OrbitControls is tricky.
    // Better: Update position/rotation every frame to match camera.

    /* 
       Actually, standard "HUD" without createPortal logic:
       Just make this group a child of the camera object?
       Or use a Portal to the camera.
    */

    // Simplest robust method: useFrame to follow camera
    useFrame(() => {
        if (groupRef.current) {
            groupRef.current.position.copy(camera.position)
            groupRef.current.quaternion.copy(camera.quaternion)
            // Move translating Z forward relative to camera orientation
            groupRef.current.translateZ(-10)
        }
    })

    // Text Size needs to be relative to FoV and distance (10 units).
    // This is hard to get pixel perfect but "Fixed at top" is possible.

    // Let's try simpler: Portal to camera.
    // return createPortal(<mesh.../>, camera)

    // Let's try the useFrame approach first as it keeps it in the main scene graph
    // preventing context loss issues.

    // Wait, if I simply put this group in the scene, and update its transform to match camera,
    // it effectively acts as a HUD.

    // But bloom might affect it? Yes, but that's fine or desired (glowing text).

    return (
        <group ref={groupRef}>
            {/* Text: Top Center */}
            {/* renderOrder=999 + depthTest=false ensures it renders ON TOP of everything */}
            <Text
                position={[0, 3.5, 0]} // Roughly top
                fontSize={0.8}
                color="#d4af37"
                anchorX="center"
                anchorY="top"
                font="https://fonts.gstatic.com/s/greatvibes/v14/RWm99F8kLExjiGqabsAw7_si.woff"
                outlineWidth={0.02}
                outlineColor="#000000"
                renderOrder={999}
                depthTest={false}
            >
                Merry Christmas
            </Text>

            {/* Webcam: Bottom Right */}
            {/* Aspect ratio math needed? 
                Let's approximate: x=5, y=-3.5
            */}
            <AttachedWebcam />
        </group>
    )
}

function AttachedWebcam() {
    const webcamStream = useStore(s => s.webcamStream)
    const [videoTexture, setVideoTexture] = useState<THREE.VideoTexture | null>(null)

    useEffect(() => {
        if (!webcamStream) return
        const video = document.createElement('video')
        video.width = 640
        video.height = 480
        video.autoplay = true
        video.muted = true
        video.srcObject = webcamStream
        video.play().catch(console.error)
        const texture = new THREE.VideoTexture(video)
        texture.colorSpace = THREE.SRGBColorSpace
        setVideoTexture(texture)
    }, [webcamStream])

    if (!videoTexture) return null

    // Place at bottom right
    return (
        <mesh position={[6, -3.5, 0]} renderOrder={999}>
            <planeGeometry args={[2.4, 1.8]} />
            {/* 4:3 aspect, scaled down */}
            <meshBasicMaterial map={videoTexture} depthTest={false} />
            <lineSegments renderOrder={999}>
                <edgesGeometry args={[new THREE.PlaneGeometry(2.4, 1.8)]} />
                <lineBasicMaterial color="#d4af37" linewidth={2} depthTest={false} />
            </lineSegments>
        </mesh>
    )
}
