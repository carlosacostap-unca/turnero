'use client'

import { useState, useEffect } from 'react'
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

export default function PanelPage() {
  const [estado, setEstado] = useState<Estado>({ slots: [], enAtencion: null, contador: 0 })

  useEffect(() => {
    async function cargar() {
      try {
        const res = await fetch('/api/turnos')
        const data = await res.json()
        setEstado(data)
      } catch {
        // ignore
      }
    }
    cargar()
    const t = setInterval(cargar, 2000)
    return () => clearInterval(t)
  }, [])

  const slotActual = estado.slots.find(s => s.id === estado.enAtencion)
  const hoy = new Date().toISOString().slice(0, 10)
  const proximos = estado.slots
    .filter(s => s.ocupado && s.dia >= hoy && s.id !== estado.enAtencion)
    .slice(0, 6)

  return (
    <div className="min-h-screen bg-blue-950 flex flex-col text-white select-none">
      <div className="absolute top-6 left-6">
        <Link href="/" className="text-blue-400 hover:text-white text-sm transition-colors">← Inicio</Link>
      </div>
      <div className="absolute top-6 right-6">
        <Link href="/admin" className="text-blue-400 hover:text-white text-sm transition-colors">Admin →</Link>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center gap-4 px-8">
        <p className="text-blue-400 text-sm font-bold uppercase tracking-[0.3em]">En Atención</p>
        {slotActual ? (
          <>
            <div
              className="font-black leading-none tabular-nums"
              style={{ fontSize: 'clamp(5rem, 22vw, 18rem)' }}
            >
              {slotActual.hora}
            </div>
            {slotActual.nombre && (
              <p className="text-blue-300 text-2xl font-medium">{slotActual.nombre}</p>
            )}
          </>
        ) : (
          <div
            className="font-black text-blue-800 leading-none"
            style={{ fontSize: 'clamp(5rem, 22vw, 18rem)' }}
          >
            - - - -
          </div>
        )}
      </div>

      {proximos.length > 0 && (
        <div className="border-t border-blue-900 px-10 py-6">
          <p className="text-blue-500 text-xs font-bold uppercase tracking-widest mb-4">Próximos turnos</p>
          <div className="flex gap-4 flex-wrap">
            {proximos.map(s => (
              <div key={s.id} className="bg-blue-900 rounded-xl px-5 py-3 text-center">
                <p className="text-2xl font-black">{s.hora}</p>
                {s.nombre && (
                  <p className="text-blue-400 text-sm mt-1 truncate max-w-[120px]">{s.nombre}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

