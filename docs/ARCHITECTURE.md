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
  El contenedor vive en Skynet (`/home/rixuko/herramientas/tablex/`), en la
  red `sky-net`, y el acceso público llega por el **túnel de Cloudflare**
  (no por Traefik: Traefik solo sirve los servicios de NetBird). La ruta
  pública es `reoxlab.com/herramientas/tablex` y exige una regla en Zero
  Trust (paso manual de Francisco). `nginx.conf` sirve la app bajo ese
  prefijo, porque el túnel reenvía la ruta completa sin recortarla.

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
| `src/exporters/markdown.ts` | Markdown |
| `src/exporters/typst.ts` | Typst |
| `src/importers/xlsx.ts` | XLSX (SheetJS) |
| `src/importers/latex.ts` | Leer código LaTeX de vuelta (lo más complejo) |
| `src/storage.ts` | Tablas recientes en localStorage |

## Hoja de ruta

1. **MVP** — editor (clic/escribir, Tab, añadir/quitar filas y columnas),
   exportar LaTeX estándar y booktabs + Markdown, copiar al portapapeles.
2. **v0.2** — fusionar celdas, alineación, negrita/cursiva, bordes, colores,
   importar XLSX y pegar desde Excel/Sheets, exportar Typst.
3. **v0.3** — leer LaTeX de vuelta, anchos de columna, longtable, abrir en
   Overleaf, tablas recientes.
4. **v1.0** — publicar en reoxlab.com con guía breve y SEO.

## Decisiones pendientes (director)

- URL pública: `reoxlab.com/herramientas/tablex` (subruta, decidida
  2026-11-21: todo el tráfico y el SEO caen en el dominio principal).
- Nombre visible y textos de la guía en español.
- Si el MVP se publica al terminar o se espera a v0.2.
