"use client";
import { useState, useRef, useEffect } from 'react'
import { API_BASE } from '../lib/api'

type ChatMsg = { role: 'user' | 'assistant'; text: string }

const ASSISTANT_HINT = `You are the in‑app assistant for a YouTube automation platform. Stay strictly within this product’s features. If a question is unrelated, reply: "This assistant focuses on YouTube automation and app features."

User profile
- Users want fast workflows to: transcribe media/docs, generate stories, craft titles/captions, trim videos, schedule/publish to YouTube, and review analytics.

Core capabilities
- Transcripts: Accept media (MP4, MOV, MKV, WEBM, AVI, MP3, WAV, M4A, AAC, OGG, FLAC) and documents (PDF, DOCX, DOC, TXT, RTF, HTML/MD, PPTX, CSV, SRT, VTT). Media uses Whisper; documents use text extraction.
- Story generation: Convert transcript or pasted text into stories via Gemini. Presets (Blog, Narrative, Reel/Short) or freeform.
- Titles & captions: Generate 5–6 word title + universal caption (Hook, Value, CTA, 10–15 hashtags). Save/view/edit in Schedule.
- Video tooling: Upload, preview, set start/end, queue clips, then continue to Schedule Post.
- Schedule & publish: Browse date‑grouped clips, generate/save captions, set schedule time, publish to YouTube.
- YouTube: Guide OAuth connection and upload. Help with upload status/history.
- Analytics: Explain dashboard KPIs, activity windows, comparisons, growth trends, tasks, alerts, integrations.

UI navigation
- Dashboard, Transcript, Story Generate, Video Trim, Schedule Post.

Answer style
- Be brief (2–6 sentences), action‑oriented, specific. Prefer 1–2–3 steps for how‑to. Use page names vs URLs. Don’t expose secrets.

Workflows
- Transcribe: Transcript → Manual or File → Continue to Story Generate.
- Story: Story Generate → choose preset → Generate → Copy/Download.
- Trim & schedule: Video Trim → upload → set start/end → Add Clip → Trim & Next → Schedule Post → Generate caption → Save/View/Edit → schedule.
- Publish: Ensure YouTube OAuth connected → in Schedule Post (with title/caption) → Publish to YouTube.

Troubleshooting
- Captions/story: ensure GEMINI_API_KEY/GOOGLE_API_KEY, try shorter text or different preset.
- Whisper: ensure ffmpeg, supported codec; try shorter/re‑encoded MP4 (H.264/AAC).
- Upload/publish: check YouTube OAuth, retry.

When to escalate
- Repeated upload failures → reconnect OAuth.
- Persistent transcription failures → re‑encode/shorten or try document workflow.`

export default function ChatFab(){
  const [open,setOpen] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const [sending, setSending] = useState(false)
  const [msgs, setMsgs] = useState<ChatMsg[]>([
    { role: 'assistant', text: 'Hi! How can I help you today?' }
  ])

  useEffect(()=>{
    const sc = scrollRef.current
    if(sc) sc.scrollTop = sc.scrollHeight
  }, [open, msgs])
  return (
    <>
      <button onClick={()=>setOpen(true)} className="fixed bottom-6 right-6 z-50 chat-fab chat-fab--lg" aria-label="Open chat">
        <div className="chat-icon chat-icon--bot" aria-hidden="true">
          <svg viewBox="0 0 24 24" className="w-8 h-8">
            <path fill="currentColor" d="M11 2a1 1 0 1 1 2 0v1.05A7.002 7.002 0 0 1 19 10v3.5c0 .7-.27 1.37-.76 1.86l-1.88 1.88c-.5.5-1.17.76-1.86.76H9.5c-.7 0-1.37-.27-1.86-.76l-1.88-1.88A2.63 2.63 0 0 1 5 13.5V10c0-3.31 2.69-6 6-6V2Zm-3 9a1.25 1.25 0 1 0 0 2.5A1.25 1.25 0 0 0 8 11Zm10 0a1.25 1.25 0 1 0-2.5 0A1.25 1.25 0 0 0 18 11Zm-9.25 6.5h6.5c.41 0 .75-.34.75-.75s-.34-.75-.75-.75h-6.5c-.41 0-.75.34-.75.75s.34.75.75.75Z"/>
          </svg>
        </div>
      </button>
      {open && (
        <div className="fixed bottom-5 right-5 z-50 w-[380px] max-w-[92vw] rounded-2xl border border-white/10 bg-gradient-to-br from-[#0f1020] via-[#0c0f1a] to-[#0b0c10] backdrop-blur-xl shadow-[0_10px_30px_rgba(0,0,0,.45)] overflow-hidden">
          <div className="relative p-3 border-b border-white/10">
            <div className="absolute inset-0 bg-gradient-to-r from-fuchsia-500/10 via-sky-500/10 to-emerald-500/10 pointer-events-none" />
            <div className="relative flex items-center justify-between">
              <div className="text-sm font-medium text-foreground">StoryVerse Assistant</div>
              <button onClick={()=>setOpen(false)} className="text-[#b5b5b5] hover:text-foreground text-sm">✕</button>
            </div>
          </div>
          {/* Messages */}
          <div ref={scrollRef} className="h-72 overflow-y-auto p-3 flex flex-col gap-2">
            {msgs.map((m, i) => (
              <div key={i} className={`max-w-[82%] ${m.role==='user'?'self-end':'self-start'}`}>
                <div className={`${m.role==='user'
                  ? 'bg-gradient-to-br from-sky-600/25 via-indigo-600/25 to-fuchsia-600/25 border-white/10'
                  : 'bg-gradient-to-br from-[#0e1222] to-[#0b0d17] border-[#20263a]'} rounded-2xl border px-3 py-2 text-sm text-foreground shadow-[0_4px_16px_rgba(0,0,0,.25)]`}>
                  {m.text}
                </div>
              </div>
            ))}
            {sending && (
              <div className="self-start max-w-[82%]">
                <div className="bg-gradient-to-br from-[#0e1222] to-[#0b0d17] border border-[#20263a] rounded-2xl px-3 py-2 text-sm text-foreground">Typing…</div>
              </div>
            )}
          </div>
          {/* Input */}
          <form onSubmit={async (e)=>{
            e.preventDefault();
            const q = (inputRef.current?.value||'').trim();
            if(!q || sending) return;
            setMsgs(prev => [...prev, {role:'user', text:q}]);
            if(inputRef.current) inputRef.current.value = '';
            setSending(true);
            try{
              const res=await fetch(`${API_BASE}/chat`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({message:q,hint:ASSISTANT_HINT})});
              const data=await res.json();
              const reply=(data.reply||'').trim()||'No response.'
              setMsgs(prev => [...prev, {role:'assistant', text: reply}]);
            }catch{
              setMsgs(prev => [...prev, {role:'assistant', text: 'Error contacting assistant.'}]);
            } finally {
              setSending(false);
            }
          }} className="p-3 border-t border-white/10 flex gap-2 bg-gradient-to-r from-black/10 to-transparent">
            <input ref={inputRef} name="q" placeholder="Type a message" className="flex-1 p-2 rounded-full border border-white/10 bg-black/30 backdrop-blur text-foreground placeholder-[#7b7b7b] focus:outline-none focus:ring-2 focus:ring-white/10" />
            <button disabled={sending} className="px-4 py-2 rounded-full text-white disabled:opacity-60 bg-gradient-to-r from-emerald-500/40 via-sky-500/40 to-fuchsia-500/40 border border-white/10 hover:from-emerald-500/50 hover:to-fuchsia-500/50">
              Send
            </button>
          </form>
        </div>
      )}
    </>
  )
}


