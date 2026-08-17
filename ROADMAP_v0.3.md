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
- [x] Consistencia media.

## 3. Récords personales

- [x] Récord personal separado por distancia de vuelta.
- [x] No mezclar tiempos de pistas/distancias distintas.
- [ ] Permitir filtrar récords por tipo de entrenamiento cuando sea necesario.

## 4. Analítica avanzada

- [x] Centralizar cálculos de analítica en `utils/athleteAnalytics.ts`.
- [x] Métricas disponibles: mejor vuelta, promedio, consistencia, velocidad media, ritmo y volumen.
- [ ] Filtro por período: 30 / 90 días / todo.
- [ ] Filtro por distancia de vuelta.
- [ ] Filtro por tipo de entrenamiento.
- [ ] Gráfico seleccionable por métrica.
- [ ] Evitar comparaciones inválidas entre distancias diferentes.

## 5. Comparación de sesiones

- [x] Lógica para localizar la sesión anterior comparable.
- [x] Lógica para calcular diferencias entre métricas.
- [x] Generador de conclusiones automáticas basadas en reglas.
- [ ] Interfaz visual de comparación de dos sesiones.
- [ ] Mostrar mejora/empeoramiento de promedio, consistencia y velocidad.
- [ ] Mostrar diferencias de cumplimiento de ritmo y volumen cuando correspondan.

## 6. Exportación

- [x] CSV individual por sesión.
- [x] CSV consolidado por deportista.
- [ ] Incorporar `athleteId` al modelo exportable para futura nube sin afectar la lectura humana del CSV.

## 7. Preparación para v0.4

- [x] Versión explícita del esquema local para migración de deportistas.
- [x] IDs permanentes para deportistas.
- [ ] Revisar IDs permanentes de todas las entidades que se sincronizarán.
- [ ] Definir documento de contrato de datos local/nube.
- [ ] Documentar estrategia offline-first y conflictos para v0.4.

## Orden de trabajo restante

1. Filtros y gráfico de evolución por métrica.
2. Comparación visual de sesiones y conclusiones automáticas.
3. Ajustes de exportación e IDs.
4. Contrato de datos para v0.4.
5. Pruebas de migración con datos existentes.
6. Build APK de validación v0.3.
7. Cierre, release notes y apertura de `develop-v0.4`.
