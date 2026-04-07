import { NextRequest, NextResponse } from 'next/server'

interface TurnosState {
  ultimoTurno: number
  turnoActual: number | null
  cola: number[]
}

declare global {
  var turnosState: TurnosState | undefined
}

if (!global.turnosState) {
  global.turnosState = {
    ultimoTurno: 0,
    turnoActual: null,
    cola: [],
  }
}

export function GET() {
  return NextResponse.json({ ...global.turnosState })
}

export async function POST(request: NextRequest) {
  let body: { accion?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Cuerpo inválido' }, { status: 400 })
  }

  const state = global.turnosState!

  switch (body.accion) {
    case 'solicitar': {
      state.ultimoTurno += 1
      state.cola.push(state.ultimoTurno)
      return NextResponse.json({ turno: state.ultimoTurno, estado: { ...state, cola: [...state.cola] } })
    }

    case 'llamar': {
      if (state.cola.length === 0) {
        return NextResponse.json({ error: 'No hay turnos en espera' }, { status: 400 })
      }
      state.turnoActual = state.cola.shift()!
      return NextResponse.json({ turnoActual: state.turnoActual, estado: { ...state, cola: [...state.cola] } })
    }

    case 'reset': {
      global.turnosState = { ultimoTurno: 0, turnoActual: null, cola: [] }
      return NextResponse.json({ estado: { ...global.turnosState } })
    }

    default:
      return NextResponse.json({ error: 'Acción inválida' }, { status: 400 })
  }
}
