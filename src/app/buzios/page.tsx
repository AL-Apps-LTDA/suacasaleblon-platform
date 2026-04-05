'use client'

import { useState, useEffect } from 'react'
import { Eye, EyeOff, Loader2, LogOut, RefreshCw, CalendarDays } from 'lucide-react'

// Same theme system as equipe/giro
const LT = {
  bg:'#faf8f5',cardBg:'#f3efe8',border:'#c9b99a',
  textPrimary:'#2e221c',textSecondary:'#5e5040',
  gold:'#b08a40',
  inputBg:'#f3efe8',inputBorder:'#ddd4c4',inputFocus:'#c9a96e',
  red:'#dc2626',
  btnBg:'#ebe5d8',btnBorder:'#c9b99a',btnText:'#5e5040',
}
const DK = {
  bg:'#1a1a22',cardBg:'#222230',border:'#444455',
  textPrimary:'#e8e6e0',textSecondary:'#a09a90',
  gold:'#c9a96e',
  inputBg:'#222230',inputBorder:'#333340',inputFocus:'#c9a96e',
  red:'#ef4444',
  btnBg:'#2a2a38',btnBorder:'#444455',btnText:'#a09a90',
}
type T = typeof LT

interface AppUser { id:string; username:string; display_name:string; role:string }

function Login({onLogin,t}:{onLogin:(u:string,p:string)=>void;t:T}){
  const [u,setU]=useState('');const [p,setP]=useState('');const [show,setShow]=useState(false);const [er,setEr]=useState('');const [ld,setLd]=useState(false)
  const go=async()=>{
    if(!u||!p){setEr('Preencha usuário e senha');return}
    setLd(true);setEr('')
    try{const r=await fetch('/api/limpezas',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'login',username:u,password:p})})
      const d=await r.json();if(!r.ok||d.error){setEr(d.error||'Credenciais inválidas');setLd(false);return}
      localStorage.setItem('buzios_auth',btoa(`${u}:${p}`));localStorage.setItem('buzios_user',JSON.stringify(d));onLogin(u,p)
    }catch{setEr('Erro de conexão')};setLd(false)}
  return(
    <div style={{minHeight:'100vh',background:t.bg,display:'flex',alignItems:'center',justifyContent:'center',padding:24}}>
      <div style={{width:'100%',maxWidth:320,textAlign:'center'}}>
        <img src="/images/logo.png" alt="Agenda Búzios" style={{width:56,height:56,borderRadius:16,margin:'0 auto 16px'}} />
        <h1 style={{fontSize:18,fontWeight:700,color:t.textPrimary,marginBottom:4}}>Agenda Búzios</h1>
        <p style={{fontSize:12,color:t.textSecondary,marginBottom:24}}>Faça login para acessar</p>
        <div style={{display:'flex',flexDirection:'column',gap:12}}>
          <input type="text" placeholder="Usuário" value={u} onChange={e=>{setU(e.target.value);setEr('')}} onKeyDown={e=>e.key==='Enter'&&go()}
            style={{width:'100%',padding:'12px 16px',borderRadius:10,fontSize:14,background:t.inputBg,border:`1.5px solid ${t.inputBorder}`,color:t.textPrimary,outline:'none',boxSizing:'border-box'}}/>
          <div style={{position:'relative'}}>
            <input type={show?'text':'password'} placeholder="Senha" value={p} onChange={e=>{setP(e.target.value);setEr('')}} onKeyDown={e=>e.key==='Enter'&&go()}
              style={{width:'100%',padding:'12px 44px 12px 16px',borderRadius:10,fontSize:14,background:t.inputBg,border:`1.5px solid ${t.inputBorder}`,color:t.textPrimary,outline:'none',boxSizing:'border-box'}}/>
            <button onClick={()=>setShow(!show)} style={{position:'absolute',right:12,top:'50%',transform:'translateY(-50%)',background:'none',border:'none',cursor:'pointer',padding:0}}>
              {show?<EyeOff size={16} style={{color:t.textSecondary}}/>:<Eye size={16} style={{color:t.textSecondary}}/>}
            </button>
          </div>
          {er&&<p style={{color:t.red,fontSize:12,margin:0}}>{er}</p>}
          <button onClick={go} disabled={ld} style={{width:'100%',padding:'12px 0',borderRadius:10,border:'none',background:t.gold,color:'#fff',fontSize:14,fontWeight:700,cursor:ld?'wait':'pointer',opacity:ld?0.7:1}}>{ld?'Entrando...':'Entrar'}</button>
        </div>
      </div>
    </div>)}

