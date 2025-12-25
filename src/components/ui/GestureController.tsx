import { useEffect, useRef, useState } from 'react'
import { FilesetResolver, GestureRecognizer } from '@mediapipe/tasks-vision'
import { useStore } from '../../store/useStore'

const GestureController = () => {
    const videoRef = useRef<HTMLVideoElement>(null)
    const [loaded, setLoaded] = useState(false)
    const [handsDetected, setHandsDetected] = useState(false)
    const [errorMessage, setErrorMessage] = useState<string | null>(null) // Debug
    const setTreeState = useStore(state => state.setTreeState)
    const gestureRecognizerRef = useRef<GestureRecognizer | null>(null)

    useEffect(() => {
        const init = async () => {
            try {
                console.log("Initializing MediaPipe...")
                const vision = await FilesetResolver.forVisionTasks(
                    "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.9/wasm"
                )
                gestureRecognizerRef.current = await GestureRecognizer.createFromOptions(vision, {
                    baseOptions: {
                        modelAssetPath: "https://storage.googleapis.com/mediapipe-models/gesture_recognizer/gesture_recognizer/float16/1/gesture_recognizer.task",
                        delegate: "GPU"
                    },
                    runningMode: "VIDEO",
                    numHands: 2,
                    minHandDetectionConfidence: 0.3,
                    minHandPresenceConfidence: 0.3,
                    minTrackingConfidence: 0.3
                })
                setLoaded(true)
                console.log("MediaPipe Initialized")
                startVideo()
            } catch (error: any) {
                console.error("MediaPipe Init Error:", error)
                setErrorMessage(`AI Init Failed: ${error.message || error}`)
            }
        }
        init()
    }, [])

    const startVideo = () => {
        if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
            navigator.mediaDevices.getUserMedia({ video: true }).then((stream) => {
                useStore.getState().setWebcamStream(stream) // Share stream
                if (videoRef.current) {
                    videoRef.current.srcObject = stream
                    videoRef.current.play()
                    requestAnimationFrame(predict)
                }
            }).catch(e => {
                console.error("Webcam Error:", e)
                setErrorMessage(`Camera Error: ${e.message}`)
            })
        } else {
            setErrorMessage("Camera API not supported")
        }
    }

    const predict = () => {
        if (videoRef.current && gestureRecognizerRef.current && videoRef.current.readyState === 4) {
            const results = gestureRecognizerRef.current.recognizeForVideo(videoRef.current, performance.now())

            let rightHandFound = false

            if (results.gestures.length > 0) {
                setHandsDetected(true)
                // Loop through hands
                for (let i = 0; i < results.gestures.length; i++) {
                    const gesture = results.gestures[i][0]
                    const handedness = results.handednesses[i][0]

                    console.log(`Gesture: ${gesture.categoryName}, Hand: ${handedness.categoryName}`)

                    if (gesture.categoryName === 'Open_Palm') {
                        setTreeState('CHAOS')
                    } else if (gesture.categoryName === 'Closed_Fist') {
                        setTreeState('FORMED')
                    }

                    if (handedness.categoryName === 'Left') {
                        // Left Hand Logic
                        const indexTip = results.landmarks[i][8]
                        if (indexTip) {
                            useStore.getState().setHandCursor({
                                x: (indexTip.x - 0.5) * 2, // Map 0..1 to -1..1
                                y: -(indexTip.y - 0.5) * 2,
                                active: true
                            })
                        }
                    }

                    if (handedness.categoryName === 'Right') {
                        rightHandFound = true
                        // Right Hand Logic: Joystick Camera Control
                        const palm = results.landmarks[i][0]
                        if (palm) {
                            const state = useStore.getState()

                            // X -> Azimuth (Rotation Speed)
                            // Center = 0.5. Right (<0.5 in mirrored?) Wait, palm.x is normalized. 
                            // Usually MediaPipe x is 0(left) -> 1(right). 
                            // Joystick logic:
                            const centerX = 0.5
                            const centerY = 0.5
                            const deadzone = 0.05
                            const sensitivity = 0.05 // speed per frame

                            const dx = palm.x - centerX
                            const dy = palm.y - centerY

                            // Azimuth
                            if (Math.abs(dx) > deadzone) {
                                // Invert dx because typically dragging right rotates camera left? 
                                // Or joystick right rotates camera right. 
                                // standard orbit: swipe left rotates camera right.
                                // Let's try direct mapping: Hand Right (x>0.5) -> Add Angle.
                                const dir = dx > 0 ? 1 : -1
                                const speed = (Math.abs(dx) - deadzone) * sensitivity
                                state.setCameraRotationTarget(state.cameraRotationTarget + (dir * speed * 2)) // *2 for faster turn
                            }

                            // Polar (Tilt)
                            if (Math.abs(dy) > deadzone) {
                                const dir = dy > 0 ? 1 : -1
                                const speed = (Math.abs(dy) - deadzone) * sensitivity
                                let newPolar = state.cameraPolarTarget + (dir * speed)
                                newPolar = Math.max(Math.PI / 4, Math.min(Math.PI / 1.5, newPolar))
                                state.setCameraPolarTarget(newPolar)
                            }

                            // Update Joystick State for UI
                            state.setRightHandJoystick({
                                x: (palm.x - 0.5) * 2,
                                y: -(palm.y - 0.5) * 2,
                                active: true
                            })
                        }
                    }
                }
            } else {
                setHandsDetected(false)
                useStore.getState().setHandCursor({ x: 0, y: 0, active: false }) // Reset cursor
                useStore.getState().setRightHandJoystick({ x: 0, y: 0, active: false })
            }

            // Update Right Hand Active State
            const state = useStore.getState()
            if (state.isRightHandActive !== rightHandFound) {
                state.setIsRightHandActive(rightHandFound)
                if (!rightHandFound) {
                    state.setRightHandJoystick({ x: 0, y: 0, active: false })
                }
            }
        }
        requestAnimationFrame(predict)
    }

    // UI Cursors
    const leftCursor = useStore(state => state.handCursor)
    const rightJoystick = useStore(state => state.rightHandJoystick)

    return (
        <>
            {/* Cursors Overlay */}
            <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
                {/* Left Hand Cursor (Pointer) */}
                {leftCursor.active && (
                    <div
                        className="absolute w-8 h-8 border-2 border-white rounded-full shadow-[0_0_15px_rgba(255,255,255,0.8)] transition-transform duration-75 flex items-center justify-center bg-white/20 backdrop-blur-sm"
                        style={{
                            left: '50%',
                            top: '50%',
                            transform: `translate(${leftCursor.x * 50}vw, ${-leftCursor.y * 50}vh) translate(-50%, -50%)`
                        }}
                    >
                        <div className="w-1 h-1 bg-white rounded-full" />
                    </div>
                )}

                {/* Right Hand Cursor (Joystick) */}
                {rightJoystick.active && (
                    <div
                        className="absolute w-24 h-24 rounded-full border border-christmas-gold/30 bg-black/20 backdrop-blur-md transition-transform duration-75 flex items-center justify-center"
                        style={{
                            left: '50%',
                            top: '50%',
                            transform: `translate(${rightJoystick.x * 50}vw, ${-rightJoystick.y * 50}vh) translate(-50%, -50%)`
                        }}
                    >
                        {/* Deadzone indicator */}
                        <div className="absolute w-8 h-8 rounded-full border border-christmas-gold/10" />

                        {/* Stick Position (Relative to Center?) 
                            Actually, rightJoystick.x/y is the ABSOLUTE position on screen.
                            So this entire div moves with the hand.
                            The visual "Joystick" effect implies a fixed base and moving stick.
                            But we implemented "Position = Joystick Value".
                            So the "Base" is the center of the screen?
                            If so, we should draw a line to the center?
                            Let's just show the Hand Position for now, maybe with an arrow pointing from center?
                            Or just the hand position is enough to verify tracking.
                        */}
                        <div className="w-3 h-3 bg-christmas-gold rounded-full shadow-[0_0_10px_#D4AF37]" />

                        {/* Label */}
                        <span className="absolute -bottom-6 text-[10px] text-christmas-gold uppercase tracking-widest whitespace-nowrap">Camera</span>
                    </div>
                )}
            </div>

            <div className="absolute bottom-6 right-6 z-50 flex flex-col items-end pointer-events-none gap-3">
                {/* Status Panel */}
                <div className="bg-black/60 backdrop-blur-md rounded-lg p-4 border border-christmas-gold/30 text-right shadow-2xl transition-all duration-300">
                    <div className="flex items-center justify-end gap-2 mb-2">
                        <span className={`w-2 h-2 rounded-full ${handsDetected ? 'bg-green-400 shadow-[0_0_10px_rgba(74,222,128,0.8)]' : 'bg-red-400 shadow-[0_0_10px_rgba(248,113,113,0.8)]'}`} />
                        <span className="text-xs font-serif text-christmas-gold tracking-widest uppercase">
                            {handsDetected ? "AI Active" : "Searching..."}
                        </span>
                    </div>

                    <div className="space-y-1 text-[10px] text-christmas-glow opacity-80 font-light">
                        <div className="flex justify-end gap-2"><span>Unleash Chaos</span> <span className="font-bold">🖐 Open</span></div>
                        <div className="flex justify-end gap-2"><span>Form Tree</span> <span className="font-bold">✊ Fist</span></div>
                        <div className="flex justify-end gap-2"><span>Magnify</span> <span className="font-bold">👈 Left</span></div>
                        <div className="flex justify-end gap-2"><span>Rotate/Tilt</span> <span className="font-bold">👉 Right</span></div>
                    </div>
                </div>

                {/* Video Feed */}
                <div className="relative group pointer-events-auto">
                    <video
                        ref={videoRef}
                        className="w-32 h-24 object-cover rounded-lg border border-christmas-gold/20 opacity-30 group-hover:opacity-100 transition-all duration-500 scale-x-[-1] shadow-lg"
                        muted
                        playsInline
                    />
                    {!loaded && !errorMessage && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-lg">
                            <span className="text-[10px] text-christmas-gold animate-pulse">Initializing...</span>
                        </div>
                    )}
                    {errorMessage && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black/80 rounded-lg p-2">
                            <span className="text-[10px] text-red-400 text-center leading-tight">{errorMessage}</span>
                        </div>
                    )}
                </div>
            </div>
        </>
    )
}

export default GestureController
