"use client";
import { useEffect, useMemo, useState } from 'react'
import Shell from '../../components/Shell'
import { API_BASE } from '../../lib/api'

interface Groups { [date: string]: string[] }

type SortKey = 'dateDesc' | 'dateAsc' | 'countDesc' | 'countAsc'

export default function Page() {
  const [groups, setGroups] = useState<Groups>({})
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [sort, setSort] = useState<SortKey>('dateDesc')
  const [loading, setLoading] = useState(true)
  const [deletingDate, setDeletingDate] = useState<string | null>(null)
  const [deletingAll, setDeletingAll] = useState(false)
  const [topSpin, setTopSpin] = useState(false)
  const [backSpin, setBackSpin] = useState(false)

  useEffect(() => {
    setLoading(true)
    fetch(`${API_BASE}/video/clips-by-date`)
      .then(r => r.json())
      .then(data => {
        if (typeof data === 'object' && data !== null) {
          setGroups(data)
        } else {
          setGroups({})
        }
      })
      .catch(() => setGroups({}))
      .finally(() => setLoading(false))
  }, [])

  const dates = useMemo(() => {
    const keys = Object.keys(groups)
    const filtered = query.trim() ? keys.filter(d => d.toLowerCase().includes(query.trim().toLowerCase())) : keys
    const sorted = [...filtered].sort((a,b) => {
      const byDate = b.localeCompare(a)
      const countA = Array.isArray(groups[a]) ? groups[a].length : 0
      const countB = Array.isArray(groups[b]) ? groups[b].length : 0
      if (sort === 'dateDesc') return byDate
      if (sort === 'dateAsc') return -byDate
      if (sort === 'countDesc') return countB - countA
      return countA - countB
    })
    return sorted
  }, [groups, query, sort])

  const clips = selectedDate ? (Array.isArray(groups[selectedDate]) ? groups[selectedDate] : []) : []

  const toMediaUrl = (p: string) => {
    const cleaned = p.replaceAll('\\', '/')
    const withoutStorage = cleaned.replace(/^storage\/?/, '')
    const base = API_BASE.replace(/\/$/, '')
    return `${base}/video/media/${withoutStorage}`
  }

  const totalClips = dates.reduce((acc,d) => acc + (Array.isArray(groups[d]) ? groups[d].length : 0), 0)

  return (
    <Shell title="Schedule Post">
      <div className="space-y-4 sm:space-y-6">
        {/* Hero header */}
        {!selectedDate && (
          <div className="relative overflow-hidden rounded-2xl border border-border">
            <div className="absolute inset-0 bg-[radial-gradient(60%_80%_at_20%_10%,rgba(124,58,237,.25),transparent_60%),radial-gradient(60%_80%_at_80%_10%,rgba(59,130,246,.25),transparent_60%),radial-gradient(80%_60%_at_50%_100%,rgba(16,185,129,.18),transparent_60%)]" />
            <div className="relative p-4 sm:p-6">
              <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4">
                <div>
                  <h2 className="text-xl sm:text-2xl font-semibold">Content Scheduler</h2>
                  <p className="mt-1 text-xs sm:text-sm text-[#b5b5b5]">Plan posts, refine captions, and publish to YouTube effortlessly.</p>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  <StatPill label="Days" value={dates.length.toString()} color="from-violet-500/30 to-fuchsia-500/30" />
                  <StatPill label="Clips" value={totalClips.toString()} color="from-sky-500/30 to-cyan-500/30" />
                  <StatPill label="Ready" value={readyCount(groups).toString()} color="from-emerald-500/30 to-lime-500/30" className="hidden sm:flex" />
                </div>
              </div>

              {/* Controls */}
              <div className="mt-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Chip>All</Chip>
                  <Chip className="text-emerald-300 border-emerald-700/40 bg-emerald-900/10">With captions</Chip>
                  <Chip className="text-amber-300 border-amber-700/40 bg-amber-900/10 hidden sm:inline">Needs captions</Chip>
                </div>
                <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
                  <div className="relative">
                    <input
                      placeholder="Search date (YYYY/MM/DD)"
                      className="w-full sm:w-64 rounded-lg border border-white/10 bg-black/30 backdrop-blur p-2 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-white/10"
                      value={query}
                      onChange={(e)=>setQuery(e.target.value)}
                      aria-label="Search dates"
                    />
                    <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[#b5b5b5]" aria-hidden>⌘K</span>
                  </div>
                  <select
                    className="rounded-lg border border-white/10 bg-black/30 backdrop-blur p-2 text-sm focus:outline-none focus:ring-2 focus:ring-white/10"
                    value={sort}
                    onChange={(e)=>setSort(e.target.value as SortKey)}
                    aria-label="Sort"
                  >
                    <option value="dateDesc">Newest first</option>
                    <option value="dateAsc">Oldest first</option>
                    <option value="countDesc">Most clips</option>
                    <option value="countAsc">Fewest clips</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Days grid */}
        {!selectedDate && (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-4">
            {loading && Array.from({length:6}).map((_,i)=> (
              <div key={i} className="rounded-xl border border-border bg-panel overflow-hidden animate-pulse">
                <div className="h-36 bg-gradient-to-br from-[#0f0f12] to-[#0c0c0f]" />
                <div className="p-4 space-y-2">
                  <div className="h-4 w-40 bg-[#111] rounded" />
                  <div className="h-3 w-24 bg-[#111] rounded" />
                </div>
              </div>
            ))}
            {!loading && dates.length === 0 && (
              <div className="col-span-full">
                <EmptyState />
              </div>
            )}
            {!loading && dates.map((date) => (
              <div
                key={date}
                className="group rounded-2xl border border-white/10 bg-gradient-to-br from-[#0e0f14] to-[#0b0c10] hover:from-[#0f1220] hover:to-[#0d101a] transition-colors shadow-sm overflow-hidden"
              >
                <div className="relative">
                  <button
                    onClick={() => setSelectedDate(date)}
                    className="block w-full text-left"
                    title="Open day"
                  >
                    <div className="grid grid-cols-3 gap-0.5 p-0.5 bg-[#0b0b0b]">
                      {Array.isArray(groups[date]) ? groups[date].slice(0, 9).map((p, i) => (
                        <video key={i} className="w-full aspect-video object-cover rounded" src={toMediaUrl(p)} muted />
                      )) : null}
                    </div>
                  </button>
                  <div className="absolute left-2 top-2 px-2 py-1 rounded bg-black/55 border border-white/10 text-[11px] backdrop-blur group-hover:bg-black/65">
                    {(Array.isArray(groups[date]) ? groups[date].length : 0)} clips
                  </div>
                  <button
                    title="Delete all clips for this day"
                    aria-label="Delete day"
                    className={`absolute right-2 top-2 p-2 rounded-full border border-transparent text-white ring-1 ring-red-800/30 ${deletingDate===date ? 'bg-red-600/40' : 'bg-red-600/20 hover:bg-red-600/30'}`}
                    onClick={async (e) => {
                      e.stopPropagation()
                      if (!confirm(`Delete ALL clips for ${date}? This cannot be undone.`)) return
                      try {
                        setDeletingDate(date)
                        const res = await fetch(`${API_BASE}/video/delete-by-date`, {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ date })
                        })
                        const data = await res.json()
                        if (!res.ok) throw new Error(data?.detail || 'Delete failed')
                        alert(`Deleted ${data.deleted || 0} clips for ${date}.`)
                        location.reload()
                      } catch (err:any) {
                        alert('Failed to delete: ' + (err?.message || err))
                      } finally { setDeletingDate(null) }
                    }}
                  >
                    {deletingDate===date ? (
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin inline-block" />
                    ) : (
                      <span className="grid place-items-center w-4 h-4">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="w-4 h-4" fill="currentColor" role="img">
                          <path d="M9 3a1 1 0 0 0-1 1v1H5a1 1 0 1 0 0 2h14a1 1 0 1 0 0-2h-3V4a1 1 0 0 0-1-1H9Zm2 6a1 1 0 0 0-1 1v7a1 1 0 1 0 2 0v-7a1 1 0 0 0-1-1Zm-4 1a1 1 0 0 1 2 0v7a1 1 0 1 1-2 0v-7Zm8-1a1 1 0 0 0-1 1v7a1 1 0 1 0 2 0v-7a1 1 0 0 0-1-1Z"/>
                        </svg>
                      </span>
                    )}
                  </button>
                </div>
                <div className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="text-lg font-semibold bg-clip-text text-transparent bg-gradient-to-r from-sky-300 via-fuchsia-300 to-emerald-300">
                      {date}
                    </div>
                    <div className="text-[10px] sm:text-xs text-[#b5b5b5]">Tap to view</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Detail view */}
        {selectedDate && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <h3 className="text-lg font-medium">
                Clips on <span className="bg-clip-text text-transparent bg-gradient-to-r from-violet-300 via-fuchsia-300 to-sky-300">{selectedDate}</span>
              </h3>
              <div className="flex gap-2">
                <button onClick={async () => { setBackSpin(true); setSelectedDate(null); setTimeout(()=>setBackSpin(false), 300) }} className="px-4 py-2 rounded-md bg-red-600 text-white font-semibold shadow-lg hover:bg-red-500 active:bg-red-400 ring-1 ring-red-800/30 inline-flex items-center gap-2">
                  {backSpin ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : null}
                  <span>Back</span>
                </button>
                <button onClick={async () => { setTopSpin(true); scrollTo({top:0, behavior:'smooth'}); setTimeout(()=>setTopSpin(false), 500) }} className="px-4 py-2 rounded-md bg-red-600 text-white font-semibold shadow-lg hover:bg-red-500 active:bg-red-400 ring-1 ring-red-800/30 inline-flex items-center gap-2">
                  {topSpin ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : null}
                  <span>Top</span>
                </button>
                <button
                  onClick={async () => {
                    if (!selectedDate) return;
                    if (!confirm(`Delete ALL clips for ${selectedDate}? This cannot be undone.`)) return;
                    try {
                      setDeletingAll(true)
                      const res = await fetch(`${API_BASE}/video/delete-by-date`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ date: selectedDate })
                      })
                      const data = await res.json()
                      if (!res.ok) throw new Error(data?.detail || 'Delete failed')
                      alert(`Deleted ${data.deleted || 0} clips for ${selectedDate}.`)
                      location.reload()
                    } catch (e:any) {
                      alert('Failed to delete: ' + (e?.message || e))
                    } finally { setDeletingAll(false) }
                  }}
                  className="px-4 py-2 rounded-md bg-red-600 text-white font-semibold shadow-lg hover:bg-red-500 active:bg-red-400 ring-1 ring-red-800/30 inline-flex items-center gap-2"
                >
                  {deletingAll ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : null}
                  <span>Delete all for this day</span>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
              {clips.map((path, idx) => (
                <ClipCard key={idx} path={path} />
              ))}
            </div>
          </div>
        )}
      </div>
    </Shell>
  )
}

