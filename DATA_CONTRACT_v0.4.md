# Speed Skate Coach / PatinCrono — Contrato de datos base para v0.4

Este documento define la forma en que la v0.3 deja preparados los datos para la futura sincronización en nube y portal web de la v0.4.

## Principio general

La app móvil seguirá siendo **offline-first**: registrar una vuelta nunca debe depender de tener Internet. La nube será una capa de sincronización y respaldo, no un requisito para usar el cronómetro en pista.

## Entidades principales

### Athlete

Identidad permanente del deportista.

```ts
interface Athlete {
  id: string;
  name: string;
  birthDate?: string;
  category?: string;
  club?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}
```

Reglas:

- `id` es la identidad real de la entidad.
- `name` puede cambiar sin modificar `id`.
- Dos deportistas no deben compartir el mismo nombre normalizado dentro de la misma cuenta/espacio de entrenador.
- Los campos de perfil son opcionales.

### Session

Registro permanente de un entrenamiento.

```ts
interface Session {
  id: string;
  date: string;
  athleteId?: string;
  athleteName: string;
  trainingType: TrainingType;
  distancePerLap: number;
  targetLapTimeMs?: number;
  targetLapCount?: number;
  laps: Lap[];
  totalTime: number;
  notes?: string;
}
```

Reglas:

- `session.id` es permanente.
- `athleteId` es la relación principal con `Athlete`.
- `athleteName` se conserva como snapshot legible y compatibilidad con sesiones históricas.
- Una sesión registrada offline debe conservar su mismo ID cuando se sincronice.

### Lap

Actualmente una vuelta se identifica dentro de su sesión por `number`.

```ts
interface Lap {
  number: number;
  lapTime: number;
  cumulativeTime: number;
  speed?: number;
  targetLapTimeMs?: number;
}
```

Para v0.4 no es obligatorio asignar un UUID independiente a cada vuelta mientras las vueltas se sincronicen como parte del documento/colección de su sesión. La clave lógica es `(sessionId, number)`.

## Versionado local

La v0.3 introduce versión de esquema para migrar deportistas basados en nombres a perfiles con IDs.

La v0.4 deberá evolucionar este concepto hacia un número de versión de base local, por ejemplo:

```text
schemaVersion: 3
```

Toda migración debe ser:

1. automática;
2. idempotente;
3. compatible con datos históricos;
4. sin eliminar información del usuario.

## Estrategia offline-first propuesta

### Escritura

1. El entrenamiento se guarda primero localmente.
2. La interfaz confirma el guardado local inmediatamente.
3. La entidad queda marcada como pendiente de sincronización.
4. Cuando existe conectividad, se envía a la nube.
5. Al confirmarse el servidor, se registra el estado sincronizado.

### Lectura

1. La app muestra primero los datos locales.
2. La sincronización consulta cambios remotos en segundo plano.
3. Los cambios recibidos se fusionan en la base local.
4. La UI se actualiza sin bloquear el uso del cronómetro.

## Campos de sincronización recomendados para v0.4

No se incorporan todavía en v0.3, pero el backend debería contemplar:

```ts
createdAt: string
updatedAt: string
deletedAt?: string
syncVersion?: number
```

El borrado remoto debería preferir **soft delete** mediante `deletedAt`, evitando que un dispositivo offline vuelva a crear accidentalmente un registro eliminado.

## Conflictos

### Athlete

Si el mismo deportista es editado en dos dispositivos:

- identificar siempre por `athlete.id`;
- comparar `updatedAt`;
- para la primera implementación, puede aplicarse `last-write-wins`;
- más adelante el portal puede mostrar conflictos importantes de perfil.

### Session

Una sesión finalizada debe tratarse como prácticamente inmutable. Las modificaciones posteriores deberían limitarse inicialmente a campos como `notes` o correcciones administrativas.

Los datos cronometrados (`laps`, tiempos y objetivos) no deberían fusionarse vuelta por vuelta entre dos ediciones concurrentes. Si existiera conflicto, debe conservarse una versión completa y auditable.

## Comparabilidad deportiva

La nube no debe asumir que todas las sesiones de un deportista son directamente comparables.

Para comparar rendimiento se deben considerar, como mínimo:

- `athleteId` igual;
- `distancePerLap` igual;
- preferentemente `trainingType` igual.

La v0.3 ya aplica este criterio para la comparación automática de sesiones.

## Portal web v0.4

El portal debería consumir las mismas entidades y reglas de cálculo que la app móvil:

- Deportistas.
- Sesiones.
- Vueltas.
- Objetivos de ritmo.
- Objetivos de volumen.
- Consistencia.
- Velocidad media.
- Récords por distancia.
- Comparaciones de sesiones.

La lógica de analítica ya centralizada en `artifacts/mobile/utils/athleteAnalytics.ts` sirve como referencia funcional para implementar una librería compartida o equivalente en el portal.

## Fuera del alcance de v0.3

- Autenticación.
- Base de datos remota.
- API.
- Sincronización real.
- Roles entrenador/deportista.
- Portal web.
- Resolución avanzada de conflictos.

Estos elementos pertenecen a v0.4.
