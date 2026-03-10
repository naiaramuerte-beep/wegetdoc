# Ideas de Diseño para PDFPro

## Opción 1: "Corporate Teal" — Minimalismo Corporativo Moderno
<response>
<text>
**Movimiento de Diseño:** Minimalismo Suizo con toques de Material Design 3
**Principios Fundamentales:**
- Claridad funcional: cada elemento tiene un propósito claro
- Jerarquía tipográfica fuerte con contraste de pesos
- Espaciado generoso que transmite confianza y profesionalismo
- Interacciones fluidas que refuerzan la sensación de calidad

**Filosofía de Color:** Teal profundo (#0D9488) como acento principal sobre fondos blancos y grises muy claros. El teal transmite confianza, tecnología y frescura sin la frialdad del azul puro.

**Paradigma de Layout:** Asimétrico con columnas de ancho variable. El hero usa un layout de dos columnas donde el texto ocupa 60% y el upload area 40%.

**Elementos Distintivos:**
- Líneas horizontales finas como separadores
- Iconos de trazo fino (stroke) en teal
- Cards con sombra muy sutil y borde izquierdo de color

**Filosofía de Interacción:** Hover states suaves con transición de 200ms. El drag-and-drop tiene feedback visual con borde animado.

**Animación:** Fade-in escalonado en secciones al hacer scroll. Botones con efecto ripple sutil.

**Sistema Tipográfico:** DM Sans para títulos (bold, 700), Inter para cuerpo (400, 500). Tamaños: 3.5rem hero, 2rem h2, 1.125rem body.
</text>
<probability>0.08</probability>
</response>

## Opción 2: "Deep Navy Pro" — Editorial Oscuro con Acentos Dorados
<response>
<text>
**Movimiento de Diseño:** Editorial Moderno / Luxury Tech
**Principios Fundamentales:**
- Navbar oscuro que contrasta con contenido claro (similar al original pero con navy)
- Tipografía editorial con serif para títulos y sans para cuerpo
- Acentos en azul eléctrico (#2563EB) y detalles en índigo
- Gradientes sutiles de azul marino a azul medio

**Filosofía de Color:** Navy profundo (#0F172A) para navbar y footer, fondo principal en gris azulado muy claro (#F8FAFC), acento principal en azul eléctrico (#2563EB) con hover en índigo (#4F46E5).

**Paradigma de Layout:** Centrado con máximo ancho de 1200px. Secciones alternadas con fondos ligeramente diferentes para crear ritmo visual.

**Elementos Distintivos:**
- Gradiente radial azul suave detrás del upload area
- Iconos en cuadrados con fondo azul muy claro
- Botón primario en azul sólido con sombra de color

**Filosofía de Interacción:** El upload area tiene un borde punteado que se anima al hacer hover. Los tabs tienen un indicador deslizante.

**Animación:** Entrada de secciones con slide-up de 40px + fade. Hover en cards con lift de 4px.

**Sistema Tipográfico:** Sora para títulos (800, 700), DM Sans para cuerpo (400, 500). Contraste fuerte entre pesos.
</text>
<probability>0.07</probability>
</response>

## Opción 3: "Emerald Clarity" — Fresco y Accesible
<response>
<text>
**Movimiento de Diseño:** Flat Design 3.0 con influencia de Notion/Linear
**Principios Fundamentales:**
- Fondo blanco puro con secciones en gris muy suave
- Verde esmeralda (#059669) como color de acción principal
- Tipografía grande y bold para impacto visual
- Cards con bordes sutiles en lugar de sombras

**Filosofía de Color:** Blanco (#FFFFFF) y gris muy claro (#F9FAFB) para fondos, verde esmeralda (#059669) para CTAs y acentos, gris oscuro (#111827) para texto.

**Paradigma de Layout:** Grid de 12 columnas con secciones full-width. El hero tiene el texto centrado con el upload area debajo, amplio.

**Elementos Distintivos:**
- Badges de color verde para etiquetas "Most popular"
- Iconos en círculos con fondo verde muy claro
- Tabla de comparación de planes con checkmarks verdes

**Filosofía de Interacción:** Transiciones rápidas (150ms). Hover en botones con cambio de tono. Focus states muy visibles para accesibilidad.

**Animación:** Minimal — solo fade-in en elementos. Sin animaciones de scroll complejas.

**Sistema Tipográfico:** Plus Jakarta Sans para todo (800 para títulos, 400 para cuerpo). Jerarquía por tamaño, no por familia.
</text>
<probability>0.06</probability>
</response>

---

## Decisión: **Opción 2 — "Deep Navy Pro"**

Se elige el estilo Editorial Oscuro con Acentos en Azul Eléctrico porque:
- Mantiene la misma estructura navbar oscuro / contenido claro del original
- El azul eléctrico como acento diferencia claramente del rojo original
- La tipografía Sora + DM Sans da personalidad sin ser genérica
- Los gradientes azules crean profundidad visual sin ser recargados
