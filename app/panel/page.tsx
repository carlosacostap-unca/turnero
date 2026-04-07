'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

interface Estado {
  ultimoTurno: number
  turnoActual: number | null
  cola: number[]
}

export default function PanelPage() {
  const [estado, setEstado] = useState<Estado | null>(null)

  useEffect(() => {
    async function cargar() {
      try {
        const res = await fetch('/api/turnos')
        const data = await res.json()
        setEstado(data)
      } catch {
        // silently ignore
      }
    }
    cargar()
    const interval = setInterval(cargar, 2000)
    return () => clearInterval(interval)
  }, [])

  const turnoStr =
    estado?.turnoActual !== null && estado?.turnoActual !== undefined
      ? String(estado.turnoActual).padStart(3, '0')
      : '---'

  return (
    <div className="min-h-screen bg-blue-950 flex flex-col items-center justify-center text-white select-none">
      <Link
        href="/"
        className="absolute top-6 left-6 text-blue-400 hover:text-white text-sm transition-colors"
      >
        ← Inicio
      </Link>
      <Link
        href="/admin"
        className="absolute top-6 right-6 text-blue-400 hover:text-white text-sm transition-colors"
      >
        Administración →
      </Link>

      <p className="text-lg font-bold text-blue-400 uppercase tracking-[0.3em] mb-8">
        Turno en Atención
      </p>

      <div
        className="font-black text-white leading-none tabular-nums"
        style={{ fontSize: 'clamp(8rem, 35vw, 28rem)' }}
      >
        {turnoStr}
      </div>

      <div className="mt-12 text-blue-400 text-xl font-medium">
        {estado
          ? estado.cola.length > 0
            ? `${estado.cola.length} turno${estado.cola.length > 1 ? 's' : ''} en espera`
            : 'Sin turnos en espera'
          : 'Conectando...'}
      </div>
    </div>
  )
}
