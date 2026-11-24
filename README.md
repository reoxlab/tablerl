# TableX

Generador gráfico de tablas para LaTeX, Markdown y Typst. Hecho en Reox Lab.

Arma tu tabla en una cuadrícula, como en una hoja de cálculo, y copia el código
generado en vivo. Sin cuentas, sin servidor, sin que tus datos salgan del navegador.

- **Web:** https://reoxlab.com/herramientas/tablex
- **Demo local:** `npm install && npm run dev`
- **Licencia:** GPL v3 (todo derivado sigue libre)

## Estado

v1.1.0: todo lo de v1.0, más temas claro y oscuro (con «Sistema» por
defecto, que sigue al sistema operativo), exportar a CSV (separador punto
y coma, para Excel y LibreOffice en español) e importar ODS además de
XLSX/XLS (si el libro trae varias hojas, se pregunta cuál importar).
Ver la hoja de ruta en `docs/ARCHITECTURE.md`.

## Desarrollo

```bash
npm install
npm run dev      # servidor de desarrollo en http://localhost:5173
npm run build    # genera dist/ (archivos estáticos listos para servir)
npm run preview  # sirve dist/ para comprobar el build
npm test         # comprobaciones de los exportadores e importadores
```

## Formatos

LaTeX (estándar, booktabs, longtable, tabularx) · Markdown · Typst · CSV.
Pegar celdas desde Excel / Google Sheets, importar XLSX, XLS y ODS y leer
código LaTeX de vuelta.
