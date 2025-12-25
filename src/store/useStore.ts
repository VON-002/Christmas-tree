import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type TreeState = 'CHAOS' | 'FORMED'

interface Preset {
    id: string
    name: string
    photos: string[]
}

interface AppState {
    treeState: TreeState
    setTreeState: (state: TreeState) => void
    toggleTreeState: () => void

    // Hand Interaction State
    handCursor: { x: number, y: number, active: boolean }
    setHandCursor: (cursor: { x: number, y: number, active: boolean }) => void

    rightHandJoystick: { x: number, y: number, active: boolean }
    setRightHandJoystick: (cursor: { x: number, y: number, active: boolean }) => void

    cameraRotationTarget: number // 0 to 1, or angle
    setCameraRotationTarget: (val: number) => void

    cameraPolarTarget: number
    setCameraPolarTarget: (val: number) => void

    isRightHandActive: boolean
    setIsRightHandActive: (val: boolean) => void

    photos: string[]
    setPhotos: (photos: string[]) => void
    addPhoto: (photo: string) => void

    activePresetId: string | null
    presets: Preset[]
    isPreviewMode: boolean
    setIsPreviewMode: (val: boolean) => void
    savePreset: (name: string) => void
    updatePreset: () => void
    loadPreset: (id: string) => void
    renamePreset: (id: string, name: string) => void
    deletePreset: (id: string) => void
}

export const useStore = create<AppState>()(
    persist(
        (set) => ({
            treeState: 'CHAOS', // Initial state
            setTreeState: (state) => set({ treeState: state }),
            toggleTreeState: () => set((state) => ({
                treeState: state.treeState === 'CHAOS' ? 'FORMED' : 'CHAOS'
            })),

            handCursor: { x: 0, y: 0, active: false },
            setHandCursor: (cursor) => set({ handCursor: cursor }),

            rightHandJoystick: { x: 0, y: 0, active: false },
            setRightHandJoystick: (cursor) => set({ rightHandJoystick: cursor }),

            cameraRotationTarget: 0,
            setCameraRotationTarget: (val) => set({ cameraRotationTarget: val }),

            cameraPolarTarget: Math.PI / 2,
            setCameraPolarTarget: (val) => set({ cameraPolarTarget: val }),

            isRightHandActive: false,
            setIsRightHandActive: (val) => set({ isRightHandActive: val }),

            photos: [],
            setPhotos: (photos) => set({ photos }),
            addPhoto: (photo) => set((state) => ({ photos: [...state.photos, photo] })),

            presets: [],
            activePresetId: null,
            isPreviewMode: false,
            setIsPreviewMode: (val) => set({ isPreviewMode: val }),

            savePreset: (name) => set((state) => ({
                presets: [...state.presets, { id: Math.random().toString(36).substr(2, 9), name, photos: [...state.photos] }],
                activePresetId: null // reset active when saving new
            })),
            updatePreset: () => set((state) => {
                if (!state.activePresetId) return {}
                return {
                    presets: state.presets.map(p => p.id === state.activePresetId
                        ? { ...p, photos: [...state.photos] }
                        : p
                    )
                }
            }),
            loadPreset: (id) => set((state) => {
                const preset = state.presets.find(p => p.id === id)
                return preset ? { photos: [...preset.photos], activePresetId: id } : {}
            }),
            renamePreset: (id, name) => set((state) => ({
                presets: state.presets.map(p => p.id === id ? { ...p, name } : p)
            })),
            deletePreset: (id) => set((state) => ({
                presets: state.presets.filter(p => p.id !== id),
                activePresetId: state.activePresetId === id ? null : state.activePresetId // clear active if deleted
            })),
        }),
        {
            name: 'luxury-christmas-storage',
            partialize: (state) => ({ presets: state.presets }), // Only persist presets
        }
    )
)
