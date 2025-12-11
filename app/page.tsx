"use client";
import Shell from '../components/Shell'
import Link from 'next/link'

// Small UI helpers
const Pill = ({ label, value, color }:{label:string; value:string; color:string}) => (
  <div className={`flex items-center gap-2 rounded-xl border border-white/10 bg-gradient-to-br ${color} px-3 py-2 backdrop-blur shadow-sm`}>
    <span className="text-[11px] text-white/70">{label}</span>
    <span className="text-sm font-semibold text-white">{value}</span>
  </div>
)

const Section = ({title, subtitle, children}:{title:string; subtitle?:string; children:React.ReactNode}) => (
  <section className="rounded-2xl border border-white/10 bg-gradient-to-b from-[#0e0f14] to-[#0b0c10] p-4 sm:p-6">
    <div className="mb-3 sm:mb-4 flex items-center justify-between gap-2 flex-wrap">
      <div>
        <h2 className="text-lg sm:text-xl font-semibold text-foreground">{title}</h2>
        {subtitle ? <p className="text-xs sm:text-sm text-[#b5b5b5] mt-1">{subtitle}</p> : null}
      </div>
      <Link href="#" className="hidden sm:inline text-xs text-[#b5b5b5] hover:text-foreground">View details</Link>
    </div>
    {children}
  </section>
)

