import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import { useThree } from '@react-three/fiber'
import { useStore } from '../../store/useStore'

export function WebcamPlane() {
    const videoRef = useRef<HTMLVideoElement>(document.createElement('video'))
    const [videoTexture, setVideoTexture] = useState<THREE.VideoTexture | null>(null)
    const { viewport } = useThree()
    const isRightHandActive = useStore(s => s.isRightHandActive)

    useEffect(() => {
        const video = videoRef.current
        video.width = 640
        video.height = 480
        video.autoplay = true
        video.playsInline = true

        // We reuse the stream from your existing camera logic if possible, 
        // to avoid double permission requests.
        // Assuming your existing camera logic sets up navigator.mediaDevices
        // Check if there's already a stream? 
        // Actually, easiest is just to request it again, browsers handle sharing usually fine.

        navigator.mediaDevices.getUserMedia({ video: true, audio: false })
            .then(stream => {
                video.srcObject = stream
                video.play()
                const texture = new THREE.VideoTexture(video)
                texture.colorSpace = THREE.SRGBColorSpace
                setVideoTexture(texture)
            })
            .catch(err => console.error("Webcam Plane error:", err))

        return () => {
            // Don't stop tracks here if other parts use it, but for cleanliness:
            const stream = video.srcObject as MediaStream
            if (stream) {
                // We rely on the App's main camera logic for input, 
                // this is just for visualization. 
                // If we stop tracks, main logic might fail.
                // So let's NOT stop tracks, just nullify.
            }
        }
    }, [])

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
