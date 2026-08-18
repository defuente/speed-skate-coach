# Speed Skate Coach / PatinCrono — Contrato de datos base para v0.4

Este documento define la forma en que la v0.3 deja preparados los datos para autenticación, sincronización en nube, restauración en otro dispositivo y portal web de la v0.4.

## Principio general

La app móvil seguirá siendo **offline-first**: registrar una vuelta nunca debe depender de tener Internet. La nube será una capa de identidad, sincronización y respaldo, no un requisito para usar el cronómetro en pista.

## Identidad del usuario / entrenador

La v0.4 incorporará una cuenta de usuario mediante Supabase Auth.

Métodos iniciales propuestos:

- correo + contraseña;
- iniciar sesión con Google.

Cada registro remoto deberá pertenecer a un usuario autenticado mediante `ownerUserId`.

```ts
interface CloudOwnedEntity {
  ownerUserId: string;
}
```

Reglas:

- un usuario solo debe poder leer y modificar sus propios datos;
- el backend aplicará Row Level Security (RLS);
- las claves privadas o `service_role` nunca se incluirán en la aplicación móvil;
- la sesión de autenticación se persistirá localmente usando almacenamiento seguro apropiado para tokens.

## Entidades principales

### Athlete

Identidad permanente del deportista.

```ts
interface AthleteCategoryHistoryEntry {
  id: string;
  category: string;
  validFrom: string;
  validTo?: string;
}

interface Athlete {
  id: string;
  name: string;
  birthDate?: string;
  category?: string;
  categoryHistory?: AthleteCategoryHistoryEntry[];
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
- `category` representa la categoría actual.
- `categoryHistory` conserva los períodos históricos de categoría.
- Al cambiar de categoría se cierra el período anterior (`validTo`) y se abre uno nuevo (`validFrom`).
- Los campos de perfil son opcionales.

### Session

Registro permanente de un entrenamiento.

```ts
interface Session {
  id: string;
  date: string;
  athleteId?: string;
  athleteName: string;
  athleteCategory?: string;
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
- `athleteCategory` es el snapshot de categoría vigente al momento de la sesión; no debe cambiar cuando el deportista avance de categoría.
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

Para v0.4 no es obligatorio asignar un UUID independiente a cada vuelta mientras las vueltas se sincronicen como parte de su sesión. La clave lógica es `(sessionId, number)`.

## Modelo remoto propuesto (Supabase / Postgres)

Tablas mínimas:

```text
profiles
athletes
athlete_category_history
sessions
laps (opcional en primera etapa; también puede almacenarse como JSON por sesión)
```

Campos comunes remotos:

```ts
id: string
ownerUserId: string
createdAt: string
updatedAt: string
deletedAt?: string
syncVersion?: number
```

Relaciones:

```text
auth.users
   └── profiles
       └── athletes
           ├── athlete_category_history
           └── sessions
               └── laps
```

## Seguridad / RLS

Toda tabla expuesta debe usar políticas por propietario.

Conceptualmente:

```sql
owner_user_id = auth.uid()
```

Las políticas deberán cubrir `SELECT`, `INSERT`, `UPDATE` y `DELETE`/soft-delete para usuarios autenticados.

## Versionado local

La v0.3 utiliza una versión de esquema local para migraciones. El historial de categorías eleva ese esquema a versión 3.

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
4. Cuando existe conectividad y una sesión autenticada, se envía a la nube.
5. Al confirmarse el servidor, se registra el estado sincronizado.

### Lectura

1. La app muestra primero los datos locales.
2. La sincronización consulta cambios remotos en segundo plano.
3. Los cambios recibidos se fusionan en la base local.
4. La UI se actualiza sin bloquear el uso del cronómetro.

## Inicio de sesión en un dispositivo nuevo

Flujo esperado:

1. El usuario instala PatinCrono.
2. Inicia sesión con la misma cuenta (Google o correo/contraseña).
3. La app obtiene el `userId` autenticado.
4. Descarga deportistas, historial de categorías y sesiones pertenecientes a ese usuario.
5. Reconstruye la base local.
6. A partir de ese momento vuelve al modo offline-first normal.

La restauración debe ser explícita y mostrar estado de progreso/resultado para evitar que el usuario confunda una descarga incompleta con pérdida de información.

## Primer respaldo de datos existentes

Cuando un usuario que ya utiliza PatinCrono localmente cree/inicie sesión por primera vez:

1. conservar los datos locales existentes;
2. asociarlos al nuevo `ownerUserId`;
3. subirlos respetando sus IDs actuales;
4. evitar duplicados por `id`;
5. marcar como sincronizados solo después de confirmación remota.

Nunca se deben borrar los datos locales después del primer login solo porque la nube esté inicialmente vacía.

## Conflictos

### Athlete

Si el mismo deportista es editado en dos dispositivos:

- identificar siempre por `athlete.id`;
- comparar `updatedAt`;
- para la primera implementación, aplicar `last-write-wins` para campos simples;
- conservar el historial de categoría como registros independientes y auditables.

### Session

Una sesión finalizada debe tratarse como prácticamente inmutable. Las modificaciones posteriores deberían limitarse inicialmente a campos como `notes` o correcciones administrativas.

Los datos cronometrados (`laps`, tiempos y objetivos) no deberían fusionarse vuelta por vuelta entre dos ediciones concurrentes. Si existiera conflicto, debe conservarse una versión completa y auditable.

## Borrados

El backend debe preferir **soft delete** mediante `deletedAt`, evitando que un dispositivo que estuvo offline vuelva a crear accidentalmente un registro eliminado.

## Comparabilidad deportiva

Para comparar rendimiento se deben considerar, como mínimo:

- `athleteId` igual;
- `athleteCategory` igual cuando exista;
- `distancePerLap` igual;
- preferentemente `trainingType` igual.

Esto evita comparar directamente tiempos de categorías o configuraciones deportivas distintas.

## Métricas históricas por categoría

La analítica podrá filtrar sesiones por `athleteCategory` y generar para cada período/categoría:

- mejor vuelta;
- tiempo promedio;
- consistencia;
- velocidad media;
- cumplimiento de ritmo;
- cumplimiento de volumen;
- distancia y vueltas acumuladas;
- evolución dentro de la categoría;
- comparación entre el inicio y fin de una categoría.

El historial de categorías permite conservar estas métricas aunque el deportista cambie posteriormente de categoría.

## Portal web v0.4

El portal deberá consumir las mismas entidades y reglas de cálculo que la app móvil:

- Deportistas.
- Historial de categorías.
- Sesiones.
- Vueltas.
- Objetivos de ritmo.
- Objetivos de volumen.
- Consistencia.
- Velocidad media.
- Récords por distancia y categoría.
- Comparaciones de sesiones.

La lógica de analítica centralizada en `artifacts/mobile/utils/athleteAnalytics.ts` sirve como referencia funcional para implementar una librería compartida o equivalente en el portal.

## Alcance v0.4

- Autenticación por correo/contraseña.
- Inicio de sesión con Google.
- Base de datos remota.
- RLS por propietario.
- Primera subida de datos locales existentes.
- Sincronización incremental.
- Restauración de datos en otro dispositivo.
- Estado visible de sincronización.
- Portal web.
- Resolución inicial de conflictos.
