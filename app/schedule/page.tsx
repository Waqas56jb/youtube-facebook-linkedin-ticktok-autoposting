"use client";
import Shell from '../../components/Shell'
import { useEffect, useMemo, useState } from 'react'

type Platform = 'YouTube' | 'Facebook' | 'TikTok' | 'LinkedIn'

const platforms: {name: Platform; color: string; icon: string}[] = [
  { name: 'YouTube', color: '#FF0000', icon: 'https://cdn.jsdelivr.net/gh/simple-icons/simple-icons/icons/youtube.svg' },
  { name: 'Facebook', color: '#1877F2', icon: 'https://cdn.jsdelivr.net/gh/simple-icons/simple-icons/icons/facebook.svg' },
  { name: 'TikTok', color: '#000000', icon: 'https://cdn.jsdelivr.net/gh/simple-icons/simple-icons/icons/tiktok.svg' },
  { name: 'LinkedIn', color: '#0A66C2', icon: 'https://cdn.jsdelivr.net/gh/simple-icons/simple-icons/icons/linkedin.svg' },
]

type CalendarCell = {
  date: string // ISO date
  items: { time: string; title: string; description?: string; path?: string }[]
}

type PlatformCalendars = Record<Platform, Record<string, CalendarCell>>

export default function Page(){
  const [active, setActive] = useState<Platform>('YouTube')
  const [tz, setTz] = useState<string>(Intl.DateTimeFormat().resolvedOptions().timeZone)
  const [now, setNow] = useState<Date>(new Date())
  const [year, setYear] = useState<number>(new Date().getFullYear())
  const [month, setMonth] = useState<number>(new Date().getMonth()) // 0-11
  const currentYear = new Date().getFullYear()
  const currentMonth = new Date().getMonth()
  const startOfToday = new Date(); startOfToday.setHours(0,0,0,0)
  const [loadingGrid, setLoadingGrid] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [modalTitle, setModalTitle] = useState('')
  const [modalTime, setModalTime] = useState('09:00')
  const [modalFile, setModalFile] = useState<File | null>(null)
  const [modalFiles, setModalFiles] = useState<File[]>([])
  const [uploading, setUploading] = useState(false)
  const [creating, setCreating] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [modalText, setModalText] = useState('')
  const [modalPrivacy, setModalPrivacy] = useState<'public'|'private'|'unlisted'>('private')
  const [genLoading, setGenLoading] = useState(false)
  const [showDay, setShowDay] = useState<string | null>(null)
  const [uploadingToSocial, setUploadingToSocial] = useState<string | null>(null)
  const [addBusy, setAddBusy] = useState(false)
  const [apiBase, setApiBase] = useState<string>('')
  const [notice, setNotice] = useState<{ type: 'error'|'success'|'info'; text: string } | null>(null)
  const [credentialsStatus, setCredentialsStatus] = useState<{linkedin: boolean, facebook: boolean}>({linkedin: false, facebook: false})
  const [store, setStore] = useState<PlatformCalendars>(()=>{
    try{
      const raw = localStorage.getItem('platform_calendars')
      if(raw) {
        const parsed = JSON.parse(raw)
        // Ensure all platforms exist; migrate Instagram -> TikTok
        return {
          YouTube: parsed.YouTube || {},
          Facebook: parsed.Facebook || {},
          TikTok: parsed.TikTok || parsed.Instagram || {},
          LinkedIn: parsed.LinkedIn || {},
        }
      }
    }catch{}
    return { YouTube:{}, Facebook:{}, TikTok:{}, LinkedIn:{} }
  })

  // realtime clock
  useEffect(()=>{
    const id = setInterval(()=>setNow(new Date()), 1000)
    return ()=>clearInterval(id)
  },[])

  // avoid hydration mismatch by rendering time/controls after mount
  useEffect(()=>{ setMounted(true) }, [])

  // Check credentials status on mount
  useEffect(()=>{
    const checkCreds = () => {
      try {
        // Check LinkedIn
        const liConfig = localStorage.getItem('linkedin_config')
        const linkedinConfigured = liConfig ? JSON.parse(liConfig) : null
        const liOk = linkedinConfigured && linkedinConfigured.access_token && linkedinConfigured.member_id
        
        // Check Facebook
        const fbConfig = localStorage.getItem('facebook_config')
        const facebookConfigured = fbConfig ? JSON.parse(fbConfig) : null
        const fbOk = facebookConfigured && facebookConfigured.access_token && facebookConfigured.app_id && facebookConfigured.page_id
        
        // Debug logging
        console.log('Facebook config:', facebookConfigured)
        console.log('Facebook configured:', fbOk)
        
        setCredentialsStatus({
          linkedin: !!liOk,
          facebook: !!fbOk
        })
      } catch (error) {
        console.error('Error checking credentials:', error)
      }
    }
    checkCreds()
  }, [])

  // persist store
  useEffect(()=>{
    try{ localStorage.setItem('platform_calendars', JSON.stringify(store)) }catch{}
  },[store])

  // resolve API base once for media URLs (avoids hardcoded localhost)
  useEffect(()=>{
    (async()=>{
      try { const mod = await import('../../lib/api'); setApiBase((mod as any).API_BASE || '') } catch {}
    })()
  },[])

  // auto-hide notices
  useEffect(()=>{
    if (!notice) return
    const id = setTimeout(()=> setNotice(null), 4000)
    return ()=> clearTimeout(id)
  }, [notice])

  // loader on month/platform switch
  useEffect(()=>{ setLoadingGrid(true); const id = setTimeout(()=>setLoadingGrid(false), 250); return ()=>clearTimeout(id) }, [year, month, active])

  const firstDay = useMemo(()=> new Date(year, month, 1), [year, month])
  const daysInMonth = useMemo(()=> new Date(year, month+1, 0).getDate(), [year, month])
  const startWeekday = (firstDay.getDay()+6)%7 // make Monday=0
  const activeColor = useMemo(()=> (platforms.find(p=>p.name===active)?.color || '#6366F1'), [active])
  const ymdKey = (y: number, m: number, d: number) => `${y}-${String(m+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`
  const grid: (Date|null)[] = useMemo(()=>{
    const cells: (Date|null)[] = []
    for(let i=0;i<startWeekday;i++) cells.push(null)
    for(let d=1; d<=daysInMonth; d++) cells.push(new Date(year, month, d))
    while(cells.length%7!==0) cells.push(null)
    return cells
  }, [year, month, daysInMonth, startWeekday])

  const fmtTime = (d: Date) => d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', timeZone: tz })
  const fmtDateKey = (d: Date) => d.toISOString().slice(0,10)
  const dateKeyInTz = (d: Date, zone: string) => {
    try {
      const parts = new Intl.DateTimeFormat('en-CA', {
        timeZone: zone,
        year: 'numeric', month: '2-digit', day: '2-digit'
      }).formatToParts(d)
      const map: Record<string, string> = {}
      for (const p of parts) map[p.type] = p.value
      return `${map.year}-${map.month}-${map.day}`
    } catch {
      return d.toISOString().slice(0,10)
    }
  }
  // Helpers to compute "today" and current month/year in selected timezone
  const getDatePartsInTz = (d: Date, zone: string) => {
    try {
      const parts = new Intl.DateTimeFormat('en-CA', {
        timeZone: zone,
        year: 'numeric', month: '2-digit', day: '2-digit'
      }).formatToParts(d)
      const map: Record<string, string> = {}
      for (const p of parts) map[p.type] = p.value
      return { year: Number(map.year), month: Number(map.month) - 1, day: Number(map.day) }
    } catch {
      return { year: d.getFullYear(), month: d.getMonth(), day: d.getDate() }
    }
  }
  const todayKeyInTz = useMemo(() => {
    const parts = getDatePartsInTz(now, tz)
    const mm = String(parts.month + 1).padStart(2, '0')
    const dd = String(parts.day).padStart(2, '0')
    return `${parts.year}-${mm}-${dd}`
  }, [now, tz])
  const currentYearInTz = useMemo(() => getDatePartsInTz(now, tz).year, [now, tz])
  const currentMonthInTz = useMemo(() => getDatePartsInTz(now, tz).month, [now, tz])

  const platformColor = (p: Platform): string => {
    if (p === 'YouTube') return '#FF0000'
    if (p === 'LinkedIn') return '#0A66C2'
    if (p === 'Facebook') return '#1877F2'
    return '#000000' // TikTok
  }

  const openAddModal = (d: Date) => {
    if (d < startOfToday && month === currentMonth && year === currentYear) return
    setSelectedDate(d)
    setModalTitle('')
    // Default time: if opening for today (in selected tz), suggest next 10 minutes slot; else 09:00
    try {
      const parts = new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date())
      const map: Record<string,string> = {}; for(const p of parts) map[p.type]=p.value
      const todayKey = `${map.year}-${map.month}-${map.day}`
      const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
      if (key === todayKey) {
        const nowParts = new Intl.DateTimeFormat('en-GB', { timeZone: tz, hour: '2-digit', minute: '2-digit', hour12: false }).formatToParts(new Date())
        const mp: Record<string,string> = {}; for(const p of nowParts) mp[p.type]=p.value
        let hh = parseInt(mp.hour||'00',10); let mm = parseInt(mp.minute||'00',10)
        mm = Math.min(59, Math.ceil((mm+1)/10)*10) // next 10-min slot
        if (mm===60){ hh=(hh+1)%24; mm=0 }
        setModalTime(`${String(hh).padStart(2,'0')}:${String(mm).padStart(2,'0')}`)
      } else {
    setModalTime('09:00')
      }
    } catch { setModalTime('09:00') }
    setModalFile(null)
    setModalFiles([])
    setModalPrivacy('private')
    setShowModal(true)
  }

  // Derived state: whether Save should be enabled
  const saveDisabled = useMemo(() => {
    const hasMedia = (modalFiles.length > 0) || !!modalFile
    const isVideo = modalFile?.type?.startsWith('video/') || false
    if (uploading || creating) return true
    if (active === 'YouTube' || active === 'TikTok') {
      return !(hasMedia && isVideo)
    }
    // Facebook/LinkedIn allow image/video or text-only
    const hasText = !!modalText.trim()
    return !(hasMedia || hasText)
  }, [active, uploading, creating, modalFiles, modalFile, modalText])

  const handleCreate = async () => {
    if (!selectedDate) return
    if (creating) return
    // Platform-specific validation
    if (active === 'YouTube') {
      if (!modalFile || !modalFile.type.startsWith('video/')) { alert('Please select a video file for YouTube.'); return }
    }
    if (active === 'TikTok') {
      // TikTok: video only
      if (!modalFile || !modalFile.type.startsWith('video/')) { alert('Please select a video file for TikTok.'); return }
      setModalText('')
    }
    if (active === 'Facebook') {
      // allow video, image, or text
    }
    if (active === 'LinkedIn') {
      // allow video, image, and text
    }
    // Prevent saving if time is in the past for the selected day in chosen timezone
    try {
      const parts = new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date())
      const map: Record<string,string> = {}; for(const p of parts) map[p.type]=p.value
      const todayKey = `${map.year}-${map.month}-${map.day}`
      const selKey = dateKeyInTz(selectedDate, tz)
      if (selKey === todayKey) {
        const nowParts = new Intl.DateTimeFormat('en-GB', { timeZone: tz, hour: '2-digit', minute: '2-digit', hour12: false }).formatToParts(new Date())
        const mp: Record<string,string> = {}; for(const p of nowParts) mp[p.type]=p.value
        const nowHHMM = `${mp.hour||'00'}:${mp.minute||'00'}`
        if ((modalTime||'00:00') <= nowHHMM) {
          alert('Selected time is in the past for today. Please pick a future time.')
          return
        }
      }
    } catch {}

    let uploadedPaths: (string | undefined)[] = []
    try {
      const toUpload: File[] = modalFiles.length ? modalFiles : (modalFile ? [modalFile] : [])
      if (toUpload.length === 0) {
        // text-only post (Facebook/LinkedIn) with duplicate prevention
        const key = dateKeyInTz(selectedDate, tz)
        setStore(prev=>{
          const next = {...prev}
          const cal = next[active]
          if(!cal[key]) cal[key] = { date: key, items: [] }
          const item = { time: modalTime, title: modalTitle.trim(), description: modalText.trim() || undefined, privacy: modalPrivacy }
          const sig = `${''}|${item.title}|${item.time}`
          const exists = cal[key].items.some(it => `${it.path||''}|${it.title}|${it.time}` === sig)
          if (!exists) {
            cal[key].items.push(item)
          }
          return next
        })
        setShowModal(false)
        return
      }
      // Media upload path: set creating true while we process
      setCreating(true)
      for (const f of toUpload) {
        setUploading(true)
        const { API_BASE } = await import('../../lib/api')
        const form = new FormData()
        form.append('file', f)
        const res = await fetch(`${API_BASE}/video/upload`, { method: 'POST', body: form })
        const json = await res.json()
        uploadedPaths.push(res.ok && json?.source_path ? (json.source_path as string) : undefined)
      }
    } catch {}
    finally {
      setUploading(false)
      setCreating(false)
    }
    const key = dateKeyInTz(selectedDate, tz)
    setStore(prev=>{
      const next = {...prev}
      const cal = next[active]
      if(!cal[key]) cal[key] = { date: key, items: [] }
      const existing = new Set(cal[key].items.map(it => `${it.path||''}|${it.title}|${it.time}`))
      if ((modalFiles.length || (modalFile?1:0)) > 1) {
        const filesArr = modalFiles.length ? modalFiles : (modalFile ? [modalFile] : [])
        filesArr.forEach((f, idx) => {
          const item = { time: modalTime, title: `${modalTitle.trim()} • ${f.name}`, description: modalText.trim() || undefined, path: uploadedPaths[idx], privacy: modalPrivacy }
          const sig = `${item.path||''}|${item.title}|${item.time}`
          if (!existing.has(sig)) cal[key].items.push(item)
        })
      } else {
        const item = { time: modalTime, title: modalTitle.trim(), description: modalText.trim() || undefined, path: uploadedPaths[0], privacy: modalPrivacy }
        const sig = `${item.path||''}|${item.title}|${item.time}`
        if (!existing.has(sig)) cal[key].items.push(item)
      }
      return next
    })
    setShowModal(false)
    setModalFiles([]); setModalFile(null); setCreating(false)
  }

  const canUploadType = (mime: string) => {
    if (active === 'YouTube') return mime.startsWith('video/')
    if (active === 'TikTok') return mime.startsWith('video/')
    if (active === 'Facebook') return mime.startsWith('video/') || mime.startsWith('image/')
    if (active === 'LinkedIn') return mime.startsWith('video/') || mime.startsWith('image/')
    return true
  }

  const onPickFile = (file: File | null) => {
    if (!file) { setModalFile(null); setModalFiles([]); return }
    if (!canUploadType(file.type)) { alert('Selected file type not allowed for this platform.'); return }
    setModalFile(file)
    setModalFiles([file])
  }

  const onPickMultiple = (list: FileList | null) => {
    if (!list || !list.length) { setModalFiles([]); setModalFile(null); return }
    const arr: File[] = []
    for (let i=0;i<list.length;i++) {
      const f = list.item(i)!
      if (canUploadType(f.type)) arr.push(f)
    }
    if (!arr.length) { alert('No allowed files selected.'); return }
    setModalFiles(arr)
    setModalFile(arr[0])
  }

  // Auto-post due items (Facebook/LinkedIn/YouTube)
  useEffect(() => {
    const parseTimeToDate = (dateKey: string, time: string): Date => {
      const [h, m] = (time || '00:00').split(':').map(Number)
      const d = new Date(dateKey + 'T00:00:00')
      d.setHours(h || 0, m || 0, 0, 0)
      return d
    }
    const postItem = async (platform: 'Facebook'|'LinkedIn'|'YouTube', item: { time: string; title: string; description?: string; path?: string; _posted?: number }, dateKey: string) => {
      try {
        const { apiService, API_BASE } = await import('../../lib/api')
        if (platform === 'LinkedIn') {
          const li = JSON.parse(localStorage.getItem('linkedin_config') || '{}')
          if (!(li && li.access_token && li.member_id)) return
          await apiService.postToLinkedIn(li.access_token, li.member_id, item.title || '', item.description || '', item.path || '')
        } else if (platform === 'Facebook') {
          const fb = JSON.parse(localStorage.getItem('facebook_config') || '{}')
          if (!(fb && fb.access_token && fb.app_id && fb.page_id)) return
          await apiService.postToFacebook(fb.access_token, fb.app_id, fb.app_secret || '', fb.page_id, item.title || '', item.description || '', item.path || '')
        } else if (platform === 'YouTube') {
          if (!item.path || !item.path.endsWith('.mp4')) return
          const res = await fetch(`${API_BASE}/video/publish-youtube`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ path: item.path, title: item.title || '', description: item.description || '', hashtags: '', privacy: (item as any).privacy || 'private' })
          })
          const js = await res.json().catch(()=>null)
          if (!res.ok) return
          if (js && js.url) {
            setStore(prev => {
              const next = { ...prev }
              const cal = next['YouTube']
              const items = cal[dateKey]?.items || []
              const idx = items.findIndex((it: any) => (it.path||'') === (item.path||'') && it.time === item.time && it.title === item.title)
              if (idx >= 0) { (items as any)[idx]._videoUrl = js.url }
              return next
            })
          }
        }
        setStore(prev => {
          const next = { ...prev }
          const cal = next[platform as 'YouTube'|'Facebook'|'LinkedIn'] as Record<string, CalendarCell>
          const items = cal[dateKey]?.items || []
          const idx = items.findIndex((it: any) => (it.path||'') === (item.path||'') && it.time === item.time && it.title === item.title)
          if (idx >= 0) { (items as any)[idx]._posted = Date.now() }
          return next
        })
      } catch {}
    }
    const tick = () => {
      try {
        const nowLocal = new Date()
        const todayKey = nowLocal.toISOString().slice(0,10)
        ;(['Facebook','LinkedIn','YouTube'] as const).forEach(platform => {
          const day = store[platform][todayKey]
          if (!day) return
          for (const it of (day.items as any[])) {
            if ((it as any)._posted) continue
            const due = parseTimeToDate(todayKey, it.time)
            if (nowLocal >= due) { postItem(platform, it as any, todayKey) }
          }
        })
      } catch {}
    }
    const id = setInterval(tick, 30000)
    tick()
    return () => clearInterval(id)
  }, [store])

  // Auto-clean past days (not current day) based on selected timezone (tz)
  useEffect(() => {
    const getNowInTz = () => {
      try {
        const d = new Date()
        const parts = new Intl.DateTimeFormat('en-CA', { // en-CA yields ISO-like YYYY-MM-DD
          timeZone: tz,
          year: 'numeric', month: '2-digit', day: '2-digit',
          hour: '2-digit', minute: '2-digit', hour12: false
        }).formatToParts(d)
        const map: Record<string, string> = {}
        for (const p of parts) { map[p.type] = p.value }
        const dateKey = `${map.year}-${map.month}-${map.day}`
        const timeStr = `${map.hour}:${map.minute}`
        return { dateKey, timeStr }
      } catch {
        // Fallback to local
        const nowLocal = new Date()
        return { dateKey: nowLocal.toISOString().slice(0,10), timeStr: nowLocal.toTimeString().slice(0,5) }
      }
    }
    const tick = () => {
      try {
        const { dateKey: todayKey, timeStr: nowHHMM } = getNowInTz()
        let changed = false
        setStore(prev => {
          const next: PlatformCalendars = { ...prev }
          ;(['YouTube','Facebook','TikTok','LinkedIn'] as Platform[]).forEach(platform => {
            const cal = { ...next[platform] }
            let calChanged = false
            for (const key of Object.keys(cal)) {
              if (key < todayKey) {
                delete cal[key]
                calChanged = true
                continue
              }
              // Do not modify current day's items; they should persist until day changes
            }
            if (calChanged) {
              next[platform] = cal
              changed = true
            }
          })
          return changed ? next : prev
        })
      } catch {}
    }
    const id = setInterval(tick, 30000) // every 30s
    tick()
    return () => clearInterval(id)
  }, [tz])

  const generateTitleAndDescription = async () => {
    try {
      setGenLoading(true)
      // Call existing caption generator (legacy) with filename as hint if uploaded
      const { API_BASE } = await import('../../lib/api')
      const name = modalFile?.name || `${active} post`
      const res = await fetch(`${API_BASE}/video/caption-legacy`, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ path: name, seed: 0 }) })
      const data = await res.json()
      if (res.ok) {
        const t = String(data.title || '').trim()
        const c = String(data.caption || '').trim()
        if (t) setModalTitle(t)
        if (c) setModalText(c)
      }
    } catch {}
    finally { setGenLoading(false) }
  }

  const instantUpload = async (item: { time: string; title: string; description?: string; path?: string }) => {

    let isConfigured = false
    if (active === 'LinkedIn') {
      isConfigured = credentialsStatus.linkedin
    } else if (active === 'Facebook') {
      isConfigured = credentialsStatus.facebook
    } else if (active === 'YouTube') {
      try {
        // First check local flag set after successful verification
        isConfigured = localStorage.getItem('youtube_auth_done') === '1'
        if (!isConfigured) {
          const { API_BASE } = await import('../../lib/api')
          const res = await fetch(`${API_BASE}/video/youtube/auth-status`).then(r=>r.json()).catch(()=>null as any)
          isConfigured = !!(res && res.configured && res.authenticated)
          if (isConfigured) localStorage.setItem('youtube_auth_done','1')
        }
      } catch {}
    }

    if (!isConfigured) {
      alert(`${active} credentials not configured. Please configure in Settings first.`)
      return
    }

    setUploadingToSocial(item.path || '')
    try {
      const { apiService } = await import('../../lib/api')
      
      if (active === 'LinkedIn') {
        const liConfig = JSON.parse(localStorage.getItem('linkedin_config') || '{}')
        console.log('LinkedIn config:', liConfig)
        const result = await apiService.postToLinkedIn(
          liConfig.access_token,
          liConfig.member_id,
          item.title || '',
          item.description || '',
          item.path || ''
        )
        console.log('LinkedIn result:', result)
      } else if (active === 'Facebook') {
        const { API_BASE } = await import('../../lib/api')
        const fbConfig = JSON.parse(localStorage.getItem('facebook_config') || '{}')
        const token = fbConfig.page_token || fbConfig.access_token
        if (!(token && fbConfig.page_id)) { throw new Error('Facebook settings missing page token or page id') }
        const res = await fetch(`${API_BASE}/video/facebook/post`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ access_token: token, page_id: fbConfig.page_id, title: item.title||'', description: item.description||'', media_path: item.path||'' })
        })
        const js = await res.json().catch(()=>null)
        if (!res.ok) { throw new Error(typeof js==='string'?js: (js?.detail? JSON.stringify(js.detail) : 'Facebook posting error')) }
      } else if (active === 'YouTube') {
        const { API_BASE } = await import('../../lib/api')
        if (!item.path || !item.path.endsWith('.mp4')) { alert('YouTube requires a video file.'); return }
        const res = await fetch(`${API_BASE}/video/publish-youtube`, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ path: item.path, title: item.title || '', description: item.description || '', hashtags: '', privacy: (item as any).privacy || 'private' }) })
        const js = await res.json().catch(()=>null)
        if (!res.ok) { throw new Error(js?.detail || js?.error || 'YouTube upload failed') }
        // Persist returned URL if available
        if (js && js.url) {
          setStore(prev => {
            const next = { ...prev }
            const cal = next[active]
            for (const key of Object.keys(cal)) {
              const items = cal[key]?.items || []
              const idx = items.findIndex((it: any) => (it.path||'') === (item.path||'') && it.time === item.time && it.title === item.title)
              if (idx >= 0) { (items as any)[idx]._videoUrl = js.url; break }
            }
            return next
          })
        }
      }
      
      alert(`✅ ${active} post uploaded successfully!`)
      // Remove the posted item from the schedule
      const dateKey = showDay as string | null
      setStore(prev => {
        const next = { ...prev }
        const removeFrom = (platform: Platform, key: string) => {
          const cal = next[platform]
          const list = cal[key]?.items || []
          if (!list.length) return false
          const filtered = list.filter(it => !(
            (it.time === item.time)
            && (it.title === item.title)
            && ((it.path || '') === (item.path || ''))
          ))
          if (filtered.length !== list.length) {
            cal[key].items = filtered
            if (!cal[key].items.length) delete cal[key]
            return true
          }
          return false
        }
        if (dateKey) {
          removeFrom(active, dateKey)
        } else {
          // Fallback: search the first matching date entry
          const cal = next[active]
          for (const key of Object.keys(cal)) {
            if (removeFrom(active, key)) break
          }
        }
        return next
      })
    } catch (error) {
      console.error('Upload error:', error)
      const msg = String((error as any)?.message || error || '')
      if (active === 'YouTube' && /exceeded|quota|limit/i.test(msg)) {
        setNotice({ type: 'error', text: 'YouTube daily upload limit reached. Please try again tomorrow.' })
      } else if (active === 'Facebook' && /(pages_manage_posts|pages_read_engagement|publish_to_groups|code\W*200)/i.test(msg)) {
        setNotice({ type: 'error', text: 'Facebook permissions error: Require pages_manage_posts and pages_read_engagement with a Page access token (and app installed). Update token in Settings and try again.' })
      } else {
        setNotice({ type: 'error', text: `Failed to upload to ${active}. ${msg}` })
      }
    } finally {
      setUploadingToSocial(null)
    }
  }

  return (
    <Shell title="Schedule" panel={false}>
      <div className="min-h-screen bg-gradient-to-br from-sky-50 via-indigo-50 to-fuchsia-50 dark:from-gray-900 dark:via-slate-900 dark:to-gray-900 p-0">
        {notice && (
          <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50">
            <div className={`px-4 py-2 rounded-xl shadow-lg border text-sm ${notice.type==='error' ? 'bg-red-50 border-red-200 text-red-700' : notice.type==='success' ? 'bg-green-50 border-green-200 text-green-700' : 'bg-blue-50 border-blue-200 text-blue-700'}`}>
              {notice.text}
            </div>
          </div>
        )}
        {/* Top Navbar */}
        <div className="sticky top-0 z-30 backdrop-blur supports-[backdrop-filter]:bg-white/60 dark:supports-[backdrop-filter]:bg-gray-900/60 border-b border-white/30 dark:border-gray-800">
          <div className="max-w-7xl mx-auto px-6 py-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="font-semibold">Scheduling Dashboard</span>
            </div>
            <div className="text-xs text-gray-600 dark:text-gray-300">{mounted ? now.toLocaleString([], { timeZone: tz }) : ''}</div>
          </div>
        </div>
        <div className="max-w-7xl mx-auto space-y-6 p-6">
          <div className="flex flex-col gap-3">
            <div className="flex items-baseline justify-between">
              <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200">Channels</h3>
              <span className="text-[11px] text-gray-500">Pick a platform to schedule</span>
            </div>
            <div className="grid grid-cols-2 gap-4 w-full">
              {(['Facebook','LinkedIn','YouTube','TikTok'] as Platform[]).map(name => {
                const p = platforms.find(pp=>pp.name===name)!
                const selected = active===name
                return (
                  <button
                    key={name}
                    onClick={()=>setActive(name)}
                    className={`group relative overflow-hidden rounded-2xl border shadow-sm transition-all px-5 py-4 flex items-center justify-between gap-4 w-full h-24 ${selected ? 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-700 ring-2 ring-offset-2 ring-[color:var(--tw-ring-color)]' : 'bg-white/90 dark:bg-gray-800/80 border-gray-200 dark:border-gray-700 hover:-translate-y-0.5 hover:shadow-md'}`}
                    style={{['--tw-ring-color' as any]: p.color}}
                    title={name}
                  >
                    <span className="w-12 h-12 rounded-full ring-2 ring-white/50 flex items-center justify-center" style={{background:p.color}}>
                      <img src={p.icon} alt="" className="w-6 h-6 filter invert" />
                    </span>
                    <div className="flex flex-col text-left leading-tight flex-1">
                      <span className="text-base font-semibold">{name}</span>
                      <span className="text-xs text-gray-500">Content Scheduler</span>
                    </div>
                    <span className="text-[11px] px-2 py-1 rounded-full border" style={{borderColor:p.color, color:p.color}}>Select</span>
                </button>
                )
              })}
            </div>
            <div className="flex items-center gap-3">
              <div className="px-3 py-2 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-sm shadow">
                {now.toLocaleString([], { timeZone: tz, hour: '2-digit', minute: '2-digit', second: '2-digit' })}
              </div>
              {mounted && (
                <>
                  <select value={tz} onChange={e=>setTz(e.target.value)} className="px-3 py-2 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-sm hover:border-indigo-400 focus:ring-2 focus:ring-indigo-400">
                    {(Intl as any).supportedValuesOf?.('timeZone')?.map((z: string)=> <option key={z} value={z}>{z}</option>) || [
                      'UTC','Europe/London','Europe/Paris','Europe/Berlin','Europe/Madrid','Europe/Rome','Europe/Amsterdam','Europe/Dublin',
                      'America/New_York','America/Chicago','America/Denver','America/Los_Angeles','America/Toronto','America/Sao_Paulo',
                      'Asia/Karachi','Asia/Kolkata','Asia/Dubai','Asia/Singapore','Asia/Hong_Kong','Asia/Tokyo','Asia/Seoul',
                      'Australia/Sydney','Pacific/Auckland','Africa/Johannesburg','Africa/Cairo'
                    ].map((z: string)=> <option key={z} value={z}>{z}</option>)}
                  </select>
                </>
              )}
            </div>
          </div>

          <div className="flex items-center justify-between mt-2">
            <div className="flex items-center gap-2">
              <button
                onClick={()=>{
                  if (year>currentYear || (year===currentYear && month>currentMonth)) {
                    setYear(y=> y - (month===0?1:0))
                    setMonth(m=> (m+11)%12)
                  }
                }}
                disabled={!(year>currentYear || (year===currentYear && month>currentMonth))}
                className={`px-3 py-2 rounded-lg border transition shadow-sm hover:shadow ${ (year>currentYear || (year===currentYear && month>currentMonth)) ? 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:-translate-y-0.5' : 'bg-gray-100 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700 opacity-60 cursor-not-allowed'}`}
              >
                ←
              </button>
              <div className="text-lg font-semibold bg-white/70 dark:bg-gray-800/60 px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm">{new Date(year, month, 1).toLocaleString([], { month: 'long', year: 'numeric' })}</div>
              <button
                onClick={()=>{
                  setYear(y=> y + (month===11?1:0))
                  setMonth(m=> (m+1)%12)
                }}
                className="px-3 py-2 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 transition shadow-sm hover:-translate-y-0.5 hover:shadow"
              >
                →
              </button>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={()=>{const t=new Date(); setYear(t.getFullYear()); setMonth(t.getMonth())}} className="px-3 py-2 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 transition hover:-translate-y-0.5 hover:shadow">Today</button>
            </div>
          </div>

          <div className="grid grid-cols-7 gap-2 relative">
            {loadingGrid && (
              <div className="absolute inset-0 z-10 rounded-2xl bg-white/60 dark:bg-gray-900/60 backdrop-blur-sm flex items-center justify-center">
                <div className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-200">
                  <div className="w-4 h-4 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                  Loading calendar...
                </div>
              </div>
            )}
            {["Mon","Tue","Wed","Thu","Fri","Sat","Sun"].map(d=> (
              <div key={d} className="text-xs font-medium text-gray-600 dark:text-gray-300 px-2">{d}</div>
            ))}
            {grid.map((d,idx)=>{
              if(!d) return <div key={idx} className="h-28 rounded-xl bg-white/50 dark:bg-gray-800/40 border border-gray-200 dark:border-gray-700" />
              const key = ymdKey(year, month, d.getDate())
              const items = store[active][key]?.items || []
              const videoCount = items.filter(it => it.path && it.path.endsWith('.mp4')).length
              const isToday = (key === todayKeyInTz)
              const isPast = (year===currentYearInTz && month===currentMonthInTz && key < todayKeyInTz)
              return (
                <div
                  key={idx}
                  onClick={()=> !isPast && setShowDay(key)}
                  className={`h-28 rounded-xl bg-white dark:bg-gray-800 border p-2 flex flex-col gap-1 ${isPast? 'opacity-60' : 'hover:shadow-md transition cursor-pointer'}`}
                  style={{ borderColor: isToday ? activeColor : undefined }}
                >
                  <div className="flex items-center justify-between">
                    <button
                      onClick={(e)=>{e.stopPropagation(); openAddModal(new Date(key + 'T00:00:00'))}}
                      disabled={isPast}
                      className={`text-xs ${isPast? 'text-gray-400 cursor-not-allowed' : 'hover:underline'}`}
                      style={!isPast ? (active === 'TikTok' ? { color: '#fff' } : { color: activeColor }) : undefined}
                    >
                      + Add
                    </button>
                    <span
                      className={`${isPast ? 'text-xs text-white line-through' : isToday ? 'text-sm text-white font-extrabold px-2 py-0.5 rounded-full ring-2 shadow-sm' : 'text-xs text-white'}`}
                      style={isToday ? { backgroundColor: activeColor, boxShadow: '0 0 0 2px rgba(59,130,246,0.3)' } : undefined}
                    >
                      {d.getDate()}
                    </span>
                  </div>
                  {/* Removed per request: count badge */}
                  <div className="flex-1 flex flex-col items-center justify-evenly overflow-hidden">
                    {items.length > 0 && (
                      <div className="flex flex-col items-center justify-evenly text-center h-full w-full">
                        {items.slice(0, 5).map((it, i) => {
                          const p = (it as any).path as string | undefined
                          const isVideo = Boolean(p && p.endsWith('.mp4'))
                          const isImage = Boolean(p && !p.endsWith('.mp4'))
                          const label = isVideo ? 'Video' : (isImage ? 'Image' : 'Text')
                          // Capsule background per platform
                          const bg = (
                            active === 'YouTube' ? '#FF0000' :
                            active === 'LinkedIn' ? '#0A66C2' :
                            active === 'Facebook' ? '#3B82F6' :
                            /* TikTok */ '#000000'
                          )
                          const posted = (it as any)._posted
                          return (
                            <span
                              key={i}
                              className={`text-[12px] font-extrabold leading-none whitespace-nowrap px-2 py-0.5 rounded-full shadow-sm ${posted ? 'ring-2' : ''}`}
                              style={{ backgroundColor: posted ? '#059669' : bg, color: '#ffffff', boxShadow: posted ? '0 0 0 2px rgba(16,185,129,.35)' : undefined }}
                              title={posted ? 'Posted' : undefined}
                            >
                              {posted ? 'Posted' : label}
                            </span>
                          )
                        })}
                        {items.length > 5 && (
                          <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full" style={{ backgroundColor: '#6B7280', color: '#ffffff' }}>+{items.length - 5} more</span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>

          {/* Footer legend */}
          <div className="mt-4 flex flex-wrap items-center gap-3 text-xs text-gray-600 dark:text-gray-300">
            <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700"><span className="w-2 h-2 rounded-full bg-indigo-400"/> Today</span>
            <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700"><span className="w-2 h-2 rounded-full bg-gray-400"/> Past (disabled)</span>
            <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700"><span className="w-2 h-2 rounded-full bg-emerald-400"/> Scheduled item</span>
          </div>
        </div>

        {/* Create modal */}
        {showModal && (
          <div className="fixed inset-0 z-40 flex items-center justify-center p-4 bg-black/50">
            <div className="w-full max-w-lg rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 shadow-2xl animate-modal-in">
              <div className="p-5 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
                  <div className="font-semibold">Schedule item • {selectedDate ? selectedDate.toDateString() : ''}</div>
                </div>
                <button onClick={()=>setShowModal(false)} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800">
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"/></svg>
                </button>
              </div>
              <div className="p-5 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-gray-600 dark:text-gray-300">Title (optional)</label>
                    <input value={modalTitle} onChange={e=>setModalTitle(e.target.value)} placeholder="Post title (optional)" className="mt-1 w-full px-3 py-2 rounded-lg bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700" />
                  </div>
                  <div>
                    <label className="text-xs text-gray-600 dark:text-gray-300">Time</label>
                    <input type="time" value={modalTime} onChange={e=>setModalTime(e.target.value)} className="mt-1 w-full px-3 py-2 rounded-lg bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700" />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-xs text-gray-600 dark:text-gray-300">Upload media {active==='YouTube' ? '(video only)' : active==='TikTok' ? '(video only)' : '(photo/video or text)'}</label>
                  <input type="file" multiple accept={active==='YouTube' ? 'video/*' : (active==='TikTok') ? 'video/*' : (active==='Facebook' || active==='LinkedIn') ? 'video/*,image/*' : '*/*'} onChange={e=>onPickMultiple(e.target.files)} className="mt-1 block w-full text-sm file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:bg-indigo-600 file:text-white hover:file:bg-indigo-700" />
                  {modalFiles.length>1 && <div className="text-xs text-gray-500">{modalFiles.length} files selected</div>}
                  {active==='YouTube' && (
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mt-2">
                      <div className="sm:col-span-1">
                        <label className="text-xs text-gray-600 dark:text-gray-300">Visibility</label>
                        <select value={modalPrivacy} onChange={e=>setModalPrivacy(e.target.value as any)} className="mt-1 w-full px-3 py-2 rounded-lg bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-sm">
                          <option value="private">Private</option>
                          <option value="unlisted">Unlisted</option>
                          <option value="public">Public</option>
                        </select>
                      </div>
                    </div>
                  )}
                  {(active==='Facebook' || active==='LinkedIn') && (
                    <div>
                      <label className="text-xs text-gray-600 dark:text-gray-300">Optional text</label>
                      <textarea value={modalText} onChange={e=>setModalText(e.target.value)} placeholder="Say something..." className="mt-1 w-full px-3 py-2 rounded-lg bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700" rows={3} />
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <button type="button" onClick={generateTitleAndDescription} disabled={genLoading} className="px-3 py-2 rounded-lg bg-emerald-600 text-white text-sm disabled:opacity-60">
                    {genLoading ? 'Generating…' : 'Generate Title & Description'}
                  </button>
                  {modalText && <span className="text-xs text-gray-500">Description ready</span>}
                </div>
              </div>
              <div className="p-5 border-t border-gray-100 dark:border-gray-800 flex items-center justify-end gap-3">
                <button onClick={()=>setShowModal(false)} className="px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">Cancel</button>
                <button onClick={handleCreate} disabled={saveDisabled} className="relative px-5 py-2 rounded-lg text-white bg-gradient-to-r from-indigo-600 to-fuchsia-600 disabled:opacity-60">
                  {uploading && <span className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                  <span className={uploading? 'pl-4':''}>Save</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Day details modal */}
        {showDay && (
          <div className="fixed inset-0 z-40 flex items-center justify-center p-4 bg-black/50">
            <div className="w-full max-w-3xl rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 shadow-2xl animate-modal-in">
              <div className="p-5 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
                <div className="font-semibold">Scheduled items • {showDay}</div>
                <div className="flex items-center gap-2">
                  <button onClick={()=>{ setShowDay(null) }} className="px-3 py-1.5 rounded-lg bg-gray-100 dark:bg-gray-800 text-sm">Close</button>
                          <button
                    onClick={()=>{
                      setAddBusy(true)
                      const d = new Date(showDay as string)
                      // Close the day modal first to avoid background overlap
                      setShowDay(null)
                      // Open the add modal on next tick
                      setTimeout(()=> openAddModal(d), 0)
                      setTimeout(()=> setAddBusy(false), 250)
                    }}
                    disabled={addBusy}
                    className={`relative px-3 py-1.5 rounded-lg text-sm transition ${addBusy? 'bg-indigo-500 text-white opacity-80 cursor-wait' : 'bg-indigo-600 text-white hover:bg-indigo-500'}`}
                  >
                    {addBusy && <span className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 border-2 border-white/40 border-t-white rounded-full animate-spin" />}
                    <span className={addBusy? 'pl-3' : ''}>+ Add</span>
                          </button>
                      </div>
                    </div>
              <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[70vh] overflow-y-auto">
                {([...(store[active][showDay]?.items || [])]
                  .sort((a,b) => (a.time||'00:00').localeCompare(b.time||'00:00'))
                ).map((it, i)=> (
                  <DayItemCard
                    key={`${it.time}|${it.title}|${it.path||''}|${i}`}
                    active={active}
                    dateKey={showDay as string}
                    item={it}
                    apiBase={apiBase}
                    instantUpload={instantUpload}
                    uploadingToSocial={uploadingToSocial}
                    removeItem={(target) => {
                      const dateKey = showDay as string
                      setStore(prev => {
                        const next = { ...prev }
                        const cal = next[active]
                        const items = cal[dateKey]?.items || []
                        const filtered = items.filter(x => !(((x.path || '') === (target.path || '')) && x.time === target.time && x.title === target.title))
                        if (filtered.length) {
                          cal[dateKey] = { date: dateKey, items: filtered }
                        } else {
                          delete cal[dateKey]
                        }
                        return next
                      })
                    }}
                    updateItem={(target, newDateKey, newTime) => {
                      const oldDateKey = showDay as string
                      setStore(prev => {
                        const next = { ...prev }
                        const cal = next[active]
                        // remove from old date
                        const items = cal[oldDateKey]?.items || []
                        const filtered = items.filter(x => !(((x.path || '') === (target.path || '')) && x.time === target.time && x.title === target.title))
                        if (filtered.length) {
                          cal[oldDateKey] = { date: oldDateKey, items: filtered }
                        } else {
                          delete cal[oldDateKey]
                        }
                        // add to new date with duplicate prevention
                        if (!cal[newDateKey]) cal[newDateKey] = { date: newDateKey, items: [] }
                        const dest = cal[newDateKey]
                        const newItem = { ...target, time: newTime }
                        const sig = `${newItem.path||''}|${newItem.title}|${newItem.time}`
                        const exists = new Set(dest.items.map(it => `${it.path||''}|${it.title}|${it.time}`))
                        if (!exists.has(sig)) dest.items.push(newItem)
                        return next
                      })
                    }}
                  />
                ))}
                {!(store[active][showDay]?.items || []).length && (
                  <div className="col-span-full">
                    <div
                      className="rounded-xl border border-dashed border-gray-300 dark:border-gray-700 p-6 text-center bg-white dark:bg-gray-800 shadow-sm"
                      onClick={(e)=> e.stopPropagation()}
                      role="region"
                      aria-label="Empty schedule state"
                    >
                      <div className="mx-auto mb-3 w-12 h-12 rounded-full bg-gray-100 dark:bg-gray-900 flex items-center justify-center text-gray-600 dark:text-gray-300">
                        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                          <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                          <line x1="16" y1="2" x2="16" y2="6"></line>
                          <line x1="8" y1="2" x2="8" y2="6"></line>
                          <line x1="3" y1="10" x2="21" y2="10"></line>
                        </svg>
                      </div>
                      <div className="font-medium">No items yet for this date</div>
                      <div className="mt-1 text-xs text-gray-500">Click “+ Add” to schedule a video, image, or text post.</div>
                      </div>
                    </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="mt-6 border-t border-white/30 dark:border-gray-800">
          <div className="max-w-7xl mx-auto px-6 py-4 text-xs text-gray-600 dark:text-gray-400 flex items-center justify-between">
            <span>Calendar is local and private. Platform-specific posts are stored per tab.</span>
            <span>Tip: Use the timezone selector to preview audience time accurately.</span>
          </div>
        </div>
      </div>
    </Shell>
  )
}

function DayItemCard({
  active,
  dateKey,
  item,
  apiBase,
  instantUpload,
  uploadingToSocial,
  removeItem,
  updateItem,
}: {
  active: Platform
  dateKey: string
  item: { time: string; title: string; description?: string; path?: string }
  apiBase: string
  instantUpload: (it: { time: string; title: string; description?: string; path?: string }) => Promise<void>
  uploadingToSocial: string | null
  removeItem: (it: { time: string; title: string; description?: string; path?: string }) => void
  updateItem: (it: { time: string; title: string; description?: string; path?: string }, newDateKey: string, newTime: string) => void
}) {
  const [showPlayer, setShowPlayer] = useState(false)
  const [editing, setEditing] = useState(false)
  const [newDate, setNewDate] = useState(dateKey)
  const [newTime, setNewTime] = useState(item.time)
  const color = active === 'YouTube' ? '#FF0000' : active === 'LinkedIn' ? '#0A66C2' : active === 'Facebook' ? '#1877F2' : '#000000'
  const isVideo = Boolean(item.path && item.path.endsWith('.mp4'))
  const isImage = Boolean(item.path && !item.path.endsWith('.mp4'))
  const mediaUrl = item.path && apiBase ? `${apiBase.replace(/\/$/,'')}/video/media/${item.path.replace(/^storage\/?/,'')}` : ''
  return (
    <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-800 p-3 space-y-3">
      <div className="flex items-center justify-between">
        <div className="font-extrabold text-lg" style={{ color }}>{item.time}</div>
        <div className="flex items-center gap-2">
          {(item as any)._videoUrl && (
            <a href={(item as any)._videoUrl} target="_blank" rel="noreferrer" className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300 hover:bg-emerald-200">YouTube URL</a>
          )}
          {isVideo && <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300">Video</span>}
          {isImage && <span className="text-[10px] px-2 py-0.5 rounded-full bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300">Image</span>}
          {!item.path && <span className="text-[10px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-700 dark:bg-gray-900/40 dark:text-gray-300">Text</span>}
          {(active === 'LinkedIn' || active === 'Facebook' || active === 'YouTube') && (
            <button
              onClick={() => instantUpload(item)}
              disabled={uploadingToSocial === item.path}
              className="text-[10px] px-2 py-0.5 rounded-full bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300 hover:bg-green-200 disabled:opacity-50"
            >
              {uploadingToSocial === item.path ? '⏳ Uploading...' : '🚀 Post live now'}
            </button>
          )}
          <button
            title="Delete from schedule"
            onClick={() => removeItem(item)}
            className="text-[10px] px-2 py-0.5 rounded-full bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300 hover:bg-red-200"
          >
            🗑️ Delete
          </button>
          <button
            title="Edit date/time"
            onClick={() => setEditing(v=>!v)}
            className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-red-50 text-red-600 hover:bg-red-100 border border-red-200 dark:bg-red-900/20 dark:text-red-300 dark:border-red-900/40"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
              <line x1="16" y1="2" x2="16" y2="6"></line>
              <line x1="8" y1="2" x2="8" y2="6"></line>
              <line x1="3" y1="10" x2="21" y2="10"></line>
            </svg>
            Edit
          </button>
        </div>
      </div>
      {editing && (
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex items-center gap-2">
            <span className="text-[10px] text-red-600">Date</span>
            <input type="date" value={newDate} onChange={e=>setNewDate(e.target.value)} className="px-2 py-1 rounded border border-red-200 focus:border-red-400 focus:ring-1 focus:ring-red-400 bg-white dark:bg-gray-800 text-sm" />
          </div>
          <div className="inline-flex items-center gap-2">
            <span className="text-[10px] text-red-600">Time</span>
            <input type="time" value={newTime} onChange={e=>setNewTime(e.target.value)} className="px-2 py-1 rounded border border-red-200 focus:border-red-400 focus:ring-1 focus:ring-red-400 bg-white dark:bg-gray-800 text-sm" />
          </div>
          <button
            onClick={() => { setEditing(false); updateItem(item, newDate, newTime) }}
            className="px-3 py-1 rounded bg-red-600 hover:bg-red-500 text-white text-xs shadow-sm"
          >Save</button>
          <button onClick={() => { setEditing(false); setNewDate(dateKey); setNewTime(item.time) }} className="px-3 py-1 rounded bg-gray-100 dark:bg-gray-800 text-xs">Cancel</button>
        </div>
      )}
      <div className="font-medium">{item.title}</div>
      {item.description && <div className="text-sm text-gray-600 dark:text-gray-300 whitespace-pre-wrap">{item.description}</div>}
      {isVideo ? (
        <div className="w-full relative rounded-lg overflow-hidden">
          {!showPlayer && (
            <div className="relative group">
              <div className="w-full aspect-video bg-gray-100 dark:bg-gray-900 animate-pulse" />
              <video
                className="w-full aspect-video object-cover block opacity-0 group-[.loaded]:opacity-100 transition-opacity"
                preload="metadata"
                muted
                playsInline
                src={mediaUrl + '#t=0.1'}
                onLoadedData={(e)=>{
                  const parent = (e.currentTarget.parentElement as HTMLElement)
                  parent?.classList?.add('loaded')
                }}
              />
              <button
                onClick={() => setShowPlayer(true)}
                className="absolute inset-0 flex items-center justify-center"
                aria-label="Play preview"
              >
                <span className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-black/60 text-white shadow-lg ring-1 ring-white/20 group-hover:bg-black/70">
                  ▶
                </span>
              </button>
              <div className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/40 to-transparent" />
            </div>
          )}
          {showPlayer && (
            <video
              className="w-full rounded-lg"
              controls
              autoPlay
              playsInline
              preload="auto"
            >
              <source src={mediaUrl} type="video/mp4" />
              Your browser does not support the video tag.
            </video>
          )}
        </div>
      ) : isImage ? (
        <div className="relative">
          <div className="w-full aspect-video bg-gray-100 dark:bg-gray-900 animate-pulse" />
          <img loading="lazy" src={mediaUrl} alt="media" className="w-full rounded-lg absolute inset-0 h-full w-full object-cover" onLoad={(e)=>{ (e.currentTarget.previousElementSibling as HTMLElement)?.classList?.remove('animate-pulse') }} />
        </div>
      ) : null}
    </div>
  )
}
