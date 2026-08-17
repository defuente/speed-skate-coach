# Speed Skate Coach / PatinCrono — v0.2.0

**Fecha de cierre:** 17 de agosto de 2026  
**Estado:** Estable / cerrada  
**Rama de desarrollo:** `develop-v0.2`  
**Rama estable:** `main`

## Resumen

La versión **v0.2.0** consolida Speed Skate Coach como una herramienta práctica para registrar entrenamientos de patinaje de carrera, evaluar el cumplimiento del ritmo y del volumen asignado, administrar deportistas y revisar la evolución de las sesiones.

El foco de esta versión fue mejorar el uso real durante pista: información crítica visible mientras corre el cronómetro, lectura rápida del desempeño, historial por deportista y métricas fáciles de interpretar.

## Principales novedades

### 1. Cronómetro y entrenamiento en vivo

- Cronómetro de sesión y tiempo de vuelta actual.
- Información de la vuelta actual permanece fija mientras se revisan datos históricos mediante scroll.
- Controles de entrenamiento permanecen accesibles sobre la navegación inferior.
- Registro de vueltas con mejor vuelta, peor vuelta, promedio, consistencia y velocidad.
- Feedback háptico para acciones principales.

### 2. Objetivo de tiempo por vuelta

- Configuración opcional de tiempo objetivo por vuelta.
- Indicador en vivo **EN OBJETIVO** / **SOBRE OBJETIVO**.
- Visualización del margen o exceso respecto del objetivo.
- Vueltas completadas marcadas con `✓` o `✗` según cumplimiento.
- Métrica de cumplimiento de ritmo por sesión.

### 3. Vista de entrenador

- Panel de análisis visible durante entrenamientos activos.
- Con objetivo de tiempo muestra:
  - vueltas cumplidas;
  - vueltas fuera del objetivo;
  - porcentaje de cumplimiento;
  - tendencia de las últimas vueltas contra el objetivo.
- Sin objetivo de tiempo funciona en modo **Ritmo libre** y muestra:
  - mejor vuelta;
  - promedio;
  - cantidad de vueltas;
  - tendencia de las últimas vueltas respecto del promedio actual.

### 4. Vueltas objetivo y cumplimiento de volumen

Se incorporó el concepto de **vueltas objetivo** para diferenciar el volumen asignado del volumen realmente completado.

- Campo opcional `Vueltas objetivo` al crear un entrenamiento.
- Progreso integrado en la cabecera fija de la vuelta actual.
- Ejemplo durante una sesión: `VUELTA 6 DE 10 · 50% COMPLETADO`.
- Barra compacta de progreso de volumen.
- La sesión no se detiene automáticamente al alcanzar el objetivo, permitiendo registrar vueltas adicionales.
- Al finalizar antes del objetivo, la app informa el volumen alcanzado.
- Persistencia de `targetLapCount` dentro de cada sesión histórica.

#### Estados de volumen en Historial

Cuando existe un objetivo de vueltas, cada sesión muestra junto al tipo de entrenamiento uno de estos estados:

- **Cumplido**: vueltas reales = vueltas objetivo.
- **Sobrecumplido**: vueltas reales > vueltas objetivo.
- **Incompleto**: vueltas reales < vueltas objetivo.

El estado incluye las vueltas reales/objetivo para identificar rápidamente el resultado sin abrir la sesión.

### 5. Gestión de deportistas

- Catálogo local persistente de deportistas.
- Recuperación automática de nombres desde sesiones históricas existentes.
- Selección rápida de un deportista guardado al iniciar un nuevo entrenamiento.
- Prevención de duplicados por diferencias de mayúsculas/minúsculas.
- Nueva pestaña **Deportistas**.
- Perfil individual con:
  - sesiones;
  - cantidad de vueltas;
  - mejor vuelta;
  - tiempo total;
  - distancia acumulada;
  - velocidad máxima;
  - evolución de mejores vueltas;
  - historial exclusivo del deportista.
- Renombrado de deportistas actualizando también sus sesiones asociadas.
- Eliminación con confirmación explícita.

### 6. Historial y detalle de sesiones

