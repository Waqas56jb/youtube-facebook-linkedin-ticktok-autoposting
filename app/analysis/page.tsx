"use client";
import Shell from '../../components/Shell'
import { useRouter } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'

export default function Page() {
  const router = useRouter()
  const [showFb, setShowFb] = useState(false)
  const [fbVersion, setFbVersion] = useState('v23.0')
  const [fbAccessToken, setFbAccessToken] = useState('')
  const [fbAppId, setFbAppId] = useState('')
  const [fbAppSecret, setFbAppSecret] = useState('')
  const [fbPageId, setFbPageId] = useState('')
  const [fbLocked, setFbLocked] = useState(false)
  const [editVersion, setEditVersion] = useState(false)
  const [editToken, setEditToken] = useState(false)
  const [editAppId, setEditAppId] = useState(false)
  const [editAppSecret, setEditAppSecret] = useState(false)
  const [editPageId, setEditPageId] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isSavingEdit, setIsSavingEdit] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const [ldVer, setLdVer] = useState(false)
  const [ldTok, setLdTok] = useState(false)
  const [ldAid, setLdAid] = useState(false)
  const [ldSec, setLdSec] = useState(false)
  const [ldPid, setLdPid] = useState(false)
  const [fbFetchingPid, setFbFetchingPid] = useState(false)
  const fetchPageIdFast = async (token: string): Promise<any> => {
    try {
      const { API_BASE } = await import('../../lib/api')
      const backendUrl = `${API_BASE}/video/facebook/pages?access_token=${encodeURIComponent(token)}`
      const directUrl = `https://graph.facebook.com/v17.0/me/accounts?access_token=${encodeURIComponent(token)}`
      const mkReq = (url: string, timeoutMs = 5000) => {
        const controller = new AbortController()
        const t = window.setTimeout(()=> controller.abort(), timeoutMs)
        return fetch(url, { signal: controller.signal })
          .then(async r => { window.clearTimeout(t); const j = await r.json(); return j })
          .catch(e => { window.clearTimeout(t); throw e })
      }
      // Race backend and direct Graph; whichever returns first wins
      const winner = await Promise.any([
        mkReq(backendUrl, 5000),
        mkReq(directUrl, 5000)
      ])
      return winner
    } catch (e) {
      // Fallback single try (backend)
      try {
        const { API_BASE } = await import('../../lib/api')
        const url = `${API_BASE}/video/facebook/pages?access_token=${encodeURIComponent(token)}`
        const r = await fetch(url)
        return await r.json()
      } catch (e2) {
        throw e2
      }
    }
  }
  const [activePlatform, setActivePlatform] = useState<string | null>(null)
  const fbConfigured = useMemo(() => {
    return Boolean(fbAccessToken && fbAppId && fbAppSecret && fbPageId)
  }, [fbAccessToken, fbAppId, fbAppSecret, fbPageId])
  const [showYt, setShowYt] = useState(false)
  const [ytFileName, setYtFileName] = useState('')
  const [ytJson, setYtJson] = useState<string>('')
  const [ytBusy, setYtBusy] = useState(false)
  const [ytVerifying, setYtVerifying] = useState(false)
  const ytConfigured = useMemo(() => {
    try {
      if (ytJson) return true
      const raw = localStorage.getItem('youtube_client_secrets')
      return Boolean(raw)
    } catch { return false }
  }, [ytJson])

  // LinkedIn state
  const [showLi, setShowLi] = useState(false)
  const [liAccessToken, setLiAccessToken] = useState('')
  const [liMemberId, setLiMemberId] = useState('')
  const [liFirstTimeHint, setLiFirstTimeHint] = useState(false)
  const [liLocked, setLiLocked] = useState(false)
  const [liEditToken, setLiEditToken] = useState(false)
  const [liEditMember, setLiEditMember] = useState(false)
  const [liIsSaving, setLiIsSaving] = useState(false)
  const [liIsSavingEdit, setLiIsSavingEdit] = useState(false)
  const [ldLiTok, setLdLiTok] = useState(false)
  const [ldLiMem, setLdLiMem] = useState(false)
  const liConfigured = useMemo(() => {
    return Boolean(liAccessToken && liMemberId)
  }, [liAccessToken, liMemberId])

  // Load saved config once
  useEffect(() => {
    try {
      const raw = localStorage.getItem('facebook_config')
      if (raw) {
        const parsed = JSON.parse(raw)
        setFbVersion(parsed.version || 'v23.0')
        setFbAccessToken(parsed.access_token || '')
        setFbAppId(parsed.app_id || '')
        setFbAppSecret(parsed.app_secret || '')
        setFbPageId(parsed.page_id || '')
        // Lock if explicitly configured OR if all fields are present
        const hasAll = Boolean((parsed.access_token||'') && (parsed.app_id||'') && (parsed.app_secret||'') && (parsed.page_id||''))
        setFbLocked(Boolean(parsed.configured) || hasAll)
      }
      const yt = localStorage.getItem('youtube_client_secrets')
      if (yt) {
        setYtJson(yt)
      }
      const li = localStorage.getItem('linkedin_config')
      if (li) {
        const parsedLi = JSON.parse(li)
        setLiAccessToken(parsedLi.access_token || '')
        setLiMemberId(parsedLi.member_id || '')
        const hasAllLi = Boolean((parsedLi.access_token||'') && (parsedLi.member_id||''))
        setLiLocked(Boolean(parsedLi.configured) || hasAllLi)
      } else {
        setLiFirstTimeHint(true)
      }
    } catch {}
  }, [])

  // Removed auto-fetch; now only fetches on explicit button click to avoid unexpected loader

  const saveFacebook = () => {
    if (isSaving) return
    setIsSaving(true)
    const payload = {
      version: fbVersion,
      access_token: fbAccessToken,
      app_id: fbAppId,
      app_secret: fbAppSecret,
      page_id: fbPageId,
      configured: true,
      savedAt: Date.now(),
    }
    setTimeout(() => {
      localStorage.setItem('facebook_config', JSON.stringify(payload))
      setFbLocked(true)
      setShowFb(false)
      setIsSaving(false)
      setToast('Facebook configured successfully')
      setTimeout(()=>setToast(null), 2000)
    }, 600)
  }

  const saveEdits = () => {
    if (isSavingEdit) return
    setIsSavingEdit(true)
    const payload = {
      version: fbVersion,
      access_token: fbAccessToken,
      app_id: fbAppId,
      app_secret: fbAppSecret,
      page_id: fbPageId,
      configured: true,
      savedAt: Date.now(),
    }
    setTimeout(() => {
      localStorage.setItem('facebook_config', JSON.stringify(payload))
      setEditVersion(false)
      setEditToken(false)
      setEditAppId(false)
      setEditAppSecret(false)
      setEditPageId(false)
      setIsSavingEdit(false)
      setToast('Facebook settings updated')
      setTimeout(()=>setToast(null), 2000)
    }, 600)
  }

  const platformCards = [
    {
      n:'TikTok', 
      i:'https://cdn.jsdelivr.net/gh/simple-icons/simple-icons/icons/tiktok.svg', 
      c:'#000000', 
      gradient: 'from-gray-900 to-black',
      sub:'Short‑form video',
      stats: '15.3M views'
    },
    {
      n:'YouTube', 
      i:'https://cdn.jsdelivr.net/gh/simple-icons/simple-icons/icons/youtube.svg', 
      c:'#FF0000', 
      gradient: 'from-red-600 to-red-800',
      sub:'Channel & Shorts',
      onClick: () => setShowYt(true),
      badge: ytConfigured ? 'Configured' : 'Not configured',
      stats: 'OAuth client'
    },
    {
      n:'Facebook', 
      i:'https://cdn.jsdelivr.net/gh/simple-icons/simple-icons/icons/facebook.svg', 
      c:'#1877F2', 
      gradient: 'from-blue-600 to-blue-800',
      sub:'Pages & Reels', 
      onClick: () => setShowFb(true), 
      badge: fbConfigured ? 'Configured' : 'Not configured',
      stats: '45.2K followers'
    },
    {
      n:'LinkedIn', 
      i:'https://cdn.jsdelivr.net/gh/simple-icons/simple-icons/icons/linkedin.svg', 
      c:'#0A66C2', 
      gradient: 'from-blue-700 to-blue-900',
      sub:'Company page',
      onClick: () => setShowLi(true),
      badge: liConfigured ? 'Configured' : 'Not configured',
      stats: '8.1K connections'
    },
  ]

  return (
    <Shell title="Settings" panel={false}>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-gray-100 dark:from-gray-900 dark:to-slate-900 p-6">
        <div className="max-w-7xl mx-auto space-y-8">
          {/* Header Section (no nav buttons) */}
          <div className="flex flex-col gap-3">
            <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-800 to-gray-600 dark:from-white dark:to-gray-300 bg-clip-text text-transparent">
              Platform Settings
            </h1>
            <p className="text-gray-600 dark:text-gray-400 text-lg max-w-2xl">
              Manage your social media integrations, configure API settings, and monitor platform connections in one place.
            </p>
          </div>

          {/* Platform Cards Grid - 2 large cards per row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {platformCards.map((platform, index) => (
              <div
                key={platform.n}
                onClick={platform.onClick as any}
                onMouseEnter={() => setActivePlatform(platform.n)}
                onMouseLeave={() => setActivePlatform(null)}
                className="group relative bg-white dark:bg-gray-800 rounded-3xl p-8 cursor-pointer shadow-md hover:shadow-2xl transition-all duration-500 border border-gray-100 dark:border-gray-700 hover:-translate-y-2 min-h-[220px]"
                style={{
                  animationDelay: `${index * 100}ms`,
                  animation: 'fadeInUp 0.6s ease-out forwards'
                }}
              >
                {/* Background Gradient Effect */}
                <div className={`absolute inset-0 bg-gradient-to-br ${platform.gradient} opacity-0 group-hover:opacity-5 rounded-2xl transition-opacity duration-500`} />
                
                {/* Animated Border */}
                <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-transparent via-gray-200 dark:via-gray-600 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                
                <div className="relative z-10">
                  {/* Platform Header */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-4">
                      <div 
                        className="relative p-3 rounded-xl shadow-lg transition-transform duration-300 group-hover:scale-110"
                        style={{ backgroundColor: platform.c }}
                      >
                        <img 
                          src={platform.i} 
                          alt={platform.n} 
                          className="w-6 h-6 filter invert"
                        />
                        {/* Pulse Animation */}
                        <div 
                          className="absolute inset-0 rounded-xl animate-ping opacity-20"
                          style={{ backgroundColor: platform.c }}
                        />
                      </div>
                      <div>
                        <h3 className="font-bold text-gray-900 dark:text-white text-lg">
                          {platform.n}
                        </h3>
                        <p className="text-gray-500 dark:text-gray-400 text-sm">
                          {platform.sub}
                        </p>
            </div>
        </div>

                    {/* Status Badge */}
                    {platform.badge && (
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium transition-all duration-300 ${
                        fbLocked 
                          ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' 
                          : 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300'
                      }`}>
                        {fbLocked ? '✓' : '!'} {platform.badge}
                      </span>
                    )}
                  </div>

                  {/* Stats */}
                  <div className="mb-4">
                    <p className="text-sm text-gray-600 dark:text-gray-400 font-medium">
                      {platform.stats}
                    </p>
                  </div>

                  {/* Progress Bar */}
                  <div className="relative h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden mb-4">
                    <div 
                      className="h-full rounded-full transition-all duration-1000 ease-out"
                      style={{
                        width: '75%',
                        background: `linear-gradient(90deg, ${platform.c}, ${platform.c}dd)`
                      }}
                    />
                    {/* Shimmer Effect */}
                    <div 
                      className="absolute top-0 h-full w-20 bg-gradient-to-r from-transparent via-white/30 to-transparent -skew-x-12 animate-shimmer"
                    />
                  </div>

                  {/* Action Button */}
              <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">
                      {platform.badge ? platform.badge : 'Ready to connect'}
                    </span>
                    <button className="group/btn relative overflow-hidden px-4 py-2 text-xs font-medium text-gray-700 dark:text-gray-200 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-all duration-300">
                      <span className="relative z-10">Configure</span>
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/50 to-transparent -translate-x-full group-hover/btn:translate-x-full transition-transform duration-500" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Enhanced Facebook Config Modal */}
          {showFb && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
              <div 
                className="relative w-full max-w-2xl bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden animate-modal-in"
              >
                {/* Modal Header */}
                <div className="relative p-6 border-b border-gray-100 dark:border-gray-700">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-blue-500">
                        <img 
                          src="https://cdn.jsdelivr.net/gh/simple-icons/simple-icons/icons/facebook.svg" 
                          alt="Facebook" 
                          className="w-5 h-5 filter invert"
                        />
                </div>
                <div>
                        <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                          Facebook Integration
                        </h3>
                        <p className="text-gray-600 dark:text-gray-400 text-sm">
                          Configure your Facebook API credentials
                        </p>
                      </div>
                    </div>
                    <button 
                      onClick={() => setShowFb(false)}
                      className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors duration-200"
                    >
                      <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                </div>

                {/* Modal Content */}
                <div className="p-6 space-y-6 max-h-[60vh] overflow-y-auto">
                  {/* Version Selector */}
                  <div className="space-y-3">
                    <label className="flex items-center justify-between text-sm font-medium text-gray-700 dark:text-gray-300">
                      API Version
                      {fbLocked && (
                        <button
                          onClick={() => {
                            if (ldVer) return; 
                            setLdVer(true); 
                            setTimeout(() => { 
                              setEditVersion(v => !v); 
                              setLdVer(false); 
                              setToast('Editing enabled: Version'); 
                              setTimeout(() => setToast(null), 1500); 
                            }, 350);
                          }}
                          className="flex items-center gap-1 px-2 py-1 text-xs bg-gray-100 dark:bg-gray-700 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                        >
                          {ldVer ? (
                            <div className="w-3 h-3 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                          ) : (
                            <>
                              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                              </svg>
                              Edit
                            </>
                          )}
                        </button>
                      )}
                    </label>
                    <select 
                      disabled={fbLocked && !editVersion}
                      value={fbVersion}
                      onChange={e => setFbVersion(e.target.value)}
                      className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                    >
                      {['v22.0', 'v23.0', 'v24.0'].map(v => (
                        <option key={v} value={v}>{v}</option>
                      ))}
                    </select>
                </div>

                  {/* Credentials Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {[
                      {
                        label: 'App ID',
                        value: fbAppId,
                        setValue: setFbAppId,
                        edit: editAppId,
                        setEdit: setEditAppId,
                        loading: ldAid,
                        setLoading: setLdAid,
                        placeholder: '1123...'
                      },
                      {
                        label: 'App Secret',
                        value: fbAppSecret,
                        setValue: setFbAppSecret,
                        edit: editAppSecret,
                        setEdit: setEditAppSecret,
                        loading: ldSec,
                        setLoading: setLdSec,
                        placeholder: '7e28...'
                      }
                    ].map((field, index) => (
                      <div key={field.label} className="space-y-3">
                        <label className="flex items-center justify-between text-sm font-medium text-gray-700 dark:text-gray-300">
                          {field.label}
                          {fbLocked && (
                            <button
                              onClick={() => {
                                if (field.loading) return;
                                field.setLoading(true);
                                setTimeout(() => {
                                  field.setEdit(v => !v);
                                  field.setLoading(false);
                                  setToast(`Editing enabled: ${field.label}`);
                                  setTimeout(() => setToast(null), 1500);
                                }, 350);
                              }}
                              className="flex items-center gap-1 px-2 py-1 text-xs bg-gray-100 dark:bg-gray-700 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                            >
                              {field.loading ? (
                                <div className="w-3 h-3 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                              ) : (
                                <>
                                  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                    <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                                  </svg>
                                  Edit
                                </>
                              )}
                            </button>
                          )}
                        </label>
                        <input
                          disabled={fbLocked && !field.edit}
                          value={field.value}
                          onChange={e => field.setValue(e.target.value)}
                          placeholder={field.placeholder}
                          className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                        />
              </div>
                    ))}
              </div>

                  {/* Additional Fields */}
                  {[
                    {
                      label: 'Access Token',
                      value: fbAccessToken,
                      setValue: setFbAccessToken,
                      edit: editToken,
                      setEdit: setEditToken,
                      loading: ldTok,
                      setLoading: setLdTok,
                      placeholder: 'EAAP...'
                    },
                    {
                      label: 'Page ID',
                      value: fbPageId,
                      setValue: setFbPageId,
                      edit: editPageId,
                      setEdit: setEditPageId,
                      loading: ldPid,
                      setLoading: setLdPid,
                      placeholder: '815252735003625'
                    }
                  ].map(field => (
                    <div key={field.label} className="space-y-3">
                      <label className="flex items-center justify-between text-sm font-medium text-gray-700 dark:text-gray-300">
                        {field.label}
                        {fbLocked && (
                          <button
                            onClick={() => {
                              if (field.loading) return;
                              field.setLoading(true);
                              setTimeout(() => {
                                field.setEdit(v => !v);
                                field.setLoading(false);
                                setToast(`Editing enabled: ${field.label}`);
                                setTimeout(() => setToast(null), 1500);
                              }, 350);
                            }}
                            className="flex items-center gap-1 px-2 py-1 text-xs bg-gray-100 dark:bg-gray-700 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                          >
                            {field.loading ? (
                              <div className="w-3 h-3 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                            ) : (
                              <>
                                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                  <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                                </svg>
                                Edit
                              </>
                            )}
                          </button>
                        )}
                      </label>
                      <input
                        disabled={fbLocked && !field.edit}
                        value={field.value}
                        onChange={e => field.setValue(e.target.value)}
                        placeholder={field.placeholder}
                        className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                      />
                      {/* Removed access token generator per request; manual paste only */}
                      {field.label === 'Page ID' && (
                        <div className="flex items-center gap-3">
                          <button
                            onClick={async ()=>{
                              try {
                                setFbFetchingPid(true)
                                const json = await fetchPageIdFast(fbAccessToken)
                                const pages = Array.isArray(json?.data) ? json.data : []
                                if (!pages.length) {
                                  setToast('No pages found for this token')
                                  setTimeout(()=>setToast(null), 1800)
                                  return
                                }
                                const preferred = pages.find((p:any)=>Array.isArray(p?.tasks)&&p.tasks.includes('CREATE_CONTENT')) || pages[0]
                                const resolvedId = String(preferred?.id || '')
                                const resolvedPageToken = String(preferred?.access_token || '')
                                if (resolvedId) {
                                  setFbPageId(resolvedId)
                                  const payload = { version: fbVersion||'v23.0', access_token: fbAccessToken, app_id: fbAppId, app_secret: fbAppSecret, page_id: resolvedId, page_token: resolvedPageToken, configured: true, savedAt: Date.now() }
                                  try { localStorage.setItem('facebook_config', JSON.stringify(payload)) } catch {}
                                  setFbLocked(true)
                                  setToast('Page ID fetched')
                                  setTimeout(()=>setToast(null), 1500)
                                }
                              } catch (e) {
                                setToast('Failed to fetch Page ID')
                                setTimeout(()=>setToast(null), 1800)
                              } finally {
                                setFbFetchingPid(false)
                              }
                            }}
                            disabled={!fbAccessToken || fbFetchingPid}
                            className="relative px-4 py-2 text-sm font-medium text-white rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {fbFetchingPid && (<span className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 border-2 border-white/50 border-t-white rounded-full animate-spin" />)}
                            <span className={fbFetchingPid? 'pl-4':''}>Fetch Page ID</span>
                          </button>
                          <span className="text-xs text-gray-500">Uses Graph API /me/accounts • Or paste Page ID manually</span>
                        </div>
                      )}
            </div>
          ))}
        </div>

                {/* Modal Footer */}
                <div className="p-6 border-t border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50">
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {fbLocked 
                        ? 'Fields are locked. Click edit icons to modify.'
                        : 'All fields are required for configuration.'
                      }
                    </p>
                    <div className="flex gap-3">
                      <button
                        onClick={() => setShowFb(false)}
                        className="px-6 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-600 border border-gray-300 dark:border-gray-500 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-500 transition-colors duration-200"
                      >
                        Cancel
                      </button>
                      {fbLocked ? (
                        <button
                          onClick={saveEdits}
                          disabled={isSavingEdit}
                          className="relative px-6 py-2 text-sm font-medium text-white bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl hover:from-blue-700 hover:to-purple-700 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {isSavingEdit && (
                            <div className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          )}
                          <span className={isSavingEdit ? 'pl-4' : ''}>
                            Save Changes
                          </span>
                        </button>
                      ) : (
                        <button
                          onClick={saveFacebook}
                          disabled={isSaving || !fbAccessToken || !fbAppId || !fbAppSecret || !fbPageId}
                          className="relative px-6 py-2 text-sm font-medium text-white bg-gradient-to-r from-green-600 to-blue-600 rounded-xl hover:from-green-700 hover:to-blue-700 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {isSaving && (
                            <div className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          )}
                          <span className={isSaving ? 'pl-4' : ''}>
                            Save & Configure
                          </span>
                        </button>
                      )}
            </div>
                  </div>
            </div>
              </div>
            </div>
          )}

          {/* YouTube Client Secrets Modal */}
          {showYt && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
              <div className="relative w-full max-w-xl bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden animate-modal-in">
                <div className="p-6 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-red-500">
                      <img src="https://cdn.jsdelivr.net/gh/simple-icons/simple-icons/icons/youtube.svg" alt="YouTube" className="w-5 h-5 filter invert" />
            </div>
                    <div>
                      <h3 className="text-xl font-bold text-gray-900 dark:text-white">YouTube Client Secrets</h3>
                      <p className="text-gray-600 dark:text-gray-400 text-sm">Upload your Google OAuth client_secrets.json</p>
          </div>
        </div>
                  <button onClick={()=>setShowYt(false)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"><svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>
            </div>
                <div className="p-6 space-y-4">
                  <div className="rounded-xl border border-dashed border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700/40 p-6 text-center">
                    <input id="yt-json" type="file" accept="application/json,.json" className="hidden" onChange={(e)=>{
                      const file = e.target.files?.[0]
                      if (!file) return
                      setYtFileName(file.name)
                      const reader = new FileReader()
                      reader.onload = () => {
                        try {
                          const text = String(reader.result || '')
                          JSON.parse(text)
                          localStorage.setItem('youtube_client_secrets', text)
                          setYtJson(text)
                          setToast('YouTube client_secrets saved')
                          setTimeout(()=>setToast(null), 1500)
                        } catch {
                          setToast('Invalid JSON file')
                          setTimeout(()=>setToast(null), 1500)
                        }
                      }
                      reader.readAsText(file)
                    }} />
                    <label htmlFor="yt-json" className="inline-flex items-center gap-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 px-4 py-2 text-sm cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-600">Choose JSON</label>
                    <div className="mt-2 text-xs text-gray-600 dark:text-gray-400">{ytFileName || 'No file selected'}</div>
              </div>
                  {ytConfigured && (
                    <div className="text-xs text-green-700 bg-green-50 border border-green-200 rounded-md px-3 py-2">Configured • Stored locally and persists after refresh</div>
                  )}
            </div>
                <div className="p-4 border-t border-gray-100 dark:border-gray-700 flex items-center justify-end">
                  <button
                    onClick={async ()=>{
                      try {
                        setYtBusy(true)
                        if (ytJson) {
                          const { API_BASE } = await import('../../lib/api')
                          const form = new FormData()
                          const blob = new Blob([ytJson], { type: 'application/json' })
                          form.append('file', blob, ytFileName || 'client_secrets.json')
                          await fetch(`${API_BASE}/video/youtube/client-secrets`, { method: 'POST', body: form })
                          setYtVerifying(true)
                          // Begin auth - open consent in new tab and also trigger backend
                          try { window.open(`${API_BASE}/video/youtube/begin-auth`, '_blank') } catch {}
                          await fetch(`${API_BASE}/video/youtube/begin-auth`)
                          const start = Date.now()
                          let ok = false
                          while (Date.now() - start < 120000) {
                            const r = await fetch(`${API_BASE}/video/youtube/auth-status`)
                            const js = await r.json()
                            if (js && js.authenticated) { ok = true; break }
                            await new Promise(res => setTimeout(res, 2000))
                          }
                          if (ok) {
                            localStorage.setItem('youtube_auth_done', '1')
                            setToast('YouTube verified and token saved')
                            setTimeout(()=>setToast(null), 2000)
                            setShowYt(false)
                          } else {
                            setToast('Verification timed out. Complete the consent window, then try again.')
                            setTimeout(()=>setToast(null), 3000)
                          }
                        } else {
                          setShowYt(false)
                        }
                      } catch (e) {
                        setToast('Failed to configure YouTube')
                        setTimeout(()=>setToast(null), 2500)
                      } finally {
                        setYtVerifying(false)
                        setYtBusy(false)
                      }
                    }}
                    disabled={ytBusy || !ytJson}
                    className={`relative rounded-lg px-4 py-2 text-sm ${ytJson ? 'bg-red-600 text-white hover:bg-red-500' : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 border border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600'} disabled:opacity-50 disabled:cursor-not-allowed`}
                  >
                    {ytBusy && <span className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />}
                    <span className={ytBusy? 'pl-4' : ''}>{ytJson ? (ytVerifying ? 'Verifying…' : 'Done & Verify') : 'Done'}</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* LinkedIn Credentials Modal */}
          {showLi && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
              <div className="relative w-full max-w-2xl bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden animate-modal-in">
                <div className="relative p-6 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-sky-600">
                      <img src="https://cdn.jsdelivr.net/gh/simple-icons/simple-icons/icons/linkedin.svg" alt="LinkedIn" className="w-5 h-5 filter invert" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-gray-900 dark:text-white">LinkedIn Integration</h3>
                      <p className="text-gray-600 dark:text-gray-400 text-sm">Enter your LinkedIn API credentials</p>
                    </div>
                  </div>
                  <button onClick={()=>setShowLi(false)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors">
                    <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                  </button>
                </div>
                <div className="p-6 space-y-6 max-h-[60vh] overflow-y-auto">
                  {/* Access Token */}
                  <div className="space-y-3">
                    <label className="flex items-center justify-between text-sm font-medium text-gray-700 dark:text-gray-300">
                      Access Token
                      {liLocked && (
                        <button
                          onClick={() => {
                            if (ldLiTok) return;
                            setLdLiTok(true);
                            setTimeout(() => {
                              setLiEditToken(v => !v);
                              setLdLiTok(false);
                              setToast('Editing enabled: Access Token');
                              setTimeout(() => setToast(null), 1500);
                            }, 350);
                          }}
                          className="flex items-center gap-1 px-2 py-1 text-xs bg-gray-100 dark:bg-gray-700 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                        >
                          {ldLiTok ? (
                            <div className="w-3 h-3 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                          ) : (
                            <>
                              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" /></svg>
                              Edit
                            </>
                          )}
                        </button>
                      )}
                    </label>
                    <input
                      disabled={liLocked && !liEditToken}
                      value={liAccessToken}
                      onChange={e => setLiAccessToken(e.target.value)}
                      placeholder="AQX... (Bearer token)"
                      className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                    />
                  </div>
                  {/* Generate Member ID */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Member ID</span>
                      {liMemberId && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300">Resolved</span>
                      )}
                    </div>
                    <div className="flex gap-3 items-center">
                      <input
                        disabled
                        value={liMemberId || ''}
                        placeholder="Not generated yet"
                        className={`w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 border border-dashed ${liMemberId? 'border-gray-200 dark:border-gray-600' : 'border-amber-300 dark:border-amber-500'} rounded-xl`}
                      />
                      <button
                        onClick={async ()=>{
                          try {
                            const { apiService } = await import('../../lib/api')
                            const res = await apiService.resolveLinkedInMemberId(liAccessToken)
                            setLiMemberId(res.member_id)
                            const payload = { access_token: liAccessToken, member_id: res.member_id, configured: true, savedAt: Date.now() }
                            localStorage.setItem('linkedin_config', JSON.stringify(payload))
                            setLiLocked(true)
                            setToast('Member ID generated and saved')
                            setTimeout(()=>setToast(null), 2000)
                            setLiFirstTimeHint(false)
                          } catch (e) {
                            setToast('Failed to generate Member ID')
                            setTimeout(()=>setToast(null), 2000)
                          }
                        }}
                        disabled={!liAccessToken}
                        className={`relative px-4 py-2 text-sm font-medium text-white rounded-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed ${liFirstTimeHint && !liMemberId ? 'animate-pulse bg-indigo-600 hover:bg-indigo-700' : 'bg-indigo-600 hover:bg-indigo-700'}`}
                      >
                        Generate Member ID
                      </button>
                    </div>
                    {liFirstTimeHint && !liMemberId && (
                      <div className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-md px-3 py-2">First time setup: enter your access token, then click Generate Member ID.</div>
                    )}
                  </div>
                </div>
                <div className="p-6 border-t border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50">
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-gray-500 dark:text-gray-400">{liLocked ? 'Fields are locked. Use Edit to modify.' : 'Provide Access Token and generate Member ID.'}</p>
                    <div className="flex gap-3">
                      <button onClick={()=>setShowLi(false)} className="px-6 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-600 border border-gray-300 dark:border-gray-500 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-500 transition-colors duration-200">Cancel</button>
                      {liLocked ? (
                        <button
                          onClick={() => {
                            if (liIsSavingEdit) return
                            setLiIsSavingEdit(true)
                            const payload = { access_token: liAccessToken, member_id: liMemberId, configured: true, savedAt: Date.now() }
                            setTimeout(() => {
                              localStorage.setItem('linkedin_config', JSON.stringify(payload))
                              setLiIsSavingEdit(false)
                              setToast('LinkedIn settings updated')
                              setTimeout(()=>setToast(null), 2000)
                            }, 600)
                          }}
                          disabled={liIsSavingEdit}
                          className="relative px-6 py-2 text-sm font-medium text-white bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl hover:from-blue-700 hover:to-purple-700 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {liIsSavingEdit && (<div className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />)}
                          <span className={liIsSavingEdit ? 'pl-4' : ''}>Save Changes</span>
                        </button>
                      ) : (
                        <button
                          onClick={() => {
                            if (liIsSaving) return
                            setLiIsSaving(true)
                            const payload = { access_token: liAccessToken, member_id: liMemberId, configured: true, savedAt: Date.now() }
                            setTimeout(() => {
                              localStorage.setItem('linkedin_config', JSON.stringify(payload))
                              setLiLocked(true)
                              setShowLi(false)
                              setLiIsSaving(false)
                              setToast('LinkedIn configured successfully')
                              setTimeout(()=>setToast(null), 2000)
                            }, 600)
                          }}
                          disabled={liIsSaving || !liAccessToken || !liMemberId}
                          className="relative px-6 py-2 text-sm font-medium text-white bg-gradient-to-r from-green-600 to-blue-600 rounded-xl hover:from-green-700 hover:to-blue-700 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {liIsSaving && (<div className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />)}
                          <span className={liIsSaving ? 'pl-4' : ''}>Save & Configure</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Enhanced Toast Notification */}
          {toast && (
            <div className="fixed bottom-6 right-6 z-50 animate-toast-in">
              <div className="bg-gray-900 dark:bg-white text-white dark:text-gray-900 px-6 py-3 rounded-xl shadow-2xl border border-gray-700 dark:border-gray-300 backdrop-blur-sm">
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                  <span className="text-sm font-medium">{toast}</span>
          </div>
        </div>
          </div>
          )}

          {/* No additional sections below */}
        </div>
      </div>

      {(ytBusy || ytVerifying) && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 px-8 py-6 text-center shadow-2xl">
            <div className="mx-auto mb-4 w-10 h-10 border-4 border-red-500 border-t-transparent rounded-full animate-spin" />
            <div className="font-semibold">Connecting to YouTube…</div>
            <div className="mt-1 text-xs text-gray-600 dark:text-gray-400">A Google consent window has opened in a new tab. Complete it once.</div>
          </div>
        </div>
      )}

      <style jsx global>{`
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes modal-in {
          from {
            opacity: 0;
            transform: scale(0.9) translateY(20px);
          }
          to {
            opacity: 1;
            transform: scale(1) translateY(0);
          }
        }

        @keyframes toast-in {
          from {
            opacity: 0;
            transform: translateX(100%);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }

        @keyframes shimmer {
          0% {
            transform: translateX(-100%) skewX(-12deg);
          }
          100% {
            transform: translateX(200%) skewX(-12deg);
          }
        }

        .animate-modal-in {
          animation: modal-in 0.3s ease-out;
        }

        .animate-toast-in {
          animation: toast-in 0.3s ease-out;
        }

        .animate-shimmer {
          animation: shimmer 2s infinite;
        }
      `}</style>
    </Shell>
  )
}