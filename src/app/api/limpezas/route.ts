// src/app/api/limpezas/route.ts
// Main API for the cleaning app (Sua Casa Limpezas / Giro Temporada)
// Handles: auth, cleanings CRUD, checklist, photos, expenses, contacts, maintenance, fixed expenses, users

import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

function hash(pw: string) {
  return crypto.createHash('sha256').update(pw).digest('hex')
}

function json(data: any, status = 200) {
  return NextResponse.json(data, {
    status,
    headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET, POST, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type, Authorization' }
  })
}

function err(msg: string, status = 400) {
  return json({ error: msg }, status)
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET, POST, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type, Authorization' }
  })
}

// Extract user from Authorization header (Basic base64(username:password))
async function getUser(req: NextRequest) {
  const auth = req.headers.get('authorization')
  if (!auth?.startsWith('Basic ')) return null
  try {
    const decoded = Buffer.from(auth.slice(6), 'base64').toString()
    const [username, password] = decoded.split(':')
    const { data } = await supabase
      .from('app_users')
      .select('*')
      .eq('username', username)
      .eq('password', hash(password))
      .single()
    return data
  } catch { return null }
}

function isAdmin(user: any) { return user?.role === 'admin' }

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const action = searchParams.get('action')

  if (action === 'health') return json({ status: 'ok', timestamp: new Date().toISOString() })

  const user = await getUser(req)
  if (!user) return err('Unauthorized', 401)

  // === CLEANINGS ===
  if (action === 'cleanings') {
    const week = searchParams.get('week')
    let query = supabase.from('cleanings').select('*').order('scheduled_date').order('sort_order')
    if (week) {
      const start = new Date(week)
      const end = new Date(start); end.setDate(end.getDate() + 6)
      const startStr = `${start.getFullYear()}-${String(start.getMonth()+1).padStart(2,'0')}-${String(start.getDate()).padStart(2,'0')}`
      const endStr = `${end.getFullYear()}-${String(end.getMonth()+1).padStart(2,'0')}-${String(end.getDate()).padStart(2,'0')}`
      query = query.gte('scheduled_date', startStr)
                    .lte('scheduled_date', endStr)
    }
    const { data, error } = await query
    if (error) return err(error.message, 500)
    return json(data)
  }

  // Single cleaning with checklist
  if (action === 'cleaning') {
    const id = searchParams.get('id')
    if (!id) return err('Missing id')
    const { data: cleaning } = await supabase.from('cleanings').select('*').eq('id', id).single()
    if (!cleaning) return err('Not found', 404)
    const { data: checklist } = await supabase
      .from('cleaning_checklist')
      .select('*, checklist_items(*)')
      .eq('cleaning_id', id)
    if (!checklist || checklist.length === 0) {
      const { data: items } = await supabase.from('checklist_items').select('*')
      if (items && items.length > 0) {
        const entries = items.map(item => ({ cleaning_id: id, checklist_item_id: item.id, completed: false }))
        await supabase.from('cleaning_checklist').upsert(entries, { onConflict: 'cleaning_id,checklist_item_id' })
        const { data: fresh } = await supabase.from('cleaning_checklist').select('*, checklist_items(*)').eq('cleaning_id', id)
        return json({ ...cleaning, checklist: fresh })
      }
    }
    return json({ ...cleaning, checklist })
  }

  if (action === 'checklist-items') {
    const { data } = await supabase.from('checklist_items').select('*').order('category').order('title')
    return json(data || [])
  }

  if (action === 'expense-categories') {
    const { data } = await supabase.from('expense_categories').select('*').order('name')
    return json(data || [])
  }

  if (action === 'expenses') {
    const month = searchParams.get('month'), year = searchParams.get('year'), apt = searchParams.get('apartment')
    let query = supabase.from('app_expenses').select('*, expense_categories(name)').order('expense_date', { ascending: false })
    if (month && year) {
      const startDate = `${year}-${month.padStart(2, '0')}-01`
      const endD = new Date(+year, +month, 0); const endDate = `${endD.getFullYear()}-${String(endD.getMonth()+1).padStart(2,'0')}-${String(endD.getDate()).padStart(2,'0')}`
      query = query.gte('expense_date', startDate).lte('expense_date', endDate)
    }
    if (apt) query = query.eq('apartment_code', apt)
    if (!isAdmin(user)) query = query.eq('submitted_by', user.id)
    const { data } = await query
    return json(data || [])
  }

  if (action === 'contacts') {
    const { data } = await supabase.from('contacts').select('*').order('name')
    return json(data || [])
  }

  if (action === 'maintenance') {
    const { data } = await supabase.from('maintenance_items').select('*').order('next_due_date', { ascending: true, nullsFirst: false })
    return json(data || [])
  }

  if (action === 'fixed-expenses') {
    const month = searchParams.get('month') || String(new Date().getMonth() + 1)
    const year = searchParams.get('year') || String(new Date().getFullYear())
    const { data: expenses } = await supabase.from('fixed_expenses').select('*').eq('active', true).order('label')
    const { data: payments } = await supabase.from('fixed_expense_payments').select('*').eq('month', +month).eq('year', +year)
    const merged = (expenses || []).map(exp => {
      const payment = (payments || []).find((p: any) => p.fixed_expense_id === exp.id)
      return { ...exp, payment: payment || null, paid: (payment as any)?.paid || false }
    })
    return json(merged)
  }

  if (action === 'cleaner-payments') {
    const cleanerId = searchParams.get('cleaner_id')
    let query = supabase.from('cleaner_payments').select('*').order('created_at', { ascending: false })
    if (cleanerId) query = query.eq('cleaner_id', cleanerId)
    if (!isAdmin(user)) query = query.eq('cleaner_id', user.id)
    const { data } = await query
    return json(data || [])
  }

  if (action === 'users') {
    if (isAdmin(user)) {
      const { data } = await supabase.from('app_users').select('id, username, display_name, role, pix_key, created_at').order('display_name')
      return json(data || [])
    }
    return json([{ id: user.id, username: user.username, display_name: user.display_name, role: user.role }])
  }

  if (action === 'chats') {
    const { data } = await supabase.from('chats').select('*').order('updated_at', { ascending: false })
    return json(data || [])
  }

  if (action === 'messages') {
    const chatId = searchParams.get('chat_id')
    if (!chatId) return err('Missing chat_id')
    const { data } = await supabase.from('messages').select('*').eq('chat_id', chatId).order('created_at')
    return json(data || [])
  }

  if (action === 'costs-summary') {
    const month = searchParams.get('month'), year = searchParams.get('year') || String(new Date().getFullYear()), apt = searchParams.get('apartment')
    let cQ = supabase.from('cleanings').select('apartment_code, cleaning_cost, cost, scheduled_date, completed')
    if (year) cQ = cQ.gte('scheduled_date', `${year}-01-01`).lte('scheduled_date', `${year}-12-31`)
    if (month) {
      const s = `${year}-${month.padStart(2, '0')}-01`, eD = new Date(+year, +month, 0), e = `${eD.getFullYear()}-${String(eD.getMonth()+1).padStart(2,'0')}-${String(eD.getDate()).padStart(2,'0')}`
      cQ = cQ.gte('scheduled_date', s).lte('scheduled_date', e)
    }
    if (apt) cQ = cQ.eq('apartment_code', apt)
    const { data: cData } = await cQ
    let eQ = supabase.from('app_expenses').select('apartment_code, amount, expense_date, category_id, expense_categories(name)')
    if (apt) eQ = eQ.eq('apartment_code', apt)
    const { data: eData } = await eQ
    return json({ cleanings: cData || [], expenses: eData || [] })
  }

  return err('Unknown action')
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const action = body.action

  // === AUTH (no user needed) ===
  if (action === 'login') {
    const { username, password } = body
    if (!username || !password) return err('Missing credentials')
    const { data } = await supabase
      .from('app_users')
      .select('id, username, display_name, role, pix_key')
      .eq('username', username)
      .eq('password', hash(password))
      .single()
    if (!data) return err('Invalid credentials', 401)
    await supabase.from('login_logs').insert({ user_id: data.id, username: data.username, display_name: data.display_name })
    return json(data)
  }

  const user = await getUser(req)

  if (action === 'change-password') {
    if (!user) return err('Unauthorized', 401)
    const { current_password, new_password } = body
    if (hash(current_password) !== user.password) return err('Wrong password')
    await supabase.from('app_users').update({ password: hash(new_password) }).eq('id', user.id)
    return json({ success: true })
  }

  if (!user) return err('Unauthorized', 401)

  // === UPSERT CLEANING (admin only) ===
  if (action === 'upsert-cleaning') {
    if (!isAdmin(user)) return err('Admin only', 403)
    const { id, ...data } = body.cleaning
    if (id) {
      const { data: updated, error } = await supabase.from('cleanings').update({ ...data, updated_at: new Date().toISOString() }).eq('id', id).select().single()
      if (error) return err(error.message, 500)
      return json(updated)
    }
    const { data: created, error } = await supabase.from('cleanings').insert(data).select().single()
    if (error) return err(error.message, 500)
    return json(created)
  }

  // === ASSIGN CLEANER ===
  if (action === 'assign-cleaner') {
    const { cleaning_id, cleaner_id, cleaner_name } = body
    const { data: cleaning } = await supabase.from('cleanings').select('cleaner_id').eq('id', cleaning_id).single()
    // If assigned by admin, only admin can change
    if (cleaning?.cleaner_id && !isAdmin(user)) return err('Already assigned - only admin can change', 403)
    // Cleaner can only assign themselves
    if (!isAdmin(user) && cleaner_id !== user.id) return err('Can only assign yourself', 403)
    const { data: updated, error } = await supabase
      .from('cleanings')
      .update({ cleaner_id, cleaner_name, updated_at: new Date().toISOString() })
      .eq('id', cleaning_id).select().single()
    if (error) return err(error.message, 500)
    return json(updated)
  }

  // === COMPLETE CLEANING ===
  if (action === 'complete-cleaning') {
    const { cleaning_id, cost, photos, video_url, extra_costs, notes, guest_count } = body
    if (!photos || photos.length < 2) return err('Minimum 2 photos required')
    if (cost === undefined || cost === null) return err('Cost is required (can be 0)')
    const { data: checklist } = await supabase.from('cleaning_checklist').select('completed').eq('cleaning_id', cleaning_id)
    if (checklist && checklist.length > 0 && !checklist.every((c: any) => c.completed)) return err('Complete all checklist items first')
    const { data: cleaning } = await supabase.from('cleanings').select('cleaner_id').eq('id', cleaning_id).single()
    if (!cleaning?.cleaner_id) return err('Assign a cleaner first')
    const updateData: any = {
      completed: true, status: 'concluida', cleaning_cost: cost, photos,
      video_url: video_url || null, checklist_completed: true,
      completed_at: new Date().toISOString(), manually_edited: true, updated_at: new Date().toISOString()
    }
    if (notes !== undefined) updateData.notes = notes
    if (guest_count !== undefined && guest_count !== null) updateData.guest_count = guest_count
    if (extra_costs !== undefined) updateData.extra_costs = extra_costs
    const { data: updated, error } = await supabase.from('cleanings').update(updateData).eq('id', cleaning_id).select().single()
    if (error) return err(error.message, 500)
    return json(updated)
  }

  // === TOGGLE CHECKLIST ===
  if (action === 'toggle-checklist') {
    const { cleaning_id, checklist_item_id, completed } = body
    const { data, error } = await supabase.from('cleaning_checklist').upsert({
      cleaning_id, checklist_item_id, completed,
      completed_by: completed ? user.id : null,
      completed_at: completed ? new Date().toISOString() : null
    }, { onConflict: 'cleaning_id,checklist_item_id' }).select().single()
    if (error) return err(error.message, 500)
    return json(data)
  }

  // === REORDER ===
  if (action === 'reorder-cleanings') {
    if (!isAdmin(user)) return err('Admin only', 403)
    for (const o of body.orders) {
      await supabase.from('cleanings').update({ sort_order: o.sort_order, manually_edited: true }).eq('id', o.id)
    }
    return json({ success: true })
  }

  // === EXPENSES ===
  if (action === 'create-expense') {
    const expense = { ...body.expense, submitted_by: user.id, created_at: new Date().toISOString() }
    const { data, error } = await supabase.from('app_expenses').insert(expense).select().single()
    if (error) return err(error.message, 500)
    return json(data)
  }

  if (action === 'update-expense') {
    const { id, ...updates } = body.expense
    if (!isAdmin(user)) {
      const { data: existing } = await supabase.from('app_expenses').select('submitted_by').eq('id', id).single()
      if (existing?.submitted_by !== user.id) return err('Can only edit your own expenses', 403)
    }
    const { data, error } = await supabase.from('app_expenses').update(updates).eq('id', id).select().single()
    if (error) return err(error.message, 500)
    return json(data)
  }

  // === FIXED EXPENSES ===
  if (action === 'mark-fixed-paid') {
    if (!isAdmin(user)) return err('Admin only', 403)
    const { fixed_expense_id, month, year, amount_paid } = body
    const { data, error } = await supabase.from('fixed_expense_payments').upsert({
      fixed_expense_id, month, year, amount_paid: amount_paid || 0,
      paid: true, paid_at: new Date().toISOString(), paid_by: user.id
    }, { onConflict: 'fixed_expense_id,month,year' }).select().single()
    if (error) return err(error.message, 500)
    return json(data)
  }

  if (action === 'upsert-fixed-expense') {
    if (!isAdmin(user)) return err('Admin only', 403)
    const { id, ...data } = body.expense
    if (id) {
      const { data: updated, error } = await supabase.from('fixed_expenses').update(data).eq('id', id).select().single()
      if (error) return err(error.message, 500)
      return json(updated)
    }
    const { data: created, error } = await supabase.from('fixed_expenses').insert(data).select().single()
    if (error) return err(error.message, 500)
    return json(created)
  }

  // === CONTACTS ===
  if (action === 'upsert-contact') {
    if (!isAdmin(user)) return err('Admin only', 403)
    const { id, ...data } = body.contact
    if (id) {
      const { data: u, error } = await supabase.from('contacts').update(data).eq('id', id).select().single()
      if (error) return err(error.message, 500)
      return json(u)
    }
    const { data: c, error } = await supabase.from('contacts').insert(data).select().single()
    if (error) return err(error.message, 500)
    return json(c)
  }

  // === MAINTENANCE ===
  if (action === 'upsert-maintenance') {
    if (!isAdmin(user)) return err('Admin only', 403)
    const { id, ...data } = body.item
    if (id) {
      const { data: u, error } = await supabase.from('maintenance_items').update(data).eq('id', id).select().single()
      if (error) return err(error.message, 500)
      return json(u)
    }
    const { data: c, error } = await supabase.from('maintenance_items').insert(data).select().single()
    if (error) return err(error.message, 500)
    return json(c)
  }

  if (action === 'mark-maintenance-done') {
    const { id } = body
    const { data: item } = await supabase.from('maintenance_items').select('frequency_days').eq('id', id).single()
    const nextDueD = item?.frequency_days ? new Date(Date.now() + item.frequency_days * 86400000) : null
    const nextDue = nextDueD ? `${nextDueD.getFullYear()}-${String(nextDueD.getMonth()+1).padStart(2,'0')}-${String(nextDueD.getDate()).padStart(2,'0')}` : null
    const { data, error } = await supabase.from('maintenance_items')
      .update({ last_done_at: new Date().toISOString(), next_due_date: nextDue }).eq('id', id).select().single()
    if (error) return err(error.message, 500)
    return json(data)
  }

  // === USERS (admin) ===
  if (action === 'create-user') {
    if (!isAdmin(user)) return err('Admin only', 403)
    const { username, password, display_name, role } = body
    const { data, error } = await supabase.from('app_users').insert({
      username, password: hash(password), display_name, role: role || 'cleaner'
    }).select('id, username, display_name, role').single()
    if (error) return err(error.message, 500)
    return json(data)
  }

  // === CHAT ===
  if (action === 'send-message') {
    const { chat_id, content } = body
    if (!chat_id) {
      const { data: chat } = await supabase.from('chats').insert({
        name: body.chat_name || 'Novo chat', created_by: user.id, participants: [user.id]
      }).select().single()
      if (!chat) return err('Failed to create chat', 500)
      const { data: msg } = await supabase.from('messages').insert({ chat_id: chat.id, sender_id: user.id, content }).select().single()
      return json({ chat, message: msg })
    }
    const { data: msg, error } = await supabase.from('messages').insert({ chat_id, sender_id: user.id, content }).select().single()
    if (error) return err(error.message, 500)
    await supabase.from('chats').update({ updated_at: new Date().toISOString() }).eq('id', chat_id)
    return json(msg)
  }

  // === DELETE (admin) ===
  if (action === 'delete') {
    if (!isAdmin(user)) return err('Admin only', 403)
    const { table, id } = body
    const allowed = ['cleanings', 'contacts', 'maintenance_items', 'app_expenses', 'expense_categories', 'fixed_expenses', 'checklist_items', 'app_users']
    if (!allowed.includes(table)) return err('Invalid table')
    if (table === 'cleanings') {
      const { data: cl } = await supabase.from('cleanings').select('apartment_code, cleaning_date, scheduled_date').eq('id', id).single()
      if (cl) await supabase.from('deleted_cleanings').insert({ apartment_code: cl.apartment_code, cleaning_date: cl.cleaning_date || cl.scheduled_date })
    }
    const { error } = await supabase.from(table).delete().eq('id', id)
    if (error) return err(error.message, 500)
    return json({ success: true })
  }

  return err('Unknown action')
}
