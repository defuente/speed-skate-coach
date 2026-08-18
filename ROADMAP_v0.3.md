# Speed Skate Coach / PatinCrono — Roadmap v0.3

**Objetivo:** Deportistas + analítica avanzada + base de datos preparada para futura sincronización en nube.

## Criterio de cierre

La v0.3 se considerará cerrada cuando los deportistas tengan identidad estable independiente del nombre, las estadísticas puedan analizarse por contexto comparable y exista una base de datos local migrable a la futura v0.4.

## 1. Modelo de deportistas

- [x] Crear entidad `Athlete` con ID permanente.
- [x] Agregar `athleteId` opcional a sesiones para compatibilidad con datos históricos.
- [x] Migrar automáticamente deportistas antiguos almacenados como nombres.
- [x] Relacionar sesiones antiguas con el nuevo ID sin perder información.
- [x] Mantener `athleteName` en la sesión como snapshot/compatibilidad.
- [x] Seleccionar deportistas por ID al iniciar entrenamientos nuevos.
- [x] Permitir renombrar un deportista sin perder la relación con sus sesiones.
- [x] Incorporar historial de categorías con períodos de vigencia.
- [x] Guardar en cada sesión la categoría vigente del deportista como snapshot histórico.
- [x] Vincular cada sesión al ID de la etapa histórica (`athleteCategoryHistoryId`) cuando corresponde.
- [x] Migrar automáticamente sesiones existentes al ID de etapa histórica cuando puede inferirse de forma segura.

## 2. Ficha del deportista

- [x] Nombre.
- [x] Fecha de nacimiento opcional en formato visible `dd/MM/yyyy`.
- [x] Categoría actual opcional.
- [x] Club/equipo opcional.
- [x] Observaciones del entrenador.
- [x] Resumen de sesiones, vueltas, tiempo y distancia.
- [x] Cumplimiento medio de volumen.
- [x] Cumplimiento medio de ritmo.
- [x] Consistencia media basada solo en sesiones con más de una vuelta.
- [x] Línea de tiempo visual del historial de categorías.
- [x] Mostrar fecha desde/hasta de cada categoría y cantidad de sesiones asociadas.

## 3. Récords personales

- [x] Récord personal separado por distancia de vuelta.
- [x] No mezclar tiempos de pistas/distancias distintas.
- [x] Mantener el récord principal por distancia; el tipo de entrenamiento se usa como contexto analítico, no para fragmentar el récord personal en v0.3.

## 4. Analítica avanzada

- [x] Centralizar cálculos de analítica en `utils/athleteAnalytics.ts`.
- [x] Métricas: mejor vuelta, promedio, consistencia, velocidad media, ritmo y volumen.
- [x] Filtro por período: 30 / 90 días / todo.
- [x] Filtro por categoría histórica.
- [x] Filtro por distancia de vuelta.
- [x] Filtro por tipo de entrenamiento.
- [x] Gráfico seleccionable por métrica.
- [x] Evitar comparaciones inválidas entre distancias diferentes.
- [x] Evitar comparar automáticamente sesiones de categorías diferentes cuando existe categoría histórica.

## 5. Comparación de sesiones

- [x] Localizar la sesión anterior comparable.
- [x] Exigir misma distancia y mismo tipo de entrenamiento para la comparación automática.
- [x] Exigir además la misma categoría cuando la sesión actual tiene categoría registrada.
- [x] Calcular diferencias entre métricas.
- [x] Generar conclusiones automáticas basadas en reglas.
- [x] Interfaz visual de comparación en la ficha del deportista.
- [x] Mostrar mejora/empeoramiento de promedio, consistencia y velocidad.
- [x] Mostrar diferencias de cumplimiento de ritmo y volumen cuando correspondan.

## 6. Exportación

- [x] CSV individual por sesión.
- [x] CSV consolidado por deportista.
- [x] Incorporar `athleteId` al CSV sin eliminar el nombre legible del deportista.
- [x] Incorporar categoría histórica de la sesión al CSV.

## 7. Preparación para v0.4

- [x] Versión explícita del esquema local para migración de deportistas.
- [x] IDs permanentes para deportistas.
- [x] Revisar IDs de entidades: `Athlete.id` y `Session.id` permanentes; vueltas identificadas por `(sessionId, number)`.
- [x] Definir documento de contrato de datos local/nube en `DATA_CONTRACT_v0.4.md`.
- [x] Documentar estrategia offline-first y manejo inicial de conflictos para v0.4.
- [x] Preparar el modelo local de categorías para sincronización futura.

> La autenticación, Google Sign-In, respaldo remoto, restauración en otro teléfono y sincronización real pertenecen a **v0.4**. El backend inicial de Supabase ya está preparado, pero la app v0.3 continúa siendo offline-first y no depende de la nube.

## 8. Mejoras de flujo y presentación

- [x] Al seleccionar un deportista guardado para un nuevo entrenamiento, precargar la configuración de su sesión más reciente.
- [x] Precargar tipo de entrenamiento, distancia por vuelta, vueltas objetivo y tiempo objetivo, manteniendo los campos editables.
- [x] Filtrar el historial de sesiones por deportista mediante selección rápida.
- [x] Mantener opción `Todos` para volver al historial completo.
- [x] Eliminar de Ajustes las instrucciones técnicas para generar APK.
- [x] Mostrar el logo real de PatinCrono en `Acerca de`.
- [x] Mostrar la versión de la aplicación desde la configuración Expo.
- [x] Incorporar autoría de la aplicación en `Acerca de`.

## 9. Corrección del historial de categorías

- [x] Impedir eliminar silenciosamente una categoría que todavía tenga sesiones asociadas.
- [x] Permitir reasignar una sesión individual a otra etapa histórica del mismo deportista.
- [x] Permitir mover todas las sesiones de una categoría a otra etapa histórica.
- [x] Permitir mover las sesiones y eliminar una categoría cargada por error.
- [x] Permitir eliminar directamente categorías sin sesiones.
- [x] Si se elimina la categoría actual, reabrir automáticamente la etapa anterior como categoría vigente.
- [x] Mantener intactos los tiempos, vueltas y demás métricas de una sesión al cambiar solo su categoría.
- [x] Incorporar acceso `Corregir categorías` desde la sección Deportistas.

## Pendientes para cerrar v0.3

1. Ejecutar `pnpm typecheck` en el entorno local.
2. Probar la migración con los datos reales existentes del teléfono.
3. Validar edición/renombre de un deportista y conservación de sus sesiones.
4. Cambiar la categoría de un deportista y confirmar que aparece el período anterior y el nuevo período actual.
5. Crear una sesión después del cambio y confirmar que guarda la nueva categoría.
6. Validar el filtro de analítica por categoría con sesiones de al menos dos etapas distintas cuando existan datos suficientes.
7. Validar `Deportistas → Corregir categorías`: mover una sesión individual, mover todas y eliminar una etapa incorrecta.
8. Confirmar que eliminar una categoría con sesiones y sin destino queda bloqueado.
9. Confirmar que borrar la categoría actual sin sesiones reactiva correctamente la categoría anterior.
10. Validar filtros por período, distancia y tipo, gráficos y comparación de sesiones.
11. Validar precarga de la configuración del último entrenamiento al seleccionar un deportista.
12. Validar filtro por deportista en Historial.
13. Corregir cualquier hallazgo de prueba.
14. Generar APK de validación v0.3.
15. Crear `RELEASE_NOTES_v0.3.0.md`, cerrar v0.3 y abrir `develop-v0.4`.
