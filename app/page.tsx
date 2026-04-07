'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

interface Estado {
  ultimoTurno: number
  turnoActual: number | null
  cola: number[]
}

function getMensajeTurno(miTurno: number, estado: Estado): string {
  if (estado.turnoActual === miTurno) {
    return '¡Es tu turno! Acercate a la ventanilla.'
  }
  const posicion = estado.cola.indexOf(miTurno)
  if (posicion !== -1) {
    return posicion === 0
      ? 'Sos el próximo en ser llamado.'
      : `Hay ${posicion} persona${posicion > 1 ? 's' : ''} antes que vos.`
  }
  if (estado.turnoActual !== null && miTurno < estado.turnoActual) {
    return 'Tu turno ya fue atendido.'
  }
  return 'Aguardá tu turno...'
}

export default function Home() {
  const [estado, setEstado] = useState<Estado | null>(null)
  const [miTurno, setMiTurno] = useState<number | null>(null)
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


