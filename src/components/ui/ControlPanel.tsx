import { useRef } from 'react'
import { useStore } from '../../store/useStore'
import { Upload, Save, Share2, Trash2, Plus } from 'lucide-react'

const ControlPanel = () => {
    const { photos, addPhoto, setPhotos, activePresetId, savePreset, updatePreset, loadPreset, presets: rawPresets, renamePreset, deletePreset } = useStore()
    const presets = rawPresets || []
    const fileInputRef = useRef<HTMLInputElement>(null)

    // Helper: Resize image and convert to Base64
    const processImage = (file: File): Promise<string> => {
        return new Promise((resolve) => {
            const reader = new FileReader()
            reader.onload = (e) => {
                const img = new Image()
                img.onload = () => {
                    const canvas = document.createElement('canvas')
                    const ctx = canvas.getContext('2d')
                    const maxDim = 512 // Limit to 512px for reasonable URL length

                    let w = img.width
                    let h = img.height

                    if (w > maxDim || h > maxDim) {
                        if (w > h) {
                            h = Math.round(h * (maxDim / w))
                            w = maxDim
                        } else {
                            w = Math.round(w * (maxDim / h))
                            h = maxDim
                        }
                    }

                    canvas.width = w
                    canvas.height = h

                    ctx?.drawImage(img, 0, 0, w, h)
                    // High compression JPEG
                    resolve(canvas.toDataURL('image/jpeg', 0.6))
                }
                img.src = e.target?.result as string
            }
            reader.readAsDataURL(file)
        })
    }

    const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            const files = Array.from(e.target.files)

            // Process all selected files
            for (const file of files) {
                const base64 = await processImage(file)
                addPhoto(base64)
            }
        }
    }

    const handleClear = () => {
        if (confirm("Clear all photos?")) {
            setPhotos([])
        }
    }

    const handleSave = () => {
        if (activePresetId) {
            // If editing an existing preset, just update it
            updatePreset()
            alert("Changes saved to current preset.")
        } else {
            // New preset
            const name = prompt("Preset Name:")
            if (name) {
                savePreset(name)
                // We DON'T clear photos if user is just saving valid work
                // User requirement: "每次加一个新的预设的时候要刷新一下照片库"
                // So if 'Save New', we clear
                setPhotos([])
            }
        }
    }

    const handleShare = () => {
        if (photos.length === 0) {
            alert("No photos to share! Please upload photos first.")
            return
        }

        if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
            alert("⚠️ Warning: You are sharing a Localhost link.\n\nOthers cannot access this link.\nPlease deploy your app (Netlify/Vercel) first, then open the public URL to share.")
        }

        const data = JSON.stringify(photos)
        const encoded = encodeURIComponent(btoa(data))
        const url = `${window.location.origin}${window.location.pathname}#data=${encoded}`

        navigator.clipboard.writeText(url).then(() => {
            alert("Share link copied! \n\n(Send this URL to others to show them your tree)")
        }).catch(() => {
            alert("Failed to copy link. Please manually copy the URL bar if it updated.")
        })
    }

    // If we are in "Share View" (url has ?data=), hide the control panel
    // so the viewer only sees the tree and photos.
    const isShareView = new URLSearchParams(window.location.search).has('data') || new URLSearchParams(window.location.hash.slice(1)).has('data')
    if (isShareView) return null

    const handleRename = (id: string, oldName: string) => {
        const newName = prompt("Rename Preset:", oldName)
        if (newName && newName !== oldName) {
            renamePreset(id, newName)
        }
    }

    const handleDelete = (id: string) => {
        if (confirm("Are you sure you want to delete this preset?")) {
            deletePreset(id)
        }
    }

    return (
        <div className="absolute top-6 right-6 z-50 flex flex-col gap-3 w-64 pointer-events-none">
            {/* Main Panel */}
            <div className="bg-black/40 backdrop-blur-xl p-4 rounded-lg border border-white/10 shadow-2xl pointer-events-auto transition-all hover:bg-black/50">
                {/* ... (Header and Add Photos) */}
                <div className="flex justify-between items-center mb-3 border-b border-white/5 pb-2">
                    <h2 className="text-sm font-serif text-christmas-gold tracking-widest uppercase">
                        Decorations
                    </h2>
                    <span className="text-[10px] text-white/30">{photos.length} / 20</span>
                </div>

                <div className="flex gap-2 mb-3">
                    <button
                        onClick={() => fileInputRef.current?.click()}
                        className="flex-1 bg-christmas-gold/90 text-black text-xs font-bold py-1.5 rounded hover:bg-white transition-colors flex items-center justify-center gap-1.5"
                    >
                        <Upload size={12} /> Add Photos
                    </button>
                    <button
                        onClick={handleClear}
                        className="bg-white/5 text-white/50 p-1.5 rounded hover:bg-red-900/50 hover:text-red-200 transition-colors"
                        title="Clear All"
                    >
                        <Trash2 size={12} />
                    </button>
                    <input ref={fileInputRef} type="file" hidden accept="image/*" multiple onChange={handleUpload} />
                </div>

                {/* Photo Grid */}
                <div className="grid grid-cols-4 gap-1.5 max-h-32 overflow-y-auto mb-3 scrollbar-none">
                    {photos.map((url, i) => (
                        <div key={i} className="aspect-square relative group overflow-hidden rounded-sm border border-white/10">
                            <img src={url} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" />
                        </div>
                    ))}
                    {photos.length === 0 && <span className="col-span-4 text-center text-[10px] text-white/20 py-2">Empty Gallery</span>}
                </div>

                {/* Presets Actions */}
                <div className="flex gap-2 pt-2 border-t border-white/5">
                    <button
                        onClick={handleSave}
                        className={`flex-1 ${activePresetId ? 'bg-christmas-gold text-black hover:bg-white' : 'bg-white/5 text-white/70 hover:bg-white/10'} py-1.5 rounded flex items-center justify-center gap-1.5 text-[10px] uppercase tracking-wide transition-colors font-bold`}
                    >
                        <Save size={12} /> {activePresetId ? 'Update' : 'Save New'}
                    </button>
                    <button onClick={handleShare} className="flex-1 bg-white/5 text-white/70 py-1.5 rounded hover:bg-white/10 flex items-center justify-center gap-1.5 text-[10px] uppercase tracking-wide transition-colors">
                        <Share2 size={12} /> Share
                    </button>
                </div>
            </div>



            {/* Presets List */}
            <div className="bg-black/40 backdrop-blur-xl p-3 rounded-lg border border-white/10 pointer-events-auto">
                <div className="flex justify-between items-center mb-2">
                    <h3 className="text-white/40 font-serif text-[10px] uppercase tracking-widest">Presets</h3>
                    <button
                        onClick={() => {
                            const name = prompt("New Preset Name:")
                            if (name) {
                                savePreset(name)
                                setPhotos([])
                            }
                        }}
                        className="text-white/50 hover:text-christmas-gold transition-colors"
                        title="New Preset"
                    >
                        <Plus size={14} />
                    </button>
                </div>

                <div className="flex flex-col gap-1 max-h-32 overflow-y-auto scrollbar-none">
                    {presets.map(p => (
                        <div key={p.id} className={`flex items-center gap-1 group px-1.5 rounded transition-colors ${activePresetId === p.id ? 'bg-christmas-gold/10' : 'hover:bg-white/5'}`}>
                            <button
                                onClick={() => loadPreset(p.id)}
                                className={`flex-1 text-left text-xs py-1.5 truncate ${activePresetId === p.id ? 'text-christmas-gold font-bold' : 'text-christmas-gold/80'}`}
                            >
                                {p.name}
                            </button>
                            <div className="flex opacity-0 group-hover:opacity-100 transition-opacity">
                                <button
                                    onClick={(e) => { e.stopPropagation(); handleRename(p.id, p.name) }}
                                    className="text-white/30 hover:text-white p-1"
                                    title="Rename"
                                >
                                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path></svg>
                                </button>
                                <button
                                    onClick={(e) => { e.stopPropagation(); handleDelete(p.id) }}
                                    className="text-white/30 hover:text-red-400 p-1"
                                    title="Delete"
                                >
                                    <LaunchTrashIcon />
                                </button>
                            </div>
                        </div>
                    ))}
                    {presets.length === 0 && (
                        <div className="text-white/20 text-[10px] text-center py-2 italic">
                            No saved presets
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}

const LaunchTrashIcon = () => (
    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
)

export default ControlPanel
