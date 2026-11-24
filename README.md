# TableX

Generador gráfico de tablas para LaTeX, Markdown y Typst. Hecho en Reox Lab.

Arma tu tabla en una cuadrícula, como en una hoja de cálculo, y copia el código
generado en vivo. Sin cuentas, sin servidor, sin que tus datos salgan del navegador.

- **Web:** https://reoxlab.com/herramientas/tablex
- **Demo local:** `npm install && npm run dev`
- **Licencia:** GPL v3 (todo derivado sigue libre)

## Estado

v1.0: editor completo con formato (negrita, cursiva, alineación, fusiones,
bordes por lado, colores, anchos de columna), exportadores LaTeX (estándar,
booktabs, longtable, tabularx), Markdown y Typst, importar XLSX y LaTeX de
vuelta, pegar TSV, botón de abrir en Overleaf y tablas recientes con
autoguardado. Ver la hoja de ruta en `docs/ARCHITECTURE.md`.

## Desarrollo

```bash
npm install
npm run dev      # servidor de desarrollo en http://localhost:5173
npm run build    # genera dist/ (archivos estáticos listos para servir)
npm run preview  # sirve dist/ para comprobar el build
npm test         # comprobaciones de los exportadores e importadores
```

## Formatos

LaTeX (estándar, booktabs, longtable, tabularx) · Markdown · Typst.
Pegar celdas desde Excel / Google Sheets, importar XLSX y leer código
LaTeX de vuelta.
