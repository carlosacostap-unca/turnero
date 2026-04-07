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

function formatDia(iso: string) {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('es-AR', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  })
}

function Header() {
  return (
    <header className="bg-blue-700 text-white shadow-lg">
      <div className="max-w-3xl mx-auto px-6 py-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Sistema de Turnos</h1>
        <nav className="flex gap-5 text-sm font-medium">
          <Link href="/panel" className="hover:text-blue-200 transition-colors">Panel</Link>
          <Link href="/admin" className="hover:text-blue-200 transition-colors">Administración</Link>
        </nav>
      </div>
    </header>
  )
}

type Paso = 'dia' | 'hora' | 'confirmar' | 'ok'

export default function Home() {
  const [slots, setSlots] = useState<Slot[]>([])
  const [paso, setPaso] = useState<Paso>('dia')
  const [diaSeleccionado, setDiaSeleccionado] = useState('')
  const [slotSeleccionado, setSlotSeleccionado] = useState<Slot | null>(null)
  const [nombre, setNombre] = useState('')
  const [reserva, setReserva] = useState<Slot | null>(null)
  const [cargando, setCargando] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')

  const cargar = useCallback(async () => {
    try {
      const res = await fetch('/api/turnos')
      const data = await res.json()
      setSlots(data.slots)
    } catch {
      // ignore
    }
  }, [])

  useEffect(() => {
    cargar()
    const t = setInterval(cargar, 5000)
    return () => clearInterval(t)
  }, [cargar])

  const hoy = new Date().toISOString().slice(0, 10)
  const diasConLibres = [
    ...new Set(slots.filter(s => !s.ocupado && s.dia >= hoy).map(s => s.dia)),
  ].sort()

  const slotsDia = slots.filter(s => s.dia === diaSeleccionado)

  async function reservar() {
    if (!slotSeleccionado) return
    setCargando(true)
    setErrorMsg('')
    try {
      const res = await fetch('/api/turnos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accion: 'reservar', slotId: slotSeleccionado.id, nombre }),
      })
      const data = await res.json()
      if (res.ok) {
        setReserva(data.turno)
        setSlots(data.estado.slots)
        setPaso('ok')
      } else {
        setErrorMsg(data.error ?? 'Error al reservar')
        cargar()
      }
    } catch {
      setErrorMsg('Error de conexión')
    }
    setCargando(false)
  }

  function reiniciar() {
    setPaso('dia')
    setDiaSeleccionado('')
    setSlotSeleccionado(null)
    setNombre('')
    setReserva(null)
    setErrorMsg('')
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex flex-col">
      <Header />
      <main className="flex-1 max-w-2xl w-full mx-auto px-6 py-10">

        {/* Confirmación */}
        {paso === 'ok' && reserva && (
          <div className="bg-white rounded-3xl shadow-xl p-10 text-center flex flex-col items-center gap-6">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center text-green-600 text-3xl">✓</div>
            <h2 className="text-2xl font-bold text-gray-800">¡Turno reservado!</h2>
            <div className="w-full bg-green-50 rounded-2xl px-8 py-6">
              <p className="text-xs uppercase tracking-widest text-gray-400 mb-1">Número de ticket</p>
              <p className="text-7xl font-black text-green-600 tabular-nums">
                {String(reserva.numero ?? 0).padStart(3, '0')}
              </p>
            </div>
            <div className="text-center">
              <p className="text-gray-500 capitalize text-sm">{formatDia(reserva.dia)}</p>
              <p className="text-4xl font-black text-gray-800 mt-1">{reserva.hora} hs</p>
              {reserva.nombre && <p className="text-gray-500 mt-2">{reserva.nombre}</p>}
            </div>
            <button onClick={reiniciar} className="text-sm text-gray-400 hover:text-gray-600 underline">
              Reservar otro turno
            </button>
          </div>
        )}

        {/* Elegir día */}
        {paso === 'dia' && (
          <div className="flex flex-col gap-6">
            <h2 className="text-xl font-semibold text-gray-700">Seleccioná un día</h2>
            {diasConLibres.length === 0 ? (
              <div className="bg-white rounded-2xl shadow p-12 text-center text-gray-400">
                No hay turnos disponibles por el momento.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {diasConLibres.map(dia => {
                  const libres = slots.filter(s => s.dia === dia && !s.ocupado).length
                  return (
                    <button
                      key={dia}
                      onClick={() => { setDiaSeleccionado(dia); setPaso('hora') }}
                      className="bg-white hover:bg-blue-600 hover:text-white rounded-2xl shadow p-6 text-left transition-all group"
                    >
                      <p className="capitalize text-lg font-semibold text-gray-800 group-hover:text-white">
                        {formatDia(dia)}
                      </p>
                      <p className="text-sm text-gray-400 group-hover:text-blue-100 mt-1">
                        {libres} horario{libres !== 1 ? 's' : ''} disponible{libres !== 1 ? 's' : ''}
                      </p>
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* Elegir horario */}
        {paso === 'hora' && (
          <div className="flex flex-col gap-6">
            <div className="flex items-center gap-3">
              <button onClick={() => setPaso('dia')} className="text-blue-500 hover:text-blue-700 text-sm font-medium">
                ← Volver
              </button>
              <h2 className="text-xl font-semibold text-gray-700 capitalize">{formatDia(diaSeleccionado)}</h2>
            </div>
            <p className="text-gray-500 text-sm -mt-3">Elegí un horario disponible</p>
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
              {slotsDia.map(slot => (
                <button
                  key={slot.id}
                  disabled={slot.ocupado}
                  onClick={() => { setSlotSeleccionado(slot); setPaso('confirmar') }}
                  className={`py-4 rounded-xl text-lg font-bold transition-all ${
                    slot.ocupado
                      ? 'bg-gray-100 text-gray-300 cursor-not-allowed'
                      : 'bg-white text-blue-700 hover:bg-blue-600 hover:text-white shadow'
                  }`}
                >
                  {slot.hora}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Confirmar */}
        {paso === 'confirmar' && slotSeleccionado && (
          <div className="flex flex-col gap-6">
            <div className="flex items-center gap-3">
              <button onClick={() => setPaso('hora')} className="text-blue-500 hover:text-blue-700 text-sm font-medium">
                ← Volver
              </button>
              <h2 className="text-xl font-semibold text-gray-700">Confirmar turno</h2>
            </div>
            <div className="bg-white rounded-2xl shadow-lg p-8 flex flex-col gap-6">
              <div className="bg-blue-50 rounded-xl px-6 py-5 text-center">
                <p className="capitalize text-blue-600 text-sm font-medium">{formatDia(slotSeleccionado.dia)}</p>
                <p className="text-5xl font-black text-blue-700 mt-2">{slotSeleccionado.hora} hs</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-2">Nombre (opcional)</label>
                <input
                  type="text"
                  value={nombre}
                  onChange={e => setNombre(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && reservar()}
                  placeholder="Tu nombre"
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-400"
                />
              </div>
              {errorMsg && (
                <p className="text-red-500 text-sm bg-red-50 px-4 py-2 rounded-lg">{errorMsg}</p>
              )}
              <button
                onClick={reservar}
                disabled={cargando}
                className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold py-4 rounded-xl text-lg transition-colors"
              >
                {cargando ? 'Reservando...' : 'Confirmar reserva'}
              </button>
            </div>
          </div>
        )}

      </main>
    </div>
  )
}

  const [cargando, setCargando] = useState(false)

  async function cargarEstado() {
    try {
      const res = await fetch('/api/turnos')
      const data = await res.json()
      setEstado(data)
    } catch {
      // silently ignore polling errors
    }
  }

  useEffect(() => {
    cargarEstado()
    const interval = setInterval(cargarEstado, 3000)
    return () => clearInterval(interval)
  }, [])

  async function sacarTurno() {
    setCargando(true)
    const res = await fetch('/api/turnos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ accion: 'solicitar' }),
    })
    const data = await res.json()
    setMiTurno(data.turno)
    setEstado(data.estado)
    setCargando(false)
  }

  const esMiTurno = estado && miTurno !== null && estado.turnoActual === miTurno

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex flex-col">
      <header className="bg-blue-700 text-white shadow-lg">
        <div className="max-w-3xl mx-auto px-6 py-4 flex items-center justify-between">
          <h1 className="text-2xl font-bold tracking-tight">Sistema de Turnos</h1>
          <nav className="flex gap-5 text-sm font-medium">
            <Link href="/panel" className="hover:text-blue-200 transition-colors">Panel</Link>
            <Link href="/admin" className="hover:text-blue-200 transition-colors">Administración</Link>
          </nav>
        </div>
      </header>

      <main className="flex-1 max-w-3xl w-full mx-auto px-6 py-10 flex flex-col gap-6">

        {/* Turno en atención */}
        <div className="bg-white rounded-2xl shadow-lg p-8 text-center">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">
            Turno en atención
          </p>
          <div className="text-8xl font-black text-blue-700 leading-none tabular-nums">
            {estado?.turnoActual !== null && estado?.turnoActual !== undefined
              ? String(estado.turnoActual).padStart(3, '0')
              : '---'}
          </div>
          <p className="mt-4 text-gray-400 text-sm">
            {estado
              ? estado.cola.length > 0
                ? `${estado.cola.length} turno${estado.cola.length > 1 ? 's' : ''} en espera`
                : 'Sin turnos en espera'
              : 'Conectando...'}
          </p>
        </div>

        {/* Sacar turno / Mi turno */}
        {miTurno === null ? (
          <div className="bg-white rounded-2xl shadow-lg p-10 text-center flex flex-col items-center gap-6">
            <h2 className="text-xl font-semibold text-gray-700">¿Necesitás ser atendido/a?</h2>
            <button
              onClick={sacarTurno}
              disabled={cargando}
              className="bg-blue-600 hover:bg-blue-700 active:bg-blue-800 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xl font-bold py-5 px-14 rounded-full shadow-md transition-colors"
            >
              {cargando ? 'Procesando...' : 'Sacar Turno'}
            </button>
            <p className="text-sm text-gray-400">Presioná el botón para obtener tu número de turno</p>
          </div>
        ) : (
          <div className={`rounded-2xl shadow-lg p-10 text-center flex flex-col items-center gap-4 transition-colors ${esMiTurno ? 'bg-green-50 border-2 border-green-400' : 'bg-white'}`}>
            <p className={`text-xs font-bold uppercase tracking-widest ${esMiTurno ? 'text-green-600' : 'text-indigo-500'}`}>
              {esMiTurno ? '¡Tu turno!' : 'Tu número de turno'}
            </p>
            <div className={`text-9xl font-black leading-none tabular-nums ${esMiTurno ? 'text-green-600' : 'text-indigo-600'}`}>
              {String(miTurno).padStart(3, '0')}
            </div>
            {estado && (
              <p className={`text-lg font-medium ${esMiTurno ? 'text-green-700' : 'text-gray-600'}`}>
                {getMensajeTurno(miTurno, estado)}
              </p>
            )}
            <button
              onClick={() => setMiTurno(null)}
              className="mt-2 text-xs text-gray-400 hover:text-gray-600 underline transition-colors"
            >
              Volver al inicio
            </button>
          </div>
        )}
      </main>
    </div>
  )
}


