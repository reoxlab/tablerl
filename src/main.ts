// Copyright (C) 2026 Francisco Peña Gallardo (Reox Lab)
//
// This file is part of TableX.
//
// TableX is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.
//
// TableX is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
// GNU General Public License for more details.
//
// You should have received a copy of the GNU General Public License
// along with TableX. If not, see <https://www.gnu.org/licenses/>.

// TableX — punto de entrada (scaffold).
// El editor (cuadrícula + barra de herramientas + exportadores) se construye
// sobre el modelo de src/model.ts. Ver docs/ARCHITECTURE.md.

import { emptyTable } from './model'

const app = document.querySelector<HTMLDivElement>('#app')
if (app) {
  const table = emptyTable()
  app.innerHTML = `
    <header style="font-family: Montserrat, system-ui, sans-serif; padding: 2rem; max-width: 720px; margin: 0 auto;">
      <h1 style="color: #80001E;">TableX</h1>
      <p>Generador gráfico de tablas para LaTeX, HTML, Markdown y más.</p>
      <p><strong>Estado:</strong> scaffold inicial — el editor está en construcción.</p>
      <p>Modelo cargado: tabla de ${table.rows}×${table.cols} lista para editar.</p>
    </header>
  `
}
