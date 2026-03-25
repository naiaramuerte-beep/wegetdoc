# Informe de Auditoría de Seguridad — pdfup.io

**Fecha:** 25 de marzo de 2026  
**Dominio auditado:** pdfup.io (anteriormente editpdf.online)  
**Motivo:** Rechazo de anuncios por política de "Software malicioso" en Google Ads (cuenta 163-962-1084)

---

## 1. Resumen ejecutivo

Se ha realizado una auditoría exhaustiva del código fuente completo de pdfup.io para identificar y corregir cualquier elemento que pudiera haber activado la política de "software malicioso" o "abuso de la red publicitaria" de Google Ads. Se identificaron **3 problemas principales** y se corrigieron todos. El sitio no contiene malware, software no deseado ni código malicioso de ningún tipo.

---

## 2. Verificaciones externas

| Herramienta | Resultado | Detalle |
|---|---|---|
| **Google Safe Browsing** | Limpio | Sin datos negativos registrados |
| **VirusTotal** | 0/94 detecciones | Ningún vendor de seguridad marca el dominio como malicioso |

---

## 3. Problemas identificados y corregidos

### 3.1 Contenido SEO oculto (riesgo de "cloaking")

**Severidad:** Crítica  
**Archivo:** `client/index.html`

Se encontró un bloque `<div>` con estilo CSS que lo hacía invisible para los usuarios (`width:1px; height:1px; overflow:hidden; clip:rect(0,0,0,0)`) pero legible por los bots de Google. Este bloque contenía texto SEO extenso con palabras clave. Google puede interpretar esto como **cloaking** — una técnica de elusión de sistemas que viola directamente la política de "contenido de anuncio elusivo" y "elusión de sistemas".

**Acción tomada:** Se eliminó completamente el bloque `<div id="seo-content">` del HTML.

### 3.2 Estadísticas falsas y social proof fabricado

**Severidad:** Alta  
**Archivos:** `client/src/pages/Home.tsx`, `client/src/lib/i18n.ts`

Se encontraron múltiples elementos de social proof con datos inventados:

- Un contador animado de "127.843 usuarios activos ahora" que fluctuaba aleatoriamente entre 120K y 145K (el propio código tenía el comentario `// Fake active users counter`)
- Badges de "2.3M usuarios activos" y "★ 4.8/5 valoración" sin base real
- Barra de estadísticas con "2.3M+ PDFs editados hoy", "★ 4.8 valoración media" y "180K+ usuarios activos"
- Texto CTA "Únete a millones de usuarios" en 10 idiomas

Estos elementos constituyen **prácticas engañosas** según la política de Google, ya que "prometen una propuesta de valor que no cumplen" y pueden considerarse como intento de obtener una "ventaja desleal" en la subasta publicitaria.

**Acciones tomadas:**
- Se eliminó completamente el contador falso de usuarios activos
- Se reemplazaron las estadísticas falsas por datos verificables sobre las funcionalidades del producto ("15+ herramientas PDF", "100% basado en navegador", "0 instalación necesaria")
- Se reemplazaron los badges falsos de rating y usuarios por características reales ("Seguro y cifrado", "Funciona en cualquier navegador")
- Se actualizó el texto CTA en los 10 idiomas para eliminar la referencia a "millones de usuarios"

### 3.3 robots.txt con dominio incorrecto

**Severidad:** Media  
**Archivo:** `client/public/robots.txt`

El archivo robots.txt seguía referenciando el dominio antiguo `editpdf.online` en lugar de `pdfup.io`, lo que podría causar confusión en los crawlers.

**Acción tomada:** Se actualizaron todas las referencias al dominio correcto `pdfup.io`.

---

## 4. Verificaciones de cumplimiento (sin problemas)

| Categoría de política | Estado | Detalle |
|---|---|---|
| **Software malicioso** | Cumple | No se encontró malware, scripts maliciosos ni código ofuscado |
| **Sitio web vulnerado** | Cumple | No hay inyecciones de código de terceros ni backdoors |
| **Software no deseado** | Corregido | Se eliminaron las estadísticas falsas (ver 3.2) |
| **Ventaja desleal** | Corregido | Se eliminó el social proof fabricado (ver 3.2) |
| **Contenido elusivo** | Corregido | Se eliminó el contenido SEO oculto (ver 3.1) |
| **Elusión de sistemas** | Corregido | Se eliminó el cloaking (ver 3.1) |
| **Descargas automáticas** | Cumple | Todas las descargas requieren acción explícita del usuario |
| **Consentimiento de cookies** | Cumple | Google Consent Mode v2 implementado correctamente |
| **Transparencia de precios** | Cumple | Términos de suscripción y prueba gratuita claramente visibles |
| **Protección de datos** | Cumple | Conexión SSL, archivos procesados en el navegador |
| **Panel de administración** | Cumple | Protegido por autenticación y verificación de rol admin |

---

## 5. Arquitectura de seguridad del sitio

El sitio pdfup.io es un editor de PDF legítimo basado en navegador con las siguientes características de seguridad:

- Los archivos PDF se procesan **en el navegador del usuario** mediante JavaScript (pdf-lib, PDF.js), sin enviar los documentos a servidores externos
- La conexión está protegida con **cifrado SSL/TLS**
- El procesamiento de conversiones (Word, Excel, etc.) se realiza en el servidor mediante LibreOffice en un entorno aislado
- No se instala ningún software en el dispositivo del usuario
- No hay popups, redirects automáticos ni iframes ocultos
- No se utilizan redes publicitarias de terceros en el sitio

---

## 6. Scripts externos legítimos

| Script | Propósito | Riesgo |
|---|---|---|
| Google Tag (G-XBHZ3TMG7K) | Analytics | Ninguno — propio de Google |
| Google Fonts (Sora, DM Sans) | Tipografías | Ninguno — CDN oficial de Google |
| Umami Analytics | Estadísticas web | Ninguno — herramienta open source de analytics |

---

## 7. Conclusión

Los problemas identificados (contenido oculto tipo cloaking y estadísticas fabricadas) han sido **completamente eliminados**. El sitio pdfup.io es una herramienta legítima de edición de PDF que cumple con todas las políticas de Google Ads. No contiene malware, software no deseado, ni prácticas engañosas.
