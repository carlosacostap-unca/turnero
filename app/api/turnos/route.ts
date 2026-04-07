import { NextRequest, NextResponse } from 'next/server'

export interface Slot {
  id: string
  dia: string    // "YYYY-MM-DD"
  hora: string   // "HH:MM"
  ocupado: boolean
  nombre: string
  numero: number | null
}

interface State {
  slots: Slot[]
  enAtencion: string | null  // id del slot en atención
  contador: number
}

declare global {
  var turnosState: State | undefined
}

if (!global.turnosState) {
  global.turnosState = { slots: [], enAtencion: null, contador: 0 }
}

const getEstado = (s: State) => ({
  slots: [...s.slots],
  enAtencion: s.enAtencion,
  contador: s.contador,
})

export function GET() {
  return NextResponse.json(getEstado(global.turnosState!))
}

export async function POST(request: NextRequest) {
  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Cuerpo inválido' }, { status: 400 })
  }

  const state = global.turnosState!

  switch (body.accion) {
    case 'reservar': {
      const { slotId, nombre = '' } = body as { slotId: string; nombre?: string }
      const slot = state.slots.find(s => s.id === slotId)
      if (!slot) return NextResponse.json({ error: 'Turno no encontrado' }, { status: 404 })
      if (slot.ocupado) return NextResponse.json({ error: 'Este horario ya está reservado' }, { status: 409 })
      state.contador += 1
      slot.ocupado = true
      slot.nombre = nombre
      slot.numero = state.contador
      return NextResponse.json({ turno: { ...slot }, estado: getEstado(state) })
    }

    case 'cancelar': {
      const { slotId } = body as { slotId: string }
      const slot = state.slots.find(s => s.id === slotId)
      if (!slot) return NextResponse.json({ error: 'Turno no encontrado' }, { status: 404 })
      if (state.enAtencion === slotId) state.enAtencion = null
      slot.ocupado = false
      slot.nombre = ''
      slot.numero = null
      return NextResponse.json({ estado: getEstado(state) })
    }

    case 'llamar': {
      const booked = state.slots
        .filter(s => s.ocupado)
        .sort((a, b) => a.dia.localeCompare(b.dia) || a.hora.localeCompare(b.hora))
      if (booked.length === 0) return NextResponse.json({ error: 'No hay turnos reservados' }, { status: 400 })
      const currentIdx = state.enAtencion ? booked.findIndex(s => s.id === state.enAtencion) : -1
      const next = booked[currentIdx + 1] ?? booked[0]
      state.enAtencion = next.id
      return NextResponse.json({ slot: { ...next }, estado: getEstado(state) })
    }

    case 'agregar': {
      const { dia, horas } = body as { dia: string; horas: string[] }
      if (!dia || !Array.isArray(horas) || horas.length === 0) {
        return NextResponse.json({ error: 'Datos inválidos' }, { status: 400 })
      }
      const existentes = new Set(state.slots.filter(s => s.dia === dia).map(s => s.hora))
      const nuevos: Slot[] = horas
        .filter(h => !existentes.has(h))
        .map(hora => ({
          id: `${dia}T${hora}-${Math.random().toString(36).slice(2, 9)}`,
          dia, hora, ocupado: false, nombre: '', numero: null,
        }))
      state.slots.push(...nuevos)
      state.slots.sort((a, b) => a.dia.localeCompare(b.dia) || a.hora.localeCompare(b.hora))
      return NextResponse.json({ agregados: nuevos.length, estado: getEstado(state) })
    }

    case 'eliminar': {
      const { slotId } = body as { slotId: string }
      if (state.enAtencion === slotId) state.enAtencion = null
      state.slots = state.slots.filter(s => s.id !== slotId)
      return NextResponse.json({ estado: getEstado(state) })
    }

    case 'reset': {
      global.turnosState = { slots: [], enAtencion: null, contador: 0 }
      return NextResponse.json({ estado: getEstado(global.turnosState) })
    }

    default:
      return NextResponse.json({ error: 'Acción inválida' }, { status: 400 })
  }
}
