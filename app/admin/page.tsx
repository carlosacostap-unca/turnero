'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

interface Estado {
  ultimoTurno: number
  turnoActual: number | null
  cola: number[]
}

type Feedback = { tipo: 'ok' | 'error'; mensaje: string } | null

export default function AdminPage() {
  const [estado, setEstado] = useState<Estado | null>(null)
  const [cargando, setCargando] = useState(false)
  const [feedback, setFeedback] = useState<Feedback>(null)

  async function cargarEstado() {
    try {
      const res = await fetch('/api/turnos')
      const data = await res.json()
      setEstado(data)
    } catch {
      // silently ignore
    }
  }

  useEffect(() => {
    cargarEstado()
    const interval = setInterval(cargarEstado, 3000)
    return () => clearInterval(interval)
  }, [])

  async function accion(tipo: 'llamar' | 'reset') {
    setCargando(true)
    setFeedback(null)
    try {
      const res = await fetch('/api/turnos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accion: tipo }),
      })
      const data = await res.json()
      if (res.ok) {
        setEstado(data.estado)
        if (tipo === 'llamar') {
          setFeedback({ tipo: 'ok', mensaje: `Turno N° ${String(data.turnoActual).padStart(3, '0')} llamado.` })
        } else {
          setFeedback({ tipo: 'ok', mensaje: 'Sistema reiniciado correctamente.' })
        }
      } else {
        setFeedback({ tipo: 'error', mensaje: data.error ?? 'Ocurrió un error.' })
      }
    } catch {
      setFeedback({ tipo: 'error', mensaje: 'Error de conexión.' })
    }
    setCargando(false)
    setTimeout(() => setFeedback(null), 4000)
  }

  function confirmarReset() {
    if (window.confirm('¿Reiniciar el sistema? Se eliminarán todos los turnos.')) {
      accion('reset')
    }
  }

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      <header className="bg-gray-800 text-white shadow-lg">
        <div className="max-w-3xl mx-auto px-6 py-4 flex items-center justify-between">
          <h1 className="text-xl font-bold">Administración de Turnos</h1>
          <Link href="/" className="text-sm text-gray-300 hover:text-white transition-colors">
            ← Inicio
          </Link>
        </div>
      </header>

      <main className="flex-1 max-w-3xl w-full mx-auto px-6 py-10 flex flex-col gap-6">

        {/* Cards de estado */}
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-white rounded-xl shadow p-6 text-center">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Turno actual</p>
            <p className="text-5xl font-black text-blue-700 tabular-nums">
              {estado?.turnoActual !== null && estado?.turnoActual !== undefined
                ? String(estado.turnoActual).padStart(3, '0')
                : '---'}
            </p>
          </div>
          <div className="bg-white rounded-xl shadow p-6 text-center">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">En espera</p>
            <p className="text-5xl font-black text-orange-500 tabular-nums">
              {estado?.cola.length ?? '—'}
            </p>
          </div>
          <div className="bg-white rounded-xl shadow p-6 text-center">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Emitidos</p>
            <p className="text-5xl font-black text-gray-700 tabular-nums">
              {estado?.ultimoTurno ?? '—'}
            </p>
          </div>
        </div>

        {/* Cola de espera */}
        {estado && estado.cola.length > 0 && (
          <div className="bg-white rounded-xl shadow p-6">
            <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-4">Cola de espera</h2>
            <div className="flex flex-wrap gap-2">
              {estado.cola.map((t) => (
                <span
                  key={t}
                  className="bg-blue-100 text-blue-800 font-bold px-3 py-1 rounded-full text-sm tabular-nums"
                >
                  {String(t).padStart(3, '0')}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Feedback */}
        {feedback && (
          <div
            className={`px-4 py-3 rounded-xl border text-sm font-medium ${
              feedback.tipo === 'ok'
                ? 'bg-green-50 border-green-200 text-green-700'
                : 'bg-red-50 border-red-200 text-red-700'
            }`}
          >
            {feedback.mensaje}
          </div>
        )}

        {/* Acciones */}
        <div className="bg-white rounded-xl shadow p-6 flex flex-col gap-4">
          <button
            onClick={() => accion('llamar')}
            disabled={cargando || !estado || estado.cola.length === 0}
            className="w-full bg-blue-600 hover:bg-blue-700 active:bg-blue-800 disabled:opacity-40 disabled:cursor-not-allowed text-white text-lg font-bold py-4 rounded-xl transition-colors"
          >
            {cargando ? 'Procesando...' : 'Llamar siguiente turno'}
          </button>
          <button
            onClick={confirmarReset}
            disabled={cargando}
            className="w-full bg-red-50 hover:bg-red-100 active:bg-red-200 text-red-600 border border-red-200 text-sm font-semibold py-3 rounded-xl transition-colors disabled:opacity-40"
          >
            Reiniciar sistema
          </button>
        </div>

        {/* Enlace al panel */}
        <Link
          href="/panel"
          className="block text-center bg-gray-800 hover:bg-gray-900 text-white font-semibold py-3 rounded-xl transition-colors"
        >
          Ver panel de display →
        </Link>
      </main>
    </div>
  )
}