export default function BuziosPage(){
  const [authed,setAuthed]=useState(false);const [token,setToken]=useState('')
  const [dark,setDark]=useState(false);const [user,setUser]=useState<AppUser|null>(null)
  const [loading,setLoading]=useState(true)
  const t=dark?DK:LT

  useEffect(()=>{
    const s=localStorage.getItem('buzios_auth'),tp=localStorage.getItem('buzios_theme'),u=localStorage.getItem('buzios_user')
    if(tp==='dark')setDark(true)
    if(s){setToken(s);setAuthed(true);if(u)try{setUser(JSON.parse(u))}catch{}}
    setLoading(false)
  },[])
  useEffect(()=>{localStorage.setItem('buzios_theme',dark?'dark':'light')},[dark])

  const handleLogin=(u:string,p:string)=>{const tk=btoa(`${u}:${p}`);setToken(tk);setAuthed(true)}
  const logout=()=>{localStorage.removeItem('buzios_auth');localStorage.removeItem('buzios_user');setAuthed(false);setToken('');setUser(null)}

  if(loading)return<div style={{minHeight:'100vh',background:t.bg}}/>
  if(!authed)return<Login onLogin={handleLogin} t={t}/>

  return(
    <div style={{background:t.bg,minHeight:'100vh',fontFamily:"'DM Sans',system-ui,-apple-system,sans-serif"}}>
      {/* Header */}
      <div style={{position:'sticky',top:0,zIndex:20,background:t.bg+'f2',backdropFilter:'blur(10px)',borderBottom:`2px solid ${t.border}`,padding:'10px 12px',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
        <div style={{display:'flex',alignItems:'center',gap:8}}>
          <img src="/images/logo.png" alt="Búzios" style={{width:32,height:32,borderRadius:8}} />
          <div>
            <div style={{fontSize:15,fontWeight:700,color:t.textPrimary}}>Agenda Búzios</div>
            {user&&<div style={{fontSize:9,color:t.textSecondary}}>{user.display_name} ({user.role})</div>}
          </div>
        </div>
        <div style={{display:'flex',alignItems:'center',gap:8}}>
          <button onClick={()=>setDark(!dark)} style={{width:44,height:24,borderRadius:12,border:'none',background:dark?t.gold+'30':'#2e221c20',position:'relative',cursor:'pointer',transition:'background 0.3s',padding:0}}>
            <div style={{width:20,height:20,borderRadius:10,background:dark?t.gold:'#3a3028',position:'absolute',top:2,left:dark?22:2,transition:'left 0.3s,background 0.3s',display:'flex',alignItems:'center',justifyContent:'center'}}>
              <span style={{fontSize:10,color:dark?'#1a1a22':'#faf8f5'}}>{dark?'☀':'☾'}</span>
            </div>
          </button>
          <button onClick={logout} style={{fontSize:9,color:t.textSecondary,background:'none',border:'none',cursor:'pointer',textDecoration:'underline'}}>Sair</button>
        </div>
      </div>

      {/* Content — placeholder */}
      <div style={{padding:'60px 20px',textAlign:'center'}}>
        <CalendarDays size={40} style={{color:t.gold,margin:'0 auto 16px',opacity:0.4}} />
        <h2 style={{fontSize:16,fontWeight:700,color:t.textPrimary,marginBottom:4}}>Agenda Búzios</h2>
        <p style={{fontSize:13,color:t.textSecondary,maxWidth:300,margin:'0 auto'}}>
          Em breve — lógica própria para os imóveis de Búzios.
        </p>
      </div>
    </div>)
}
