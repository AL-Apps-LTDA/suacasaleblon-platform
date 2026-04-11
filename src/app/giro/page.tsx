'use client'

import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { Loader2, KeyRound, RefreshCw, Eye, EyeOff, X, Camera, Trash2, Plus, Edit3, ChevronDown, CalendarDays, MessageSquare, Phone as PhoneIcon, Settings, DollarSign } from 'lucide-react'
import ContactsTab from './ContactsTab'
import ChatTab from './ChatTab'

// ─── CONSTANTS ─────────────────────────────────────────
// Apartments are loaded dynamically per client — no hardcoded list
const APTS: string[] = []
const DAYS_L = ['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB']
const CHECKIN_H = 15
const COST_CATEGORIES = [
  { value: 'transporte', label: 'Transporte' },
  { value: 'compra', label: 'Compra' },
  { value: 'manutencao', label: 'Manutenção' },
  { value: 'outro', label: 'Outro' },
] as const

// ─── THEMES ────────────────────────────────────────────
const LT = {
  bg:'#faf8f5',cardBg:'#f3efe8',border:'#c9b99a',borderInner:'#ddd4c4',
  textPrimary:'#2e221c',textSecondary:'#5e5040',labelColor:'#4a3e30',
  gold:'#b08a40',goldBg:'#b08a4018',
  green:'#16a34a',greenBg:'#16a34a22',greenBorder:'#16a34a55',
  yellow:'#a8864a',yellowBg:'#a8864a12',yellowBorder:'#a8864a50',
  red:'#dc2626',redBg:'#dc262612',redBorder:'#dc262650',warnIcon:'#eab308',
  hachStroke:'#a09890',hachText:'#706860',dot:'#beb5a5',hachId:'hL',
  shadow:'0 0 4px rgba(250,248,245,0.95)',
  btnBg:'#ebe5d8',btnBorder:'#c9b99a',btnText:'#5e5040',
  inputBg:'#f3efe8',inputBorder:'#ddd4c4',inputFocus:'#c9a96e',
  overlay:'rgba(0,0,0,0.4)',modalBg:'#faf8f5',
}
const DK = {
  bg:'#1a1a22',cardBg:'#222230',border:'#444455',borderInner:'#333340',
  textPrimary:'#e8e6e0',textSecondary:'#a09a90',labelColor:'#c0b8a8',
  gold:'#c9a96e',goldBg:'#c9a96e14',
  green:'#22c55e',greenBg:'#22c55e22',greenBorder:'#22c55e55',
  yellow:'#eab308',yellowBg:'#eab30812',yellowBorder:'#eab30850',
  red:'#ef4444',redBg:'#ef444412',redBorder:'#ef444450',warnIcon:'#eab308',
  hachStroke:'#55556a',hachText:'#8888a0',dot:'#44445a',hachId:'hD',
  shadow:'0 0 4px rgba(26,26,34,0.95)',
  btnBg:'#2a2a38',btnBorder:'#444455',btnText:'#a09a90',
  inputBg:'#222230',inputBorder:'#333340',inputFocus:'#c9a96e',
  overlay:'rgba(0,0,0,0.6)',modalBg:'#1e1e28',
}
type T = typeof LT

// ─── TYPES ─────────────────────────────────────────────
interface Res { apartment_code:string; guest_name:string; guest_phone?:string; checkin:string; checkout:string }
interface ExtraCost { type:string; description?:string; amount:number }
interface Cln { id?:string; apartment_code:string; scheduled_date:string; cleaning_date?:string; status?:string; completed?:boolean; manually_edited?:boolean; cleaner_name?:string; cleaner_id?:string; cleaning_cost?:number; cost?:number; photos?:string[]; notes?:string; guest_count?:number; sort_order?:number; extra_costs?:ExtraCost[] }
interface DayCell { type:'empty'|'pending'|'done'|'late'|'occupied'; apt:string; cleaning?:Cln; date:string }
interface AppUser { id:string; username:string; display_name:string; role:string; pix_key?:string }

// ─── HELPERS ───────────────────────────────────────────
function weekDates(off:number):Date[] {
  const n=new Date(),d=n.getDay(),m=new Date(n);m.setDate(n.getDate()-((d+6)%7)+off*7);m.setHours(0,0,0,0)
  return Array.from({length:7},(_,i)=>{const x=new Date(m);x.setDate(m.getDate()+i);return x})
}
function ds(d:Date){return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`}
function isToday(d:Date){return ds(d)===ds(new Date())}
function fmt(d:Date){return `${d.getDate().toString().padStart(2,'0')}/${(d.getMonth()+1).toString().padStart(2,'0')}`}
function fmtFull(s:string){const [y,m,d]=s.split('-').map(Number);const dt=new Date(y,m-1,d);return `${DAYS_L[dt.getDay()]} ${fmt(dt)}`}
function isLate(sd:string){
  const n=new Date(),br=new Date(n.toLocaleString('en-US',{timeZone:'America/Sao_Paulo'})),t=ds(br)
  if(sd>t)return false;if(sd<t)return true;return br.getHours()>=CHECKIN_H
}
function apiH(token:string){return {'Authorization':`Basic ${token}`,'Content-Type':'application/json'}}

// ─── HACH PATTERNS ─────────────────────────────────────
function Hach(){return(<svg width="0" height="0" style={{position:'absolute'}}><defs>
  <pattern id="hL" patternUnits="userSpaceOnUse" width="5" height="5" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="5" stroke="#a09890" strokeWidth="0.9"/></pattern>
  <pattern id="hD" patternUnits="userSpaceOnUse" width="5" height="5" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="5" stroke="#55556a" strokeWidth="0.9"/></pattern>
</defs></svg>)}

// ─── STATUS CELL ───────────────────────────────────────
function Cell({cell,t,onClick}:{cell:DayCell;t:T;onClick?:()=>void}){
  if(cell.type==='empty')return<div style={{width:3.5,height:3.5,borderRadius:'50%',background:t.dot}}/>
  if(cell.type==='occupied')return(
    <div style={{position:'relative',width:'100%',height:'100%',display:'flex',alignItems:'center',justifyContent:'center'}}>
      <svg width="100%" height="100%" style={{position:'absolute',top:0,left:0}}><rect width="100%" height="100%" fill={`url(#${t.hachId})`}/></svg>
      <span style={{fontSize:9,fontWeight:700,color:t.hachText,position:'relative',zIndex:1,textShadow:t.shadow}}>{cell.apt}</span>
    </div>)
  const done=cell.type==='done',late=cell.type==='late'
  const c=done?t.green:late?t.red:t.yellow, bg=done?t.greenBg:late?t.redBg:t.yellowBg, bd=done?t.greenBorder:late?t.redBorder:t.yellowBorder
  return(
    <div onClick={onClick} style={{width:38,height:28,borderRadius:6,display:'flex',flexDirection:'column',alignItems:'stretch',justifyContent:'space-between',padding:'3px 5px',cursor:'pointer',background:done?bg:'transparent',border:`1.5px solid ${bd}`,transition:'transform 0.1s'}}
      onPointerDown={e=>(e.currentTarget.style.transform='scale(0.92)')} onPointerUp={e=>(e.currentTarget.style.transform='scale(1)')} onPointerLeave={e=>(e.currentTarget.style.transform='scale(1)')}>
      <div style={{display:'flex',alignItems:'flex-start',justifyContent:'flex-start'}}>
        {done&&<span style={{fontSize:11,color:c,lineHeight:'1'}}>✓</span>}
        {late&&<span style={{fontSize:9,lineHeight:'1',color:t.warnIcon}}>⚠</span>}
        {!done&&!late&&<span style={{fontSize:8,lineHeight:'1',color:c,opacity:0.8}}>◷</span>}
      </div>
      <div style={{display:'flex',alignItems:'flex-end',justifyContent:'flex-end'}}>
        <span style={{fontSize:cell.apt.length>3?7:8,fontWeight:700,color:c,lineHeight:'1'}}>{cell.apt}</span>
      </div>
    </div>)
}

