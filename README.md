# CasaTrade

Oficina 3D para analizar ticks de Deriv y probar contratos Over/Under en una cuenta virtual.
La aplicación **no envía órdenes al broker**: todo se resuelve en una cuenta demo.

## Cómo se usa

Abre `index.html` (o publica la carpeta tal cual, como hace el workflow de GitHub Pages).
El equipo de 8 personas trabaja sobre la escena: 3 estaciones con nombre (analista, tester y
gerencia) y 5 visitantes que llegan a la mesa de clientes, consultan los tableros y salen por
recepción.

- **Orden global:** Full Work, Oportunidad, 50% Descanso y Descanso reparten al equipo entre
  las estaciones y la zona de descanso.
- **Cámara 360°:** General, Analista, Tester, Gerencia, Descanso, Ping pong y Refrigerio.
- **Modo Turbo:** multiplica la velocidad de simulación (×3.5) y usa la ventana de 30 ticks.

## Plano de la oficina

Reproduce el plano de referencia: ala oeste técnica, sala de trading central y ala este de
análisis y administración. Todas las zonas están rotuladas con etiquetas flotantes.

| Zona | Contenido |
| --- | --- |
| Sala de trading principal | Tres filas de mesas isla con gráficos en vivo; la fila central son las estaciones del analista, el tester y gerencia. |
| Mesa de clientes (research) | Cinco plazas para los visitantes. |
| Ingeniería de estrategias de trading | Pod acristalado con mesa holográfica y anillos animados. |
| Zona de servidores | Dos bancos de racks con telemetría LED intermitente. |
| Ciberseguridad | Sala oscura con muro de vídeo continuo, consolas y mesa de mapa. |
| Análisis macroeconómico | Plataforma elevada con mesas de reunión y cuatro paneles de datos. |
| Administración | Cuatro despachos acristalados con escritorio y monitor. |
| Zona de descanso | Sofás, mesa baja y máquina de refrigerio; aquí también está el ping-pong. |

Los pasillos llevan guías de neón (cian en la circulación principal, magenta en estrategias y
ámbar en administración) y las etiquetas de zona se atenúan cuando la cámara se acerca para no
taparse entre sí.

## Organización del código

- `analysis-engine.js` y `market-feed.js`: análisis determinista, ventana de ticks y conexión con el mercado.
- `workspace.js`: estado y controles de la interfaz (pestañas, cuenta, historial, chat).
- `office-scene.js`: escena compartida, asientos, mobiliario, rótulos, cámaras y personajes.
- `office-life.js`: rutinas del equipo (tableros, recepción, ping-pong, celebración) y ciudad de fondo.
- `office-activities.js`: poses de comida y ping-pong, texturas de superficie y vestuario.
- `workspace.css` y el `<style>` de `index.html`: presentación de la interfaz.
- `tests/`: regresiones de análisis, mercados, contratos, asientos, actividades, navegación y capturas.

## Pruebas

```powershell
node tests/check.cjs            # sintaxis de todos los scripts + motor + banda ±5 + Turbo
node tests/office.cjs           # asientos, orientación, pies en el suelo, descanso a 30/60/120 fps
node tests/scene-navigation.cjs # las 16 plazas funcionales y los 7 destinos compartidos son alcanzables
node tests/life.cjs             # rutinas del equipo, salidas por recepción, rally de ping-pong
node tests/activities.cjs       # bocado, contacto de pala, red y bote en la mesa
node tests/contracts.cjs        # contratos Over/Under, PnL, martingala, recibo y reset
node tests/turbo.cjs            # modo Turbo, sesgo demo, inmunidad en vivo y banda
node tests/scene-views.cjs      # capturas de todas las cámaras en tests/scene-*.png
```

Los tests de navegador lanzan Microsoft Edge en modo headless mediante Playwright.
