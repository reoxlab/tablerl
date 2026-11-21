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
