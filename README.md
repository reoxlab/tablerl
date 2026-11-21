# TableX

Generador gráfico de tablas para LaTeX, HTML, Markdown y más. Hecho en Reox Lab.

Arma tu tabla en una cuadrícula, como en una hoja de cálculo, y copia el código
generado en vivo. Sin cuentas, sin servidor, sin que tus datos salgan del navegador.

- **Web:** https://reoxlab.com/herramientas/tablex (pendiente de publicar)
- **Demo local:** `npm install && npm run dev`
- **Licencia:** MIT

## Estado

Scaffold inicial. El editor (MVP) está en construcción; ver la hoja de ruta en
`docs/ARCHITECTURE.md` y las notas del proyecto en Obsidian (`Proyectos/tablex`).

## Desarrollo

```bash
npm install
npm run dev      # servidor de desarrollo en http://localhost:5173
npm run build    # genera dist/ (archivos estáticos listos para servir)
npm run preview  # sirve dist/ para comprobar el build
```

## Despliegue

Imagen Docker multi-etapa (Node para el build, nginx:alpine para servir):

```bash
docker compose up -d --build
```

Ver `docker-compose.yml`. La ruta pública (subdominio o subruta) está pendiente
de decisión; las etiquetas de Traefik van comentadas hasta entonces.

## Formatos (objetivo)

LaTeX (estándar y booktabs) · HTML · Markdown · texto plano · Typst ·
MediaWiki · AsciiDoc. Importar CSV / XLSX y leer código LaTeX de vuelta.
