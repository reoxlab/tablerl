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

// TableRL — temas claro / oscuro / sistema (v1.1.0).
//
// La elección del usuario se guarda en localStorage; por defecto es
// «system», que sigue a `prefers-color-scheme` del sistema operativo y
// reacciona si cambia en caliente. El tema efectivo se escribe en
// `document.documentElement.dataset.theme` y el CSS lo lee con
// `[data-theme="dark"]`.

import type { StorageLike } from './recents'

export type ThemeChoice = 'light' | 'dark' | 'system'
export type Theme = 'light' | 'dark'

export const THEME_KEY = 'tablerl-theme-v1'

export function resolveTheme(choice: ThemeChoice, prefersDark: boolean): Theme {
  if (choice === 'dark') return 'dark'
  if (choice === 'light') return 'light'
  return prefersDark ? 'dark' : 'light'
}

export function loadThemeChoice(storage: StorageLike): ThemeChoice {
  const raw = storage.getItem(THEME_KEY)
  if (raw === 'light' || raw === 'dark' || raw === 'system') return raw
  return 'system'
}

export function saveThemeChoice(storage: StorageLike, choice: ThemeChoice): void {
  storage.setItem(THEME_KEY, choice)
}
