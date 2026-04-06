'use client'

import { useState, useEffect, useMemo } from 'react'
import { Eye, EyeOff, Loader2, ChevronLeft, ChevronRight, Phone, Users } from 'lucide-react'
import { createClient } from '@supabase/supabase-js'
import { fmtBRL } from '@/lib/types'

function getSupabase() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL || '', process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '')
}

// ─── THEMES ────────────────────────────────────
const LT = {
  bg:'#faf8f5',card:'#f3efe8',border:'#c9b99a',borderInner:'#ddd4c4',
  text:'#2e221c',muted:'#5e5040',
  gold:'#b08a40',goldLight:'#c9a96e',
  inputBg:'#f3efe8',inputBorder:'#ddd4c4',
  red:'#dc2626',elevated:'#ebe5d8',
}
const DK = {
  bg:'#1a1a22',card:'#222230',border:'#444455',borderInner:'#333340',
  text:'#e8e6e0',muted:'#a09a90',
  gold:'#c9a96e',goldLight:'#dbc192',
  inputBg:'#222230',inputBorder:'#333340',
  red:'#ef4444',elevated:'#2a2a38',
}
type T = typeof LT

const BUZIOS_APTS = ['BZ01', 'BZ02'] as const
const APT_META: Record<string, { label: string; owner: string; icon: string; accent: string; accentLight: string }> = {
  BZ01: { label: 'Casa 01', owner: 'Gilberto', icon: '\u{1F3E0}', accent: '#c9a96e', accentLight: '#dbc192' },
  BZ02: { label: 'Casa 02', owner: 'Meri', icon: '\u{1F3E1}', accent: '#7cb3a3', accentLight: '#9fd4c4' },
}
const MONTHS = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro']
const WEEKDAYS = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb']

interface AppUser { id:string; username:string; display_name:string; role:string }
interface Res { id:number; apartment_code:string; guest_name:string; checkin:string; checkout:string; source:string; total_value:number; guests?:number; guest_phone?:string }

function fmtDateBR(iso:string){if(!iso)return{day:'—',wd:''};const[y,m,d]=iso.split('-').map(Number);return{day:`${String(d).padStart(2,'0')} ${(MONTHS[m-1]||'').slice(0,3)}`,wd:WEEKDAYS[new Date(y,m-1,d).getDay()]}}
function initials(n:string){if(!n||n==='—')return'?';return n.trim().split(/\s+/).slice(0,2).map(w=>w[0]).join('').toUpperCase()}
function isCurrent(ci:string,co:string){const t=new Date().toLocaleDateString('sv-SE');return ci<=t&&co>t}

