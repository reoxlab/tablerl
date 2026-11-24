// Copyright (C) 2026 Francisco Peña Gallardo (Reox Lab)
//
// This file is part of TableRL.
//
// TableRL is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.
//
// TableRL is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
// GNU General Public License for more details.
//
// You should have received a copy of the GNU General Public License
// along with TableRL. If not, see <https://www.gnu.org/licenses/>.

// TableRL — tablas recientes y autoguardado (localStorage).
//
// Todo queda en el navegador del usuario: las últimas 5 copias guardadas
// a mano y un autoguardado de la sesión actual (se actualiza al editar,
// con pausa). El título y la etiqueta se guardan con la tabla y se
// restauran al cargarla. El almacenamiento se inyecta para poder probar
// el módulo en Node sin localStorage.

import type { TableModel } from './model'

export interface RecentEntry {
  id: string
  name: string
  savedAt: number
  caption: string
  label: string
  model: TableModel
}

export interface StorageLike {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
  removeItem(key: string): void
}

export const RECENTS_KEY = 'tablex-recents-v1'
export const AUTOSAVE_KEY = 'tablex-autosave-v1'
export const MAX_RECENTS = 5

function isRecentEntry(v: unknown): v is RecentEntry {
  if (typeof v !== 'object' || v === null) return false
  const e = v as Record<string, unknown>
  const model = e.model as Record<string, unknown> | null
  return (
    typeof e.id === 'string' &&
    typeof e.name === 'string' &&
    typeof e.savedAt === 'number' &&
    typeof e.caption === 'string' &&
    typeof e.label === 'string' &&
    model !== null &&
    typeof model.rows === 'number' &&
    Array.isArray(model.cells)
  )
}

export function loadRecents(storage: StorageLike): RecentEntry[] {
  try {
    const raw = storage.getItem(RECENTS_KEY)
    if (!raw) return []
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed.filter(isRecentEntry)
  } catch {
    return []
  }
}

/** Nombre de la copia: el título si lo hay, si no la primera celda con texto. */
export function deriveName(model: TableModel, caption: string): string {
  if (caption.trim() !== '') return caption.trim()
  for (const row of model.cells) {
    for (const cell of row) {
      if (cell.text.trim() !== '') return cell.text.trim().slice(0, 40)
    }
  }
  return 'Tabla sin título'
}

function newId(): string {
  const c = globalThis.crypto as { randomUUID?: () => string } | undefined
  return c?.randomUUID ? c.randomUUID() : `r${Date.now()}-${Math.floor(Math.random() * 1e6)}`
}

/**
 * Guarda una copia de la tabla. Si ya existe una copia idéntica, solo se
 * actualiza su fecha (no se duplica). Devuelve la lista actualizada.
 */
export function saveRecent(
  storage: StorageLike,
  model: TableModel,
  caption: string,
  label: string,
): RecentEntry[] {
  const list = loadRecents(storage)
  const modelJson = JSON.stringify(model)
  const existing = list.find((e) => JSON.stringify(e.model) === modelJson)
  if (existing) {
    existing.savedAt = Date.now()
    existing.caption = caption
    existing.label = label
    existing.name = deriveName(model, caption)
    list.sort((a, b) => b.savedAt - a.savedAt)
  } else {
    list.unshift({
      id: newId(),
      name: deriveName(model, caption),
      savedAt: Date.now(),
      caption,
      label,
      model: JSON.parse(modelJson) as TableModel,
    })
  }
  const trimmed = list.slice(0, MAX_RECENTS)
  storage.setItem(RECENTS_KEY, JSON.stringify(trimmed))
  return trimmed
}

export function deleteRecent(storage: StorageLike, id: string): RecentEntry[] {
  const list = loadRecents(storage).filter((e) => e.id !== id)
  storage.setItem(RECENTS_KEY, JSON.stringify(list))
  return list
}

/** Autoguardado de la sesión (se llama con pausa tras cada cambio). */
export function autosave(
  storage: StorageLike,
  model: TableModel,
  caption: string,
  label: string,
): void {
  storage.setItem(
    AUTOSAVE_KEY,
    JSON.stringify({ savedAt: Date.now(), caption, label, model }),
  )
}

export interface Autosave {
  savedAt: number
  caption: string
  label: string
  model: TableModel
}

export function loadAutosave(storage: StorageLike): Autosave | null {
  try {
    const raw = storage.getItem(AUTOSAVE_KEY)
    if (!raw) return null
    const parsed: unknown = JSON.parse(raw)
    if (typeof parsed !== 'object' || parsed === null) return null
    const p = parsed as Record<string, unknown>
    const model = p.model as Record<string, unknown> | null
    if (model === null || typeof model.rows !== 'number' || !Array.isArray(model.cells)) {
      return null
    }
    return {
      savedAt: typeof p.savedAt === 'number' ? p.savedAt : 0,
      caption: typeof p.caption === 'string' ? p.caption : '',
      label: typeof p.label === 'string' ? p.label : '',
      model: model as unknown as TableModel,
    }
  } catch {
    return null
  }
}
