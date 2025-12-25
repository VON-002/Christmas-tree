import { Hud, OrthographicCamera, Text } from '@react-three/drei'
import { useThree } from '@react-three/fiber'
import { useEffect, useState } from 'react'
import * as THREE from 'three'
import { useStore } from '../../store/useStore'

export function HUDOverlay() {
    const { size } = useThree()
    const viewportWidth = size.width
    const viewportHeight = size.height

    return (
        <Hud renderPriority={1}>
            <OrthographicCamera
                makeDefault
                position={[0, 0, 10]}
                left={-viewportWidth / 2}
                right={viewportWidth / 2}
                top={viewportHeight / 2}
                bottom={-viewportHeight / 2}
            />

            <Text
                position={[0, viewportHeight / 2 - 60, 0]}
                fontSize={60}
                color="#d4af37"
                anchorX="center"
                anchorY="middle"
                font="https://fonts.gstatic.com/s/greatvibes/v14/RWm99F8kLExjiGqabsAw7_si.woff"
                outlineWidth={2}
                outlineColor="#000000"
            >
                Merry Christmas
            </Text>

            <HUDWebcam width={viewportWidth} height={viewportHeight} />
        </Hud>
    )
}

function HUDWebcam({ width, height }: { width: number, height: number }) {
    const camWidth = 320
    const camHeight = 240
    const padding = 20

    // Bottom Right position
    const x = width / 2 - camWidth / 2 - padding
    const y = -height / 2 + camHeight / 2 + padding

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
        video.play().catch(e => console.error("HUD Webcam play error:", e))

        const texture = new THREE.VideoTexture(video)
        texture.colorSpace = THREE.SRGBColorSpace
        setVideoTexture(texture)
    }, [webcamStream])

    if (!videoTexture) return null

    return (
        <mesh position={[x, y, 0]}>
            <planeGeometry args={[camWidth, camHeight]} />
            <meshBasicMaterial map={videoTexture} />
            <lineSegments>
                <edgesGeometry args={[new THREE.PlaneGeometry(camWidth, camHeight)]} />
                <lineBasicMaterial color="#d4af37" linewidth={2} />
            </lineSegments>
        </mesh>
    )
}