// ─── LOGIN ─────────────────────────────────────
function Login({onLogin,t}:{onLogin:(u:string,p:string)=>void;t:T}){
  const [u,setU]=useState('');const [p,setP]=useState('');const [show,setShow]=useState(false);const [er,setEr]=useState('');const [ld,setLd]=useState(false)
  const go=async()=>{
    if(!u||!p){setEr('Preencha usuário e senha');return}
    setLd(true);setEr('')
    try{const r=await fetch('/api/limpezas',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'login',username:u,password:p,context:'buzios'})})
      const d=await r.json();if(!r.ok||d.error){setEr(d.error||'Credenciais inválidas');setLd(false);return}
      localStorage.setItem('buzios_auth',btoa(`${u}:${p}`));localStorage.setItem('buzios_user',JSON.stringify(d));onLogin(u,p)
    }catch{setEr('Erro de conexão')};setLd(false)}
  return(
    <div style={{minHeight:'100vh',background:t.bg,display:'flex',alignItems:'center',justifyContent:'center',padding:24}}>
      <div style={{width:'100%',maxWidth:320,textAlign:'center'}}>
        <img src="/images/logo.png" alt="Agenda Búzios" style={{width:56,height:56,borderRadius:16,margin:'0 auto 16px'}} />
        <h1 style={{fontSize:18,fontWeight:700,color:t.text,marginBottom:4}}>Agenda Búzios</h1>
        <p style={{fontSize:12,color:t.muted,marginBottom:24}}>Faça login para acessar</p>
        <div style={{display:'flex',flexDirection:'column',gap:12}}>
          <input type="text" placeholder="Usuário" value={u} onChange={e=>{setU(e.target.value);setEr('')}} onKeyDown={e=>e.key==='Enter'&&go()}
            style={{width:'100%',padding:'12px 16px',borderRadius:10,fontSize:14,background:t.inputBg,border:`1.5px solid ${t.inputBorder}`,color:t.text,outline:'none',boxSizing:'border-box'}}/>
          <div style={{position:'relative'}}>
            <input type={show?'text':'password'} placeholder="Senha" value={p} onChange={e=>{setP(e.target.value);setEr('')}} onKeyDown={e=>e.key==='Enter'&&go()}
              style={{width:'100%',padding:'12px 44px 12px 16px',borderRadius:10,fontSize:14,background:t.inputBg,border:`1.5px solid ${t.inputBorder}`,color:t.text,outline:'none',boxSizing:'border-box'}}/>
            <button onClick={()=>setShow(!show)} style={{position:'absolute',right:12,top:'50%',transform:'translateY(-50%)',background:'none',border:'none',cursor:'pointer',padding:0}}>
              {show?<EyeOff size={16} style={{color:t.muted}}/>:<Eye size={16} style={{color:t.muted}}/>}
            </button>
          </div>
          {er&&<p style={{color:t.red,fontSize:12,margin:0}}>{er}</p>}
          <button onClick={go} disabled={ld} style={{width:'100%',padding:'12px 0',borderRadius:10,border:'none',background:t.gold,color:'#fff',fontSize:14,fontWeight:700,cursor:ld?'wait':'pointer',opacity:ld?0.7:1}}>{ld?'Entrando...':'Entrar'}</button>
        </div>
      </div>
    </div>)}

