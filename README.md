# 🤖 Clasificador de Tickets de Soporte con IA

Automatiza la atención al cliente en **Google Sheets** usando la **API de Claude (Anthropic)**. Cada ticket se clasifica automáticamente con:

| Campo | Ejemplo |
|---|---|
| Categoría | Facturación, Soporte técnico, Conectividad... |
| Prioridad | 🔴 Alta / 🟡 Media / 🟢 Baja |
| Sentimiento | Positivo / Neutral / Negativo |
| Resumen | "Cobro duplicado, solicita reembolso" |
| Respuesta sugerida | Borrador listo para enviar al cliente |

## ¿Por qué es útil?
Un equipo de soporte pierde tiempo leyendo y priorizando tickets a mano. Esta herramienta lo hace en segundos y deja arriba a los clientes molestos o en riesgo de irse.

## Arquitectura
```
Google Sheets (hoja "Tickets")
      │ menú personalizado
      ▼
Apps Script (Code.gs)
      │ UrlFetchApp → HTTPS
      ▼
Claude API (/v1/messages) → responde JSON
      │
      ▼
Se escriben resultados + color por prioridad + hoja "Resumen" con gráfico
```

## Instalación
1. Crea una hoja de Google Sheets → **Extensiones → Apps Script**.
2. Pega `src/Code.gs`, guarda y recarga la hoja.
3. Menú **🤖 IA Tickets**:
   1. Configurar API Key (obtenla en console.anthropic.com)
   2. Crear hoja de ejemplo
   3. Clasificar pendientes
   4. Ver resumen

## Decisiones técnicas
- **Seguridad:** la API key se guarda en `PropertiesService`, nunca en el código ni en GitHub.
- **Salida estructurada:** el prompt obliga a responder en JSON, que se parsea y se escribe en columnas.
- **Tolerante a errores:** si un ticket falla, se marca con el error y los demás continúan.
- **Idempotente:** solo procesa tickets en estado "Pendiente".

## Mejoras futuras
Ejecución automática con un activador cada X minutos, envío de la respuesta por Gmail y conexión con formularios de Google Forms.
