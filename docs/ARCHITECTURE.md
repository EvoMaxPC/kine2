# Arquitectura del Sistema — Consultorio Kinesiológico

## 1. Flujo Bidireccional de Comunicación

```
[Paciente] (WhatsApp en móvil / web / desktop)
   │
   ▼
[WhatsApp Business Platform]
   │ (Webhook Seguro HTTPS)
   ▼
[Backend - Cloud Run / Express]
   │
   ├─► [Módulo de Audio] ──► Transcripción de Audio
   │
   ├─► [Motor Conversacional / IA] ──► Detección de Intención & Entidades
   │
   ▼
[Motor de Reglas & Agenda Determinística] ◄── [Base de Datos / Repositorio]
   │ (Valida disponibilidad real / previene solapamientos)
   │
   ├─► Si requiere aprobación humana ──► [Panel del Kinesiólogo] (Sección Solicitudes)
   │                                           │
   │                                           ▼
   │                                     [Kinesiólogo Pulsa Aceptar]
   │                                           │
   ▼                                           ▼
[Actualización Transaccional en Base de Datos + Registro de Auditoría]
   │
   ▼
[Mensaje Saliente Formateado]
   │ (Graph API / WhatsApp Cloud)
   ▼
[Paciente] (Recibe confirmación natural por WhatsApp)
```

---

## 2. Estados del Turno (`AppointmentStatus`)

Cada turno transiciona a través de un conjunto cerrado de estados formales:

* `REQUESTED`: Turno solicitado pendiente de confirmación.
* `PENDING_APPROVAL`: Turno en espera de revisión del profesional.
* `CONFIRMED`: Turno formalmente reservado y validado en la agenda.
* `CHANGE_PENDING`: Solicitud de cambio en curso (el turno original se mantiene hasta confirmar).
* `CANCEL_PENDING`: Solicitud de cancelación en curso.
* `CANCELLED`: Turno cancelado (permanece registrado para historial y auditoría).
* `COMPLETED`: Paciente atendido en el consultorio.
* `NO_SHOW`: Paciente ausente sin aviso previo.

---

## 3. Principio de Separación: IA vs Motor de Agenda

1. **La Inteligencia Artificial:**
   * Interpreta mensajes y audios coloquiales en español rioplatense/latino.
   * Extrae intenciones estructuradas (`REQUEST_APPOINTMENT`, `CHANGE_APPOINTMENT`, `CANCEL_APPOINTMENT`, `CHECK_APPOINTMENT`, `AMBIGUOUS`).
   * Redacta respuestas empáticas y concisas según la política de tono.
   * Si la intención es ambigua, solicita aclaración (`requiresClarification = true`).

2. **El Motor de Agenda y Repositorios:**
   * Determina los horarios libres válidos.
   * Bloquea slots con control de concurrencia (evita doble reserva simultánea).
   * Valida disponibilidad nuevamente antes de confirmar cualquier solicitud.
   * **NUNCA la IA inventa ni asigna disponibilidad por su cuenta.**

---

## 4. Principios de Seguridad & Privacidad

* **Cero Secretos en el Frontend:** Ni tokens de WhatsApp ni claves de base de datos se exponen al cliente.
* **Trazabilidad Inmutable:** Cada operación emite un `AuditEvent` con actor, entidad afectada y timestamp.
* **Protección de Datos Sensibles:** En esta fase se aísla estrictamente la información administrativa de los datos clínicos de pacientes.
* **Zona Horaria Configurable:** Por defecto `America/Argentina/Cordoba`, parametrizada centralmente en `ClinicConfig`.
