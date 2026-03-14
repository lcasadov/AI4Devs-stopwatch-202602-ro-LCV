# Prompts — Countdown Timer

**Chatbot used:** Claude (claude-sonnet-4-6) via Claude Code CLI

---

## Prompt 1 — Context and requirements

**User:**

> Actúa como un Analista Programador con más 10 años de experiencia.
>
> Utiliza el repositorio https://github.com/lcasadov/AI4Devs-stopwatch-202602-ro-LCV como referencia
> en la imagen png que hay en el repositorio.
>
> Crea un Branch en el repositorio que se llame first.
>
> Crea una página web que genere una cuenta atrás segundo a segundo a partir de un número de minutos
> y segundos introducidos por el usuario.
>
> **Criterios técnicos:**
> - Utiliza las mejores prácticas en desarrollo web.
> - Separa el código HTML y javascript en index.html y script.js
> - Aplica los principios de SOLID.
> - Genera un fichero logs.txt en el que se generen los logs necesarios para la aplicación.
> - Captura las excepciones necesarias.
> - Para css utiliza UnoCSS.
> - Haz que sea una web responsiva y que funcione en los navegadores más utilizados correctamente
>   (Chrome, Edge, Opera, Firefox, Safari, Brave)
>
> **Criterios Funcionales:**
> - Habrá un campo de entrada de horas que debe ser un campo entero entre 0 y 99. A la derecha
>   habrá un campo de entrada de minutos que debe ser un campo entero entre 0 y 59. A la derecha
>   habrá un campo de entrada de segundos que debe ser un campo entero entre 0 y 59.
> - Debajo de los 3 campos habrá un campo contador en el que se visualizarán horas:minutos:segundos.
> - Habrá un botón de Start (deshabilitado inicialmente), otro botón de Stop y otro botón de Reset.
> - Si no se cumplen los criterios de mínimo y máximo, marca el campo de entrada con el estilo
>   UnoCSS más adecuado y muestra una alerta de error con un mensaje de error.
> - Si se cumplen los criterios se habilita el botón de Start.
> - Si se pulsa el botón de Start comenzará la cuenta atrás segundo a segundo sobre los datos
>   mostrados en el campo contador en ese momento.
> - La cuenta atrás se detendrá al llegar a cero o cuando se pulse el botón de Stop.
> - Si se pulsa el botón Reset se borran los datos de los cuatro campos y se deshabilita el botón Start.
>
> **Criterios generales:**
> - Añade un título y una descripción atractivos y divertidos.
> - Pídeme toda la información adicional que necesites antes de crearlo.

---

## Prompt 2 — Clarifications requested by Claude

**Claude asked:**

> Antes de implementarlo, tengo algunas preguntas:
>
> 1. **Idioma de la interfaz** — ¿Los textos de la UI deben estar en español o en inglés?
> 2. **Gestión de logs.txt** — Al ser una aplicación web en el navegador, no puedo escribir
>    directamente en el sistema de archivos. Las opciones son:
>    - Opción A: Botón "Descargar logs" que genera y descarga el archivo `logs.txt`
>    - Opción B: Los logs se guardan en `localStorage` y se muestran en la página
>    - Opción C: Combinación de ambas
> 3. **Ubicación de los archivos** — ¿Creo la carpeta `stopwatch-LCV/` o directamente en `template/`?
> 4. **Esquema de colores** — La imagen tiene Start (verde) y Clear (rojo). Con Start, Stop y Reset,
>    ¿qué colores asigno?
> 5. **¿Incluyo `prompts.md`?**

**User answered:**

> El idioma de la UI en ambos idiomas y que se pueda seleccionar mediante un icono con la bandera
> de España/Gran Bretaña.
> La gestión de los logs guardan en localStorage + botón de descarga.
> Los archivos directamente en el template sobreescribiendo los que hay.
> El esquema de colores Start: verde / Stop: naranja / Reset: rojo.
> Incluye los prompts en el archivo prompts.md incluyendo las preguntas y respuestas.

---

## Solution summary

Claude generated the following files inside `template/`:

| File | Description |
|---|---|
| `index.html` | Semantic HTML5 + UnoCSS CDN runtime for all styling |
| `script.js` | ES6 classes with strict SOLID separation |
| `prompts.md` | This file — full conversation record |

### SOLID breakdown

| Principle | Applied via |
|---|---|
| **S**ingle Responsibility | `Logger`, `I18n`, `Validator`, `Timer`, `UIController` each own one concern |
| **O**pen/Closed | `Timer` accepts `onTick`/`onComplete` callbacks — behaviour extended without modifying the class |
| **L**iskov Substitution | All classes are self-contained and substitutable in their roles |
| **I**nterface Segregation | `UIController.bindEvents(handlers)` exposes only the surface `CountdownApp` needs |
| **D**ependency Inversion | `CountdownApp` depends on the high-level interfaces of its collaborators, not on DOM details |

### Key technical decisions

- **UnoCSS CDN runtime** (`@unocss/runtime/uno.global.js`) — zero build step, Tailwind-compatible
  utility classes, MutationObserver for dynamic class injection.
- **logs.txt via Blob + `URL.createObjectURL`** — widely supported in all target browsers;
  entries persisted in `localStorage` across sessions, capped at 500 entries.
- **Bilingual UI** — `I18n` class holds both dictionaries; flag buttons toggle language at runtime
  with full re-render of all text nodes.
- **Responsive layout** — flexbox card (`max-w-md`), fluid inputs (`flex-1`), `sm:` breakpoint
  on display font.
- **Cross-browser compatibility** — no cutting-edge APIs; standard DOM events, `setInterval`,
  `Blob`, `localStorage` — all supported in Chrome, Edge, Opera, Firefox, Safari and Brave.
