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

## 2. Ficha del deportista

- [x] Nombre.
- [x] Fecha de nacimiento opcional.
- [x] Categoría opcional.
- [x] Club/equipo opcional.
- [x] Observaciones del entrenador.
- [x] Resumen de sesiones, vueltas, tiempo y distancia.
- [x] Cumplimiento medio de volumen.
- [x] Cumplimiento medio de ritmo.
- [x] Consistencia media basada solo en sesiones con más de una vuelta.

## 3. Récords personales

- [x] Récord personal separado por distancia de vuelta.
- [x] No mezclar tiempos de pistas/distancias distintas.
- [ ] Evaluar después de pruebas si los récords necesitan además filtro por tipo de entrenamiento.

## 4. Analítica avanzada

- [x] Centralizar cálculos de analítica en `utils/athleteAnalytics.ts`.
- [x] Métricas: mejor vuelta, promedio, consistencia, velocidad media, ritmo y volumen.
- [x] Filtro por período: 30 / 90 días / todo.
- [x] Filtro por distancia de vuelta.
- [x] Filtro por tipo de entrenamiento.
- [x] Gráfico seleccionable por métrica.
- [x] Evitar comparaciones inválidas entre distancias diferentes.

## 5. Comparación de sesiones

- [x] Localizar la sesión anterior comparable.
- [x] Exigir misma distancia y mismo tipo de entrenamiento para la comparación automática.
- [x] Calcular diferencias entre métricas.
- [x] Generar conclusiones automáticas basadas en reglas.
- [x] Interfaz visual de comparación en la ficha del deportista.
- [x] Mostrar mejora/empeoramiento de promedio, consistencia y velocidad.
- [x] Mostrar diferencias de cumplimiento de ritmo y volumen cuando correspondan.

## 6. Exportación

- [x] CSV individual por sesión.
- [x] CSV consolidado por deportista.
- [x] Incorporar `athleteId` al CSV sin eliminar el nombre legible del deportista.

## 7. Preparación para v0.4

- [x] Versión explícita del esquema local para migración de deportistas.
- [x] IDs permanentes para deportistas.
- [x] Revisar IDs de entidades: `Athlete.id` y `Session.id` permanentes; vueltas identificadas por `(sessionId, number)`.
- [x] Definir documento de contrato de datos local/nube en `DATA_CONTRACT_v0.4.md`.
- [x] Documentar estrategia offline-first y manejo inicial de conflictos para v0.4.

## Pendientes para cerrar v0.3

1. Ejecutar `pnpm typecheck` en el entorno local.
2. Probar migración con datos reales existentes del usuario.
3. Validar edición/renombre de un deportista y conservación de sus sesiones.
4. Validar filtros, gráficos y comparación con al menos dos sesiones comparables.
5. Decidir después de la prueba si el récord personal requiere filtro adicional por tipo de entrenamiento.
6. Corregir cualquier hallazgo de prueba.
7. Generar APK de validación v0.3.
8. Crear release notes y cerrar v0.3.
9. Abrir `develop-v0.4` para nube + portal web.
