'use client';

import { useMemo, useState } from 'react';
import { savePrescriptionRecord, saveDocumentRecord } from '@/utils/medical-records';

const emptyMedicine = {
  medicine_name: '',
  strength: '',
  dosage: '',
  frequency: '',
  route: 'Oral',
  duration: '',
  quantity: 1,
  instructions: '',
};

export default function OnlinePrescription({ appointment = {}, records = {}, onClose, onSaved }) {
  const doctor = appointment.doctor?.user ?? appointment.doctor ?? {};
  const patient = appointment.patient?.user ?? appointment.patient ?? {};
  const payment = appointment.payment ?? appointment.paymentDetails ?? {};

  const patientName = patient.name || appointment.patientName || 'Patient';
  const doctorName = doctor.name || 'Doctor';
  const appointmentNo = appointment.appointment_no || appointment.appointmentNo || appointment.id || 'Not set';
  const appointmentDate = appointment.appointmentDate || appointment.appointment_date || 'Not set';
  const appointmentTime = appointment.slotTime || appointment.start_time || 'Not set';
  const paymentStatus = appointment.paymentStatus || payment.status || appointment.payment_status || 'Pending';
  const paymentMethod = payment.method || payment.paymentMethod || appointment.paymentMethod || 'Not available';
  const diagnosis = getMedicalValue(records, 'diagnosis') || 'No diagnosis attached';
  const chiefComplaint = getMedicalValue(records, 'chiefComplaint') || 'No chief complaint attached';
  const clinicalNotes = getMedicalValue(records, 'notes') || 'No clinical notes attached';
  const treatmentPlan = getMedicalValue(records, 'treatmentPlan') || 'No treatment plan attached';
  const appointmentKey = String(appointment.appointment_no ?? appointment.appointmentNo ?? appointment.id ?? '');

  const [items, setItems] = useState([{ ...emptyMedicine }]);
  const [notes, setNotes] = useState('');
  const [followUpInDays, setFollowUpInDays] = useState(7);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState('');

  const hasExistingMedicine = useMemo(() => {
    return (records?.prescriptions ?? []).some((prescription) => {
      const recordAppointmentKey = String(prescription.appointmentId ?? prescription.appointment_id ?? prescription.appointmentNo ?? prescription.appointment_no ?? '');
      return recordAppointmentKey === appointmentKey;
    });
  }, [appointment, records, appointmentKey]);

  function updateMedicine(index, field, value) {
    const next = [...items];
    next[index] = { ...next[index], [field]: value };
    setItems(next);
  }

  function addMedicine() {
    setItems((current) => [...current, { ...emptyMedicine }]);
  }

  function removeMedicine(index) {
    if (items.length === 1) {
      setItems([{ ...emptyMedicine }]);
      return;
    }

    setItems((current) => current.filter((_, i) => i !== index));
  }

  async function persistPrescription({ createUploadDocument = false } = {}) {
    const cleanItems = items.map((item) => ({
      medicine_name: String(item.medicine_name ?? '').trim(),
      strength: String(item.strength ?? '').trim(),
      dosage: String(item.dosage ?? '').trim(),
      frequency: String(item.frequency ?? '').trim(),
      route: String(item.route ?? '').trim(),
      duration: String(item.duration ?? '').trim(),
      quantity: Number(item.quantity ?? 0),
      instructions: String(item.instructions ?? '').trim(),
    }));

    if (cleanItems.some((item) => !item.medicine_name || !item.strength || !item.dosage || !item.frequency || !item.route || !item.duration || item.quantity < 1)) {
      setError('Complete all required medicine fields before saving the prescription.');
      return;
    }

    try {
      setSaving(true);
      const prescriptionPayload = {
        appointmentId: appointmentKey,
        prescription: treatmentPlan,
        notes: notes || clinicalNotes,
        followUpInDays,
        items: cleanItems,
      };

      await savePrescriptionRecord(prescriptionPayload, 'doctor');

      if (createUploadDocument) {
        await saveDocumentRecord({
          appointmentId: appointmentKey,
          title: `${patientName || 'Prescription'} ${appointmentNo || ''}`,
          documentType: 'pdf',
          notes: notes || clinicalNotes,
          referenceNo: appointmentNo,
          documentDate: appointmentDate,
          documentUrl: '',
          documentFile: undefined,
        }, 'doctor');
      }

      setSuccess('Prescription saved successfully');
      onSaved?.();
    } catch (catchError) {
      setError(catchError instanceof Error ? catchError.message : 'Could not save prescription.');
    } finally {
      setSaving(false);
    }
  }

  async function handleSave(event) {
    event.preventDefault();
    setError('');
    setSuccess('');

    await persistPrescription({ createUploadDocument: false });
  }

  async function handleUpload(event) {
    event.preventDefault();
    setError('');
    setSuccess('');

    await persistPrescription({ createUploadDocument: true });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-950/40 p-4 backdrop-blur-[2px]">
      <div className="max-h-[92vh] w-full max-w-5xl overflow-y-auto rounded-2xl border border-slate-200 bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-700">HealthPortal</p>
            <h2 className="text-2xl font-bold text-slate-900">Online Prescription</h2>
          </div>
          <button type="button" onClick={onClose} className="rounded-full border border-slate-200 px-3 py-1 text-sm font-bold text-slate-600 hover:bg-slate-50" aria-label="Close prescription modal">
            ×
          </button>
        </div>

        <form onSubmit={handleSave} className="space-y-6 px-6 py-5">
          {error ? <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div> : null}
          {success ? <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{success}</div> : null}

          <section className="grid gap-4 md:grid-cols-2">
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Doctor Information</p>
              <div className="mt-3 space-y-1 text-sm">
                <p className="font-bold text-slate-900">{doctorName}</p>
                <p className="text-slate-600">{doctor.email || 'No email available'}</p>
                <p className="text-slate-600">{doctor.phone || 'No phone available'}</p>
                <p className="text-slate-600">{doctor.specialty || doctor.specialization || 'Specialty not available'}</p>
                <p className="text-slate-600">{doctor.license_no || doctor.registration_no || 'Registration not available'}</p>
                <p className="text-slate-600">{doctor.chamber_address || doctor.hospital || appointment.doctor?.hospital || 'Hospital not available'}</p>
              </div>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Patient Information</p>
              <div className="mt-3 space-y-1 text-sm">
                <p className="font-bold text-slate-900">{patientName}</p>
                <p className="text-slate-600">Patient ID: {patient.mrn || appointment.patientId || appointment.patient_id || 'Not available'}</p>
                <p className="text-slate-600">Age: {patient.age || appointment.patientAge || appointment.age || 'Not available'}</p>
                <p className="text-slate-600">Gender: {patient.gender || appointment.patientGender || 'Not available'}</p>
                <p className="text-slate-600">Phone: {patient.phone || appointment.patientPhone || 'Not available'}</p>
                <p className="text-slate-600">Email: {patient.email || 'Not available'}</p>
              </div>
            </div>
          </section>

          <section className="grid gap-4 md:grid-cols-4">
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Appointment</p>
              <p className="mt-2 text-sm font-semibold text-slate-900">#{appointmentNo}</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Date</p>
              <p className="mt-2 text-sm font-semibold text-slate-900">{appointmentDate}</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Time</p>
              <p className="mt-2 text-sm font-semibold text-slate-900">{appointmentTime}</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Payment</p>
              <p className="mt-2 text-sm font-semibold text-slate-900">{paymentStatus}</p>
              <p className="text-xs text-slate-500">{paymentMethod}</p>
            </div>
          </section>

          <section className="grid gap-4 md:grid-cols-2">
            <div className="rounded-xl border border-blue-100 bg-blue-50 p-4">
              <p className="text-xs font-bold uppercase tracking-wide text-blue-700">Chief Complaint</p>
              <p className="mt-2 text-sm font-medium text-slate-900">{chiefComplaint}</p>
            </div>
            <div className="rounded-xl border border-blue-100 bg-blue-50 p-4">
              <p className="text-xs font-bold uppercase tracking-wide text-blue-700">Diagnosis</p>
              <p className="mt-2 text-sm font-medium text-slate-900">{diagnosis}</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 md:col-span-2">
              <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Clinical Notes</p>
              <p className="mt-2 text-sm text-slate-700">{clinicalNotes}</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 md:col-span-2">
              <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Treatment Plan</p>
              <p className="mt-2 text-sm text-slate-700">{treatmentPlan}</p>
            </div>
          </section>

          <section className="rounded-xl border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
              <div>
                <h3 className="text-lg font-bold text-slate-900">Prescription Medicines</h3>
                <p className="text-xs text-slate-500">Prescribed medicines and instructions</p>
              </div>
              <button type="button" onClick={addMedicine} className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700">+ Add Medicine</button>
            </div>

            <div className="space-y-4 p-4">
              {items.map((medicine, index) => (
                <div key={index} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <div className="mb-3 flex items-center justify-between">
                    <span className="text-sm font-bold text-slate-900">Medicine #{index + 1}</span>
                    <button type="button" onClick={() => removeMedicine(index)} className="rounded-lg border border-red-200 px-3 py-1 text-xs font-semibold text-red-700 hover:bg-red-50">Remove</button>
                  </div>
                  <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                    <label className="space-y-1 text-xs font-bold uppercase tracking-wide text-slate-600">
                      Medicine Name
                      <input value={medicine.medicine_name} onChange={(event) => updateMedicine(index, 'medicine_name', event.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-900" required />
                    </label>
                    <label className="space-y-1 text-xs font-bold uppercase tracking-wide text-slate-600">
                      Strength
                      <input value={medicine.strength} onChange={(event) => updateMedicine(index, 'strength', event.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-900" required />
                    </label>
                    <label className="space-y-1 text-xs font-bold uppercase tracking-wide text-slate-600">
                      Dosage
                      <input value={medicine.dosage} onChange={(event) => updateMedicine(index, 'dosage', event.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-900" required />
                    </label>
                    <label className="space-y-1 text-xs font-bold uppercase tracking-wide text-slate-600">
                      Frequency / Schedule
                      <input value={medicine.frequency} onChange={(event) => updateMedicine(index, 'frequency', event.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-900" required />
                    </label>
                    <label className="space-y-1 text-xs font-bold uppercase tracking-wide text-slate-600">
                      Route
                      <select value={medicine.route} onChange={(event) => updateMedicine(index, 'route', event.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-900" required>
                        <option>Oral</option>
                        <option>Topical</option>
                        <option>Injection</option>
                        <option>Inhalation</option>
                        <option>Eye</option>
                        <option>Ear</option>
                      </select>
                    </label>
                    <label className="space-y-1 text-xs font-bold uppercase tracking-wide text-slate-600">
                      Duration
                      <input value={medicine.duration} onChange={(event) => updateMedicine(index, 'duration', event.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-900" required />
                    </label>
                    <label className="space-y-1 text-xs font-bold uppercase tracking-wide text-slate-600">
                      Quantity
                      <input type="number" min="1" value={medicine.quantity} onChange={(event) => updateMedicine(index, 'quantity', Number(event.target.value))} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-900" required />
                    </label>
                    <label className="space-y-1 text-xs font-bold uppercase tracking-wide text-slate-600 md:col-span-2">
                      Instructions
                      <input value={medicine.instructions} onChange={(event) => updateMedicine(index, 'instructions', event.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-900" />
                    </label>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="grid gap-4 md:grid-cols-2">
            <label className="space-y-1 text-xs font-bold uppercase tracking-wide text-slate-600">
              Doctor's Instructions / Notes
              <textarea value={notes} onChange={(event) => setNotes(event.target.value)} rows="4" className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-900" placeholder="Take medicines regularly." />
            </label>
            <label className="space-y-1 text-xs font-bold uppercase tracking-wide text-slate-600">
              Follow-up In Days
              <input type="number" min="1" value={followUpInDays} onChange={(event) => setFollowUpInDays(Number(event.target.value))} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-900" />
            </label>
          </section>

          <section className="flex justify-end gap-3 border-t border-slate-200 pt-4">
            <button type="button" onClick={onClose} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">Cancel</button>
            <button type="button" onClick={handleUpload} disabled={saving} className="rounded-lg border border-sky-200 bg-sky-50 px-4 py-2 text-sm font-semibold text-sky-800 hover:bg-sky-100 disabled:cursor-not-allowed disabled:opacity-70">
              {saving ? 'Uploading...' : 'Upload'}
            </button>
            <button type="submit" disabled={saving} className="rounded-lg bg-emerald-600 px-5 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-70">
              {saving ? 'Saving...' : 'Save Prescription'}
            </button>
          </section>
        </form>
      </div>
    </div>
  );
}

function getMedicalValue(records, key, appointment = {}) {
  const appointmentKey = String(appointment.id ?? appointment.appointment_no ?? appointment.appointmentNo ?? '');
  const lists = records?.notes ?? [];
  if (!Array.isArray(lists)) return '';
  const target = lists.find((item) => String(item.appointmentId ?? item.appointment_id) === appointmentKey);
  if (!target) return '';

  return key === 'diagnosis'
    ? target.diagnosis
    : key === 'chiefComplaint'
      ? target.title
      : key === 'notes'
        ? target.summary
        : key === 'treatmentPlan'
          ? target.treatmentPlan
          : '';
}
