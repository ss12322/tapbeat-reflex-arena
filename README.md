# TAPBEAT — Reflex Arena · Audio Edition

Juego web de reflejos y ritmo. Escucha la señal de audio, toca el botón **TAP** lo más rápido posible y acumula clicks antes de que termine cada ronda.

**Jugar en línea:** https://ss12322.github.io/tapbeat-reflex-arena/

---

## Cómo jugar

1. En la pantalla **Home**, pulsa **UNIRSE AL TORNEO**.
2. Espera la cuenta regresiva (3… 2… 1… GO).
3. En cada ronda aparece el botón **TAP** en una posición aleatoria.
4. **Espera** a que suene la señal de audio (el botón cambia a modo escucha).
5. Cuando suene, **toca repetidamente** el botón o usa **Espacio / Enter** para sumar clicks.
6. Al terminar la ventana de sonido, se evalúa tu ronda y avanzas a la siguiente.
7. Completa **10 rondas** y revisa tu score final, rango y premio simulado.

---

## Controles

| Acción | Control |
|--------|---------|
| Tap / click | Botón **TAP** en pantalla |
| Teclado | **Espacio** o **Enter** (durante la partida) |
| Volumen de música | Slider en la pantalla Home |
| Silenciar música | Botón ♪ en la pantalla Home |

> En móvil, puede que necesites tocar la pantalla una vez para que el navegador permita reproducir audio.

---

## Puntuación

| Evento | Puntos |
|--------|--------|
| Click válido (durante la señal) | **+10** |
| Click antes del sonido | **−10** |
| Click después del sonido | **−10** |
| Sin clicks en la ronda | **0** (racha reiniciada) |

### Calificaciones por ronda

| Clicks en la ronda | Calificación |
|--------------------|--------------|
| 0 | MISS |
| 1–4 | GOOD |
| 5–7 | GREAT |
| 8–11 | PERFECT |
| 12+ | INSANE |

---

## Mecánicas del juego

- **10 rondas** por partida.
- La señal de audio suena entre **1,5 y 4,5 s** después de iniciar cada ronda (aleatorio).
- La duración de la señal va de **3,0 s** (ronda 1) a **0,8 s** (ronda 10): el juego se vuelve más exigente.
- El botón **TAP** se reposiciona aleatoriamente en cada ronda.
- Mantén una **racha** de rondas con al menos un click para mejorar tu desempeño.

---

## Anti-trampa

El juego detecta clicks demasiado rápidos (menos de **80 ms** entre taps). Si se repite el patrón, se marca como actividad sospechosa y el resultado puede invalidarse.

---

## Torneo y premios (simulado)

La pantalla Home muestra un **Prize Pool** y un **Leaderboard Top 5** con datos de demostración. Los premios se calculan según el rango final:

| Puesto | Premio (del pool) |
|--------|-------------------|
| 1° | 40% |
| 2° | 24% |
| 3° | 16% |

El pool crece automáticamente mientras la página está abierta.

---

## Estructura del proyecto

```
.
├── index.html          # Juego completo (HTML, CSS y JavaScript)
├── sounds/
│   └── tron-juego.wav  # Música de la pantalla Home
└── README.md
```

---

## Ejecutar en local

1. Clona el repositorio:

```bash
git clone https://github.com/ss12322/tapbeat-reflex-arena.git
cd tapbeat-reflex-arena
```

2. Abre `index.html` en un navegador moderno, o sirve la carpeta con un servidor local:

```bash
# Python 3
python -m http.server 8080
```

3. Visita `http://localhost:8080`.

> Se recomienda usar un servidor local en lugar de abrir el archivo directamente (`file://`) para que el audio cargue correctamente.

---

## Personalizar sonidos

En `index.html`, busca el objeto `CUSTOM_SOUNDS` para cambiar los archivos de audio:

```javascript
const CUSTOM_SOUNDS = {
  countdown: null,              // null = sonido sintético por defecto
  go: null,
  signal: null,
  home: 'sounds/tron-juego.wav' // Música de inicio (loop)
};
```

Coloca tus archivos en la carpeta `sounds/` y actualiza las rutas.

---

## Licencia

Proyecto académico — ICESI.
