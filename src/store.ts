import { create } from 'zustand'

export type VisualMode = 'spectrum' | 'orbit' | 'tunnel' | 'particles' | 'waveform' | 'neon-grid'

export interface Project {
  id: string
  name: string
  prompt: string
  visualMode: VisualMode
  intensity: number
  createdAt: number
  mediaName?: string
}

interface StudioState {
  media: File | null
  mediaUrl: string | null
  overlayTrack: File | null
  overlayUrl: string | null
  isPlaying: boolean
  muteOriginal: boolean
  prompt: string
  visualMode: VisualMode
  intensity: number
  recording: boolean
  projects: Project[]
  activity: string[]
  analyser: AnalyserNode | null
  audioCtx: AudioContext | null
  setMedia: (f: File | null) => void
  setOverlayTrack: (f: File | null) => void
  togglePlay: () => void
  stop: () => void
  setMuteOriginal: (v: boolean) => void
  setPrompt: (v: string) => void
  setVisualMode: (m: VisualMode) => void
  setIntensity: (n: number) => void
  setAnalyser: (a: AnalyserNode | null, ctx: AudioContext | null) => void
  startCapture: () => void
  stopCapture: () => void
  saveProject: () => void
  loadProject: (id: string) => void
  deleteProject: (id: string) => void
  log: (msg: string) => void
  _captureStop: (() => void) | null
  setCaptureStop: (fn: (() => void) | null) => void
}

const loadProjects = (): Project[] => { try { return JSON.parse(localStorage.getItem('pulse-projects') || '[]') } catch { return [] } }
const loadActivity = (): string[] => { try { return JSON.parse(localStorage.getItem('pulse-activity') || '[]') } catch { return [] } }

export const useStudio = create<StudioState>((set, get) => ({
  media: null, mediaUrl: null, overlayTrack: null, overlayUrl: null,
  isPlaying: false, muteOriginal: false, prompt: '', visualMode: 'spectrum', intensity: 1,
  recording: false, projects: loadProjects(), activity: loadActivity(),
  analyser: null, audioCtx: null, _captureStop: null,

  setMedia: (f) => {
    const prev = get().mediaUrl
    if (prev) URL.revokeObjectURL(prev)
    set({ media: f, mediaUrl: f ? URL.createObjectURL(f) : null, isPlaying: false })
  },
  setOverlayTrack: (f) => {
    const prev = get().overlayUrl
    if (prev) URL.revokeObjectURL(prev)
    set({ overlayTrack: f, overlayUrl: f ? URL.createObjectURL(f) : null })
  },
  togglePlay: () => set(s => ({ isPlaying: !s.isPlaying })),
  stop: () => set({ isPlaying: false }),
  setMuteOriginal: (v) => set({ muteOriginal: v }),
  setPrompt: (v) => set({ prompt: v }),
  setVisualMode: (m) => set({ visualMode: m }),
  setIntensity: (n) => set({ intensity: n }),
  setAnalyser: (a, ctx) => set({ analyser: a, audioCtx: ctx }),
  setCaptureStop: (fn) => set({ _captureStop: fn }),
  startCapture: () => { set({ recording: true }); get().log('Capture started') },
  stopCapture: () => {
    const stop = get()._captureStop
    if (stop) stop()
    set({ recording: false, _captureStop: null })
    get().log('Capture finished — download should start')
  },
  saveProject: () => {
    const s = get()
    const p: Project = {
      id: crypto.randomUUID(),
      name: s.media?.name?.replace(/\.[^.]+$/, '') || `Project ${new Date().toLocaleString()}`,
      prompt: s.prompt, visualMode: s.visualMode, intensity: s.intensity,
      createdAt: Date.now(), mediaName: s.media?.name,
    }
    const next = [p, ...s.projects].slice(0, 40)
    localStorage.setItem('pulse-projects', JSON.stringify(next))
    set({ projects: next })
    s.log(`Saved project: ${p.name}`)
  },
  loadProject: (id) => {
    const p = get().projects.find(x => x.id === id)
    if (!p) return
    set({ prompt: p.prompt, visualMode: p.visualMode, intensity: p.intensity })
    get().log(`Loaded project: ${p.name}`)
  },
  deleteProject: (id) => {
    const next = get().projects.filter(p => p.id !== id)
    localStorage.setItem('pulse-projects', JSON.stringify(next))
    set({ projects: next })
    get().log('Project deleted')
  },
  log: (msg) => {
    const line = `[${new Date().toLocaleTimeString()}] ${msg}`
    const next = [line, ...get().activity].slice(0, 80)
    localStorage.setItem('pulse-activity', JSON.stringify(next))
    set({ activity: next })
  },
}))
