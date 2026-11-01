# Sclintex — Control de jornadas

Aplicación web personal para registrar jornadas de delivery, ingresos, gastos, kilometraje y mantenimiento de la moto.

## Cómo usar
1. Descomprime el proyecto.
2. Abre `index.html` en Chrome, Edge o Firefox.
3. En Configuración define tu meta mensual, intervalo de cambio, kilometraje del último cambio de aceite y odómetro actual.
4. En Jornada diaria registra el kilometraje inicial al comenzar.
5. Al terminar registra el kilometraje final, ingresos, gasolina y otros gastos.

## Funciones
- Resumen mensual de ingresos, ganancia neta, gasolina y kilómetros.
- Meta mensual con barra de progreso.
- Inicio y cierre de jornada con validaciones.
- Historial mensual con detalle y eliminación de registros.
- Exportación mensual a CSV compatible con Excel.
- Respaldo y restauración de todos los datos en JSON.
- Contador de mantenimiento que suma kilómetros de jornadas completadas y se reinicia al registrar un cambio de aceite.
- Diseño adaptable a escritorio y celular.

## Almacenamiento y privacidad
Los datos se guardan en `localStorage` del navegador. No se envían a un servidor. Si borras los datos del navegador o cambias de dispositivo/perfil, puedes perder el historial; descarga periódicamente un respaldo JSON desde Configuración.

## Dependencias externas
- Lucide Icons (CDN)
- Google Fonts (DM Sans y Manrope)

Para cargar iconos y tipografías se necesita conexión a internet. La aplicación y sus registros funcionan localmente.


## Instalar como aplicación (PWA)
El proyecto incluye `manifest.webmanifest`, `service-worker.js`, `pwa.js` e iconos de aplicación.
Para instalarlo en un teléfono debe publicarse en un sitio con HTTPS (por ejemplo GitHub Pages). Abrir `index.html` directamente desde archivos no activa la instalación PWA.
- Android: abre la dirección HTTPS en Chrome y pulsa Instalar aplicación (o el menú ⋮ > Instalar aplicación / Añadir a pantalla de inicio).
- iPhone: abre la dirección HTTPS en Safari, pulsa Compartir y luego Añadir a pantalla de inicio.
El shell principal queda disponible sin conexión después de la primera carga. Google Fonts y Lucide por CDN pueden no cargar offline; el registro y los cálculos sí funcionan.