export default function Page() {
  const kpi = [
    { label:'Subscribers', value:'34.2K', delta:'+2.8%' },
    { label:'Watch hours', value:'42.7K', delta:'+4.6%' },
    { label:'Views (30d)', value:'1.9M', delta:'+6.1%' },
    { label:'Revenue (est.)', value:'$6.2K', delta:'+3.3%' },
    { label:'Uploads/Scheduled', value:'184 / 12', delta:'—' },
    { label:'Engagement rate', value:'6.7%', delta:'+0.4%' },
  ]

  const recentUploads = Array.from({length:6}).map((_,i)=>({
    id:i,
    title:`How to scale AI workflows ${i+1}`,
    status: i%3===0?'Public':(i%3===1?'Private':'Scheduled'),
    views: Math.floor(1000+Math.random()*50000),
    thumb:`https://picsum.photos/seed/${i+11}/640/360`
  }))

  const scheduled = Array.from({length:4}).map((_,i)=>({
    id:i,
    title:`Scheduled: Short #${i+1}`,
    when:`in ${60*(i+1)} mins`,
    thumb:`https://picsum.photos/seed/s${i+1}/640/360`
  }))

  return (
    <Shell title="Unified Dashboard">
      <div className="space-y-6 sm:space-y-8">
        {/* Hero overview */}
        <div className="relative overflow-hidden rounded-2xl border border-border">
          <div className="absolute inset-0 bg-[radial-gradient(60%_80%_at_20%_10%,rgba(124,58,237,.25),transparent_60%),radial-gradient(60%_80%_at_80%_10%,rgba(59,130,246,.25),transparent_60%),radial-gradient(80%_60%_at_50%_100%,rgba(16,185,129,.18),transparent_60%)]" />
          <div className="relative p-4 sm:p-6">
            <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4">
              <div>
                <h2 className="text-xl sm:text-2xl font-semibold">Channel Overview</h2>
                <p className="mt-1 text-xs sm:text-sm text-[#b5b5b5]">Key KPIs across subscribers, views, revenue, and engagement.</p>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
                <Pill label="Subs" value="34.2K" color="from-fuchsia-500/30 to-violet-500/30" />
                <Pill label="Hours" value="42.7K" color="from-sky-500/30 to-cyan-500/30" />
                <Pill label="Views" value="1.9M" color="from-emerald-500/30 to-lime-500/30" />
                <Pill label="Revenue" value="$6.2K" color="from-amber-500/30 to-orange-500/30" />
                <Pill label="Uploads" value="184" color="from-indigo-500/30 to-blue-500/30" />
                <Pill label="Engage" value="6.7%" color="from-pink-500/30 to-rose-500/30" />
              </div>
            </div>
          </div>
        </div>

        {/* 1. KPIs detailed */}
        <Section title="Key Metrics" subtitle="Rolling 30‑day performance with deltas">
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6 gap-3 sm:gap-4">
            {kpi.map((k,i)=> (
              <div key={i} className="rounded-xl border border-white/10 bg-[#0f0f12] p-4">
                <div className="text-xs text-[#b5b5b5]">{k.label}</div>
                <div className="mt-2 text-2xl sm:text-3xl font-bold text-foreground">{k.value}</div>
                <div className="mt-1 text-[11px] text-green-400">{k.delta}</div>
              </div>
            ))}
          </div>
        </Section>

        {/* 2. Video Management */}
        <Section title="Video Management" subtitle="Recent uploads and upcoming schedules">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Recent uploads */}
            <div className="lg:col-span-2 rounded-xl border border-white/10 bg-[#0f0f12] p-4">
              <h3 className="text-base font-semibold mb-3">Recent Uploads</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {recentUploads.map(v=> (
                  <div key={v.id} className="rounded-lg overflow-hidden border border-white/10 bg-[#0b0c10]">
                    <div className="relative">
                      <img src={v.thumb} alt="thumb" className="w-full aspect-video object-cover" />
                      <div className="absolute left-2 top-2 px-2 py-1 rounded bg-black/55 text-[11px] border border-white/10">{v.status}</div>
                    </div>
                    <div className="p-3">
                      <div className="truncate text-sm font-medium">{v.title}</div>
                      <div className="mt-1 text-[11px] text-[#b5b5b5]">{v.views.toLocaleString()} views</div>
                      <div className="mt-2 flex gap-2">
                        <button className="btn-red btn-red-sm btn-show-active"><span className="spinner-sm"></span><span className="label">Edit</span></button>
                        <button className="btn-red btn-red-sm btn-show-active"><span className="spinner-sm"></span><span className="label">Analytics</span></button>
                        <button className="btn-red btn-red-sm btn-show-active"><span className="spinner-sm"></span><span className="label">Delete</span></button>
                      </div>
                  </div>
                  </div>
                ))}
              </div>
            </div>
            {/* Scheduled */}
            <div className="rounded-xl border border-white/10 bg-[#0f0f12] p-4">
              <h3 className="text-base font-semibold mb-3">Scheduled Videos</h3>
              <div className="space-y-3">
                {scheduled.map(s=> (
                  <div key={s.id} className="flex gap-3 rounded-lg border border-white/10 bg-[#0b0c10] p-2">
                    <img src={s.thumb} alt="thumb" className="w-24 h-16 rounded object-cover" />
                    <div className="min-w-0">
                      <div className="truncate text-sm font-medium">{s.title}</div>
                      <div className="text-[11px] text-[#b5b5b5]">{s.when}</div>
                      <div className="mt-1 flex gap-2">
                        <button className="btn-red btn-red-sm btn-show-active"><span className="spinner-sm"></span><span className="label">Reschedule</span></button>
                        <button className="btn-red btn-red-sm btn-show-active"><span className="spinner-sm"></span><span className="label">Edit</span></button>
                      </div>
                    </div>
                  </div>
                ))}
                  </div>
                </div>
          </div>
        </Section>

        {/* 3. Automation Controls */}
        <Section title="Automation Controls" subtitle="Bulk upload and auto‑scheduler">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="rounded-xl border border-white/10 bg-[#0f0f12] p-4">
              <h4 className="text-sm font-semibold mb-2">Auto Upload Scheduler</h4>
              <p className="text-xs text-[#b5b5b5]">Define posting windows and cadence. Queue videos to auto‑publish.</p>
              <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                <label className="block">Days
                  <select className="mt-1 w-full rounded border border-white/10 bg-black/30 p-2">
                    <option>Mon-Fri</option><option>Daily</option><option>Custom</option>
                  </select>
                </label>
                <label className="block">Time
                  <select className="mt-1 w-full rounded border border-white/10 bg-black/30 p-2">
                    <option>7:00 PM</option><option>9:00 AM</option><option>Custom</option>
                  </select>
                </label>
                <label className="block col-span-2">Cadence
                  <select className="mt-1 w-full rounded border border-white/10 bg-black/30 p-2">
                    <option>1 per day</option><option>2 per day</option><option>Every other day</option>
                  </select>
                </label>
              </div>
              <div className="mt-3 flex gap-2">
                <button className="btn-red btn-red-sm btn-show-active"><span className="spinner-sm"></span><span className="label">Save rule</span></button>
                <button className="btn-red btn-red-sm btn-show-active"><span className="spinner-sm"></span><span className="label">Pause</span></button>
              </div>
            </div>
            <div className="rounded-xl border border-white/10 bg-[#0f0f12] p-4">
              <h4 className="text-sm font-semibold mb-2">Bulk Upload</h4>
              <p className="text-xs text-[#b5b5b5]">Drop multiple videos, then batch apply titles, descriptions, and tags.</p>
              <div className="mt-3 h-32 rounded border-2 border-dashed border-white/10 grid place-items-center text-xs text-[#b5b5b5]">Drop files here</div>
              <div className="mt-3 flex gap-2">
                <button className="btn-red btn-red-sm btn-show-active"><span className="spinner-sm"></span><span className="label">Upload</span></button>
                <button className="btn-red btn-red-sm btn-show-active"><span className="spinner-sm"></span><span className="label">Apply template</span></button>
              </div>
            </div>
            <div className="rounded-xl border border-white/10 bg-[#0f0f12] p-4">
              <h4 className="text-sm font-semibold mb-2">Active Rules</h4>
              <ul className="text-xs text-[#b5b5b5] space-y-2 list-disc ml-4">
                <li>Post weekdays at 7 PM (Shorts)</li>
                <li>Long‑form: Tue/Thu at 6 PM</li>
                <li>Cross‑post to TikTok next morning</li>
              </ul>
                </div>
          </div>
        </Section>

        {/* 4. Analytics & Insights */}
        <Section title="Analytics & Insights" subtitle="Audience activity, trends, and comparisons">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="rounded-xl border border-white/10 bg-[#0f0f12] p-4">
              <div className="text-sm text-[#b5b5b5] mb-2">Audience Active Hours</div>
              <div className="grid grid-cols-7 gap-1 h-48 items-end">
                {Array.from({length:7}).map((_,i)=>{
                  const bars = Array.from({length:6}).map((__,j)=>(
                    <div key={j} className="flex-1 bg-[#7aa2ff]/30" style={{height:`${15+Math.random()*75}%`}} />
                  ))
                  return (
                    <div key={i} className="flex gap-1 h-full items-end w-full">{bars}</div>
                  )
                })}
              </div>
                </div>
            <div className="rounded-xl border border-white/10 bg-[#0f0f12] p-4">
              <div className="text-sm text-[#b5b5b5] mb-2">Performance (Last 7 vs Prev 7)</div>
              <div className="grid grid-cols-2 gap-3">
                {['Views','Watch hours','Engagement','Revenue'].map((m,i)=> (
                  <div key={i} className="rounded-lg border border-white/10 bg-[#0b0c10] p-3">
                    <div className="text-xs text-[#b5b5b5]">{m}</div>
                    <div className="mt-1 text-xl font-bold">{Math.floor(50+Math.random()*950)}</div>
                    <div className="text-[11px] text-green-400 mt-1">+{(Math.random()*15).toFixed(1)}%</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Section>

        {/* 5. Growth Tracking */}
        <Section title="Growth Tracking" subtitle="Subscribers, views, hours, and revenue trends">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="rounded-xl border border-white/10 bg-[#0f0f12] p-4">
              <div className="text-sm text-[#b5b5b5] mb-2">Subscriber Growth</div>
              <div className="h-48 flex items-end gap-1">
                {Array.from({length:52}).map((_,i)=> (
                  <div key={i} className="w-1 bg-emerald-400/40" style={{height:`${10+Math.random()*90}%`}} />
                ))}
              </div>
            </div>
            <div className="rounded-xl border border-white/10 bg-[#0f0f12] p-4">
              <div className="text-sm text-[#b5b5b5] mb-2">Views & Watch Hours</div>
              <div className="h-48 grid grid-cols-14 items-end gap-1">
                {Array.from({length:28}).map((_,i)=> (
                  <div key={i} className="flex gap-1 h-full items-end">
                    <div className="w-2 bg-sky-400/40" style={{height:`${15+Math.random()*75}%`}} />
                    <div className="w-2 bg-indigo-400/40" style={{height:`${10+Math.random()*70}%`}} />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Section>

        {/* 6. Task / Workflow Management */}
        <Section title="Workflow Management" subtitle="Pending uploads, rules, and to‑dos">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="rounded-xl border border-white/10 bg-[#0f0f12] p-4">
              <h4 className="text-sm font-semibold mb-2">Pending uploads</h4>
              <ul className="text-xs text-[#b5b5b5] space-y-2 list-disc ml-4">
                <li>Short_0912.mp4 (title needed)</li>
                <li>Tutorial_v2.mov (thumbnail missing)</li>
                <li>PodcastEp14.mp3 (chapters)</li>
              </ul>
            </div>
            <div className="rounded-xl border border-white/10 bg-[#0f0f12] p-4">
              <h4 className="text-sm font-semibold mb-2">Automation rules</h4>
              <div className="flex flex-wrap gap-2 text-[11px]">
                {['Weekday 7PM','Cross‑post TikTok','Long‑form Tue/Thu','Auto‑tags AI'].map((t,i)=> (
                  <span key={i} className="inline-flex items-center rounded-full border border-white/10 bg-black/30 px-3 py-1">{t}</span>
                ))}
              </div>
            </div>
            <div className="rounded-xl border border-white/10 bg-[#0f0f12] p-4">
              <h4 className="text-sm font-semibold mb-2">To‑dos</h4>
              <ul className="text-xs text-[#b5b5b5] space-y-2 list-disc ml-4">
                <li>Upload 5 Shorts for next week</li>
                <li>Optimize tags on top 10 videos</li>
                <li>Draft Q&A community post</li>
              </ul>
            </div>
          </div>
        </Section>

        {/* 7. Notifications & Alerts */}
        <Section title="Notifications & Alerts" subtitle="Policies, failures, AI tips, and milestones">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="rounded-xl border border-white/10 bg-[#0f0f12] p-4">
              <div className="space-y-2 text-sm">
                <Alert color="from-amber-500/20 to-orange-500/20">YouTube policy changed: Ad suitability update.</Alert>
                <Alert color="from-rose-500/20 to-red-500/20">Upload failed: Short_0910.mp4 (retry).</Alert>
                <Alert color="from-emerald-500/20 to-teal-500/20">AI: Your audience is most active at 7 PM.</Alert>
                <Alert color="from-fuchsia-500/20 to-violet-500/20">Milestone: +1,000 subscribers this month 🎉</Alert>
              </div>
            </div>
            <div className="rounded-xl border border-white/10 bg-[#0f0f12] p-4">
              <h4 className="text-sm font-semibold mb-2">Best Performing Video</h4>
              <div className="flex gap-3">
                <img src="https://picsum.photos/seed/best/640/360" alt="best" className="w-40 h-24 rounded object-cover" />
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium">How I automate content in 2025</div>
                  <div className="text-[11px] text-[#b5b5b5]">246K views • 11.2K watch hours</div>
                  <div className="mt-2 flex gap-2">
                    <button className="btn-red btn-red-sm btn-show-active"><span className="spinner-sm"></span><span className="label">Open</span></button>
                    <button className="btn-red btn-red-sm btn-show-active"><span className="spinner-sm"></span><span className="label">Insights</span></button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Section>

        {/* 8. Integrations */}
        <Section title="Integrations" subtitle="Cross‑posting and platform connections">
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
            {[
              { name:'YouTube', color:'from-red-500/30 to-rose-500/30' },
              { name:'TikTok', color:'from-fuchsia-500/30 to-cyan-500/30' },
              { name:'Instagram', color:'from-pink-500/30 to-amber-500/30' },
              { name:'X / Twitter', color:'from-sky-500/30 to-indigo-500/30' },
              { name:'Facebook', color:'from-blue-600/30 to-indigo-600/30' },
              { name:'LinkedIn', color:'from-sky-600/30 to-cyan-600/30' },
            ].map((p,i)=> (
              <div key={i} className={`rounded-xl border border-white/10 bg-gradient-to-br ${p.color} p-3 text-center text-sm font-medium`}>{p.name}</div>
            ))}
          </div>
        </Section>
      </div>
    </Shell>
  )
}

function Alert({ children, color }:{children:React.ReactNode; color:string}){
  return (
    <div className={`rounded-lg border border-white/10 bg-gradient-to-br ${color} px-3 py-2`}>{children}</div>
  )
}