- Historial con filtros por deportista.
- Tarjetas de sesión con información de tiempo, vueltas, volumen, mejor vuelta, ritmo y velocidad media cuando corresponda.
- Estados visuales de cumplimiento de volumen.
- Detalle completo de cada sesión.
- Ayuda contextual mediante iconos `ⓘ` para explicar las métricas principales:
  - cumplimiento de volumen;
  - mejor vuelta;
  - peor vuelta;
  - cumplimiento de ritmo;
  - tiempo promedio;
  - consistencia;
  - velocidad media;
  - distancia total.

### 7. Interpretación de métricas

#### Consistencia

La consistencia se calcula como el **coeficiente de variación** de los tiempos de vuelta:

`desviación estándar / tiempo promedio × 100`

- `0%` representaría vueltas idénticas.
- Un porcentaje menor indica un ritmo más regular.
- Un porcentaje mayor indica mayor variación entre vueltas.

#### Velocidad media

La velocidad media se calcula como:

`distancia total recorrida / tiempo acumulado`

La app la presenta en `km/h`.

### 8. Estadísticas y gráficos

- Resumen de sesiones y vueltas.
- Mejor vuelta global.
- Velocidad máxima cuando existen datos de distancia.
- Gráficos con mejor legibilidad para uso móvil.
- Evolución de:
  - mejor vuelta por sesión;
  - velocidad media;
  - vueltas por sesión;
  - consistencia;
  - cumplimiento de volumen.
- Cumplimiento promedio de volumen.
- Conteo de sesiones que completaron el volumen objetivo.

### 9. Exportación CSV

- Exportación CSV de una sesión individual.
- Exportación consolidada de sesiones por deportista desde Historial.
- Inclusión de datos de objetivo y cumplimiento cuando existen.
- Compatibilidad con Expo mediante `expo-file-system/legacy` y `expo-sharing`.

## Cambios de modelo de datos

Durante v0.2 se incorporaron campos opcionales que mantienen compatibilidad con sesiones antiguas:

- `targetLapTimeMs`: objetivo de tiempo por vuelta.
- `targetLapCount`: cantidad de vueltas objetivo de la sesión.
- Persistencia del objetivo de tiempo también a nivel de vuelta para mantener contexto histórico.

Las sesiones creadas antes de v0.2 continúan siendo legibles porque estos campos son opcionales.

## Persistencia local

Los datos continúan almacenándose localmente mediante `AsyncStorage`:

- sesiones;
- configuración;
- catálogo de deportistas.

No se incluye todavía sincronización en nube ni cuentas multiusuario en v0.2.

## Correcciones técnicas relevantes

- Corrección del tipado de la paleta de colores.
- Compatibilidad de exportación CSV con la API legacy de Expo File System.
- Ajustes de rutas tipadas de Expo Router para nuevas pantallas de deportistas.
- Corrección de nodos de texto sueltos en componentes React Native.
- Ajustes de layout para evitar que los controles queden detrás de la barra de navegación.
- Reestructuración del scroll de entrenamiento para mantener fija la información crítica de la vuelta actual.
- Mejoras de legibilidad en gráficos y tarjetas de estadísticas.

## Validación realizada

Durante el desarrollo de v0.2 se realizaron iteraciones de validación con:

```bash
pnpm typecheck
```

usando:

```bash
tsc -p tsconfig.json --noEmit
```

También se realizaron pruebas manuales en Expo del flujo de entrenamiento, incluyendo:

- creación de sesiones;
- selección de deportistas;
- objetivos de tiempo;
- objetivos de vueltas;
- cumplimiento e incumplimiento;
- sobrecumplimiento;
- Vista de entrenador;
- scroll durante entrenamiento;
- historial;
- perfil de deportistas;
- detalle de sesión.

## Alcance cerrado de v0.2

A partir de este release no se agregarán nuevas funcionalidades a `develop-v0.2`. Solo deberían considerarse correcciones críticas si fueran necesarias.

Las nuevas funcionalidades deben desarrollarse desde:

`develop-v0.3`

creada a partir del mismo commit estable utilizado para cerrar `v0.2.0`.

## Próxima versión

La versión **v0.3** queda reservada para nuevas capacidades y experimentación sin afectar la estabilidad alcanzada en v0.2.

---

**Release:** `v0.2.0`  
**Aplicación Expo:** `0.2.0`
