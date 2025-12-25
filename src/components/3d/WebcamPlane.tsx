import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import { useThree } from '@react-three/fiber'
import { useStore } from '../../store/useStore'

export function WebcamPlane() {
    const videoRef = useRef<HTMLVideoElement>(document.createElement('video'))
    const [videoTexture, setVideoTexture] = useState<THREE.VideoTexture | null>(null)
    const { viewport } = useThree()
    const isRightHandActive = useStore(s => s.isRightHandActive)

    const webcamStream = useStore(s => s.webcamStream)

    useEffect(() => {
        const video = videoRef.current
        video.width = 640
        video.height = 480
        video.autoplay = true
        video.playsInline = true
        video.muted = true // Essential for autoplay

        if (webcamStream) {
            video.srcObject = webcamStream
            video.play().catch(e => console.error("WebcamPlane play error:", e))

            const texture = new THREE.VideoTexture(video)
            texture.colorSpace = THREE.SRGBColorSpace
            setVideoTexture(texture)
        }

        return () => {
            // Do not stop tracks as they are owned by GestureController
            video.srcObject = null
        }
    }, [webcamStream])

    // Position: Bottom Right
    // viewport bottom right is (viewport.width/2, -viewport.height/2)
    const width = 4
    const height = 3 // 4:3 aspect
    const x = viewport.width / 2 - width / 2 - 1
    const y = -viewport.height / 2 + height / 2 + 1

    if (!videoTexture) return null

    return (
        <mesh position={[x, y, 0]} renderOrder={999}>
            <planeGeometry args={[width, height]} />
            <meshBasicMaterial map={videoTexture} />
            {/* Optional Frame */}
            <lineSegments>
                <edgesGeometry args={[new THREE.PlaneGeometry(width, height)]} />
                <lineBasicMaterial color={isRightHandActive ? "#00ff00" : "#d4af37"} />
            </lineSegments>
        </mesh>
    )
}