// ─── CLEANING MODAL ────────────────────────────────────
function GuestBox({label,emoji,name,phone,t}:{label:string;emoji:string;name:string;phone?:string;t:T}){
  const phoneClean=phone?.replace(/\D/g,'')||''
  const whatsUrl=phoneClean?`https://wa.me/${phoneClean.startsWith('55')?phoneClean:'55'+phoneClean}`:''
  const telUrl=phoneClean?`tel:+${phoneClean.startsWith('55')?phoneClean:'55'+phoneClean}`:''
  return(
    <div style={{background:t.inputBg,border:`1.5px solid ${t.inputBorder}`,borderRadius:10,padding:'10px 12px'}}>
      <div style={{fontSize:9,fontWeight:700,color:t.textSecondary,textTransform:'uppercase',letterSpacing:'0.05em',marginBottom:6}}>{emoji} {label}</div>
      <div style={{fontSize:13,fontWeight:600,color:t.textPrimary,marginBottom:phone?6:0}}>{name}</div>
      {phone&&<div style={{display:'flex',gap:6,marginTop:4}}>
        <a href={telUrl} style={{flex:1,display:'flex',alignItems:'center',justifyContent:'center',gap:4,padding:'7px 0',borderRadius:8,fontSize:11,fontWeight:600,background:t.gold+'18',color:t.gold,textDecoration:'none',border:`1px solid ${t.gold}30`}}>
          📞 Ligar
        </a>
        <a href={whatsUrl} target="_blank" rel="noopener" style={{flex:1,display:'flex',alignItems:'center',justifyContent:'center',gap:4,padding:'7px 0',borderRadius:8,fontSize:11,fontWeight:600,background:'#25D36618',color:'#25D366',textDecoration:'none',border:'1px solid #25D36630'}}>
          💬 WhatsApp
        </a>
      </div>}
      {!phone&&<div style={{fontSize:10,color:t.textSecondary,opacity:0.6,fontStyle:'italic'}}>Telefone não disponível</div>}
    </div>)
}

