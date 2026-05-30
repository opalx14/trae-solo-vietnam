import { useState } from 'react'
import templates from './templates.json'

const API_KEY = 'fe_oa_29c6d204f284dbc5831f57e407c8236217b47292d9e4f260'
const API_URL = 'https://api.freemodel.dev/v1/chat/completions'
const MODEL = 'gpt-5.5'

type Shot = { title: string; imagePrompt: string; videoPrompt: string; audio: string; duration: number }
type Landing = { title: string; description: string; ctaText: string }
type Template = { id: string; label: string; topic: string; landing: Landing; shots: Shot[] }
type VideoBlock = { imagePrompt: string; videoPrompt: string }

const RESOLUTIONS = ['360P', '540P', '720P', '1080P']
const RATIOS = ['16:9', '9:16', '1:1', '4:3', '3:4', '21:9']

export default function App() {
  const [step, setStep] = useState(0)
  const [mode, setMode] = useState<'templates' | 'ai'>('templates')
  const [topic, setTopic] = useState('')
  const [shots, setShots] = useState<Shot[]>([])
  const [landing, setLanding] = useState<Landing | null>(null)
  const [loading, setLoading] = useState(false)
  const [resolution, setResolution] = useState('720P')
  const [ratio, setRatio] = useState('16:9')
  const [duration, setDuration] = useState(15)
  const [numVideos, setNumVideos] = useState(2)
  const [audio, setAudio] = useState(true)
  const [videoFile, setVideoFile] = useState<string | null>(null)
  const [copied, setCopied] = useState<string | null>(null)
  const [playingVideo, setPlayingVideo] = useState<string | null>(null)
  const [videoBlocks, setVideoBlocks] = useState<VideoBlock[]>([])

  const selectTemplate = (tpl: Template) => {
    setShots(tpl.shots)
    setLanding(tpl.landing)
    setTopic(tpl.topic)
    buildBlocks(tpl.shots, duration, numVideos, ratio)
    setStep(1)
  }

  const callAI = async (messages: { role: string; content: string }[]) => {
    const res = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${API_KEY}` },
      body: JSON.stringify({ model: MODEL, messages, response_format: { type: 'json_object' } }),
    })
    const data = await res.json()
    return JSON.parse(data.choices[0].message.content)
  }

  const generate = async () => {
    if (!topic.trim()) return
    setLoading(true)
    try {
      const content = await callAI([
        { role: 'system', content: `Return JSON: {"landing":{"title":"","description":"","ctaText":""},"shots":[{"title":"","imagePrompt":"","videoPrompt":"","audio":"","duration":${Math.floor(duration / 6)}}]}. Generate exactly 6 shots for a ${duration * numVideos}s total video (${numVideos} clips of ${duration}s each).` },
        { role: 'user', content: topic },
      ])
      setShots(content.shots || [])
      setLanding(content.landing || null)
      buildBlocks(content.shots || [], duration, numVideos, ratio)
      setStep(1)
    } catch { /* */ }
    setLoading(false)
  }

  const buildBlocks = (s: Shot[], dur: number, num: number, r: string) => {
    const shotsPerVideo = Math.ceil(s.length / num)
    const blocks: VideoBlock[] = []

    for (let v = 0; v < num; v++) {
      const videoShots = s.slice(v * shotsPerVideo, (v + 1) * shotsPerVideo)
      if (!videoShots.length) continue

      const rows = Math.ceil(videoShots.length / 3)
      const imgPrompt = `A cinematic storyboard in 3x${rows} grid layout (${videoShots.length} panels), ${r} aspect ratio:\n\n${videoShots.map((sh, i) => `Panel ${i + 1}: ${sh.imagePrompt}`).join('\n')}\n\nCinematic realism, photorealistic, dramatic lighting, consistent style.`

      const perShot = Math.floor(dur / videoShots.length)
      let offset = 0
      const vidPrompt = videoShots.map((sh, i) => {
        const d = i === videoShots.length - 1 ? dur - offset : perShot
        const end = offset + d
        const line = `${offset}-${end}s: ${sh.videoPrompt.replace(/^\d+-\d+s:\s*/g, '')}`
        offset = end
        return line
      }).join('\n')

      blocks.push({ imagePrompt: imgPrompt, videoPrompt: vidPrompt })
    }
    setVideoBlocks(blocks)
  }

  const copy = (text: string, label: string) => {
    navigator.clipboard.writeText(text)
    setCopied(label)
    setTimeout(() => setCopied(null), 1500)
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0c0c0f] to-[#111118] text-white flex items-center justify-center">
      <div className="w-full max-w-4xl px-4 py-12">

        {/* Step 0: Home */}
        {step === 0 && (
          <div className="text-center">
            <div className="inline-flex items-center gap-2 text-xs text-zinc-500 mb-4 border border-zinc-800 rounded-full px-3 py-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              PixVerse × TRAE
            </div>
            <h1 className="text-4xl font-bold tracking-tight mb-2">Storyboard Video Builder</h1>
            <p className="text-sm text-zinc-500 mb-8">Generate prompts for PixVerse AI video</p>

            {/* Tabs: Templates / AI */}
            <div className="flex justify-center gap-1 mb-6">
              <button onClick={() => setMode('templates')} className={`px-4 py-2 rounded-lg text-sm font-medium transition ${mode === 'templates' ? 'bg-zinc-800 text-white' : 'text-zinc-500 hover:text-white'}`}>Templates</button>
              <button onClick={() => setMode('ai')} className={`px-4 py-2 rounded-lg text-sm font-medium transition ${mode === 'ai' ? 'bg-zinc-800 text-white' : 'text-zinc-500 hover:text-white'}`}>AI Generate</button>
            </div>

            <div className="max-w-md mx-auto">
              {/* Templates mode */}
              {mode === 'templates' && (
                <div>
                  <div className="flex flex-wrap gap-2 justify-center mb-4">
                    {(templates.templates as Template[]).map(t => (
                      <button key={t.id} onClick={() => selectTemplate(t)} className="px-3 py-1.5 rounded-full text-xs border border-zinc-800 text-zinc-400 hover:text-white hover:border-emerald-500/40 transition">{t.label}</button>
                    ))}
                  </div>
                  <div className="flex items-center justify-center gap-3 mb-4">
                    <select value={duration} onChange={e => setDuration(+e.target.value)} className="bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-1.5 text-xs text-white outline-none">
                      {[5, 8, 10, 15].map(d => <option key={d} value={d}>{d}s</option>)}
                    </select>
                    <select value={numVideos} onChange={e => setNumVideos(+e.target.value)} className="bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-1.5 text-xs text-white outline-none">
                      {[1, 2, 3, 4].map(n => <option key={n} value={n}>{n} clip{n > 1 ? 's' : ''}</option>)}
                    </select>
                    <span className="text-[10px] text-zinc-500">{duration * numVideos}s total</span>
                  </div>
                </div>
              )}

              {/* AI mode */}
              {mode === 'ai' && (
                <div>
                  <div className="rounded-2xl border border-zinc-800/60 bg-zinc-900/30 p-4 mb-4">
                    <input value={topic} onChange={e => setTopic(e.target.value)} onKeyDown={e => e.key === 'Enter' && generate()} placeholder="Your video idea..." className="w-full bg-transparent text-sm outline-none placeholder:text-zinc-600 mb-3" />
                    <div className="flex items-center gap-2">
                      <select value={duration} onChange={e => setDuration(+e.target.value)} className="bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-1.5 text-xs text-white outline-none">
                        {[5, 8, 10, 15].map(d => <option key={d} value={d}>{d}s</option>)}
                      </select>
                      <select value={numVideos} onChange={e => setNumVideos(+e.target.value)} className="bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-1.5 text-xs text-white outline-none">
                        {[1, 2, 3, 4].map(n => <option key={n} value={n}>{n} clip{n > 1 ? 's' : ''}</option>)}
                      </select>
                      <span className="text-[10px] text-zinc-500">{duration * numVideos}s</span>
                      <button onClick={generate} disabled={loading} className="rounded-xl bg-emerald-500 text-black px-5 py-2 text-sm font-semibold hover:bg-emerald-400 disabled:opacity-50 transition ml-auto">{loading ? '...' : 'Go'}</button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Demo Gallery */}
            <div className="mt-8">
              <p className="text-xs text-zinc-500 mb-4">Demo Videos</p>
              <div className="grid grid-cols-3 gap-5">
                {[
                  { src: '/videos/PixVerse_V6_Image_Text_720P_1_Anime_—_Samurai_.mp4', label: 'Anime' },
                  { src: '/videos/PixVerse_V6_Image_Text_720P_2_SciFi_—_Space_st.mp4', label: 'Sci-Fi' },
                  { src: '/videos/PixVerse_V6_Image_Text_720P_3_Food_—_Ramen_cin.mp4', label: 'Food' },
                  { src: '/videos/PixVerse_V6_Image_Text_720P_4_Fantasy_—_Dragon.mp4', label: 'Fantasy' },
                  { src: '/videos/PixVerse_V6_Image_Text_720P_5_Fashion_Film_—_N.mp4', label: 'Fashion' },
                  { src: '/videos/PixVerse_V6_Image_Text_720P_6_Nature_—_Underwa.mp4', label: 'Nature' },
                ].map(v => (
                  <div key={v.label} className="relative cursor-pointer group" onClick={() => setPlayingVideo(v.src)}>
                    <video src={v.src} className="w-full rounded-2xl aspect-[16/9] bg-zinc-900 object-cover" preload="metadata" playsInline muted />
                    <div className="absolute inset-0 flex items-center justify-center rounded-2xl">
                      <div className="w-10 h-10 rounded-full bg-white/30 flex items-center justify-center backdrop-blur-sm">
                        <svg className="w-5 h-5 text-white ml-0.5" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                      </div>
                    </div>
                    <p className="text-xs text-zinc-500 text-center mt-2">{v.label}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Step 1: Settings */}
        {step === 1 && (
          <div className="max-w-md mx-auto">
            <h2 className="text-xl font-bold text-center mb-6">Settings</h2>
            <div className="grid grid-cols-2 gap-4 mb-8">
              <div>
                <p className="text-[10px] text-zinc-500 uppercase mb-1">Resolution</p>
                <select value={resolution} onChange={e => setResolution(e.target.value)} className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white outline-none">
                  {RESOLUTIONS.map(r => <option key={r}>{r}</option>)}
                </select>
              </div>
              <div>
                <p className="text-[10px] text-zinc-500 uppercase mb-1">Ratio</p>
                <select value={ratio} onChange={e => { setRatio(e.target.value); buildBlocks(shots, duration, numVideos, e.target.value) }} className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white outline-none">
                  {RATIOS.map(r => <option key={r}>{r}</option>)}
                </select>
              </div>
              <div>
                <p className="text-[10px] text-zinc-500 uppercase mb-1">Duration / clip</p>
                <input type="number" min={1} max={60} value={duration} onChange={e => { const v = Math.max(1, +e.target.value); setDuration(v); buildBlocks(shots, v, numVideos, ratio) }} className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white outline-none" />
              </div>
              <div>
                <p className="text-[10px] text-zinc-500 uppercase mb-1">Audio</p>
                <button onClick={() => setAudio(!audio)} className={`w-full rounded-lg px-3 py-2 text-sm border ${audio ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-400' : 'border-zinc-700 bg-zinc-900 text-zinc-400'}`}>{audio ? 'ON' : 'OFF'}</button>
              </div>
            </div>
            <p className="text-center text-xs text-zinc-500 mb-6">{numVideos} clips × {duration}s = {numVideos * duration}s total</p>
            <div className="flex justify-center gap-3">
              <button onClick={() => setStep(0)} className="rounded-xl border border-zinc-700 px-5 py-2 text-sm text-zinc-400 hover:text-white transition">Back</button>
              <button onClick={() => setStep(2)} className="rounded-xl bg-emerald-500 text-black px-5 py-2 text-sm font-semibold hover:bg-emerald-400 transition">Next</button>
            </div>
          </div>
        )}

        {/* Step 2: Prompts */}
        {step === 2 && (
          <div>
            <h2 className="text-xl font-bold text-center mb-6">Prompts ({videoBlocks.length} clips × {duration}s)</h2>
            <div className="space-y-6">
              {videoBlocks.map((block, idx) => (
                <div key={idx} className="rounded-2xl border border-zinc-800/60 bg-zinc-900/20 p-5">
                  <p className="text-sm font-semibold text-zinc-300 mb-4">Video {idx + 1}</p>

                  <div className="mb-4">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-zinc-500">📷 Image Prompt</span>
                      <button onClick={() => copy(block.imagePrompt, `img${idx}`)} className="text-xs text-emerald-500 hover:text-emerald-400">{copied === `img${idx}` ? '✓' : 'Copy'}</button>
                    </div>
                    <pre className="text-xs text-zinc-400 leading-relaxed whitespace-pre-wrap max-h-32 overflow-auto bg-black/20 rounded-lg p-3">{block.imagePrompt}</pre>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-zinc-500">🎬 Video Prompt</span>
                      <button onClick={() => copy(block.videoPrompt, `vid${idx}`)} className="text-xs text-emerald-500 hover:text-emerald-400">{copied === `vid${idx}` ? '✓' : 'Copy'}</button>
                    </div>
                    <pre className="text-xs text-zinc-300 leading-relaxed whitespace-pre-wrap max-h-32 overflow-auto bg-emerald-500/5 border border-emerald-500/10 rounded-lg p-3">{block.videoPrompt}</pre>
                    <p className="mt-1 text-[10px] text-zinc-600">PixVerse V6 · Image-to-Video · {resolution} · {ratio} · {duration}s · Audio {audio ? 'ON' : 'OFF'}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="flex justify-center gap-3 mt-6">
              <button onClick={() => setStep(1)} className="rounded-xl border border-zinc-700 px-5 py-2 text-sm text-zinc-400 hover:text-white transition">Back</button>
              <button onClick={() => setStep(3)} className="rounded-xl bg-emerald-500 text-black px-5 py-2 text-sm font-semibold hover:bg-emerald-400 transition">Next</button>
            </div>
          </div>
        )}

        {/* Step 3: Landing */}
        {step === 3 && (
          <div className="max-w-lg mx-auto">
            <h2 className="text-xl font-bold text-center mb-6">Landing Page</h2>
            <label className="block cursor-pointer rounded-xl border border-dashed border-zinc-800 hover:border-emerald-500/30 p-6 text-center text-sm text-zinc-500 transition mb-4">
              Upload final video
              <input type="file" accept="video/*" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) setVideoFile(URL.createObjectURL(f)) }} />
            </label>
            {videoFile && <video src={videoFile} controls className="w-full rounded-xl aspect-video mb-4" />}
            {landing && (
              <div className="text-center py-4">
                <h3 className="text-xl font-bold">{landing.title}</h3>
                <p className="text-sm text-zinc-500 mt-2">{landing.description}</p>
                <button className="mt-4 rounded-full bg-emerald-500 text-black px-5 py-2.5 text-sm font-semibold">{landing.ctaText}</button>
              </div>
            )}
            <div className="flex justify-center gap-3 mt-6">
              <button onClick={() => setStep(2)} className="rounded-xl border border-zinc-700 px-5 py-2 text-sm text-zinc-400 hover:text-white transition">Back</button>
              <button onClick={() => setStep(0)} className="rounded-xl bg-emerald-500 text-black px-5 py-2 text-sm font-semibold hover:bg-emerald-400 transition">Done</button>
            </div>
          </div>
        )}

        <p className="mt-12 text-center text-[10px] text-zinc-700">Built with TRAE × PixVerse</p>
      </div>

      {/* Video Popup */}
      {playingVideo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm" onClick={() => setPlayingVideo(null)}>
          <div className="w-full max-w-3xl px-4" onClick={e => e.stopPropagation()}>
            <video src={playingVideo} className="w-full rounded-2xl" controls autoPlay playsInline />
          </div>
        </div>
      )}
    </div>
  )
}
