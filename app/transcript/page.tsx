"use client";
import { useState, DragEvent } from 'react';
import { useRouter } from 'next/navigation';
import { uploadTranscriptFile, submitManualTranscript, TranscriptResponse } from '../../lib/api';
import Shell from '../../components/Shell'

export default function Page() {
  const router = useRouter();
  const [activeMode, setActiveMode] = useState<'manual' | 'file' | null>('manual');
  const [manualText, setManualText] = useState('');
  const [busy, setBusy] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const charCount = manualText.length;
  const wordCount = manualText.trim() ? manualText.trim().split(/\s+/).length : 0;

  return (
    <Shell title="Transcript">
      <div className="space-y-6">
        {/* Hero header */}
        <div className="relative overflow-hidden rounded-2xl border border-border">
          <div className="absolute inset-0 bg-[radial-gradient(60%_80%_at_20%_10%,rgba(124,58,237,.25),transparent_60%),radial-gradient(60%_80%_at_80%_10%,rgba(59,130,246,.25),transparent_60%),radial-gradient(80%_60%_at_50%_100%,rgba(16,185,129,.18),transparent_60%)]" />
          <div className="relative p-4 sm:p-6">
            <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-3">
              <div>
                <h2 className="text-xl sm:text-2xl font-semibold">Create a Transcript</h2>
                <p className="mt-1 text-xs sm:text-sm text-[#b5b5b5]">Paste a script or upload media/documents. We’ll extract clean, ready-to-use text.</p>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Stat label="Words" value={wordCount.toString()} color="from-emerald-500/30 to-teal-500/30" />
                <Stat label="Chars" value={charCount.toString()} color="from-sky-500/30 to-cyan-500/30" />
              </div>
            </div>

            {/* Mode selector */}
            <div className="mt-4 flex gap-2">
              <button
                onClick={() => setActiveMode('manual')}
                className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg border transition-all ${
                  activeMode === 'manual'
                    ? 'bg-panelActive border-[#3a3a3a] text-white'
                    : 'bg-panel border-border text-foreground hover:bg-panelHover'
                }`}
                aria-pressed={activeMode === 'manual'}
              >
                <span className="grid place-items-center w-5 h-5 rounded bg-gradient-to-br from-fuchsia-500/30 to-violet-500/30">📝</span>
                Manual Script
              </button>
              <button
                onClick={() => setActiveMode('file')}
                className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg border transition-all ${
                  activeMode === 'file'
                    ? 'bg-panelActive border-[#3a3a3a] text-white'
                    : 'bg-panel border-border text-foreground hover:bg-panelHover'
                }`}
                aria-pressed={activeMode === 'file'}
              >
                <span className="grid place-items-center w-5 h-5 rounded bg-gradient-to-br from-sky-500/30 to-cyan-500/30">📁</span>
                File Transcript
              </button>
            </div>
          </div>
        </div>

        {/* Manual Script */}
        {activeMode === 'manual' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2 rounded-2xl border border-white/10 bg-gradient-to-b from-[#0e0f14] to-[#0b0c10] p-4 sm:p-5">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg font-medium">Write Your Script</h3>
                <div className="text-[11px] text-[#b5b5b5]">{wordCount} words • {charCount} chars</div>
              </div>
              <textarea
                value={manualText}
                onChange={(e) => setManualText(e.target.value)}
                placeholder="Type or paste your script here..."
                className="w-full h-64 p-4 rounded-lg border border-white/10 bg-[#0f0f12] text-foreground placeholder-[#666] resize-none focus:outline-none focus:ring-2 focus:ring-white/10"
              />
              <div className="mt-3 flex items-center justify-between gap-2">
                <div className="flex flex-wrap gap-2">
                  <QuickChip onClick={() => setManualText(t => `${t}${t && !t.endsWith('\n') ? '\n' : ''}Intro: Hook the viewer in 1 sentence.\n`) }>Add intro</QuickChip>
                  <QuickChip onClick={() => setManualText(t => `${t}${t && !t.endsWith('\n') ? '\n' : ''}Main points: 3 bullets with value.\n`) }>Add bullets</QuickChip>
                  <QuickChip onClick={() => setManualText(t => `${t}${t && !t.endsWith('\n') ? '\n' : ''}CTA: Like, share, and subscribe for more.\n`) }>Add CTA</QuickChip>
                </div>
                <button
                  disabled={!manualText.trim() || busy}
                  onClick={async () => {
                    try {
                      setBusy(true);
                      const res = await submitManualTranscript(manualText);
                      if (typeof window !== 'undefined') {
                        sessionStorage.setItem('transcriptPayload', JSON.stringify({
                          kind: 'document',
                          transcript: res.transcript,
                          segments: [],
                          language: null,
                          duration: null,
                        } as TranscriptResponse));
                      }
                      router.push(`/story-generate`);
                    } finally {
                      setBusy(false);
                    }
                  }}
                  className="h-10 px-5 rounded-md bg-red-600 text-white font-semibold shadow-lg hover:bg-red-500 active:bg-red-400 disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-2 ring-1 ring-red-800/30 transition-colors"
                >
                  {busy ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : null}
                  <span>{busy ? 'Submitting…' : 'Submit Script'}</span>
                </button>
              </div>
            </div>

            <div className="rounded-2xl border border-border bg-panel p-4 sm:p-5">
              <h4 className="text-base font-semibold">Tips</h4>
              <ul className="mt-2 space-y-2 text-sm text-[#b5b5b5] list-disc ml-4">
                <li>Short sentences improve caption and title quality.</li>
                <li>Mention keywords you want emphasized in titles.</li>
                <li>For videos, you can upload files instead of pasting text.</li>
              </ul>
              <div className="mt-4 rounded-lg border border-white/10 bg-black/20 p-3">
                <div className="text-xs text-[#b5b5b5] mb-1">Example template</div>
                <pre className="whitespace-pre-wrap text-xs">Intro: Why this matters in 1 line.\nPoint 1: Practical benefit.\nPoint 2: Clarifying detail.\nCTA: What should the viewer do next?</pre>
              </div>
            </div>
          </div>
        )}

        {/* File Upload */}
        {activeMode === 'file' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div
              className={`lg:col-span-2 rounded-2xl border-2 border-dashed ${isDragging ? 'border-sky-500/40 bg-sky-500/5' : 'border-border'} bg-panel p-6 text-center transition-colors`}
              onDragOver={(e: DragEvent) => { e.preventDefault(); setIsDragging(true) }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={async (e: DragEvent) => {
                e.preventDefault(); setIsDragging(false);
                const file = e.dataTransfer?.files?.[0];
                if (!file) return;
                await handleUpload(file)
              }}
            >
              <div className="space-y-4">
                <div className="text-5xl">📁</div>
                <div>
                  <p className="text-foreground font-medium">Drop your file here or click to browse</p>
                  <p className="text-sm text-[#b5b5b5] mt-1">Audio, video, and documents are supported. We’ll auto-detect the best method.</p>
                </div>
                <input
                  type="file"
                  multiple={false}
                  className="hidden"
                  id="file-upload"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    await handleUpload(file)
                  }}
                />
                <label
                  htmlFor="file-upload"
                  className="inline-block px-6 py-2 rounded-md bg-red-600 text-white font-semibold shadow-lg hover:bg-red-500 active:bg-red-400 cursor-pointer transition-colors ring-1 ring-red-800/30"
                >
                  Choose File
                </label>
                {busy && <div className="text-sm text-[#b5b5b5] inline-flex items-center gap-2"><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Processing…</div>}
              </div>
            </div>

            <div className="rounded-2xl border border-border bg-panel p-4 sm:p-5">
              <h4 className="text-base font-semibold">Supported formats</h4>
              <div className="mt-3 flex flex-wrap gap-2 text-xs">
                <Badge>MP3</Badge><Badge>WAV</Badge><Badge>M4A</Badge><Badge>AAC</Badge><Badge>OGG</Badge><Badge>FLAC</Badge>
                <Badge>MP4</Badge><Badge>MOV</Badge><Badge>MKV</Badge><Badge>WEBM</Badge><Badge>AVI</Badge>
                <Badge>PDF</Badge><Badge>DOCX</Badge><Badge>DOC</Badge><Badge>TXT</Badge><Badge>RTF</Badge>
                <Badge>HTML</Badge><Badge>MD</Badge><Badge>PPTX</Badge><Badge>CSV</Badge><Badge>SRT</Badge><Badge>VTT</Badge>
              </div>
              <div className="mt-4 rounded-lg border border-white/10 bg-black/20 p-3 text-xs text-[#b5b5b5]">
                Files are processed securely. Large media may take longer depending on length and quality.
              </div>
            </div>
          </div>
        )}
      </div>
    </Shell>
  )

  async function handleUpload(file: File) {
    setBusy(true);
    try {
      const res = await uploadTranscriptFile(file);
      if (typeof window !== 'undefined') {
        sessionStorage.setItem('transcriptPayload', JSON.stringify(res));
      }
      router.push(`/story-generate`);
    } finally {
      setBusy(false);
    }
  }
}

function Stat({ label, value, color }: { label: string, value: string, color: string }) {
  return (
    <div className={`hidden sm:flex items-center gap-2 rounded-xl border border-white/10 bg-gradient-to-br ${color} px-3 py-2 backdrop-blur shadow-sm`}>
      <div className="text-[11px] text-white/70">{label}</div>
      <div className="text-sm font-semibold text-white">{value}</div>
    </div>
  )
}

function QuickChip({ children, onClick }: { children: React.ReactNode, onClick: ()=>void }) {
  return (
    <button onClick={onClick} className="inline-flex items-center rounded-full border border-white/10 bg-black/30 backdrop-blur px-3 py-1 text-xs text-white/80 hover:bg-black/40">
      {children}
    </button>
  )
}

function Badge({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-full border border-white/10 bg-black/30 backdrop-blur px-2.5 py-1 text-[11px] text-white/80">
      {children}
    </span>
  )
}


