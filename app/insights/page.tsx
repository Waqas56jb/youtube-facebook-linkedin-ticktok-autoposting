"use client";
import Shell from '../../components/Shell'

export default function Page() {
  return (
    <Shell title="Intelligence & Insights">
      <div className="space-y-10">
        {/* Executive Summary */}
        <section className="rounded-2xl border border-border bg-panel p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold text-foreground">Executive Summary</h2>
              <p className="mt-1 text-sm text-[#b5b5b5]">High-level signals across growth, engagement, monetization, and content performance over the last 30 days.</p>
            </div>
            <div className="grid grid-cols-2 gap-3 text-right">
              {[
                {k: 'Growth', v: '+12.4%'},
                {k: 'Engagement', v: '+9.1%'},
                {k: 'Revenue', v: '+6.7%'},
                {k: 'Retention', v: '+3.8%'},
              ].map((x,i)=>(
                <div key={i} className="rounded-lg border border-border bg-[#0e0e10] p-3">
                  <div className="text-xs text-[#b5b5b5]">{x.k}</div>
                  <div className="text-lg font-bold text-foreground">{x.v}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Metrics Grid */}
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            {label:'New Subscribers', value:'24,381', trend:'+7.2%'},
            {label:'Active Creators', value:'1,042', trend:'+3.1%'},
            {label:'Avg. Session', value:'6m 42s', trend:'+9.4%'},
            {label:'Share Rate', value:'13.8%', trend:'+1.2%'},
          ].map((m,i)=>(
            <div key={i} className="rounded-xl border border-border bg-panel p-5 hover:bg-panelHover transition-colors">
              <div className="text-sm text-[#b5b5b5]">{m.label}</div>
              <div className="mt-2 text-3xl font-bold text-foreground">{m.value}</div>
              <div className="mt-1 text-xs text-green-400">{m.trend} this period</div>
            </div>
          ))}
        </section>

        {/* Revenue Funnel + CTR Trend */}
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="rounded-xl border border-border bg-panel p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-semibold text-foreground">Revenue Funnel</h3>
              <div className="text-xs text-[#b5b5b5]">Discovery → Loyalists</div>
            </div>
            <div className="space-y-3">
              {[
                {label:'Impressions', val: '4.1M', w: 100, c:'#7aa2ff'},
                {label:'Views', val: '1.2M', w: 72, c:'#34d399'},
                {label:'Engaged', val: '312K', w: 48, c:'#a78bfa'},
                {label:'Subscribers', val: '24K', w: 28, c:'#ff8f6b'},
                {label:'Customers', val: '3.2K', w: 18, c:'#9bb5ff'},
              ].map((f,i)=>(
                <div key={i}>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-[#b5b5b5]">{f.label}</span>
                    <span className="text-foreground font-medium">{f.val}</span>
                  </div>
                  <div className="mt-1 h-3 rounded-full bg-[#0e0e10] border border-border overflow-hidden">
                    <div className="h-full" style={{width: f.w+'%', background: f.c}} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-border bg-panel p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-semibold text-foreground">CTR Trend (Last 8 weeks)</h3>
              <div className="text-xs text-[#b5b5b5]">Daily medians</div>
            </div>
            <div className="h-48 grid grid-cols-16 gap-2 items-end">
              {Array.from({length:16}).map((_,i)=>{
                const v = 20+Math.random()*60
                return <div key={i} className="w-full bg-[#7aa2ff]/50" style={{height:`${v}%`}} />
              })}
            </div>
          </div>
        </section>

        {/* Cohort Retention Heatmap */}
        <section className="rounded-xl border border-border bg-panel p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-lg font-semibold text-foreground">Cohort Retention</h3>
            <div className="text-xs text-[#b5b5b5]">Week 0 → Week 8</div>
          </div>
          <div className="overflow-x-auto">
            <div className="min-w-[640px] grid grid-cols-9 gap-1">
              <div className="text-xs text-[#b5b5b5] p-2">Cohort</div>
              {Array.from({length:8}).map((_,i)=>(<div key={i} className="text-xs text-[#b5b5b5] p-2 text-center">W{i}</div>))}
              {Array.from({length:10}).map((_,r)=> (
                <>
                  <div className="text-xs p-2 text-[#b5b5b5]">{`Q${Math.floor(r/2)+1}-${(r%2)+1}`}</div>
                  {Array.from({length:8}).map((_,c)=>{
                    const val = Math.floor(20+Math.random()*70)
                    const op = 0.2 + (val/100)*0.75
                    return <div key={`${r}-${c}`} className="h-8 rounded" style={{background:`rgba(122,162,255,${op})`}} />
                  })}
                </>
              ))}
            </div>
          </div>
        </section>

        {/* Content Calendar */}
        <section className="rounded-xl border border-border bg-panel p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-lg font-semibold text-foreground">Content Calendar (Next 2 Weeks)</h3>
            <div className="text-xs text-[#b5b5b5]">Auto-generated slots</div>
          </div>
          <div className="grid grid-cols-7 gap-3">
            {Array.from({length:14}).map((_,i)=> (
              <div key={i} className="rounded-lg border border-border bg-[#0e0e10] p-3">
                <div className="text-xs text-[#b5b5b5]">{new Date(Date.now()+i*86400000).toLocaleDateString()}</div>
                <div className="mt-2 space-y-2">
                  {Array.from({length:Math.floor(1+Math.random()*3)}).map((_,j)=> (
                    <div key={j} className="text-xs rounded border border-border bg-panel px-2 py-1 text-foreground">{['Reel','Short','Carousel','Longform'][Math.floor(Math.random()*4)]}</div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Workflow Recommendations */}
        <section className="rounded-xl border border-border bg-panel p-5">
          <h3 className="text-lg font-semibold text-foreground mb-3">Workflow Recommendations</h3>
          <ol className="list-decimal list-inside space-y-2 text-sm text-foreground">
            <li>Batch record 8–10 shorts on one theme; maintain consistent framing and lighting.</li>
            <li>Use transcripts to generate story-first captions, then refine titles to exactly 5–6 words.</li>
            <li>Schedule posts to cluster around past peak engagement hours per platform.</li>
            <li>Run A/B tests on the first 3 seconds hook; iterate weekly.</li>
            <li>Cross-post with platform-native features (YT Shorts, Reels) to maximize reach.</li>
            <li>Reply to top comments within 60 minutes to boost early velocity.</li>
          </ol>
        </section>

        {/* A/B Tests & Anomalies */}
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="rounded-xl border border-border bg-panel p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-semibold text-foreground">A/B Tests</h3>
              <div className="text-xs text-[#b5b5b5]">Hooks & Thumbnails</div>
            </div>
            <div className="space-y-3 text-sm">
              {Array.from({length:4}).map((_,i)=> (
                <div key={i} className="rounded-lg border border-border p-3 flex items-center justify-between">
                  <div className="text-foreground">Experiment #{i+1}</div>
                  <div className="text-xs text-[#b5b5b5]">Lift {(2+Math.random()*12).toFixed(1)}%</div>
                </div>
              ))}
            </div>
          </div>
          <div className="rounded-xl border border-border bg-panel p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-semibold text-foreground">Anomaly Detection</h3>
              <div className="text-xs text-[#b5b5b5]">Last 14 days</div>
            </div>
            <div className="h-40 rounded-lg border border-border bg-[#0e0e10] relative overflow-hidden">
              {Array.from({length:24}).map((_,i)=>{
                const spike = Math.random()>0.88
                return <div key={i} className={`absolute bottom-0 w-1`} style={{left:`${i*4}%`, height: `${20+Math.random()*70}%`, background: spike? '#ff8f6b':'#7aa2ff'}} />
              })}
            </div>
          </div>
        </section>

        {/* Resources & Next Actions */}
        <section className="rounded-xl border border-border bg-panel p-5">
          <h3 className="text-lg font-semibold text-foreground mb-3">Next Best Actions</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {[
              {t:'Refresh top 5 thumbnails', d:'Apply winning styles from A/B tests across the library.'},
              {t:'Create series playlist', d:'Bundle best-performing shorts into bingeable sequences.'},
              {t:'Optimize posting windows', d:'Shift releases to peak hours by platform and region.'},
            ].map((x,i)=>(
              <div key={i} className="rounded-lg border border-border bg-[#0e0e10] p-4">
                <div className="font-medium text-foreground">{x.t}</div>
                <div className="text-sm text-[#b5b5b5] mt-1">{x.d}</div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </Shell>
  )
}