function CleaningModal({cell,t,token,user,cleaners,reservations,onClose,onSaved}:{cell:DayCell;t:T;token:string;user:AppUser;cleaners:AppUser[];reservations:Res[];onClose:()=>void;onSaved:()=>void}){
  const cl=cell.cleaning!
  const isAdm=user.role==='admin'

  // Find checkout/checkin guests for this apartment on this day
  const date=cl.scheduled_date||cl.cleaning_date||cell.date
  const aptRes=reservations.filter(r=>r.apartment_code===cell.apt)
  const checkoutGuest=aptRes.find(r=>r.checkout===date)
  const checkinGuest=aptRes.find(r=>r.checkin===date)
  const [cost,setCost]=useState(cl.cleaning_cost?.toString()??cl.cost?.toString()??'')
  const [assignee,setAssignee]=useState(cl.cleaner_id||'')
  const [assigneeName,setAssigneeName]=useState(cl.cleaner_name||'')
  const [notes,setNotes]=useState(cl.notes||'')
  const [guests,setGuests]=useState(cl.guest_count?.toString()||'')
  const [photos,setPhotos]=useState<string[]>(cl.photos||[])
  const [saving,setSaving]=useState(false)
  const [error,setError]=useState('')
  const [deleteConfirm,setDeleteConfirm]=useState(false)
  const fileRef=useRef<HTMLInputElement>(null)
  // Extra costs (stored as JSON array in cleaning)
  const [extraCosts,setExtraCosts]=useState<ExtraCost[]>(cl.extra_costs||[])
  const [showAddCost,setShowAddCost]=useState(false)
  const [newCostType,setNewCostType]=useState('transporte')
  const [newCostDesc,setNewCostDesc]=useState('')
  const [newCostAmount,setNewCostAmount]=useState('')

  // Permission: if admin already set cleaner/cost, cleaner can't change
  const cleanerLocked=!isAdm&&!!cl.cleaner_id&&cl.cleaner_id!==user.id
  const costLocked=!isAdm&&cl.cleaning_cost!=null&&cl.cleaning_cost>0

  // Available cleaners for dropdown
  const cleanerOpts=isAdm?cleaners.filter(u=>u.role==='cleaner'):[{id:user.id,display_name:user.display_name,username:user.username,role:user.role}]

  const canComplete=cost!==''&&photos.length>=2
  const isDone=cl.completed||cl.status==='concluida'
  // Admin or assigned cleaner can edit even completed cleanings
  const canEdit=isAdm||cl.cleaner_id===user.id
  const locked=isDone&&!canEdit

  const handlePhoto=async(e:React.ChangeEvent<HTMLInputElement>)=>{
    const files=e.target.files;if(!files)return
    for(let i=0;i<files.length&&photos.length+i<6;i++){
      const f=files[i]
      const reader=new FileReader()
      reader.onload=()=>{setPhotos(p=>[...p,reader.result as string].slice(0,6))}
      reader.readAsDataURL(f)
    }
    e.target.value=''
  }

  const handleSave=async(complete:boolean)=>{
    setSaving(true);setError('')
    const h=apiH(token)
    try{
      // Assign cleaner if changed
      if(assignee&&assignee!==cl.cleaner_id){
        const aName=cleanerOpts.find(c=>c.id===assignee)?.display_name||assigneeName
        const r=await fetch('/api/limpezas',{method:'POST',headers:h,body:JSON.stringify({action:'assign-cleaner',cleaning_id:cl.id,cleaner_id:assignee,cleaner_name:aName})})
        if(!r.ok){const d=await r.json();setError(d.error||'Erro ao atribuir');setSaving(false);return}
      }
      // Build safe values
      const safeCost=parseFloat(cost);const validCost=isNaN(safeCost)?0:safeCost
      const safeGuests=parseInt(guests);const validGuests=isNaN(safeGuests)?null:safeGuests
      // Update fields via upsert (admin) or complete
      if(complete){
        const payload:any={action:'complete-cleaning',cleaning_id:cl.id,cost:validCost,photos}
        if(notes)payload.notes=notes
        if(validGuests!==null)payload.guest_count=validGuests
        if(extraCosts.length>0)payload.extra_costs=extraCosts
        const r=await fetch('/api/limpezas',{method:'POST',headers:h,body:JSON.stringify(payload)})
        if(!r.ok){const d=await r.json();setError(d.error||'Erro ao concluir');setSaving(false);return}
      }else if(isAdm){
        // Admin can update any field without completing
        const cleaning:any={id:cl.id,cleaning_cost:validCost,cost:validCost,photos,manually_edited:true}
        if(notes!==undefined)cleaning.notes=notes
        if(validGuests!==null)cleaning.guest_count=validGuests
        if(extraCosts.length>0)cleaning.extra_costs=extraCosts
        const r=await fetch('/api/limpezas',{method:'POST',headers:h,body:JSON.stringify({action:'upsert-cleaning',cleaning})})
        if(!r.ok){const d=await r.json();setError(d.error||'Erro ao salvar');setSaving(false);return}
      }
      onSaved();onClose()
    }catch{setError('Erro de conexão')}
    setSaving(false)
  }

  const handleDelete=async()=>{
    setSaving(true)
    try{
      const r=await fetch('/api/limpezas',{method:'POST',headers:apiH(token),body:JSON.stringify({action:'delete',table:'cleanings',id:cl.id})})
      if(r.ok){onSaved();onClose()}else{const d=await r.json();setError(d.error||'Erro')}
    }catch{setError('Erro')}
    setSaving(false)
  }

  const inputS=(extra?:any):any=>({width:'100%',padding:'10px 12px',borderRadius:8,fontSize:13,background:t.inputBg,border:`1.5px solid ${t.inputBorder}`,color:t.textPrimary,outline:'none',boxSizing:'border-box' as const,...extra})

  return(
    <div style={{position:'fixed',inset:0,zIndex:100,display:'flex',alignItems:'center',justifyContent:'center',padding:16}} onClick={onClose}>
      <div style={{position:'absolute',inset:0,background:t.overlay}}/>
      <div onClick={e=>e.stopPropagation()} style={{position:'relative',width:'100%',maxWidth:520,maxHeight:'85vh',overflowY:'auto',background:t.modalBg,borderRadius:16,padding:'20px 16px',boxShadow:'0 4px 30px rgba(0,0,0,0.25)'}}>
        {/* Header */}
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:16}}>
          <div>
            <div style={{fontSize:16,fontWeight:700,color:t.textPrimary}}>Apto {cell.apt}</div>
            <div style={{fontSize:11,color:t.textSecondary}}>{fmtFull(cl.scheduled_date||cl.cleaning_date||cell.date)}</div>
          </div>
          <div style={{display:'flex',gap:8,alignItems:'center'}}>
            {isAdm&&!locked&&<button onClick={()=>setDeleteConfirm(true)} style={{background:'none',border:'none',cursor:'pointer',padding:4}}><Trash2 size={16} style={{color:t.red}}/></button>}
            <button onClick={onClose} style={{background:'none',border:'none',cursor:'pointer',padding:4}}><X size={18} style={{color:t.textSecondary}}/></button>
          </div>
        </div>

        {/* Delete confirm */}
        {deleteConfirm&&<div style={{background:t.redBg,border:`1px solid ${t.redBorder}`,borderRadius:8,padding:12,marginBottom:12}}>
          <div style={{fontSize:12,color:t.red,fontWeight:600,marginBottom:8}}>Deletar esta limpeza?</div>
          <div style={{display:'flex',gap:8}}>
            <button onClick={handleDelete} disabled={saving} style={{flex:1,padding:'8px 0',borderRadius:8,border:'none',background:t.red,color:'#fff',fontSize:12,fontWeight:600,cursor:'pointer'}}>Sim, deletar</button>
            <button onClick={()=>setDeleteConfirm(false)} style={{flex:1,padding:'8px 0',borderRadius:8,border:`1px solid ${t.border}`,background:'transparent',color:t.textSecondary,fontSize:12,cursor:'pointer'}}>Cancelar</button>
          </div>
        </div>}

        {/* Status badge */}
        {isDone&&<div style={{display:'inline-flex',alignItems:'center',gap:4,background:t.greenBg,border:`1px solid ${t.greenBorder}`,borderRadius:6,padding:'4px 10px',marginBottom:12}}>
          <span style={{fontSize:12,color:t.green,fontWeight:600}}>✓ Concluída</span>
        </div>}

        {/* Guest info boxes */}
        {(checkoutGuest||checkinGuest)&&<div style={{display:'flex',flexDirection:'column',gap:8,marginBottom:14}}>
          {checkoutGuest&&<GuestBox label="Saindo" emoji="🔴" name={checkoutGuest.guest_name} phone={checkoutGuest.guest_phone} t={t}/>}
          {checkinGuest&&<GuestBox label="Entrando" emoji="🟢" name={checkinGuest.guest_name} phone={checkinGuest.guest_phone} t={t}/>}
        </div>}

        {/* Faxineira */}
        <div style={{marginBottom:12}}>
          <label style={{fontSize:11,fontWeight:600,color:t.textSecondary,display:'block',marginBottom:4}}>Faxineira</label>
          {cleanerLocked?
            <div style={inputS({opacity:0.6,cursor:'not-allowed'})}>{assigneeName||'Atribuída pelo admin'}</div>:
            <div style={{position:'relative'}}>
              <select value={assignee} onChange={e=>{setAssignee(e.target.value);setAssigneeName(cleanerOpts.find(c=>c.id===e.target.value)?.display_name||'')}}
                style={inputS({appearance:'none' as const,paddingRight:32,cursor:'pointer'})}>
                <option value="">Selecionar...</option>
                {cleanerOpts.map(c=><option key={c.id} value={c.id}>{c.display_name}</option>)}
              </select>
              <ChevronDown size={14} style={{position:'absolute',right:10,top:'50%',transform:'translateY(-50%)',color:t.textSecondary,pointerEvents:'none'}}/>
            </div>}
        </div>

        {/* Valor */}
        <div style={{marginBottom:12}}>
          <label style={{fontSize:11,fontWeight:600,color:t.textSecondary,display:'block',marginBottom:4}}>Valor (R$) *</label>
          {costLocked?
            <div style={inputS({opacity:0.6,cursor:'not-allowed'})}>R$ {cl.cleaning_cost?.toFixed(2)}</div>:
            <input type="number" min="0" step="0.01" placeholder="0,00" value={cost} onChange={e=>setCost(e.target.value)} style={inputS()} inputMode="decimal"/>}
        </div>

        {/* Hóspedes */}
        <div style={{marginBottom:12}}>
          <label style={{fontSize:11,fontWeight:600,color:t.textSecondary,display:'block',marginBottom:4}}>Nº de hóspedes</label>
          <input type="number" min="0" placeholder="0" value={guests} onChange={e=>setGuests(e.target.value)} style={inputS()} inputMode="numeric"/>
        </div>

        {/* Observações */}
        <div style={{marginBottom:12}}>
          <label style={{fontSize:11,fontWeight:600,color:t.textSecondary,display:'block',marginBottom:4}}>Observações</label>
          <textarea value={notes} onChange={e=>setNotes(e.target.value)} placeholder="Notas sobre a limpeza..." rows={2} style={inputS({resize:'vertical' as const,fontFamily:'inherit'})}/>
        </div>

        {/* Custos adicionais — caixinha */}
        <div style={{background:t.inputBg,border:`1.5px solid ${t.inputBorder}`,borderRadius:10,padding:'10px 12px',marginBottom:12}}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:extraCosts.length>0||showAddCost?8:0}}>
            <label style={{fontSize:9,fontWeight:700,color:t.textSecondary,textTransform:'uppercase',letterSpacing:'0.05em'}}>💰 Custos adicionais</label>
            {!locked&&<button onClick={()=>setShowAddCost(!showAddCost)} style={{display:'flex',alignItems:'center',gap:3,fontSize:10,fontWeight:600,color:t.gold,background:'none',border:'none',cursor:'pointer',padding:0}}>
              <Plus size={12}/>{showAddCost?'Cancelar':'Adicionar'}
            </button>}
          </div>
          {/* Add cost form */}
          {showAddCost&&<div style={{display:'flex',flexDirection:'column',gap:6,marginBottom:8}}>
            <div style={{display:'flex',gap:6}}>
              <select value={newCostType} onChange={e=>{setNewCostType(e.target.value);if(e.target.value!=='outro')setNewCostDesc('')}} style={{flex:'0 0 auto',padding:'7px 8px',borderRadius:6,fontSize:11,background:t.bg,border:`1px solid ${t.border}`,color:t.textPrimary,outline:'none'}}>
                {COST_CATEGORIES.map(c=><option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
              <input type="number" min="0" step="0.01" placeholder="Valor" value={newCostAmount} onChange={e=>setNewCostAmount(e.target.value)} inputMode="decimal"
                style={{flex:1,minWidth:70,padding:'7px 8px',borderRadius:6,fontSize:11,background:t.bg,border:`1px solid ${t.border}`,color:t.textPrimary,outline:'none'}}/>
              <button onClick={()=>{
                const amt=parseFloat(newCostAmount)
                if(!amt||amt<=0)return
                if(newCostType==='outro'&&!newCostDesc.trim())return
                const desc=newCostType==='outro'?newCostDesc.trim():undefined
                setExtraCosts(prev=>[...prev,{type:newCostType,description:desc,amount:amt}])
                setNewCostAmount('');setNewCostDesc('');setShowAddCost(false)
              }} style={{padding:'7px 12px',borderRadius:6,border:'none',background:t.gold,color:'#fff',fontSize:11,fontWeight:600,cursor:'pointer'}}>+</button>
            </div>
            {newCostType==='outro'&&<input type="text" placeholder="Descreva o custo..." value={newCostDesc} onChange={e=>setNewCostDesc(e.target.value)} maxLength={60}
              style={{padding:'7px 8px',borderRadius:6,fontSize:11,background:t.bg,border:`1px solid ${t.border}`,color:t.textPrimary,outline:'none'}}/>}
          </div>}
          {/* Cost list */}
          {extraCosts.length>0?(
            <div style={{display:'flex',flexDirection:'column',gap:4}}>
              {extraCosts.map((ec,i)=>(
                <div key={i} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'6px 10px',borderRadius:6,background:t.goldBg,border:`1px solid ${t.gold}20`}}>
                  <div style={{display:'flex',alignItems:'center',gap:6}}>
                    <span style={{fontSize:10,fontWeight:600,color:t.gold}}>{COST_CATEGORIES.find(c=>c.value===ec.type)?.label||ec.type}</span>
                    {ec.description&&<span style={{fontSize:10,color:t.textSecondary}}>· {ec.description}</span>}
                  </div>
                  <div style={{display:'flex',alignItems:'center',gap:6}}>
                    <span style={{fontSize:11,fontWeight:700,color:t.textPrimary}}>R$ {ec.amount.toFixed(2)}</span>
                    {!locked&&<button onClick={()=>setExtraCosts(prev=>prev.filter((_,j)=>j!==i))} style={{background:'none',border:'none',cursor:'pointer',padding:0,display:'flex'}}><X size={12} style={{color:t.red}}/></button>}
                  </div>
                </div>))}
              <div style={{fontSize:10,color:t.textSecondary,textAlign:'right',marginTop:2}}>
                Total extras: <strong style={{color:t.textPrimary}}>R$ {extraCosts.reduce((s,c)=>s+c.amount,0).toFixed(2)}</strong>
              </div>
            </div>
          ):(!showAddCost&&<div style={{fontSize:10,color:t.textSecondary,opacity:0.6}}>Nenhum custo adicional</div>)}
        </div>

        {/* Fotos */}
        <div style={{marginBottom:16}}>
          <label style={{fontSize:11,fontWeight:600,color:t.textSecondary,display:'block',marginBottom:6}}>Fotos * (mín 2, máx 6)</label>
          <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
            {photos.map((p,i)=>(
              <div key={i} style={{width:60,height:60,borderRadius:8,overflow:'hidden',position:'relative',border:`1px solid ${t.border}`}}>
                <img src={p} alt="" style={{width:'100%',height:'100%',objectFit:'cover'}}/>
                {!locked&&<button onClick={()=>setPhotos(ps=>ps.filter((_,j)=>j!==i))} style={{position:'absolute',top:2,right:2,width:18,height:18,borderRadius:9,background:'rgba(0,0,0,0.5)',border:'none',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}>
                  <X size={10} style={{color:'#fff'}}/>
                </button>}
              </div>))}
            {photos.length<6&&!locked&&(
              <button onClick={()=>fileRef.current?.click()} style={{width:60,height:60,borderRadius:8,border:`1.5px dashed ${t.border}`,background:'transparent',cursor:'pointer',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:2}}>
                <Camera size={16} style={{color:t.textSecondary}}/>
                <span style={{fontSize:8,color:t.textSecondary}}>{photos.length}/6</span>
              </button>)}
          </div>
          <input ref={fileRef} type="file" accept="image/*" multiple capture="environment" onChange={handlePhoto} style={{display:'none'}}/>
        </div>

        {/* Error */}
        {error&&<p style={{color:t.red,fontSize:12,marginBottom:8}}>{error}</p>}

        {/* Actions */}
        {!locked&&<div style={{display:'flex',gap:8}}>
          {isAdm&&<button onClick={()=>handleSave(false)} disabled={saving} style={{flex:1,padding:'12px 0',borderRadius:10,border:`1.5px solid ${t.btnBorder}`,background:t.btnBg,color:t.btnText,fontSize:13,fontWeight:600,cursor:'pointer',opacity:saving?0.6:1}}>
            {saving?'Salvando...':'Salvar'}
          </button>}
          <button onClick={()=>handleSave(true)} disabled={saving||!canComplete} style={{flex:1,padding:'12px 0',borderRadius:10,border:'none',background:canComplete?t.green:t.border,color:canComplete?'#fff':t.textSecondary,fontSize:13,fontWeight:700,cursor:canComplete?'pointer':'not-allowed',opacity:saving?0.6:1}}>
            {saving?'Concluindo...':canComplete?'✓ Concluir Limpeza':`Falta: ${cost===''?'valor':''} ${photos.length<2?`${2-photos.length} foto(s)`:''}`}
          </button>
        </div>}
      </div>
    </div>)
}

