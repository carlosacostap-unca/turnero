'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'

interface Slot {
  id: string
  dia: string
  hora: string
  ocupado: boolean
  nombre: string
  numero: number | null
}

interface Estado {
  slots: Slot[]
  enAtencion: string | null
  contador: number
}

function formatDia(iso: string) {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('es-AR', {
    weekday: 'long', day: 'numeric', month: 'long',
  })
}

function generarHoras(desde = '07:00', hasta = '19:30', intervalo = 30): string[] {
  const result: string[] = []
  const [h0, m0] = desde.split(':').map(Number)
  const [h1, m1] = hasta.split(':').map(Number)
  let mins = h0 * 60 + m0
  const end = h1 * 60 + m1
  while (mins <= end) {
    result.push(`${String(Math.floor(mins / 60)).padStart(2, '0')}:${String(mins % 60).padStart(2, '0')}`)
    mins += intervalo
  }
  return result
}

const HORAS = generarHoras()

export default function AdminPage() {
  const [estado, setEstado] = useState<Estado>({ slots: [], enAtencion: null, contador: 0 })
  const [vista, setVista] = useState<'turnos' | 'agregar'>('turnos')
  const [diaAgregar, setDiaAgregar] = useState('')
  const [horasSeleccionadas, setHorasSeleccionadas] = useState<Set<string>>(new Set())
  const [cargandoAgregar, setCargandoAgregar] = useState(false)
  const [feedbackAgregar, setFeedbackAgregar] = useState('')
  const [feedback, setFeedback] = useState<{ tipo: 'ok' | 'error'; msg: string } | null>(null)

  const cargar = useCallback(async () => {
    try {
      const res = await fetch('/api/turnos')
      const data = await res.json()
      setEstado(data)
    } catch {
      // ignore
    }
  }, [])

  useEffect(() => {
    cargar()
    const t = setInterval(cargar, 3000)
    return () => clearInterval(t)
  }, [cargar])

  function mostrarFeedback(tipo: 'ok' | 'error', msg: string) {
    setFeedback({ tipo, msg })
    setTimeout(() => setFeedback(null), 4000)
  }

  async function accion(body: Record<string, unknown>) {
    const res = await fetch('/api/turnos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    const data = await res.json()
    if (res.ok && data.estado) setEstado(data.estado)
    return { ok: res.ok, data }
  }

  async function llamarSiguiente() {
    const { ok, data } = await accion({ accion: 'llamar' })
    ok
      ? mostrarFeedback('ok', `Llamando turno ${data.slot.hora} hs${data.slot.nombre ? ' — ' + data.slot.nombre : ''}`)
      : mostrarFeedback('error', data.error)
  }

  async function cancelarReserva(slotId: string) {
    const { ok, data } = await accion({ accion: 'cancelar', slotId })
    ok ? mostrarFeedback('ok', 'Reserva cancelada') : mostrarFeedback('error', data.error)
  }

  async function eliminarSlot(slotId: string) {
    await accion({ accion: 'eliminar', slotId })
  }

  async function agregarSlots() {
    if (!diaAgregar || horasSeleccionadas.size === 0) return
    setCargandoAgregar(true)
    const { ok, data } = await accion({ accion: 'agregar', dia: diaAgregar, horas: [...horasSeleccionadas] })
    if (ok) {
      setHorasSeleccionadas(new Set())
      setFeedbackAgregar(`Se agregaron ${data.agregados} horario${data.agregados !== 1 ? 's' : ''}.`)
    }
    setCargandoAgregar(false)
  }

  async function resetear() {
    if (!window.confirm('¿Reiniciar el sistema? Se eliminarán todos los turnos y reservas.')) return
    const { ok } = await accion({ accion: 'reset' })
    if (ok) mostrarFeedback('ok', 'Sistema reiniciado')
  }

  const diasUnicos = [...new Set(estado.slots.map(s => s.dia))].sort()
  const slotActual = estado.slots.find(s => s.id === estado.enAtencion)
  const reservados = estado.slots.filter(s => s.ocupado)
  const hoy = new Date().toISOString().slice(0, 10)

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      <header className="bg-gray-800 text-white shadow-lg">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <h1 className="text-xl font-bold">Administración de Turnos</h1>
          <div className="flex gap-4">
            <Link href="/panel" className="text-sm text-gray-300 hover:text-white">Panel →</Link>
            <Link href="/" className="text-sm text-gray-300 hover:text-white">← Inicio</Link>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-4xl w-full mx-auto px-6 py-8 flex flex-col gap-6">

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: 'Total slots', val: estado.slots.length, color: 'text-gray-700' },
            { label: 'Reservados', val: reservados.length, color: 'text-orange-600' },
            { label: 'Disponibles', val: estado.slots.filter(s => !s.ocupado).length, color: 'text-green-600' },
            { label: 'Atendidos', val: estado.contador, color: 'text-blue-700' },
          ].map(({ label, val, color }) => (
            <div key={label} className="bg-white rounded-xl shadow p-4 text-center">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-1">{label}</p>
              <p className={`text-4xl font-black ${color}`}>{val}</p>
            </div>
          ))}
        </div>

        {/* En atención */}
        {slotActual && (
          <div className="bg-blue-700 text-white rounded-xl shadow-lg px-6 py-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-blue-200 uppercase tracking-widest mb-1">En atención ahora</p>
              <p className="text-3xl font-black">{slotActual.hora} hs</p>
              <p className="text-blue-200 capitalize text-sm">{formatDia(slotActual.dia)}</p>
              {slotActual.nombre && <p className="text-blue-100 text-sm mt-1">{slotActual.nombre}</p>}
            </div>
            <p className="text-6xl font-black text-blue-300 tabular-nums">
              {String(slotActual.numero ?? 0).padStart(3, '0')}
            </p>
          </div>
        )}

        {/* Feedback */}
        {feedback && (
          <div className={`px-4 py-3 rounded-xl border text-sm font-medium ${
            feedback.tipo === 'ok'
              ? 'bg-green-50 border-green-200 text-green-700'
              : 'bg-red-50 border-red-200 text-red-700'
          }`}>
            {feedback.msg}
          </div>
        )}

        {/* Acciones rápidas */}
        <div className="flex gap-3 flex-wrap">
          <button
            onClick={llamarSiguiente}
            disabled={reservados.length === 0}
            className="bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white font-bold px-6 py-3 rounded-xl transition-colors"
          >
            Llamar siguiente turno
          </button>
          <button
            onClick={resetear}
            className="bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 font-semibold px-6 py-3 rounded-xl transition-colors text-sm"
          >
            Reiniciar sistema
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 border-b border-gray-200">
          {(['turnos', 'agregar'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setVista(tab)}
              className={`px-5 py-2.5 text-sm font-semibold rounded-t-lg transition-colors ${
                vista === tab
                  ? 'bg-white text-blue-700 border border-b-white border-gray-200 -mb-px'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab === 'turnos' ? 'Turnos' : 'Agregar turnos'}
            </button>
          ))}
        </div>

        {/* Vista: Turnos */}
        {vista === 'turnos' && (
          <div className="flex flex-col gap-4">
            {diasUnicos.length === 0 ? (
              <div className="bg-white rounded-xl shadow p-10 text-center text-gray-400">
                No hay turnos cargados. Usá la pestaña &quot;Agregar turnos&quot; para empezar.
              </div>
            ) : (
              diasUnicos.map(dia => (
                <div key={dia} className="bg-white rounded-xl shadow overflow-hidden">
                  <div className="bg-gray-50 border-b border-gray-100 px-5 py-3">
                    <h3 className="font-semibold text-gray-700 capitalize">{formatDia(dia)}</h3>
                  </div>
                  <div className="divide-y divide-gray-50">
                    {estado.slots.filter(s => s.dia === dia).map(slot => (
                      <div
                        key={slot.id}
                        className={`flex items-center px-5 py-3 gap-3 ${slot.id === estado.enAtencion ? 'bg-blue-50' : ''}`}
                      >
                        <span className="font-mono font-bold text-gray-700 w-14 shrink-0">{slot.hora}</span>
                        {slot.ocupado ? (
                          <>
                            <span className="text-xs font-bold bg-orange-100 text-orange-600 px-2 py-0.5 rounded-full">Reservado</span>
                            {slot.numero !== null && (
                              <span className="text-xs text-gray-400 tabular-nums">#{String(slot.numero).padStart(3, '0')}</span>
                            )}
                            <span className="text-gray-600 text-sm flex-1 truncate">{slot.nombre || '—'}</span>
                            {slot.id === estado.enAtencion && (
                              <span className="text-xs font-bold bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">En atención</span>
                            )}
                            <button
                              onClick={() => cancelarReserva(slot.id)}
                              className="text-xs text-red-400 hover:text-red-600 transition-colors shrink-0"
                            >
                              Cancelar
                            </button>
                          </>
                        ) : (
                          <>
                            <span className="text-xs font-bold bg-green-100 text-green-600 px-2 py-0.5 rounded-full">Disponible</span>
                            <span className="flex-1" />
                            <button
                              onClick={() => eliminarSlot(slot.id)}
                              className="text-xs text-gray-300 hover:text-red-400 transition-colors"
                            >
                              Eliminar
                            </button>
                          </>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* Vista: Agregar */}
        {vista === 'agregar' && (
          <div className="bg-white rounded-xl shadow p-6 flex flex-col gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-2">Día</label>
              <input
                type="date"
                value={diaAgregar}
                min={hoy}
                onChange={e => {
                  setDiaAgregar(e.target.value)
                  setHorasSeleccionadas(new Set())
                  setFeedbackAgregar('')
                }}
                className="border border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
            </div>

            {diaAgregar && (
              <>
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <label className="text-sm font-medium text-gray-600">
                      Horarios — {horasSeleccionadas.size} seleccionado{horasSeleccionadas.size !== 1 ? 's' : ''}
                    </label>
                    <div className="flex gap-2 text-xs">
                      <button
                        onClick={() => setHorasSeleccionadas(new Set(HORAS.filter(h => !estado.slots.some(s => s.dia === diaAgregar && s.hora === h))))}
                        className="text-blue-500 hover:text-blue-700"
                      >
                        Todos
                      </button>
                      <span className="text-gray-300">|</span>
                      <button onClick={() => setHorasSeleccionadas(new Set())} className="text-gray-400 hover:text-gray-600">
                        Ninguno
                      </button>
                    </div>
                  </div>
                  <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                    {HORAS.map(hora => {
                      const yaExiste = estado.slots.some(s => s.dia === diaAgregar && s.hora === hora)
                      const sel = horasSeleccionadas.has(hora)
                      return (
                        <button
                          key={hora}
                          disabled={yaExiste}
                          onClick={() => {
                            const next = new Set(horasSeleccionadas)
                            sel ? next.delete(hora) : next.add(hora)
                            setHorasSeleccionadas(next)
                          }}
                          className={`py-2.5 rounded-lg text-sm font-semibold transition-colors ${
                            yaExiste
                              ? 'bg-gray-100 text-gray-300 cursor-not-allowed'
                              : sel
                              ? 'bg-blue-600 text-white'
                              : 'bg-gray-100 text-gray-600 hover:bg-blue-100 hover:text-blue-700'
                          }`}
                        >
                          {hora}
                        </button>
                      )
                    })}
                  </div>
                </div>

                {feedbackAgregar && (
                  <p className="text-green-600 text-sm bg-green-50 px-4 py-2 rounded-lg">{feedbackAgregar}</p>
                )}

                <button
                  onClick={agregarSlots}
                  disabled={cargandoAgregar || horasSeleccionadas.size === 0}
                  className="bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white font-bold py-3 rounded-xl transition-colors"
                >
                  {cargandoAgregar
                    ? 'Agregando...'
                    : `Agregar ${horasSeleccionadas.size} horario${horasSeleccionadas.size !== 1 ? 's' : ''}`}
                </button>
              </>
            )}
          </div>
        )}

      </main>
    </div>
  )
}

