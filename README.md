# Consultorio Kinesiológico — Base de Producción v0.1 (Fase 1)

Sistema web profesional para la administración interna de un consultorio kinesiológico, diseñado con una arquitectura modular estricta y desacoplada, preparado para la futura conexión con WhatsApp Cloud API y Cloud Firestore.

---

## 1. Objetivo General

Proveer al kinesiólogo y personal autorizado una herramienta interna rápida, limpia e intuitiva para el control de agenda, validación de solicitudes y seguimiento administrativo de pacientes.

**Principio de canal:**
* **WhatsApp** es el único canal de interacción para el paciente. El paciente no requiere cuentas, contraseñas ni portales web.
* **La IA nunca inventa disponibilidad:** El motor de agenda y base de datos determinístico es la única fuente de verdad.

---

## 2. Estructura del Proyecto

```
src/
├── domain/                      # Entidades puras y tipos de dominio
│   ├── appointments/            # Appointment, AppointmentStatus (Enums estrictos)
│   ├── patients/                # Patient (Solo información administrativa)
│   ├── professionals/           # Professional
│   ├── requests/                # AppointmentRequest, RequestType, RequestStatus
│   ├── conversations/           # ConversationMessage (INBOUND / OUTBOUND)
│   ├── audit/                   # AuditEvent (Trazabilidad inmutable)
│   └── config/                  # ClinicConfig (Zona horaria, parámetros)
├── repositories/                # Contratos e implementaciones de persistencia
│   ├── IAppointmentRepository.ts
│   ├── IPatientRepository.ts
│   ├── IRequestRepository.ts
│   ├── IConversationRepository.ts
│   ├── IAuditRepository.ts
│   ├── MockAppointmentRepository.ts   # Implementación en memoria con mutex y revalidación
│   ├── MockPatientRepository.ts
│   ├── MockRequestRepository.ts
│   ├── MockConversationRepository.ts
│   ├── MockAuditRepository.ts
│   └── firebase/                # Esqueletos preparados para Fase 2
├── services/                    # Lógica de negocio y reglas determinísticas
│   └── AppointmentService.ts    # Revalidación, prevención de superposición, idempotencia
├── integrations/                # Abstracciones para servicios externos
│   ├── whatsapp/                # IWhatsAppProvider, MockWhatsAppProvider, MetaWhatsAppProvider
│   ├── transcription/           # ITranscriptionProvider, MockTranscriptionProvider, GeminiTranscriptionProvider
│   └── ai/                      # PatientIntent, ConversationPolicy
├── mock/                        # Dataset DEMO aislado
│   └── demoData.ts
├── hooks/                       # Hook reactivo de estado (useKineStore)
├── utils/                       # Utilidades de fechas (ISO 8601, timezone)
├── design-system/               # Tokens de color, tipografía y badges
├── components/                  # Vistas UI (Hoy, Agenda, Solicitudes, Pacientes, Auditoría)
└── tests/                       # Suite de pruebas automatizadas
```

---

## 3. Cómo Ejecutar el Proyecto

### Desarrollo:
```bash
npm run dev
```
Inicia la aplicación en `http://localhost:3000`.

### Pruebas Automatizadas:
```bash
npm test
```
Ejecuta la suite de 12 pruebas automatizadas que validan todas las reglas de negocio críticas.

---

## 4. Estado Actual (Fase 1) vs Próxima Fase (Fase 2)

| Componente | Estado en Fase 1 | Próxima Fase (Fase 2) |
| :--- | :--- | :--- |
| **Persistencia** | `MockRepository` en memoria con aislamiento `MODO DEMO` | Cloud Firestore transaccional con Security Rules |
| **Canal WhatsApp** | `MockWhatsAppProvider` con registro de mensajes salientes `PREPARED_FOR_WHATSAPP` | Meta Business Cloud API (Webhooks seguros en Cloud Run) |
| **Transcripción de Audio** | `MockTranscriptionProvider` con contrato de salida | Gemini Audio API (`gemini-3.5-transcribe` server-side) |
| **Datos Clínicos** | Solo datos administrativos (nombre, teléfono) | Módulos clínicos ampliados según normativa de privacidad |
| **Credenciales / Keys** | **Ninguna clave ni secreto en código** | Secret Manager server-side |

---

## 5. Reglas de Negocio Verificadas

1. **No Superposición:** Un profesional nunca puede tener dos turnos confirmados solapados.
2. **Revalidación en Aprobación:** Al pulsar *Aceptar*, el sistema vuelve a validar disponibilidad en tiempo real antes de alterar la agenda.
3. **Persistencia de Estados:** La cancelación o reprogramación modifica el estado del turno sin eliminar físicamente registros.
4. **Idempotencia:** Bloqueos de concurrencia previenen reservas duplicadas ante pulsaciones repetidas.
5. **Auditoría:** Cada acción genera un registro inmutable con fecha, actor y descripción.
