# TableX

Generador gráfico de tablas para LaTeX, HTML, Markdown y más. Hecho en Reox Lab.

Arma tu tabla en una cuadrícula, como en una hoja de cálculo, y copia el código
generado en vivo. Sin cuentas, sin servidor, sin que tus datos salgan del navegador.

- **Web:** https://reoxlab.com/herramientas/tablex (pendiente de publicar)
- **Demo local:** `npm install && npm run dev`
- **Licencia:** GPL v3 (todo derivado sigue libre)

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

Imagen Docker multi-etapa (Node para el build, nginx:alpine para servir).
El despliegue vive en Skynet en `/home/rixuko/herramientas/tablex/`:

```bash
docker compose up -d --build
```

La app se sirve bajo el prefijo `/herramientas/tablex/` (ver `nginx.conf`:
el túnel de Cloudflare reenvía la ruta completa, sin recortarla).

**Paso manual en Cloudflare Zero Trust** (lo hace Francisco, el token de
Muse no tiene permisos de túnel): en el túnel de reoxlab.com, añadir un
hostname público `reoxlab.com` con ruta `/herramientas/tablex/*` que apunte
al servicio `http://tablex:80`. Sin esa regla, el contenedor corre pero
nadie llega a él desde fuera.

**Probar en local** (sin publicar):

```bash
docker run --rm --network sky-net -p 127.0.0.1:8080:80 tablex
# abrir http://127.0.0.1:8080/herramientas/tablex/
```

## Formatos (objetivo)

LaTeX (estándar y booktabs) · Markdown · Typst. Pegar celdas desde Excel /
Google Sheets, importar XLSX y leer código LaTeX de vuelta.