function StatPill({ label, value, color, className }: { label: string, value: string, color: string, className?: string }) {
  return (
    <div className={`hidden xs:flex items-center gap-2 rounded-xl border border-white/10 bg-gradient-to-br ${color} px-3 py-2 backdrop-blur shadow-sm ${className||''}`}>
      <div className="text-[11px] text-white/70">{label}</div>
      <div className="text-sm font-semibold text-white">{value}</div>
    </div>
  )
}

function Chip({ children, className }: { children: React.ReactNode, className?: string }) {
  return (
    <span className={`inline-flex items-center rounded-full border border-white/10 bg-black/30 backdrop-blur px-3 py-1 text-xs text-white/80 ${className||''}`}>{children}</span>
  )
}

function EmptyState() {
  return (
    <div className="rounded-xl border border-dashed border-border bg-gradient-to-b from-[#0e0f14] to-[#0b0c10] p-6 text-center">
      <div className="mx-auto mb-3 h-12 w-12 rounded-lg border border-border bg-[#0e0e10] grid place-items-center text-[#7aa2ff]">
        <svg viewBox="0 0 24 24" className="w-6 h-6" fill="currentColor"><path d="M5 6a3 3 0 0 0-3 3v7a4 4 0 0 0 4 4h12a4 4 0 0 0 4-4V9a3 3 0 0 0-3-3h-1.382a1 1 0 0 1-.894-.553l-.447-.894A2 2 0 0 0 14.382 3H9.618a2 2 0 0 0-1.789 1.053l-.447.894A1 1 0 0 1 6.488 6H5Zm7 3a4 4 0 0 1 3.995 3.8L16 13v1a1 1 0 1 1-2 0v-1a2 2 0 1 0-4 0v1a1 1 0 1 1-2 0v-1a4 4 0 0 1 4-4Z"/></svg>
      </div>
      <h4 className="text-base font-semibold">No clips yet</h4>
      <p className="mt-1 text-sm text-[#b5b5b5]">Trim or upload videos to see dated groups here.</p>
    </div>
  )
}

