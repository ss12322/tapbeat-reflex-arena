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
├── supabase-config.js  # URL y anon key de Supabase
├── supabase/
│   └── schema.sql      # Tablas profiles y scores (ejecutar en Supabase)
├── sounds/
│   └── tron-juego.wav  # Música de la pantalla Home
└── README.md
```

---

## Supabase (usuarios y leaderboard global)

El registro, login y leaderboard se guardan en [Supabase](https://supabase.com/dashboard/project/njaesbocsnfbfouogfpo).

### 1. Crear tablas

En el dashboard → **SQL Editor**, ejecuta el contenido de `supabase/schema.sql`.

### 2. Configurar la API key

1. Ve a **Settings → API** en tu proyecto Supabase.
2. Copia la **anon public** key.
3. Pégala en `supabase-config.js`:

```javascript
window.TAPBEAT_SUPABASE = {
  url: 'https://njaesbocsnfbfouogfpo.supabase.co',
  anonKey: 'tu-anon-key-aqui'
};
```

### 3. Auth (recomendado para desarrollo)

En **Authentication → Providers → Email**, desactiva **Confirm email** para que el registro entre directo al juego sin confirmar correo.

### 4. Recuperar contraseña por código (email)

Para que el correo envíe un **código numérico** (y no solo un enlace):

1. Ve a **Authentication → Email Templates → Reset password**.
2. Reemplaza el contenido por algo como:

```html
<h2>Restablecer contraseña — TAPBEAT</h2>
<p>Tu código de verificación es:</p>
<p style="font-size: 28px; letter-spacing: 4px; font-weight: bold;">{{ .Token }}</p>
<p>Ingresa este código en el juego para crear una nueva contraseña.</p>
<p>El código expira en 1 hora.</p>
```

3. Guarda la plantilla.

En el juego: **Inicia sesión → ¿Olvidaste tu contraseña? → Enviar código → ingresar código y nueva contraseña**.

### Qué se guarda en el servidor

| Tabla | Contenido |
|-------|-----------|
| `auth.users` | Email y contraseña (Supabase Auth) |
| `profiles` | Nombre de usuario único + email |
| `scores` | Mejor score y promedio de clicks por jugador |

Todos los usuarios registrados comparten el mismo leaderboard global.

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

## Ejecutar en local

1. Clona el repositorio y configura Supabase (ver arriba).
2. Sirve la carpeta con un servidor local:

```bash
python -m http.server 8080
```

3. Visita `http://localhost:8080`.

> Usa un servidor local (no `file://`) para que Supabase y el audio funcionen correctamente.

---

## Licencia

Proyecto académico — ICESI.
