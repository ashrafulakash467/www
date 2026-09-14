export function printAppointments(appointments, title = "Appointment Details") {
  const items = (Array.isArray(appointments) ? appointments : [appointments]).filter(Boolean);
  if (!items.length || typeof window === "undefined") return;

  const popup = window.open("", "_blank", "width=1000,height=800");
  if (!popup) return;

  popup.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>${escapeHtml(title)}</title>
    <style>
      @page{size:A4 portrait;margin:10mm}*{box-sizing:border-box}body{margin:0;font-family:Arial,sans-serif;color:#172033;background:#fff}
      h1{margin:0;font-size:24px}.meta{margin:5px 0 18px;color:#64748b;font-size:12px}.appointment{border:1px solid #cbd5e1;border-radius:12px;padding:14px;margin:0 0 12px;break-inside:avoid}
      .heading{display:flex;justify-content:space-between;gap:16px;border-bottom:1px solid #e2e8f0;padding-bottom:10px}.name{font-size:17px;font-weight:700}.status{font-size:11px;text-transform:uppercase;color:#047857;font-weight:700}
      .grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px;margin-top:12px}.label{font-size:9px;text-transform:uppercase;letter-spacing:.12em;color:#64748b;font-weight:700}.value{font-size:12px;font-weight:600;margin-top:3px;white-space:pre-wrap}.wide{grid-column:span 3}
      footer{border-top:1px solid #e2e8f0;padding-top:10px;margin-top:16px;font-size:10px;color:#64748b}@media print{.appointment{break-inside:avoid}}
    </style></head><body><h1>${escapeHtml(title)}</h1><p class="meta">Generated ${escapeHtml(new Date().toLocaleString())} · ${items.length} appointment${items.length === 1 ? "" : "s"}</p>${items.map(appointmentMarkup).join("")}<footer>Generated from HealthPortal Appointments</footer><script>window.onload=function(){window.focus();setTimeout(function(){window.print();window.close()},250)}<\/script></body></html>`);
  popup.document.close();
}

function appointmentMarkup(appointment) {
  const patient = appointment.patient ?? {};
  const doctor = appointment.doctor ?? {};
  const fields = [
    ["Appointment ID", appointment.appointmentNo || appointment.appointment_no || appointment.id],
    ["Date", appointment.appointmentDate || appointment.appointment_date || "Not set"],
    ["Time", appointment.slotTime || appointment.start_time || "Not set"],
    ["Doctor", doctor.name || appointment.doctorName || "Doctor"],
    ["Patient email", patient.email || "Not available"],
    ["Patient phone", patient.phone || "Not available"],
    ["Payment", appointment.paymentStatus || appointment.payment_status || "Pending"],
    ["Amount", formatAmount(appointment)],
    ["Consultation", appointment.consultationType || appointment.consultation_type || appointment.type || "Consultation"],
    ["Reason", appointment.reason || "Not provided", true],
    ["Notes", appointment.notes || appointment.doctorNotes || appointment.doctor_notes || appointment.description || "Not provided", true],
  ];

  return `<section class="appointment"><div class="heading"><div class="name">${escapeHtml(patient.name || appointment.patientName || "Patient")}</div><div class="status">${escapeHtml(appointment.status || "Pending")}</div></div><div class="grid">${fields.map(([label, value, wide]) => `<div class="${wide ? "wide" : ""}"><div class="label">${escapeHtml(label)}</div><div class="value">${escapeHtml(value)}</div></div>`).join("")}</div></section>`;
}

function formatAmount(appointment) {
  const cents = Number(appointment.paymentAmountCents ?? appointment.amountCents);
  if (!Number.isFinite(cents)) return "Not available";
  return new Intl.NumberFormat("en-BD", { style: "currency", currency: appointment.paymentCurrency || "BDT" }).format(cents / 100);
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" })[character]);
}
