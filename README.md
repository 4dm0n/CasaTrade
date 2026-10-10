# CasaTrade

Casa Trade es una oficina 3D para analizar ticks de Deriv y probar contratos Over/Under en una cuenta virtual.

## Modos de análisis

- **Manual:** opera el mercado y contrato elegidos, con hasta 100 ticks recientes.
- **Automático:** compara mercados en vivo con una ventana de 100 ticks.
- **Turbo:** compara mercados en vivo usando los últimos 30 ticks para mostrar señales con mayor frecuencia. La muestra corta también es más variable; solo se permite un trade pendiente y se resuelve con el siguiente tick.

Los trades se procesan en una cuenta demo: la aplicación no envía órdenes al broker. La frecuencia observada no predice resultados futuros.

La oficina incluye burbujas de diálogo con escritura animada, resultados flotantes sobre analista y tester, y la racha de ganancias exclusivamente en vivo de gerencia. El equipo humano del primer piso valida cada señal con trades de prueba sobre ticks nuevos; el tester solo autoriza una operación tras dos aciertos consecutivos. Estos trades de prueba no cambian el balance ni el historial. El segundo piso tiene un equipo de bots esféricos independiente, sin computadores: patrullan continuamente y llevan las ganancias a la caja fuerte y las pérdidas al contenedor. Cambiar la vista no traslada personajes entre equipos. El ping-pong solo se mueve mientras hay dos humanos en la mesa.

## Oficina financiera de dos pisos

- Usa los botones **Humanos / Bots** para cambiar la vista. Cada equipo permanece en su propio piso y no puede desplazarse al otro.
- El piso superior azul es una sala compacta alrededor del área de conteo, caja, cajones, caja fuerte y contenedor de pérdidas. Tiene billetes de dólar visibles sobre la mesa; los bots llevan los billetes hasta la caja fuerte cuando hay ganancia y desde allí hasta el desecho cuando hay pérdida.
- La actividad física del dinero es una representación de la cuenta virtual; no mueve fondos reales. Los ticks en vivo iluminan las señales de los robots.

## Organización del código

- `js/app/`: estado y controles de la interfaz.
- `js/trading/`: análisis determinista y conexión de mercado.
- `js/scene/`: escena compartida de oficina, robots y piso financiero.
- `tests/`: regresiones de análisis, mercados, contratos y escena 3D.