function readyCount(groups: Groups): number {
  return Object.values(groups).reduce((acc, arr) => acc + (Array.isArray(arr) ? arr.filter(p => {
    try { return !!localStorage.getItem(`caption:${p}`) } catch { return false }
  }).length : 0), 0)
}

function ClipCard({ path }: { path: string }) {
  const [elapsed, setElapsed] = useState(0)
  const [hasCaption, setHasCaption] = useState(false)
  const name = (path.replaceAll('\\', '/').split(/[\/\\]/).pop()) || 'clip.mp4'
  const mediaUrl = (() => {
    const cleaned = path.replaceAll('\\', '/').replace(/^storage\/?/, '')
    const base = API_BASE.replace(/\/$/, '')
    return `${base}/video/media/${cleaned}`
  })()
  const [showPicker, setShowPicker] = useState(false)
  const [scheduledAt, setScheduledAt] = useState<string | null>(null)
  const [deletingClip, setDeletingClip] = useState(false)
  const [generatingCap, setGeneratingCap] = useState(false)
  const [publishing, setPublishing] = useState(false)
  const [schedulingSpin, setSchedulingSpin] = useState(false)
  const [playbackError, setPlaybackError] = useState(false)
  const formatDisplay = (iso: string) => {
    try {
      const d = new Date(iso)
      const day = d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: '2-digit' })
      const time = d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })
      return `${day} • ${time}`
    } catch { return iso }
  }
  useEffect(() => {
    try {
      const raw = localStorage.getItem('clipSchedule') || '{}'
      const map = JSON.parse(raw) as Record<string, string>
      if (map[path]) setScheduledAt(map[path])
    } catch {}
  }, [path])
  useEffect(() => {
    try {
      const key = `caption:${path}`
      const raw = localStorage.getItem(key)
      if (raw) {
        const captionData = JSON.parse(raw)
        setHasCaption(!!(captionData.title || captionData.caption))
      }
    } catch {}
  }, [path])
  useEffect(() => {
    try {
      const raw = localStorage.getItem('clipSchedule') || '{}'
      const map = JSON.parse(raw) as Record<string, string>
      if (scheduledAt) { map[path] = scheduledAt } else if (map[path]) { delete map[path] }
      localStorage.setItem('clipSchedule', JSON.stringify(map))
    } catch {}
  }, [scheduledAt, path])

  return (
    <div className="rounded-2xl border border-white/10 bg-gradient-to-b from-[#0e0f14] to-[#0b0c10] overflow-hidden shadow-[0_10px_30px_rgba(0,0,0,.35)]">
      <div className="relative aspect-video bg-black">
        <video
          controls
          className="w-full h-full object-contain"
          src={mediaUrl}
          onTimeUpdate={(e) => setElapsed(Math.floor((e.target as HTMLVideoElement).currentTime))}
          onError={() => setPlaybackError(true)}
        />
        <div className="absolute right-2 top-2 px-2 py-1 rounded bg-red-600/20 text-[10px] text-white border border-red-800/30">
          {elapsed}s
        </div>
        {playbackError && (
          <div className="absolute inset-2 rounded-lg border border-red-800/40 bg-red-950/70 text-red-100 p-3 text-xs flex items-center justify-between gap-3">
            <span>Playback error. File missing or still processing.</span>
            <button onClick={() => { setPlaybackError(false); (document.activeElement as HTMLElement)?.blur(); }} className="btn-red btn-red-sm">Dismiss</button>
          </div>
        )}
        {scheduledAt && (
          <div className="absolute left-2 top-2 px-2 py-1 rounded bg-red-600/20 text-white text-[11px] border border-red-800/30">
            {formatDisplay(scheduledAt)}
          </div>
        )}
        {showPicker && (
          <div className="absolute right-2 bottom-2 rounded-lg border border-white/10 bg-black/60 backdrop-blur p-3 shadow-lg z-10 w-56">
            <label className="block text-xs text-[#b5b5b5] mb-1">Schedule date & time</label>
            <input
              type="datetime-local"
              className="w-full text-sm p-2 rounded border border-white/10 bg-[#0e0e0f] text-foreground"
              onChange={(e) => setScheduledAt(e.target.value ? new Date(e.target.value).toISOString() : null)}
            />
            <div className="mt-2 flex justify-end gap-2">
              <button type="button" onClick={() => setShowPicker(false)} className="px-3 py-1 rounded bg-panel border border-border text-foreground hover:bg-panelHover text-xs">Close</button>
            </div>
          </div>
        )}
      </div>
      <div className="p-3 border-t border-white/10">
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <div className="truncate text-sm text-foreground" title={name}>{name}</div>
            <div className={`text-[11px] ${hasCaption ? 'text-emerald-300' : 'text-[#b5b5b5]'}`}>{hasCaption ? 'Caption saved' : 'No caption yet'}</div>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              title="Delete clip"
              aria-label="Delete clip"
              disabled={deletingClip}
              className={`p-2 rounded-full border border-transparent text-white ring-1 ring-red-800/30 ${deletingClip ? 'bg-red-600/40' : 'bg-red-600/20 hover:bg-red-600/30'}`}
              onClick={async () => {
                if (!confirm('Are you sure you want to delete this clip? This action cannot be undone.')) return;
                try {
                  setDeletingClip(true)
                  const res = await fetch(`${API_BASE}/video/delete`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ path })
                  })
                  if (!res.ok) throw new Error('Delete failed')
                  try {
                    const scheduleKey = 'clipSchedule'
                    const raw = localStorage.getItem(scheduleKey) || '{}'
                    const map = JSON.parse(raw) as Record<string, string>
                    if (map[path]) { delete map[path]; localStorage.setItem(scheduleKey, JSON.stringify(map)) }
                    const captionKey = `caption:${path}`
                    localStorage.removeItem(captionKey)
                  } catch (e) { console.error('Failed to clean up local storage:', e) }
                  alert('Clip deleted successfully!')
                  location.reload()
                } catch (e) {
                  alert('Delete failed: ' + e)
                } finally { setDeletingClip(false) }
              }}
            >
              {deletingClip ? (
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin inline-block" />
              ) : (
                <span className="grid place-items-center w-4 h-4">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="w-4 h-4" fill="currentColor" role="img">
                    <path d="M9 3a1 1 0 0 0-1 1v1H5a1 1 0 1 0 0 2h14a1 1 0 1 0 0-2h-3V4a1 1 0 0 0-1-1H9Zm2 6a1 1 0 0 0-1 1v7a1 1 0 1 0 2 0v-7a1 1 0 0 0-1-1Zm-4 1a1 1 0 0 1 2 0v7a1 1 0 1 1-2 0v-7Zm8-1a1 1 0 0 0-1 1v7a1 1 0 1 0 2 0v-7a1 1 0 0 0-1-1Z"/>
                  </svg>
                </span>
              )}
            </button>
            <button
              title="Generate caption"
              aria-label="Generate caption"
              disabled={generatingCap}
              className={`p-2 rounded-full border border-transparent text-white ring-1 ring-red-800/30 ${generatingCap ? 'bg-red-600/40' : 'bg-red-600/20 hover:bg-red-600/30'}`}
              onClick={async () => {
                try {
                  setGeneratingCap(true)
                  const res = await fetch(`${API_BASE}/video/caption`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ path, seed: Math.floor(Math.random()*1000000) })
                  })
                  if (!res.ok) throw new Error('Caption generation failed')
                  const data = await res.json()
                  const payload = { title: data.title, caption: data.caption, hashtags: data.hashtags, transcript: data.transcript }
                  try {
                    const key = `caption:${path}`
                    localStorage.setItem(key, JSON.stringify(payload))
                    setHasCaption(true)
                    alert('Caption generated successfully! Click the eye icon to view/edit.')
                  } catch (e) { alert('Caption generated but failed to save locally') }
                } catch (e) {
                  alert('Caption generation failed: ' + e)
                } finally { setGeneratingCap(false) }
              }}
            >
              {generatingCap ? (
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin inline-block" />
              ) : (
                <span className="grid place-items-center w-4 h-4">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="w-4 h-4" fill="currentColor" role="img">
                    <path d="M13.5 2.5a1 1 0 0 0-1.9.4l-.3 2.1-2.1.3a1 1 0 0 0-.4 1.9l2-.6 5.9 5.9-3.3 3.3-5.9-5.9-.6 2a1 1 0 0 0 1.9.4l.3-2.1 2.1-.3a1 1 0 1 0 .4-1.9l-2 .6 5.9-5.9Z"/>
                  </svg>
                </span>
              )}
            </button>
            <button
              title="View caption"
              aria-label="View caption"
              className={`relative p-2 rounded-full border border-transparent ${hasCaption ? 'bg-red-600/30' : 'bg-red-600/20'} text-white hover:bg-red-600/40 ring-1 ring-red-800/30`}
              onClick={() => {
                const key = `caption:${path}`
                const raw = localStorage.getItem(key)
                let obj: any = { title: '', caption: '', hashtags: '' }
                if (raw) { try { obj = JSON.parse(raw) } catch {} }
                if (!obj.title && !obj.caption) { alert('No caption found. Please generate a caption first.'); return }
                const wrapper = document.createElement('div')
                wrapper.innerHTML = `
                  <div class="fixed inset-0 z-50 flex items-center justify-center">
                    <div class="absolute inset-0 bg-black/60"></div>
                    <div class="relative w-full max-w-2xl rounded-xl border border-border bg-panel p-5 shadow-xl">
                      <h3 class="text-lg font-semibold mb-4">Caption & Title</h3>
                      <div class="space-y-3">
                        <div>
                          <label class="block text-xs text-[#b5b5b5] mb-1">Title (5-6 words)</label>
                          <input id="cap-title" class="w-full p-2 rounded border border-border bg-[#0e0e0f] text-foreground" />
                        </div>
                        <div>
                          <label class="block text-xs text-[#b5b5b5] mb-1">Description / Caption</label>
                          <textarea id="cap-desc" rows="6" class="w-full p-2 rounded border border-border bg-[#0e0e0f] text-foreground"></textarea>
                        </div>
                        <div>
                          <label class="block text-xs text-[#b5b5b5] mb-1">Hashtags</label>
                          <input id="cap-tags" class="w-full p-2 rounded border border-border bg-[#0e0e0f] text-foreground" />
                        </div>
                        <div class="flex justify-end gap-2 pt-2">
                          <button id="cap-cancel" class="px-3 py-1 rounded bg-panel border border-border text-foreground hover:bg-panelHover text-xs">Cancel</button>
                          <button id="cap-save" class="px-3 py-1 rounded bg-panelActive border border-[#3a3a3a] text-white text-xs hover:bg-[#2a2a2a]">Save</button>
                        </div>
                      </div>
                    </div>
                  </div>`
                document.body.appendChild(wrapper)
                ;(document.getElementById('cap-title') as HTMLInputElement).value = obj.title || ''
                ;(document.getElementById('cap-desc') as HTMLTextAreaElement).value = obj.caption || ''
                ;(document.getElementById('cap-tags') as HTMLInputElement).value = obj.hashtags || ''
                const close = () => { try { document.body.removeChild(wrapper) } catch {} }
                document.getElementById('cap-cancel')?.addEventListener('click', close)
                document.getElementById('cap-save')?.addEventListener('click', () => {
                  try {
                    const title = (document.getElementById('cap-title') as HTMLInputElement).value
                    const desc = (document.getElementById('cap-desc') as HTMLTextAreaElement).value
                    const tags = (document.getElementById('cap-tags') as HTMLInputElement).value
                    localStorage.setItem(key, JSON.stringify({ title, caption: desc, hashtags: tags }))
                    alert('Caption saved successfully!')
                  } catch (e) { alert('Failed to save caption: ' + e) }
                  close()
                })
              }}
            >
              <span className="grid place-items-center w-4 h-4">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="w-4 h-4" fill="currentColor" role="img">
                  <path d="M12 5c-7 0-10 7-10 7s3 7 10 7 10-7 10-7-3-7-10-7Zm0 12a5 5 0 1 1 0-10 5 5 0 0 1 0 10Zm0-8a3 3 0 1 0 .001 6.001A3 3 0 0 0 12 9Z"/>
                </svg>
              </span>
            </button>
            <button
              title="Publish to YouTube"
              aria-label="Publish to YouTube"
              disabled={publishing}
              className={`p-2 rounded-full border border-transparent text-white ring-1 ring-red-800/30 ${publishing ? 'bg-red-600/40' : 'bg-red-600/20 hover:bg-red-600/30'}`}
              onClick={async () => {
                const key = `caption:${path}`
                const raw = localStorage.getItem(key)
                let captionData = { title: '', caption: '', hashtags: '' }
                if (raw) { try { captionData = JSON.parse(raw) } catch {} }
                if (!captionData.title && !captionData.caption) { alert('Please generate a caption first before publishing to YouTube'); return }
                if (!confirm('Publish this video to YouTube?')) return
                try {
                  setPublishing(true)
                  const res = await fetch(`${API_BASE}/video/publish-youtube`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ path, title: captionData.title, description: captionData.caption, hashtags: captionData.hashtags })
                  })
                  if (!res.ok) throw new Error('YouTube publish failed')
                  const data = await res.json()
                  alert(`Success! Video published to YouTube.\nVideo URL: ${data.url}`)
                } catch (e) { alert('YouTube publishing failed: ' + e) } finally { setPublishing(false) }
              }}
            >
              {publishing ? (
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin inline-block" />
              ) : (
                <span className="grid place-items-center w-4 h-4">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="w-4 h-4" fill="currentColor" role="img">
                    <path d="M23.498 6.186a3.003 3.003 0 0 0-2.122-2.125C19.5 3.5 12 3.5 12 3.5s-7.5 0-9.376.561A3.003 3.003 0 0 0 .502 6.186C0 8.077 0 12 0 12s0 3.923.502 5.814a3.003 3.003 0 0 0 2.122 2.125C4.5 20.5 12 20.5 12 20.5s7.5 0 9.376-.561a3.003 3.003 0 0 0 2.122-2.125C24 15.923 24 12 24 12s0-3.923-.502-5.814ZM9.75 15.5v-7l6 3.5-6 3.5Z" />
                  </svg>
                </span>
              )}
            </button>
            <button
              title="Schedule"
              aria-label="Schedule"
              disabled={schedulingSpin}
              className={`p-2 rounded-full border border-transparent text-white ring-1 ring-red-800/30 ${schedulingSpin ? 'bg-red-600/40' : 'bg-red-600/20 hover:bg-red-600/30'}`}
              onClick={() => { setSchedulingSpin(true); setShowPicker((v) => !v); setTimeout(()=>setSchedulingSpin(false), 400) }}
              onDoubleClick={() => { setScheduledAt(null) }}
            >
              {schedulingSpin ? (
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin inline-block" />
              ) : (
                <span className="grid place-items-center w-4 h-4">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="w-4 h-4" fill="currentColor" role="img">
                    <path d="M7 2a1 1 0 0 0 0 2h10a1 1 0 1 0 0-2H7Z" />
                    <path d="M5 4h14a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Zm0 4v10h14V8H5Z" />
                    <path d="M12 10a1 1 0 0 1 1 1v3.586l1.707 1.707a1 1 0 1 1-1.414 1.414l-2-2A1 1 0 0 1 11 15v-4a1 1 0 0 1 1-1Z" />
                  </svg>
                </span>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}