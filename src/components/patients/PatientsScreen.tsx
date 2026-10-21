import React, { useState, useMemo, useEffect } from 'react';
import { useKineStore } from '../../hooks/useKineStore.ts';
import { Patient, Appointment } from '../../types/index.ts';
import {
  Users,
  Search,
  Plus,
  Phone,
  MessageCircle,
  Calendar,
  CheckCircle2,
  X,
  FileText,
  AlertTriangle,
  ArrowRight,
  Shield,
  Layers,
  Edit,
  ChevronDown,
  ChevronUp,
  Clock,
  Mail,
  Settings,
} from 'lucide-react';
import { normalizeArgentinePhoneNumber } from '../../utils/phoneUtils.ts';
import { detectPotentialDuplicatePatient } from '../../utils/patientUtils.ts';
import { NewAppointmentModal } from '../appointments/NewAppointmentModal.tsx';

export const PatientsScreen: React.FC = () => {
  const {
    patients,
    createPatient,
    updatePatient,
    getPatientAppointments,
    checkPatientDuplicate,
    mergePatients,
    setIsWhatsAppDrawerOpen,
    setActiveWhatsAppPatientId,
    setIsNewAppointmentModalOpen,
    setNewAppointmentInitialSlot,
  } = useKineStore();

  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedPatientForAppointment, setSelectedPatientForAppointment] = useState<string | null>(null);

  // Expandable patient view state
  const [expandedPatientId, setExpandedPatientId] = useState<string | null>(null);
  const [expandedPatientAppointments, setExpandedPatientAppointments] = useState<Appointment[]>([]);
  const [loadingAppointments, setLoadingAppointments] = useState(false);

  useEffect(() => {
    if (expandedPatientId) {
      setLoadingAppointments(true);
      getPatientAppointments(expandedPatientId)
        .then((apps) => {
          setExpandedPatientAppointments(apps || []);
        })
        .catch(() => {
          setExpandedPatientAppointments([]);
        })
        .finally(() => {
          setLoadingAppointments(false);
        });
    } else {
      setExpandedPatientAppointments([]);
    }
  }, [expandedPatientId, getPatientAppointments]);

  // Edit patient state
  const [editingPatient, setEditingPatient] = useState<Patient | null>(null);

  // Merge modal state
  const [mergeModalData, setMergeModalData] = useState<{ primaryPatient: Patient; candidateToMergeId: string } | null>(null);

  // Form state
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('+54 9 11 ');
  const [whatsappPhone, setWhatsappPhone] = useState('+54 9 11 ');
  const [email, setEmail] = useState('');
  const [insurance, setInsurance] = useState('Particular');
  const [insuranceNumber, setInsuranceNumber] = useState('');
  const [administrativeNotes, setAdministrativeNotes] = useState('');
  const [medicalHistory, setMedicalHistory] = useState('');

  const handleOpenEdit = (patient: Patient) => {
    setEditingPatient(patient);
    setFirstName(patient.firstName || '');
    setLastName(patient.lastName || '');
    setPhone(patient.phone || '+54 9 11 ');
    setWhatsappPhone(patient.whatsappPhone || patient.phone || '+54 9 11 ');
    setEmail(patient.email || '');
    setInsurance(patient.insurance || 'Particular');
    setInsuranceNumber(patient.insuranceNumber || '');
    setAdministrativeNotes(patient.administrativeNotes || '');
    setMedicalHistory(patient.medicalHistory || '');
  };

  const handleSavePatientEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPatient || !firstName.trim() || !phone.trim()) return;

    const normPhone = normalizeArgentinePhoneNumber(phone);
    const normWa = normalizeArgentinePhoneNumber(whatsappPhone || phone);

    await updatePatient(editingPatient.id, {
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      phone: normPhone,
      whatsappPhone: normWa,
      email: email.trim() || undefined,
      insurance: insurance.trim() || 'Particular',
      insuranceNumber: insuranceNumber.trim() || undefined,
      administrativeNotes: administrativeNotes.trim() || undefined,
      medicalHistory: medicalHistory.trim() || undefined,
    });

    setEditingPatient(null);
    resetForm();
  };

  // Live Duplicate Check (Regla 21)
  const duplicateCheck = useMemo(() => {
    if (!firstName.trim() || !phone.trim() || phone.trim() === '+54 9 11 ') {
      return { isDuplicate: false };
    }
    return detectPotentialDuplicatePatient(
      {
        firstName,
        lastName,
        phone: normalizeArgentinePhoneNumber(phone),
        whatsappPhone: normalizeArgentinePhoneNumber(whatsappPhone || phone),
      },
      patients
    );
  }, [firstName, lastName, phone, whatsappPhone, patients]);

  const filteredPatients = patients.filter((p) => {
    const term = searchTerm.toLowerCase().trim();
    const fullName = `${p.firstName} ${p.lastName}`.toLowerCase();
    const ph = p.phone.toLowerCase();
    const wa = p.whatsappPhone.toLowerCase();
    const ins = (p.insurance || '').toLowerCase();
    return fullName.includes(term) || ph.includes(term) || wa.includes(term) || ins.includes(term);
  });

  const handlePhoneChange = (val: string) => {
    setPhone(val);
    setWhatsappPhone(val); // Por defecto sincronizado
  };

  const handleCreatePatient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firstName.trim() || !phone.trim()) return;

    const normPhone = normalizeArgentinePhoneNumber(phone);
    const normWa = normalizeArgentinePhoneNumber(whatsappPhone || phone);

    await createPatient({
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      phone: normPhone,
      whatsappPhone: normWa,
      email: email.trim() || undefined,
      insurance: insurance.trim() || 'Particular',
      insuranceNumber: insuranceNumber.trim() || undefined,
      administrativeNotes: administrativeNotes.trim() || undefined,
      active: true,
    });

    setIsModalOpen(false);
    resetForm();
  };

  const resetForm = () => {
    setFirstName('');
    setLastName('');
    setPhone('+54 9 11 ');
    setWhatsappPhone('+54 9 11 ');
    setEmail('');
    setInsurance('Particular');
    setInsuranceNumber('');
    setAdministrativeNotes('');
    setMedicalHistory('');
  };

  const handleOpenChat = (patientId: string) => {
    setActiveWhatsAppPatientId(patientId);
    setIsWhatsAppDrawerOpen(true);
  };

  const handleOpenAppointment = (patientId: string) => {
    setSelectedPatientForAppointment(patientId);
  };

  const handleExecuteMerge = async () => {
    if (!mergeModalData || !mergeModalData.candidateToMergeId) return;
    await mergePatients(mergeModalData.primaryPatient.id, mergeModalData.candidateToMergeId);
    setMergeModalData(null);
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto animate-in fade-in duration-150">
      {/* Header & Search */}
      <div className="bg-white dark:bg-[#121B17] border border-stone-200/80 dark:border-stone-800/80 rounded-3xl p-6 sm:p-7 shadow-[0_2px_12px_-4px_rgba(13,92,82,0.06)] space-y-4 transition-colors duration-200">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-stone-100 dark:border-stone-800/80">
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-teal-800 dark:text-teal-300 mb-1 flex items-center gap-2">
              <Users className="w-3.5 h-3.5 text-teal-700 dark:text-teal-400" />
              <span>Directorio Administrativo</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-stone-900 dark:text-white">
              Padrón de Pacientes ({patients.length})
            </h1>
            <p className="text-xs sm:text-sm text-stone-500 dark:text-stone-400 mt-1">
              Información de contacto, cobertura médica y canal de comunicación WhatsApp.
            </p>
          </div>

          <button
            onClick={() => setIsModalOpen(true)}
            className="px-4 py-2 bg-teal-700 hover:bg-teal-800 text-white text-xs font-semibold rounded-xl transition-all flex items-center gap-1.5 shadow-xs self-start sm:self-center active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>Nuevo Paciente</span>
          </button>
        </div>

        {/* Search input */}
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400 dark:text-stone-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por nombre, teléfono, WhatsApp u obra social..."
            className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-stone-50/70 dark:bg-[#15221C] border border-stone-200/60 dark:border-stone-800/70 text-xs sm:text-sm text-stone-900 dark:text-stone-100 placeholder:text-stone-400 dark:placeholder:text-stone-400 focus:outline-hidden focus:ring-2 focus:ring-teal-700/20"
          />
        </div>
      </div>

      {/* Patient Cards List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredPatients.map((patient) => (
          <div
            key={patient.id}
            className="bg-white dark:bg-[#121B17] border border-stone-200/80 dark:border-stone-800/80 rounded-2xl p-5 shadow-2xs hover:border-teal-300 dark:hover:border-teal-700 transition-all flex flex-col justify-between"
          >
            <div>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-base font-bold text-stone-900 dark:text-stone-100">
                    {patient.firstName} {patient.lastName}
                  </h3>
                  <div className="flex items-center gap-2 text-xs text-stone-500 dark:text-stone-400 mt-1">
                    <span className="flex items-center gap-1">
                      <Phone className="w-3 h-3 text-stone-400" />
                      {patient.whatsappPhone || patient.phone}
                    </span>
                  </div>
                </div>

                <span className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300">
                  {patient.insurance || 'Particular'}
                </span>
              </div>

              {/* Administrative Details */}
              <div className="mt-3.5 space-y-1.5 text-xs text-stone-600 dark:text-stone-300 bg-stone-50/70 dark:bg-[#15221C] p-3 rounded-xl border border-stone-200/50 dark:border-stone-800">
                {patient.insuranceNumber && (
                  <div className="flex items-center justify-between">
                    <span className="text-stone-500 dark:text-stone-400">Nº Afiliado:</span>
                    <span className="font-mono text-stone-800 dark:text-stone-200">{patient.insuranceNumber}</span>
                  </div>
                )}
                {patient.administrativeNotes ? (
                  <div className="text-stone-600 dark:text-stone-400 text-[11px] italic">
                    "{patient.administrativeNotes}"
                  </div>
                ) : (
                  <div className="text-stone-400 text-[11px]">Sin observaciones administrativas.</div>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="mt-4 pt-3 border-t border-stone-100 dark:border-stone-800/80 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setExpandedPatientId(expandedPatientId === patient.id ? null : patient.id)}
                  className="px-2.5 py-1.5 text-xs font-semibold bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-200 hover:bg-stone-200 dark:hover:bg-stone-700 rounded-xl flex items-center gap-1 transition-colors"
                  title="Expandir / Contraer detalles y configuración de paciente"
                >
                  {expandedPatientId === patient.id ? (
                    <>
                      <ChevronUp className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
                      <span>Contraer</span>
                    </>
                  ) : (
                    <>
                      <ChevronDown className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
                      <span>Ver Ficha</span>
                    </>
                  )}
                </button>
                <button
                  onClick={() => handleOpenEdit(patient)}
                  className="px-2.5 py-1.5 text-xs font-semibold bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-200 hover:bg-stone-200 dark:hover:bg-stone-700 rounded-xl flex items-center gap-1 transition-colors"
                  title="Editar / Configurar teléfono, nombre, obra social y otros datos"
                >
                  <Edit className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
                  <span>Editar</span>
                </button>
                <button
                  onClick={() => setMergeModalData({ primaryPatient: patient, candidateToMergeId: '' })}
                  className="text-[11px] font-semibold text-stone-400 hover:text-stone-700 dark:hover:text-stone-300"
                  title="Fusionar registros duplicados si existen"
                >
                  Fusionar...
                </button>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleOpenChat(patient.id)}
                  className="px-3 py-1.5 text-xs font-semibold bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-200 hover:bg-stone-200 rounded-xl flex items-center gap-1.5 transition-colors"
                >
                  <MessageCircle className="w-3.5 h-3.5 text-teal-600" />
                  <span>WhatsApp</span>
                </button>
                <button
                  onClick={() => handleOpenAppointment(patient.id)}
                  className="px-3 py-1.5 text-xs font-bold bg-teal-700 hover:bg-teal-800 text-white rounded-xl flex items-center gap-1.5 transition-colors shadow-2xs"
                >
                  <Calendar className="w-3.5 h-3.5" />
                  <span>Nuevo Turno</span>
                </button>
              </div>
            </div>

            {/* Expandable View Panel */}
            {expandedPatientId === patient.id && (
              <div className="mt-4 pt-4 border-t border-teal-100 dark:border-teal-900/60 bg-teal-50/40 dark:bg-[#15221C]/80 -mx-5 -mb-5 p-5 rounded-b-2xl space-y-4 animate-in slide-in-from-top-2 duration-150">
                {/* Contact & Configuration Details */}
                <div>
                  <h4 className="text-xs font-bold text-teal-900 dark:text-teal-300 uppercase tracking-wider flex items-center gap-1.5 mb-2">
                    <Settings className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
                    <span>Contacto y Ajustes de Ficha</span>
                  </h4>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                    <div className="flex items-center justify-between p-2 rounded-lg bg-white/80 dark:bg-stone-900/60 border border-stone-200/50 dark:border-stone-800">
                      <span className="text-stone-500 flex items-center gap-1">
                        <Phone className="w-3 h-3 text-teal-600" /> Tel. Principal:
                      </span>
                      <span className="font-mono text-stone-900 dark:text-stone-100 font-semibold">{patient.phone}</span>
                    </div>

                    <div className="flex items-center justify-between p-2 rounded-lg bg-white/80 dark:bg-stone-900/60 border border-stone-200/50 dark:border-stone-800">
                      <span className="text-stone-500 flex items-center gap-1">
                        <MessageCircle className="w-3 h-3 text-teal-600" /> WhatsApp:
                      </span>
                      <span className="font-mono text-stone-900 dark:text-stone-100 font-semibold">
                        {patient.whatsappPhone || patient.phone}
                      </span>
                    </div>

                    {patient.email && (
                      <div className="flex items-center justify-between p-2 rounded-lg bg-white/80 dark:bg-stone-900/60 border border-stone-200/50 dark:border-stone-800 col-span-1 sm:col-span-2">
                        <span className="text-stone-500 flex items-center gap-1">
                          <Mail className="w-3 h-3 text-teal-600" /> Email:
                        </span>
                        <span className="font-mono text-stone-900 dark:text-stone-100">{patient.email}</span>
                      </div>
                    )}

                    {patient.medicalHistory && (
                      <div className="p-2.5 rounded-lg bg-white/80 dark:bg-stone-900/60 border border-stone-200/50 dark:border-stone-800 col-span-1 sm:col-span-2 space-y-1">
                        <span className="text-stone-500 font-semibold flex items-center gap-1">
                          <FileText className="w-3 h-3 text-teal-600" /> Antecedentes Médicos:
                        </span>
                        <div className="text-stone-800 dark:text-stone-200 italic font-sans text-xs">
                          {patient.medicalHistory}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Patient Appointment History */}
                <div>
                  <h4 className="text-xs font-bold text-teal-900 dark:text-teal-300 uppercase tracking-wider flex items-center gap-1.5 mb-2">
                    <Clock className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
                    <span>Historial de Citas ({loadingAppointments ? '...' : expandedPatientAppointments.length})</span>
                  </h4>

                  {loadingAppointments ? (
                    <div className="p-3 text-center text-xs text-stone-400 bg-white/60 dark:bg-stone-900/40 rounded-xl border border-stone-200/50 dark:border-stone-800">
                      Cargando historial de turnos...
                    </div>
                  ) : expandedPatientAppointments.length === 0 ? (
                    <div className="p-3 text-center text-xs text-stone-400 bg-white/60 dark:bg-stone-900/40 rounded-xl border border-stone-200/50 dark:border-stone-800">
                      Este paciente no registra turnos activos en el sistema.
                    </div>
                  ) : (
                    <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                      {expandedPatientAppointments.map((app: Appointment) => {
                        const dateStr = app.startAt.includes('T') ? app.startAt.split('T')[0] : app.startAt;
                        const timeStr = app.startAt.includes('T') ? app.startAt.split('T')[1].substring(0, 5) : '';

                        return (
                          <div
                            key={app.id}
                            className="p-2.5 rounded-xl bg-white dark:bg-stone-900 border border-stone-200/60 dark:border-stone-800 text-xs flex items-center justify-between"
                          >
                            <div>
                              <div className="font-semibold text-stone-900 dark:text-stone-100 flex items-center gap-2">
                                <span>{dateStr}</span>
                                {timeStr && <span className="font-mono text-teal-700 dark:text-teal-400">{timeStr} hs</span>}
                              </div>
                              <div className="text-[11px] text-stone-500 dark:text-stone-400">
                                Duración: {app.durationMinutes} min
                              </div>
                            </div>

                            <span
                              className={`px-2 py-0.5 rounded-md text-[10px] font-bold font-mono ${
                                app.status === 'CONFIRMED'
                                  ? 'bg-teal-100 text-teal-800 dark:bg-teal-950 dark:text-teal-300'
                                  : app.status === 'COMPLETED'
                                  ? 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
                                  : app.status === 'CANCELLED'
                                  ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                                  : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                              }`}
                            >
                              {app.status}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Modal: Nuevo Paciente con Detección de Duplicados (Regla 21) */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-stone-900/60 dark:bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white dark:bg-[#121B17] w-full max-w-lg rounded-2xl shadow-2xl border border-stone-200 dark:border-stone-800 overflow-hidden flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between px-5 py-4 border-b border-stone-100 dark:border-stone-800/80 bg-stone-50/50 dark:bg-[#15221C]">
              <div className="flex items-center gap-2 text-stone-900 dark:text-stone-100 font-bold text-base">
                <Users className="w-5 h-5 text-teal-600 dark:text-teal-400" />
                <span>Alta Administrativa de Paciente</span>
              </div>
              <button
                onClick={() => {
                  setIsModalOpen(false);
                  resetForm();
                }}
                className="p-1 rounded-lg text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreatePatient} className="p-5 space-y-4 overflow-y-auto flex-1">
              {/* Detección de Paciente Duplicado (Regla 21) */}
              {duplicateCheck.isDuplicate && duplicateCheck.matchedPatient && (
                <div className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 flex items-start gap-2.5 animate-in fade-in">
                  <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                  <div className="text-xs text-amber-900 dark:text-amber-200">
                    <span className="font-bold">Podría ser un paciente existente:</span>
                    <div className="mt-0.5">
                      {duplicateCheck.matchedPatient.firstName} {duplicateCheck.matchedPatient.lastName} ({duplicateCheck.matchedPatient.whatsappPhone}).
                    </div>
                    <div className="mt-1 text-[11px] text-amber-800/80 dark:text-amber-300/80">
                      {duplicateCheck.reason}
                    </div>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                    Nombre:
                  </label>
                  <input
                    type="text"
                    required
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder="Ej. María"
                    className="w-full px-3 py-2 text-xs rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                    Apellido:
                  </label>
                  <input
                    type="text"
                    required
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    placeholder="Ej. Gómez"
                    className="w-full px-3 py-2 text-xs rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 focus:outline-hidden"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                  Teléfono / WhatsApp:
                </label>
                <input
                  type="text"
                  required
                  value={phone}
                  onChange={(e) => handlePhoneChange(e.target.value)}
                  placeholder="+54 9 11 5555-1111"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 focus:outline-hidden"
                />
                <span className="text-[10px] text-stone-400 mt-1 block">
                  Se normalizará automáticamente al formato de mensajería argentino.
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                    Obra Social / Cobertura:
                  </label>
                  <input
                    type="text"
                    value={insurance}
                    onChange={(e) => setInsurance(e.target.value)}
                    placeholder="Ej. OSDE, Particular, Swiss"
                    className="w-full px-3 py-2 text-xs rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                    Nº de Afiliado:
                  </label>
                  <input
                    type="text"
                    value={insuranceNumber}
                    onChange={(e) => setInsuranceNumber(e.target.value)}
                    placeholder="Opcional"
                    className="w-full px-3 py-2 text-xs rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 focus:outline-hidden"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                  Observaciones Administrativas:
                </label>
                <textarea
                  rows={2}
                  value={administrativeNotes}
                  onChange={(e) => setAdministrativeNotes(e.target.value)}
                  placeholder="Ej. Prefiere turno por la mañana, presentó orden autorizada..."
                  className="w-full px-3 py-2 text-xs rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 focus:outline-hidden"
                />
              </div>

              {/* Footer */}
              <div className="pt-3 border-t border-stone-100 dark:border-stone-800/80 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsModalOpen(false);
                    resetForm();
                  }}
                  className="px-3.5 py-2 text-xs font-semibold text-stone-600 dark:text-stone-400 hover:text-stone-800 rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-bold bg-teal-700 hover:bg-teal-800 text-white rounded-xl transition-all shadow-xs"
                >
                  Registrar Paciente
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Editar / Configurar Paciente */}
      {editingPatient && (
        <div className="fixed inset-0 z-50 bg-stone-900/60 dark:bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white dark:bg-[#121B17] w-full max-w-lg rounded-2xl shadow-2xl border border-stone-200 dark:border-stone-800 overflow-hidden flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between px-5 py-4 border-b border-stone-100 dark:border-stone-800/80 bg-stone-50/50 dark:bg-[#15221C]">
              <div className="flex items-center gap-2 text-stone-900 dark:text-stone-100 font-bold text-base">
                <Edit className="w-5 h-5 text-teal-600 dark:text-teal-400" />
                <span>Configurar Ficha de Paciente</span>
              </div>
              <button
                onClick={() => {
                  setEditingPatient(null);
                  resetForm();
                }}
                className="p-1 rounded-lg text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSavePatientEdit} className="p-5 space-y-4 overflow-y-auto flex-1">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                    Nombre:
                  </label>
                  <input
                    type="text"
                    required
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder="Ej. María"
                    className="w-full px-3 py-2 text-xs rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                    Apellido:
                  </label>
                  <input
                    type="text"
                    required
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    placeholder="Ej. Gómez"
                    className="w-full px-3 py-2 text-xs rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 focus:outline-hidden"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                    Teléfono Principal:
                  </label>
                  <input
                    type="text"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+54 9 11 5555-1111"
                    className="w-full px-3 py-2 text-xs rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                    Teléfono WhatsApp:
                  </label>
                  <input
                    type="text"
                    value={whatsappPhone}
                    onChange={(e) => setWhatsappPhone(e.target.value)}
                    placeholder="+54 9 11 5555-1111"
                    className="w-full px-3 py-2 text-xs rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 focus:outline-hidden"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                  Email de Contacto:
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="paciente@ejemplo.com (Opcional)"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 focus:outline-hidden"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                    Obra Social / Cobertura:
                  </label>
                  <input
                    type="text"
                    value={insurance}
                    onChange={(e) => setInsurance(e.target.value)}
                    placeholder="Ej. OSDE, Particular, Swiss"
                    className="w-full px-3 py-2 text-xs rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                    Nº de Afiliado:
                  </label>
                  <input
                    type="text"
                    value={insuranceNumber}
                    onChange={(e) => setInsuranceNumber(e.target.value)}
                    placeholder="Opcional"
                    className="w-full px-3 py-2 text-xs rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 focus:outline-hidden"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                  Antecedentes Médicos / Historia Clínica General:
                </label>
                <textarea
                  rows={2}
                  value={medicalHistory}
                  onChange={(e) => setMedicalHistory(e.target.value)}
                  placeholder="Ej. Antecedentes de esguince de tobillo derecho, cirugía en 2022..."
                  className="w-full px-3 py-2 text-xs rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                  Observaciones Administrativas:
                </label>
                <textarea
                  rows={2}
                  value={administrativeNotes}
                  onChange={(e) => setAdministrativeNotes(e.target.value)}
                  placeholder="Ej. Prefiere turno por la mañana, presentó orden autorizada..."
                  className="w-full px-3 py-2 text-xs rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 focus:outline-hidden"
                />
              </div>

              {/* Footer */}
              <div className="pt-3 border-t border-stone-100 dark:border-stone-800/80 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setEditingPatient(null);
                    resetForm();
                  }}
                  className="px-3.5 py-2 text-xs font-semibold text-stone-600 dark:text-stone-400 hover:text-stone-800 rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-bold bg-teal-700 hover:bg-teal-800 text-white rounded-xl transition-all shadow-xs flex items-center gap-1.5"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Update (Actualizar Paciente)</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Fusión Manual de Pacientes (Regla 22) */}
      {mergeModalData && (
        <div className="fixed inset-0 z-50 bg-stone-900/60 dark:bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white dark:bg-[#121B17] w-full max-w-md rounded-2xl shadow-2xl border border-stone-200 dark:border-stone-800 p-5 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-stone-100 dark:border-stone-800">
              <div className="flex items-center gap-2 font-bold text-sm text-stone-900 dark:text-stone-100">
                <Layers className="w-4 h-4 text-teal-600" />
                <span>Fusión Manual de Pacientes</span>
              </div>
              <button onClick={() => setMergeModalData(null)} className="text-stone-400">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="text-xs text-stone-600 dark:text-stone-400">
              Se conservará la ficha de <strong>{mergeModalData.primaryPatient.firstName} {mergeModalData.primaryPatient.lastName}</strong> y se le reasignarán los turnos y mensajes del paciente secundario seleccionado.
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                Seleccionar paciente duplicado a fusionar:
              </label>
              <select
                value={mergeModalData.candidateToMergeId}
                onChange={(e) => setMergeModalData({ ...mergeModalData, candidateToMergeId: e.target.value })}
                className="w-full px-3 py-2 text-xs rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100"
              >
                <option value="">Seleccionar paciente...</option>
                {patients
                  .filter((p) => p.id !== mergeModalData.primaryPatient.id && p.active)
                  .map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.firstName} {p.lastName} ({p.phone})
                    </option>
                  ))}
              </select>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setMergeModalData(null)}
                className="px-3 py-1.5 text-xs text-stone-500 font-semibold"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={!mergeModalData.candidateToMergeId}
                onClick={handleExecuteMerge}
                className="px-4 py-2 text-xs font-bold bg-teal-700 hover:bg-teal-800 text-white rounded-xl disabled:opacity-50"
              >
                Confirmar Fusión
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Agendar Turno para paciente seleccionado */}
      {selectedPatientForAppointment && (
        <NewAppointmentModal
          isOpen={!!selectedPatientForAppointment}
          onClose={() => setSelectedPatientForAppointment(null)}
          preselectedPatientId={selectedPatientForAppointment}
        />
      )}
    </div>
  );
};