// ─── CREATE CLEANING MODAL (admin) ─────────────────────
function CreateModal({date,t,token,onClose,onSaved}:{date:string;t:T;token:string;onClose:()=>void;onSaved:()=>void}){
  const [apt,setApt]=useState(APTS[0]||'')
  const [saving,setSaving]=useState(false)
  const [error,setError]=useState('')
  const handleCreate=async()=>{
    setSaving(true)
    try{
      const r=await fetch('/api/limpezas',{method:'POST',headers:apiH(token),body:JSON.stringify({action:'upsert-cleaning',cleaning:{apartment_code:apt,scheduled_date:date,status:'pendente',manually_edited:true}})})
      if(r.ok){onSaved();onClose()}else{const d=await r.json();setError(d.error||'Erro')}
    }catch{setError('Erro')}
    setSaving(false)
  }
  return(
    <div style={{position:'fixed',inset:0,zIndex:100,display:'flex',alignItems:'center',justifyContent:'center'}} onClick={onClose}>
      <div style={{position:'absolute',inset:0,background:t.overlay}}/>
      <div onClick={e=>e.stopPropagation()} style={{position:'relative',width:'90%',maxWidth:400,background:t.modalBg,borderRadius:16,padding:'20px 16px'}}>
        <div style={{fontSize:15,fontWeight:700,color:t.textPrimary,marginBottom:4}}>Nova Limpeza</div>
        <div style={{fontSize:11,color:t.textSecondary,marginBottom:16}}>{fmtFull(date)}</div>
        <label style={{fontSize:11,fontWeight:600,color:t.textSecondary,display:'block',marginBottom:4}}>Apartamento</label>
        <div style={{position:'relative',marginBottom:16}}>
          <select value={apt} onChange={e=>setApt(e.target.value)} style={{width:'100%',padding:'10px 12px',borderRadius:8,fontSize:13,background:t.inputBg,border:`1.5px solid ${t.inputBorder}`,color:t.textPrimary,outline:'none',appearance:'none' as const}}>
            {APTS.map(a=><option key={a} value={a}>{a}</option>)}
          </select>
          <ChevronDown size={14} style={{position:'absolute',right:10,top:'50%',transform:'translateY(-50%)',color:t.textSecondary,pointerEvents:'none'}}/>
        </div>
        {error&&<p style={{color:t.red,fontSize:12,marginBottom:8}}>{error}</p>}
        <div style={{display:'flex',gap:8}}>
          <button onClick={onClose} style={{flex:1,padding:'10px 0',borderRadius:10,border:`1.5px solid ${t.btnBorder}`,background:t.btnBg,color:t.btnText,fontSize:13,cursor:'pointer'}}>Cancelar</button>
          <button onClick={handleCreate} disabled={saving} style={{flex:1,padding:'10px 0',borderRadius:10,border:'none',background:t.gold,color:'#fff',fontSize:13,fontWeight:700,cursor:'pointer',opacity:saving?0.6:1}}>
            {saving?'Criando...':'Criar'}
          </button>
        </div>
      </div>
    </div>)
}

