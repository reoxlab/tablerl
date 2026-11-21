# TableX — Arquitectura

> Nota de dirección completa en Obsidian: `Proyectos/tablex/Arquitectura.md`.
> Este archivo es el resumen técnico que vive junto al código.

## Idea

Clon funcional (código y diseño propios) de un generador gráfico de tablas
estilo tablesgenerator.com: el usuario edita una cuadrícula y la app genera
el código en vivo, sin que los datos salgan del navegador.

## Stack

- **TypeScript + Vite** — app 100% estática; `npm run build` genera `dist/`.
- **Sin backend, sin base de datos.** Persistencia local: `localStorage`
  (tablas recientes) y nada más.
- **Despliegue:** imagen Docker multi-etapa (Node build → nginx:alpine).
  Consumo: unos MB de RAM, CPU ~0 en reposo; solo sirve archivos estáticos.

## Modelo de datos

`src/model.ts` — `TableModel`: filas, columnas, celdas y anchos de columna.
Cada `Cell` guarda texto, negrita/cursiva, alineación, color de fondo,
bordes, `colspan`/`rowspan` y `coveredBy` (celdas cubiertas por una fusión).
Todos los exportadores leen este modelo y nada más.

## Módulos (objetivo)

| Módulo | Responsabilidad |
| --- | --- |
| `src/model.ts` | Modelo y celdas vacías |
| `src/editor/` | Cuadrícula editable, selección, teclado (Tab, flechas) |
| `src/exporters/latex.ts` | LaTeX estándar y booktabs |
| `src/exporters/html.ts` | HTML |
| `src/exporters/markdown.ts` | Markdown |
| `src/exporters/text.ts` | Texto plano |
| `src/exporters/typst.ts` | Typst |
| `src/exporters/mediawiki.ts` | MediaWiki |
| `src/exporters/asciidoc.ts` | AsciiDoc |
| `src/importers/csv.ts` | CSV (PapaParse) |
| `src/importers/xlsx.ts` | XLSX (SheetJS) |
| `src/importers/latex.ts` | Leer código LaTeX de vuelta (lo más complejo) |
| `src/storage.ts` | Tablas recientes en localStorage |

## Hoja de ruta

1. **MVP** — editor (clic/escribir, Tab, añadir/quitar filas y columnas),
   exportar LaTeX estándar y booktabs + HTML + Markdown, copiar al portapapeles.
2. **v0.2** — fusionar celdas, alineación, negrita/cursiva, bordes, colores,
   importar CSV y pegar desde Excel/Sheets.
3. **v0.3** — resto de formatos, importar XLSX, leer LaTeX de vuelta,
   anchos de columna, longtable, abrir en Overleaf, tablas recientes.
4. **v1.0** — publicar en reoxlab.com con guía breve y SEO.

## Decisiones pendientes (director)

- URL pública: `tablex.reoxlab.com` (subdominio) o
  `reoxlab.com/herramientas/tablex` (subruta).
- Nombre visible y textos de la guía en español.
- Si el MVP se publica al terminar o se espera a v0.2.