// ─── PROPERTY CARD ─────────────────────────────
function Card({code,reservations,t}:{code:string;reservations:Res[];t:T}){
  const m=APT_META[code]||{label:code,owner:'—',icon:'\u{1F3E0}',accent:t.gold,accentLight:t.goldLight}
  const count=reservations.filter(r=>r.guest_name&&r.guest_name!=='—').length

  return(
    <div style={{background:t.card,border:`1px solid ${t.border}`,borderRadius:16,overflow:'hidden',marginBottom:16}}>
      {/* Stripe */}
      <div style={{height:3,background:`linear-gradient(90deg, ${m.accent}, ${m.accentLight}, ${m.accent})`}}/>
      {/* Header */}
      <div style={{display:'flex',alignItems:'center',gap:12,padding:'14px 16px',borderBottom:`1px solid ${t.borderInner}`}}>
        <div style={{width:40,height:40,borderRadius:10,background:`${m.accent}18`,border:`1px solid ${m.accent}40`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:18}}>{m.icon}</div>
        <div style={{flex:1}}>
          <div style={{fontSize:13,fontWeight:700,color:m.accentLight}}>{m.label} — {m.owner}</div>
          <div style={{fontSize:10,color:t.muted}}>Responsável: {m.owner}</div>
        </div>
        <span style={{fontSize:10,color:t.muted,background:`${t.text}08`,border:`1px solid ${t.borderInner}`,borderRadius:99,padding:'2px 10px'}}>{count} reserva{count!==1?'s':''}</span>
      </div>
      {/* Reservations — mobile-first card layout */}
      <div style={{padding:'8px 12px 12px'}}>
        {reservations.length===0?(
          <div style={{padding:'24px 0',textAlign:'center',color:t.muted,fontSize:12}}>Nenhuma reserva neste período</div>
        ):reservations.map(r=>{
          const ci=fmtDateBR(r.checkin),co=fmtDateBR(r.checkout),cur=isCurrent(r.checkin,r.checkout)
          return(
            <div key={r.id} style={{display:'flex',alignItems:'center',gap:10,padding:'10px 0',borderBottom:`1px solid ${t.borderInner}25`,background:cur?`${m.accent}06`:'transparent',borderRadius:cur?8:0,margin:cur?'2px -4px':'0',paddingLeft:cur?4:0,paddingRight:cur?4:0}}>
              {/* Avatar */}
              <div style={{width:32,height:32,borderRadius:16,background:cur?'#22c55e20':`${m.accent}18`,border:`1.5px solid ${cur?'#22c55e40':`${m.accent}35`}`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:10,fontWeight:800,color:cur?'#86efac':m.accentLight,flexShrink:0}}>{initials(r.guest_name)}</div>
              {/* Info */}
              <div style={{flex:1,minWidth:0}}>
                <div style={{display:'flex',alignItems:'center',gap:6}}>
                  <span style={{fontSize:13,fontWeight:600,color:t.text,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{r.guest_name||'—'}</span>
                  {r.source&&<span style={{fontSize:8,padding:'1px 5px',borderRadius:3,fontWeight:700,flexShrink:0,
                    background:r.source.toLowerCase().includes('airbnb')?'#ec489918':r.source.toLowerCase().includes('booking')?'#3b82f618':`${m.accent}18`,
                    color:r.source.toLowerCase().includes('airbnb')?'#f472b6':r.source.toLowerCase().includes('booking')?'#60a5fa':m.accentLight
                  }}>{r.source}</span>}
                </div>
                <div style={{fontSize:11,color:t.muted,marginTop:1}}>{ci.day} <span style={{opacity:0.4}}>→</span> {co.day} &middot; <span style={{fontSize:10}}>{ci.wd}—{co.wd}</span></div>
              </div>
              {/* Value */}
              {r.total_value?<div style={{fontSize:11,fontFamily:'monospace',fontWeight:600,color:'#22c55e',flexShrink:0}}>{fmtBRL(r.total_value)}</div>:null}
            </div>)
        })}
      </div>
    </div>)
}

// ─── MAIN PAGE ─────────────────────────────────
export default function BuziosPage(){
  const [authed,setAuthed]=useState(false)
  const [dark,setDark]=useState(false)
  const [user,setUser]=useState<AppUser|null>(null)
  const [checking,setChecking]=useState(true)
  const [reservations,setReservations]=useState<Res[]>([])
  const [loading,setLoading]=useState(true)
  const [month,setMonth]=useState(new Date().getMonth())
  const [year,setYear]=useState(new Date().getFullYear())
  const t=dark?DK:LT

  useEffect(()=>{
    const s=localStorage.getItem('buzios_auth'),tp=localStorage.getItem('buzios_theme'),u=localStorage.getItem('buzios_user')
    if(tp==='dark')setDark(true)
    if(s){setAuthed(true);if(u)try{setUser(JSON.parse(u))}catch{}}
    setChecking(false)
  },[])
  useEffect(()=>{localStorage.setItem('buzios_theme',dark?'dark':'light')},[dark])

  // Fetch reservations
  useEffect(()=>{
    if(!authed)return
    async function load(){
      setLoading(true)
      const start=`${year}-${String(month+1).padStart(2,'0')}-01`
      const em=month+2>12?1:month+2, ey=month+2>12?year+1:year
      const end=`${ey}-${String(em).padStart(2,'0')}-01`
      const supabase=getSupabase();const{data}=await supabase.from('reservations').select('*').in('apartment_code',BUZIOS_APTS).or(`checkin.gte.${start},checkout.gte.${start}`).lt('checkin',end).order('checkin')
      if(data)setReservations(data)
      setLoading(false)
    }
    load()
  },[authed,month,year])

  const grouped=useMemo(()=>{
    const m:Record<string,Res[]>={}
    for(const c of BUZIOS_APTS)m[c]=reservations.filter(r=>r.apartment_code===c).sort((a,b)=>a.checkin.localeCompare(b.checkin))
    return m
  },[reservations])

  const handleLogin=(u:string,p:string)=>{setAuthed(true)}
  const logout=()=>{localStorage.removeItem('buzios_auth');localStorage.removeItem('buzios_user');setAuthed(false);setUser(null)}

  if(checking)return<div style={{minHeight:'100vh',background:t.bg}}/>
  if(!authed)return<Login onLogin={handleLogin} t={t}/>

  const curCount=reservations.filter(r=>isCurrent(r.checkin,r.checkout)).length

  return(
    <div style={{background:t.bg,minHeight:'100vh',fontFamily:"'DM Sans',system-ui,-apple-system,sans-serif"}}>
      {/* Header */}
      <div style={{position:'sticky',top:0,zIndex:20,background:t.bg+'f2',backdropFilter:'blur(10px)',borderBottom:`2px solid ${t.border}`,padding:'10px 12px',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
        <div style={{display:'flex',alignItems:'center',gap:8}}>
          <img src="/images/logo.png" alt="Búzios" style={{width:32,height:32,borderRadius:8}} />
          <div>
            <div style={{fontSize:15,fontWeight:700,color:t.text}}>Agenda Búzios</div>
            {user&&<div style={{fontSize:9,color:t.muted}}>{user.display_name} ({user.role})</div>}
          </div>
        </div>
        <div style={{display:'flex',alignItems:'center',gap:8}}>
          <button onClick={()=>setDark(!dark)} style={{width:44,height:24,borderRadius:12,border:'none',background:dark?t.gold+'30':'#2e221c20',position:'relative',cursor:'pointer',transition:'background 0.3s',padding:0}}>
            <div style={{width:20,height:20,borderRadius:10,background:dark?t.gold:'#3a3028',position:'absolute',top:2,left:dark?22:2,transition:'left 0.3s,background 0.3s',display:'flex',alignItems:'center',justifyContent:'center'}}>
              <span style={{fontSize:10,color:dark?'#1a1a22':'#faf8f5'}}>{dark?'\u2600':'\u263E'}</span>
            </div>
          </button>
          <button onClick={logout} style={{fontSize:9,color:t.muted,background:'none',border:'none',cursor:'pointer',textDecoration:'underline'}}>Sair</button>
        </div>
      </div>

      {/* Filters */}
      <div style={{padding:'12px 12px 0',display:'flex',alignItems:'center',justifyContent:'space-between',flexWrap:'wrap',gap:8}}>
        <div style={{display:'flex',alignItems:'center',gap:6}}>
          {curCount>0&&(
            <div style={{display:'flex',alignItems:'center',gap:5,background:'#22c55e15',border:'1px solid #22c55e30',borderRadius:99,padding:'3px 10px',fontSize:10,color:'#22c55e',fontWeight:600}}>
              <span style={{width:5,height:5,borderRadius:'50%',background:'#22c55e',animation:'pulse 2s ease-in-out infinite'}}/>
              {curCount} agora
            </div>
          )}
        </div>
        <div style={{display:'flex',alignItems:'center',gap:6}}>
          <div style={{display:'flex',alignItems:'center',background:t.elevated,border:`1px solid ${t.borderInner}`,borderRadius:8,overflow:'hidden'}}>
            <button onClick={()=>setMonth(m=>m>0?m-1:11)} style={{padding:'6px 8px',background:'none',border:'none',color:t.muted,cursor:'pointer'}}><ChevronLeft size={14}/></button>
            <span style={{fontSize:12,fontWeight:600,color:t.text,minWidth:110,textAlign:'center'}}>{MONTHS[month]} {year}</span>
            <button onClick={()=>setMonth(m=>m<11?m+1:0)} style={{padding:'6px 8px',background:'none',border:'none',color:t.muted,cursor:'pointer'}}><ChevronRight size={14}/></button>
          </div>
          <select value={year} onChange={e=>setYear(Number(e.target.value))}
            style={{background:t.elevated,border:`1px solid ${t.borderInner}`,borderRadius:8,padding:'6px 8px',fontSize:11,fontWeight:600,color:t.text}}>
            {[2025,2026,2027,2028,2029,2030].map(y=><option key={y} value={y}>{y}</option>)}
          </select>
        </div>
      </div>

      {/* Cards */}
      <div style={{padding:12}}>
        {loading?(
          <div style={{display:'flex',justifyContent:'center',padding:'60px 0'}}>
            <Loader2 size={20} style={{animation:'spin 1s linear infinite',color:t.gold}}/>
          </div>
        ):(
          BUZIOS_APTS.map(code=><Card key={code} code={code} reservations={grouped[code]||[]} t={t}/>)
        )}
        <p style={{textAlign:'center',fontSize:10,color:t.muted,marginTop:8}}>Dados sincronizados via Hospitable</p>
      </div>

      <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}@keyframes pulse{0%,100%{opacity:1}50%{opacity:.3}}`}</style>
    </div>)
}