// ─── WEEK GRID (with admin reorder per day) ────────────
function Grid({dates,label,reservations,cleanings,t,onCellClick,onEmptyClick,isAdm,token,onReordered}:{dates:Date[];label:string;reservations:Res[];cleanings:Cln[];t:T;onCellClick:(c:DayCell)=>void;onEmptyClick:(date:string)=>void;isAdm:boolean;token:string;onReordered:()=>void}){
  const [reorderCol,setReorderCol]=useState<number|null>(null) // which day column is in reorder mode
  const [localOrder,setLocalOrder]=useState<string[]>(APTS) // apt order for the reorder column
  const longPressTimer=useRef<any>(null)

  // Build grid: rows=apts, cols=days. For reorder column, use localOrder instead of APTS
  const grid=useMemo(()=>{
    return APTS.map((apt,ri)=>dates.map((day,ci):DayCell=>{
      const d=ds(day)
      // If this column is being reordered, use localOrder for row mapping
      const effectiveApt=(reorderCol===ci)?localOrder[ri]||apt:apt
      const cl=cleanings.find(c=>c.apartment_code===effectiveApt&&((c.scheduled_date||'').slice(0,10)===d||(c.cleaning_date||'').slice(0,10)===d))
      if(cl){
        if(cl.completed||cl.status==='concluida')return{type:'done',apt:effectiveApt,cleaning:cl,date:d}
        if(isLate(d))return{type:'late',apt:effectiveApt,cleaning:cl,date:d}
        return{type:'pending',apt:effectiveApt,cleaning:cl,date:d}
      }
      const occ=reservations.some(r=>r.apartment_code===effectiveApt&&d>=r.checkin&&d<r.checkout)
      if(occ)return{type:'occupied',apt:effectiveApt,date:d}
      return{type:'empty',apt:effectiveApt,date:d}
    }))
  },[dates,reservations,cleanings,reorderCol,localOrder])

  const startReorder=(colIdx:number)=>{
    if(!isAdm)return
    setReorderCol(colIdx)
    setLocalOrder([...APTS])
  }

  const moveRow=(rowIdx:number,dir:-1|1)=>{
    const newIdx=rowIdx+dir
    if(newIdx<0||newIdx>=APTS.length)return
    setLocalOrder(prev=>{const n=[...prev];[n[rowIdx],n[newIdx]]=[n[newIdx],n[rowIdx]];return n})
  }

  const saveReorder=async()=>{
    if(reorderCol===null)return
    const d=ds(dates[reorderCol])
    // Build orders: for each apt in localOrder, find the cleaning on that day and set sort_order
    const orders:any[]=[]
    localOrder.forEach((apt,i)=>{
      const cl=cleanings.find(c=>c.apartment_code===apt&&((c.scheduled_date||'').slice(0,10)===d||(c.cleaning_date||'').slice(0,10)===d))
      if(cl?.id)orders.push({id:cl.id,sort_order:i})
    })
    if(orders.length>0){
      try{await fetch('/api/limpezas',{method:'POST',headers:apiH(token),body:JSON.stringify({action:'reorder-cleanings',orders})})}catch{}
    }
    setReorderCol(null)
    onReordered()
  }

  const cancelReorder=()=>{setReorderCol(null);setLocalOrder([...APTS])}

  // Long press handler for cells
  const handlePointerDown=(ci:number)=>{
    if(!isAdm)return
    longPressTimer.current=setTimeout(()=>startReorder(ci),500)
  }
  const handlePointerUp=()=>{if(longPressTimer.current){clearTimeout(longPressTimer.current);longPressTimer.current=null}}

  return(
    <div style={{background:t.cardBg,borderRadius:12,border:`2px solid ${t.border}`,overflow:'hidden',marginBottom:14}}>
      <div style={{padding:'8px 12px',borderBottom:`1.5px solid ${t.border}`,display:'flex',justifyContent:'space-between',alignItems:'center'}}>
        <span style={{fontSize:12,fontWeight:800,color:t.labelColor,textTransform:'uppercase',letterSpacing:'0.06em'}}>{label}</span>
        {reorderCol!==null&&<div style={{display:'flex',gap:6}}>
          <button onClick={saveReorder} style={{fontSize:9,fontWeight:700,padding:'3px 10px',borderRadius:6,border:'none',background:t.green,color:'#fff',cursor:'pointer'}}>✓ Salvar</button>
          <button onClick={cancelReorder} style={{fontSize:9,fontWeight:600,padding:'3px 10px',borderRadius:6,border:`1px solid ${t.border}`,background:'transparent',color:t.textSecondary,cursor:'pointer'}}>Cancelar</button>
        </div>}
      </div>
      <div style={{display:'grid',gridTemplateColumns:'repeat(7,1fr)',borderBottom:`1.5px solid ${t.border}`}}>
        {dates.map((day,i)=>{const td=isToday(day);const reordering=reorderCol===i;return(
          <div key={i} style={{textAlign:'center',padding:'6px 2px',background:reordering?t.gold+'20':td?t.goldBg:'transparent',borderRight:i<6?`1px solid ${t.borderInner}`:'none',transition:'background 0.2s'}}>
            <div style={{fontSize:9,fontWeight:700,color:reordering?t.gold:td?t.gold:t.textSecondary}}>{DAYS_L[day.getDay()]}</div>
            <div style={{fontSize:11,fontWeight:800,color:reordering?t.gold:td?t.gold:t.textPrimary}}>{fmt(day)}</div>
            {reordering&&<div style={{fontSize:7,color:t.gold,marginTop:1}}>↕ editando</div>}
          </div>)})}
      </div>
      {grid.map((row,ri)=>(
        <div key={ri} style={{display:'grid',gridTemplateColumns:'repeat(7,1fr)',borderBottom:ri<grid.length-1?`1.5px solid ${t.borderInner}`:'none',minHeight:52}}>
          {row.map((cell,ci)=>{
            const reordering=reorderCol===ci
            return(
            <div key={ci}
              onPointerDown={()=>!reordering&&handlePointerDown(ci)}
              onPointerUp={handlePointerUp}
              onPointerLeave={handlePointerUp}
              onClick={()=>{
                if(reordering)return
                if(cell.cleaning)onCellClick(cell)
                else if(cell.type==='empty'&&isAdm)onEmptyClick(cell.date)
              }}
              style={{display:'flex',alignItems:'center',justifyContent:'center',height:52,borderRight:ci<6?`1px solid ${t.borderInner}40`:'none',position:'relative',overflow:'hidden',
                cursor:reordering?'default':cell.cleaning||(cell.type==='empty'&&isAdm)?'pointer':'default',
                background:reordering?t.gold+'08':'transparent',transition:'background 0.2s'}}>
              {reordering?(
                <div style={{display:'flex',alignItems:'center',gap:2}}>
                  {ri>0&&<button onClick={(e)=>{e.stopPropagation();moveRow(ri,-1)}} style={{width:16,height:16,borderRadius:4,border:'none',background:t.btnBg,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',fontSize:8,color:t.textSecondary,padding:0}}>↑</button>}
                  <Cell cell={cell} t={t}/>
                  {ri<APTS.length-1&&<button onClick={(e)=>{e.stopPropagation();moveRow(ri,1)}} style={{width:16,height:16,borderRadius:4,border:'none',background:t.btnBg,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',fontSize:8,color:t.textSecondary,padding:0}}>↓</button>}
                </div>
              ):(<Cell cell={cell} t={t}/>)}
            </div>)})}
        </div>))}
    </div>)
}

// ─── LEGEND ────────────────────────────────────────────
function Leg({t}:{t:T}){return(
  <div style={{display:'flex',alignItems:'center',gap:14,flexWrap:'wrap',padding:'6px 2px'}}>
    {[{l:'Pendente',bd:t.yellowBorder,c:t.yellow,i:'◷',bg:'transparent'},{l:'Concluída',bd:t.greenBorder,c:t.green,i:'✓',bg:t.greenBg},{l:'Atrasada',bd:t.redBorder,c:t.warnIcon,i:'⚠',bg:'transparent'}].map(x=>(
      <div key={x.l} style={{display:'flex',alignItems:'center',gap:5,fontSize:10,color:t.textSecondary}}>
        <div style={{width:22,height:15,borderRadius:4,background:x.bg,border:`1.5px solid ${x.bd}`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:9,fontWeight:700,color:x.c}}>{x.i}</div>{x.l}
      </div>))}
    <div style={{display:'flex',alignItems:'center',gap:5,fontSize:10,color:t.textSecondary}}>
      <div style={{width:22,height:15,borderRadius:4,overflow:'hidden',border:`1.5px solid ${t.borderInner}`}}><svg width="22" height="15" style={{display:'block'}}><rect width="22" height="15" fill={`url(#${t.hachId})`}/></svg></div>Ocupado
    </div>
  </div>)}

// ─── LOGIN ─────────────────────────────────────────────
function Login({onLogin,t}:{onLogin:(u:string,p:string)=>void;t:T}){
  const [u,setU]=useState('');const [p,setP]=useState('');const [show,setShow]=useState(false);const [er,setEr]=useState('');const [ld,setLd]=useState(false)
  const go=async()=>{
    if(!u||!p){setEr('Preencha usuário e senha');return}
    setLd(true);setEr('')
    try{const r=await fetch('/api/limpezas',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'login',username:u,password:p,context:'leblon'})})
      const d=await r.json();if(!r.ok||d.error){setEr(d.error||'Credenciais inválidas');setLd(false);return}
      localStorage.setItem('giro_auth',btoa(`${u}:${p}`));localStorage.setItem('giro_user',JSON.stringify(d));onLogin(u,p)
    }catch{setEr('Erro de conexão')};setLd(false)}
  return(
    <div style={{minHeight:'100vh',background:t.bg,display:'flex',alignItems:'center',justifyContent:'center',padding:24}}>
      <div style={{width:'100%',maxWidth:320,textAlign:'center'}}>
        <img src="/images/logo.png" alt="Giro Temporada" style={{width:56,height:56,borderRadius:16,margin:'0 auto 16px'}} />
        <h1 style={{fontSize:18,fontWeight:700,color:t.textPrimary,marginBottom:4}}>Giro Temporada</h1>
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

// ─── MAIN PAGE ─────────────────────────────────────────
export default function GiroPage(){
  const [authed,setAuthed]=useState(false);const [token,setToken]=useState('')
  const [dark,setDark]=useState(false);const [loading,setLoading]=useState(true);const [refreshing,setRefreshing]=useState(false)
  const [activeTab,setActiveTab]=useState<'agenda'|'custos'|'chat'|'config'>('agenda')
  const [res,setRes]=useState<Res[]>([]);const [clns,setClns]=useState<Cln[]>([])
  const [user,setUser]=useState<AppUser|null>(null);const [cleaners,setCleaners]=useState<AppUser[]>([])
  const [modal,setModal]=useState<DayCell|null>(null);const [createDate,setCreateDate]=useState<string|null>(null)
  const t=dark?DK:LT
  const isAdm=user?.role==='admin'

  useEffect(()=>{
    const s=localStorage.getItem('giro_auth'),tp=localStorage.getItem('giro_theme'),u=localStorage.getItem('giro_user')
    if(tp==='dark')setDark(true)
    if(s){setToken(s);setAuthed(true);if(u)try{setUser(JSON.parse(u))}catch{}}else{setLoading(false)}
  },[])
  useEffect(()=>{localStorage.setItem('giro_theme',dark?'dark':'light')},[dark])

  // PWA: override manifest and meta tags for Giro Temporada
  useEffect(()=>{
    const ml=document.querySelector('link[rel="manifest"]')
    if(ml)ml.setAttribute('href','/manifest-giro.json')
    const tc=document.querySelector('meta[name="theme-color"]')
    if(tc)tc.setAttribute('content','#b08a40')
    const at=document.querySelector('meta[name="apple-mobile-web-app-title"]')
    if(at)at.setAttribute('content','Giro Temporada')
    document.title='Giro Temporada'
  },[])

  const fetchData=useCallback(async(tk:string)=>{
    try{
      setRefreshing(true);const h={Authorization:`Basic ${tk}`}
      try{const r=await fetch('/api/limpezas?action=cleanings',{headers:h});if(r.ok){const d=await r.json();setClns(Array.isArray(d)?d:[])}}catch{}
      try{const r=await fetch('/api/equipe');if(r.ok){const d=await r.json();const raw=d?.reservations||d||[]
        setRes((Array.isArray(raw)?raw:[]).map((r:any)=>({...r,checkin:r.checkin?.slice(0,10)||'',checkout:r.checkout?.slice(0,10)||''})))}}catch{}
      try{const r=await fetch('/api/limpezas?action=users',{headers:h});if(r.ok){const d=await r.json();setCleaners(Array.isArray(d)?d:[])}}catch{}
    }catch(e){console.error(e)}
    finally{setLoading(false);setRefreshing(false)}
  },[])

  useEffect(()=>{if(authed&&token)fetchData(token)},[authed,token,fetchData])

  const handleLogin=(u:string,p:string)=>{const tk=btoa(`${u}:${p}`);setToken(tk);setAuthed(true)}
  const refresh=()=>{if(token)fetchData(token)}
  const logout=()=>{localStorage.removeItem('giro_auth');localStorage.removeItem('giro_user');setAuthed(false);setToken('');setUser(null);setLoading(false)}

  if(!authed)return<Login onLogin={handleLogin} t={t}/>
  const w1=weekDates(0),w2=weekDates(1)

  return(
    <div style={{background:t.bg,minHeight:'100vh',transition:'background 0.3s',fontFamily:"'DM Sans',system-ui,-apple-system,sans-serif"}}>
      <Hach/>
      <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>

      {/* Header */}
      <div style={{position:'sticky',top:0,zIndex:20,background:t.bg+'f2',backdropFilter:'blur(10px)',borderBottom:`2px solid ${t.border}`,padding:'10px 12px',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
        <div style={{display:'flex',alignItems:'center',gap:8}}>
          <img src="/images/logo.png" alt="Giro" style={{width:32,height:32,borderRadius:8}} />
          <div>
            <div style={{fontSize:15,fontWeight:700,color:t.textPrimary}}>Giro Temporada</div>
            {user&&<div style={{fontSize:9,color:t.textSecondary}}>{user.display_name} ({user.role})</div>}
          </div>
        </div>
        <div style={{display:'flex',alignItems:'center',gap:8}}>
          <button onClick={()=>setDark(!dark)} style={{width:44,height:24,borderRadius:12,border:'none',background:dark?t.gold+'30':'#2e221c20',position:'relative',cursor:'pointer',transition:'background 0.3s',padding:0}}>
            <div style={{width:20,height:20,borderRadius:10,background:dark?t.gold:'#3a3028',position:'absolute',top:2,left:dark?22:2,transition:'left 0.3s,background 0.3s',display:'flex',alignItems:'center',justifyContent:'center'}}>
              <span style={{fontSize:10,color:dark?'#1a1a22':'#faf8f5'}}>{dark?'☀':'☾'}</span>
            </div>
          </button>
          <button onClick={refresh} disabled={refreshing} style={{display:'flex',alignItems:'center',gap:5,padding:'6px 14px',fontSize:10,fontWeight:700,borderRadius:8,border:`1.5px solid ${t.btnBorder}`,background:t.btnBg,color:t.btnText,cursor:refreshing?'wait':'pointer',opacity:refreshing?0.7:1}}>
            <RefreshCw size={12} style={refreshing?{animation:'spin 1s linear infinite'}:{}}/>Atualizar
          </button>
          <button onClick={logout} style={{fontSize:9,color:t.textSecondary,background:'none',border:'none',cursor:'pointer',textDecoration:'underline'}}>Sair</button>
        </div>
      </div>

      {/* Content — tab views */}
      <div style={{paddingBottom:60}}>
        {activeTab==='agenda'&&(loading?(
          <div style={{display:'flex',justifyContent:'center',padding:'60px 0'}}><Loader2 size={20} style={{animation:'spin 1s linear infinite',color:t.gold}}/></div>
        ):(
          <div style={{padding:'12px 10px',maxWidth:600,margin:'0 auto'}}>
            <Grid dates={w1} label="Semana Atual" reservations={res} cleanings={clns} t={t} isAdm={!!isAdm} token={token} onCellClick={c=>setModal(c)} onEmptyClick={d=>isAdm&&setCreateDate(d)} onReordered={refresh}/>
            <Grid dates={w2} label="Próxima Semana" reservations={res} cleanings={clns} t={t} isAdm={!!isAdm} token={token} onCellClick={c=>setModal(c)} onEmptyClick={d=>isAdm&&setCreateDate(d)} onReordered={refresh}/>
            <Leg t={t}/>
            {isAdm&&<div style={{textAlign:'center',marginTop:8}}>
              <span style={{fontSize:9,color:t.textSecondary,opacity:0.6}}>Toque num dia vazio para criar limpeza</span>
            </div>}
          </div>
        ))}

        {activeTab==='custos'&&<div style={{padding:'40px 20px',textAlign:'center',color:t.textSecondary,fontSize:13}}>Custos — em breve</div>}
        {activeTab==='chat'&&user&&<ChatTab t={t} token={token} user={user} allUsers={cleaners}/>}
        {activeTab==='config'&&<div style={{maxWidth:600,margin:'0 auto'}}>
          <ContactsTab t={t} token={token} userId={user?.id}/>
        </div>}
      </div>

      {/* Modals */}
      {modal&&modal.cleaning&&user&&<CleaningModal cell={modal} t={t} token={token} user={user} cleaners={cleaners} reservations={res} onClose={()=>setModal(null)} onSaved={refresh}/>}
      {createDate&&<CreateModal date={createDate} t={t} token={token} onClose={()=>setCreateDate(null)} onSaved={refresh}/>}

      {/* Bottom Navigation */}
      <div style={{position:'fixed',bottom:0,left:0,right:0,zIndex:30,background:t.bg,borderTop:`1.5px solid ${t.border}`,display:'flex',justifyContent:'space-around',padding:'6px 0 env(safe-area-inset-bottom, 8px)'}}>
        {([
          {key:'agenda',label:'Agenda',icon:CalendarDays},
          {key:'custos',label:'Custos',icon:DollarSign},
          {key:'chat',label:'Chat',icon:MessageSquare},
          {key:'config',label:'Config',icon:Settings},
        ] as const).map(tab=>{
          const active=activeTab===tab.key
          return(
            <button key={tab.key} onClick={()=>setActiveTab(tab.key)}
              style={{display:'flex',flexDirection:'column',alignItems:'center',gap:2,padding:'4px 8px',background:active?t.gold+'18':'transparent',borderRadius:8,border:'none',cursor:'pointer',transition:'all 0.15s',minWidth:56}}>
              <tab.icon size={18} style={{color:active?t.gold:t.textSecondary}}/>
              <span style={{fontSize:9,fontWeight:active?700:500,color:active?t.gold:t.textSecondary}}>{tab.label}</span>
            </button>)
        })}
      </div>
    </div>)
}
