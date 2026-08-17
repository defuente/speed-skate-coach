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
  - tiempo promedio;
  - vueltas registradas;
  - tendencia de las últimas vueltas comparada con el promedio actual.

### 4. Volumen objetivo

- Nueva configuración opcional de **vueltas objetivo**.
- La cabecera fija muestra la vuelta actual, cantidad objetivo y porcentaje completado.
- Barra compacta de progreso del volumen.
- La sesión no se detiene automáticamente al cumplir la meta; permite registrar vueltas extra.
- Al finalizar antes del objetivo se informa el porcentaje de volumen completado.
- Diferenciación entre cumplimiento de ritmo y cumplimiento de volumen.

### 5. Historial de sesiones

- Historial con filtro por deportista.
- Tarjetas con tiempo, vueltas, volumen, mejor vuelta, ritmo y velocidad media.
- Estado visible para sesiones con vueltas objetivo:
  - **Cumplido**: vueltas reales = objetivo.
  - **Sobrecumplido**: vueltas reales > objetivo.
  - **Incompleto**: vueltas reales < objetivo.
- Detalle completo de cada sesión y registro de vueltas.

### 6. Ayuda contextual de métricas

El detalle de sesión incorpora información contextual para explicar:

- cumplimiento de volumen;
- mejor y peor vuelta;
- cumplimiento de ritmo;
- tiempo promedio;
- consistencia;
- velocidad media;
- distancia total.

La métrica de **consistencia** corresponde al coeficiente de variación de los tiempos de vuelta: desviación estándar / tiempo promedio × 100. Un porcentaje menor representa un ritmo más regular.

### 7. Gestión de deportistas

- Catálogo persistente de deportistas.
- Selección de deportistas guardados al crear entrenamientos.
- Pestaña de deportistas.
- Perfil individual con:
  - sesiones;
  - vueltas totales;
  - mejor vuelta;
  - tiempo acumulado;
  - distancia;
  - velocidad máxima;
  - evolución de rendimiento.
- Renombrar deportista actualiza sus sesiones asociadas.
- Eliminar deportista elimina su perfil y sesiones asociadas con confirmación.

### 8. Estadísticas

- Estadísticas globales y por deportista.
- Métricas de rendimiento y consistencia.
- Evolución mediante gráficos.
- Cumplimiento promedio de volumen para sesiones con vueltas objetivo.
- Comparación de vueltas reales versus vueltas objetivo.

### 9. Exportación CSV

- Exportación de sesiones individuales.
- Exportación consolidada por deportista.
- Datos de objetivo de tiempo y volumen incluidos en los archivos exportados.

## Datos persistidos por sesión

Entre otros datos, una sesión puede almacenar:

- deportista;
- tipo de entrenamiento;
- distancia por vuelta;
- tiempo objetivo por vuelta;
- vueltas objetivo;
- vueltas realizadas;
- tiempos individuales;
- tiempo acumulado;
- velocidad;
- tiempo total.

Los nuevos campos de v0.2 son opcionales, por lo que las sesiones antiguas siguen siendo compatibles.

## Empaquetado Android

La aplicación Expo declara la versión **0.2.0** en `artifacts/mobile/app.json`.

Se agregó `artifacts/mobile/eas.json` con:

- perfil `preview` para generar un **APK instalable directamente en dispositivos Android**;
- perfil `production` preparado para generar un **Android App Bundle (AAB)** cuando se publique en Google Play.

## Validación

Durante el desarrollo de v0.2 se realizaron pruebas manuales frecuentes en Expo/Android y validaciones de TypeScript mediante:

```bash
pnpm typecheck
```

La interfaz de cronómetro, objetivos, scroll, Vista de entrenador, historial y gestión de deportistas fue iterada a partir del uso en dispositivo.

El repositorio no posee actualmente checks automáticos obligatorios en GitHub, por lo que la validación de dispositivo y typecheck continúa siendo parte importante del flujo de desarrollo.

## Política de cierre

- `main` representa la versión estable v0.2.0.
- `develop-v0.2` queda congelada como referencia de esta versión.
- El desarrollo posterior se realiza en `develop-v0.3`.
- Nuevas funcionalidades no deben agregarse a v0.2 salvo correcciones críticas de mantenimiento.

## Próxima versión

La siguiente línea de desarrollo es **v0.3**, iniciada desde el estado estable de v0.2.0.
