"use client";
import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Shell from '../../components/Shell'
import { API_BASE } from '../../lib/api'

export default function Page() {
  const router = useRouter();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [sourcePath, setSourcePath] = useState<string | null>(null);
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [clips, setClips] = useState<{ start: number, end: number }[]>([]);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [objectUrl, setObjectUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [trimming, setTrimming] = useState(false);
  const [addingClip, setAddingClip] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) { setSelectedFile(file); }
  };

  useEffect(() => {
    const upload = async () => {
      if (!selectedFile) return;
      setUploading(true);
      try {
        const form = new FormData();
        form.append('file', selectedFile);
        const res = await fetch(`${API_BASE}/video/upload`, { method: 'POST', body: form });
        if (!res.ok) throw new Error('Upload failed');
        const data = await res.json();
        setSourcePath(data.source_path);
      } catch (error) {
        console.error('Upload failed:', error);
        setSourcePath(null);
      } finally {
        setUploading(false);
      }
    };
    upload();
  }, [selectedFile]);

  // Stabilize preview URL so video doesn't reset while typing
  useEffect(() => {
    if (!selectedFile) {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
      setObjectUrl(null);
      return;
    }
    const url = URL.createObjectURL(selectedFile);
    setObjectUrl(url);
    return () => { URL.revokeObjectURL(url); };
  }, [selectedFile]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const parseTime = (value: string) => {
    const trimmed = value.trim();
    if (!trimmed) return NaN;
    // Support mm:ss or ss
    const parts = trimmed.split(":").map(p => p.trim());
    if (parts.length === 1) {
      const s = Number(parts[0]);
      return Number.isFinite(s) ? s : NaN;
    }
    if (parts.length === 2) {
      const [mStr, sStr] = parts;
      const m = Number(mStr);
      const s = Number(sStr);
      if (!Number.isFinite(m) || !Number.isFinite(s) || s < 0 || s >= 60 || m < 0) return NaN;
      return m * 60 + s;
    }
    // Optional support for hh:mm:ss
    if (parts.length === 3) {
      const [hStr, mStr, sStr] = parts;
      const h = Number(hStr);
      const m = Number(mStr);
      const s = Number(sStr);
      if (!Number.isFinite(h) || !Number.isFinite(m) || !Number.isFinite(s) || s < 0 || s >= 60 || m < 0 || m >= 60 || h < 0) return NaN;
      return h * 3600 + m * 60 + s;
    }
    return NaN;
  };

  return (
    <Shell title="Video Trim">
      <div className="space-y-6">
        {/* Hero */}
        <div className="relative overflow-hidden rounded-2xl border border-border">
          <div className="absolute inset-0 bg-[radial-gradient(60%_80%_at_20%_10%,rgba(124,58,237,.25),transparent_60%),radial-gradient(60%_80%_at_80%_10%,rgba(59,130,246,.25),transparent_60%),radial-gradient(80%_60%_at_50%_100%,rgba(16,185,129,.18),transparent_60%)]" />
          <div className="relative p-4 sm:p-6">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div>
                <h3 className="text-lg sm:text-xl font-semibold">Trim videos into clips</h3>
                <p className="text-xs sm:text-sm text-[#b5b5b5] mt-1">Upload a video, set start/end, queue clips, and continue to schedule.</p>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                <Stat label="Queued" value={clips.length.toString()} color="from-emerald-500/30 to-lime-500/30" />
                <Stat label="Source" value={uploading ? 'Uploading...' : selectedFile ? (sourcePath ? 'Ready' : 'Processing...') : 'None'} color="from-sky-500/30 to-cyan-500/30" />
                <Stat label="Duration" value={videoRef.current ? formatTime(Math.floor(videoRef.current.duration||0)) : '--:--'} color="from-indigo-500/30 to-blue-500/30" />
              </div>
            </div>
          </div>
        </div>

        {/* Upload */}
        {!selectedFile && (
          <div className="space-y-4">
            <div className="rounded-2xl border-2 border-dashed border-white/10 bg-black/20 backdrop-blur p-8 text-center">
              <div className="space-y-4">
                {uploading ? (
                  <>
                    <div className="w-16 h-16 mx-auto border-4 border-white/30 border-t-white rounded-full animate-spin" />
                    <div>
                      <p className="text-foreground font-medium">Uploading video...</p>
                      <p className="text-sm text-[#b5b5b5] mt-1">Please wait while we process your file</p>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="text-5xl">🎬</div>
                    <div>
                      <p className="text-foreground font-medium">Drop your video here or click to browse</p>
                      <p className="text-sm text-[#b5b5b5] mt-1">Supports MP4, MOV, MKV, WEBM, AVI and more</p>
                    </div>
                    <input type="file" accept="video/*" onChange={handleFileChange} className="hidden" id="video-upload" disabled={uploading} />
                    <label htmlFor="video-upload" className={`inline-block px-6 py-2 rounded-lg bg-red-600 text-white font-semibold text-sm hover:bg-red-500 transition-colors ${uploading ? 'opacity-50 cursor-not-allowed' : ''}`}>
                      Choose Video File
                    </label>
                  </>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Trimmer */}
        {selectedFile && (
          <div className="space-y-6">
            <div className="mx-auto max-w-2xl w-full">
              <div className="rounded-2xl border border-white/10 bg-[#0f0f12] shadow-sm overflow-hidden">
                <div className="aspect-video bg-black">
                  <video ref={videoRef} controls className="w-full h-full object-contain" src={objectUrl ?? undefined} />
                </div>
                <div className="p-3 border-t border-white/10 text-xs text-[#b5b5b5] truncate">
                  {selectedFile?.name}
                </div>
              </div>
            </div>

            <div className="max-w-3xl mx-auto space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold tracking-wide text-white/90">Start (mm:ss)</label>
                  <div className="flex items-center gap-2">
                    <input type="text" value={startTime} onChange={(e) => setStartTime(e.target.value)} placeholder="00:00" className="w-full px-3 py-2.5 rounded-md border border-white/15 bg-[#0e0e10] text-foreground placeholder-[#777] focus:outline-none focus:ring-2 focus:ring-emerald-400/40" />
                    <button type="button" onClick={() => { if (videoRef.current) setStartTime(formatTime(Math.floor(videoRef.current.currentTime))); }}
                      className="h-11 w-24 px-4 rounded-md bg-red-600 text-white font-semibold text-sm shadow-lg hover:bg-red-500 active:bg-red-400 transition-colors ring-1 ring-red-800/30 whitespace-nowrap">
                      Set In
                    </button>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold tracking-wide text-white/90">End (mm:ss)</label>
                  <div className="flex items-center gap-2">
                    <input type="text" value={endTime} onChange={(e) => setEndTime(e.target.value)} placeholder="00:10" className="w-full px-3 py-2.5 rounded-md border border-white/15 bg-[#0e0e10] text-foreground placeholder-[#777] focus:outline-none focus:ring-2 focus:ring-fuchsia-400/40" />
                    <button type="button" onClick={() => { if (videoRef.current) setEndTime(formatTime(Math.floor(videoRef.current.currentTime))); }}
                      className="h-11 w-24 px-4 rounded-md bg-red-600 text-white font-semibold text-sm shadow-lg hover:bg-red-500 active:bg-red-400 transition-colors ring-1 ring-red-800/30 whitespace-nowrap">
                      Set Out
                    </button>
                  </div>
                </div>
                <div className="flex items-end gap-8">
                  <button 
                    type="button" 
                    disabled={!startTime || !endTime || addingClip} 
                    onClick={async () => {
                      const s = parseTime(startTime);
                      const e = parseTime(endTime);
                      if (Number.isFinite(s) && Number.isFinite(e) && s >= 0 && e > s) {
                        setAddingClip(true);
                        // Simulate processing time
                        await new Promise(resolve => setTimeout(resolve, 500));
                        setClips((prev) => [...prev, { start: s, end: e }]);
                        setStartTime('');
                        setEndTime('');
                        setAddingClip(false);
                      }
                    }} 
                    className="h-11 w-28 px-4 rounded-md bg-red-600 text-white font-semibold text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-red-500 shadow-[0_8px_24px_rgba(239,68,68,.35)] transition-colors inline-flex items-center justify-center gap-2 ring-1 ring-red-800/30 whitespace-nowrap"
                  >
                    {addingClip ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        <span>Adding...</span>
                      </>
                    ) : (
                      <>
                        <span>➕</span>
                        <span>Add Clip</span>
                      </>
                    )}
                  </button>
                  <button 
                    type="button" 
                    onClick={() => { setStartTime(''); setEndTime(''); }} 
                    className="h-11 w-20 px-4 rounded-md bg-red-600 text-white font-semibold text-sm shadow-lg hover:bg-red-500 active:bg-red-400 whitespace-nowrap ml-2"
                  >
                    Clear
                  </button>
                </div>
              </div>

              {clips.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium">Queued Clips</h4>
                    <button type="button" onClick={() => setClips([])} className="h-11 px-4 mr-3 rounded-md bg-red-600 text-white text-sm font-semibold inline-flex items-center justify-center shadow-lg hover:bg-red-500 active:bg-red-400 ring-1 ring-red-800/30 whitespace-nowrap">
                      Clear All
                    </button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {clips.map((c, i) => (
                      <div key={i} className="rounded-lg border border-white/10 bg-gradient-to-br from-[#0b0c10] to-[#0e0f14] p-3 flex items-center justify-between shadow-[0_4px_16px_rgba(0,0,0,.35)]">
                        <div className="text-sm">
                          <div className="font-medium">Clip {i + 1}</div>
                          <div className="text-[11px] text-[#b5b5b5]">{formatTime(c.start)} - {formatTime(c.end)}</div>
                        </div>
                        <button onClick={() => setClips(prev => prev.filter((_,idx)=> idx!==i))} className="text-sm px-3 py-1.5 rounded-md bg-red-600 text-white font-semibold shadow-lg hover:bg-red-500 active:bg-red-400 ring-1 ring-red-800/30">
                          Remove
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="space-y-3">
                {(!sourcePath || clips.length === 0) && (
                  <div className="text-center p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
                    <p className="text-sm text-amber-200">
                      {!sourcePath ? 'Please wait for video upload to complete' : 'Please add at least one clip before trimming'}
                    </p>
                  </div>
                )}
                
                <div className="flex items-center justify-between">
                  <button type="button" onClick={() => { setSelectedFile(null); setSourcePath(null); setClips([]); setStartTime(''); setEndTime(''); }} className="px-4 py-2 rounded-md bg-red-600 text-white font-semibold shadow hover:bg-white">
                    Change Video
                  </button>
                <button 
                  type="button" 
                  disabled={!sourcePath || clips.length === 0 || trimming || uploading} 
                  onClick={async () => {
                    setTrimming(true);
                    try {
                      const res = await fetch(`${API_BASE}/video/trim`, { 
                        method: 'POST', 
                        headers: { 'Content-Type': 'application/json' }, 
                        body: JSON.stringify({ source_path: sourcePath, clips }) 
                      });
                      if (!res.ok) throw new Error('Trim failed');
                      const data = await res.json();
                      try {
                        if (typeof window !== 'undefined') {
                          sessionStorage.setItem('trimmedClips', JSON.stringify({ source: sourcePath, clips: data.clips }));
                        }
                      } catch {}
                      router.push('/schedule-post');
                    } catch (error) {
                      console.error('Trim failed:', error);
                      alert('Failed to trim video. Please try again.');
                    } finally {
                      setTrimming(false);
                    }
                  }} 
                  className="h-11 px-5 mr-3 rounded-md bg-red-600 text-white font-semibold text-sm shadow-lg hover:bg-red-500 active:bg-red-400 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 ring-1 ring-red-800/30"
                >
                  {trimming ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Trimming...</span>
                    </>
                  ) : (
                    <>
                      <span>✂️</span>
                      <span>Trim & Next</span>
                    </>
                  )}
                </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </Shell>
  )
}

function Stat({ label, value, color }: { label: string, value: string, color: string }) {
  return (
    <div className={`hidden sm:flex items-center gap-2 rounded-xl border border-white/10 bg-gradient-to-br ${color} px-3 py-2 backdrop-blur shadow-sm`}>
      <div className="text-[11px] text-white/70">{label}</div>
      <div className="text-sm font-semibold text-white">{value}</div>
    </div>
  )
}