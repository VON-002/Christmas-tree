import { Text } from '@react-three/drei'
import { useThree } from '@react-three/fiber'

export function OverlayText() {
    const { viewport } = useThree()
    // Position at top center, scaling with viewport
    // viewport.height / 2 is top edge
    const yPos = viewport.height / 2 - 1.5

    return (
        <Text
            position={[0, yPos, 0]}
            fontSize={1.5}
            color="#d4af37" // Christmas Gold
            font="https://fonts.gstatic.com/s/greatvibes/v14/RWm99F8kLExjiGqabsAw7_si.woff" // Great Vibes cursive font
            anchorX="center"
            anchorY="middle"
            outlineWidth={0.05}
            outlineColor="#000000"
            fillOpacity={0.9}
        >
            Merry Christmas
        </Text>
    )
}
