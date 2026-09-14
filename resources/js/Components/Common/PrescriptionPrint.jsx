"use client";

const PRINT_STYLES = `
  @media print {
    @page { size: A4 portrait; margin: 7mm; }

    html, body {
      margin: 0 !important;
      padding: 0 !important;
      background: #fff !important;
    }

    #prescription-print-sheet,
    #prescription-print-sheet * {
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }

    #prescription-print-sheet {
      position: static !important;
      width: 100% !important;
      max-width: none !important;
      margin: 0 !important;
      overflow: visible !important;
      font-size: 9px !important;
    }

    #prescription-print-sheet .prescription-header {
      padding: 3mm 4mm !important;
    }

    #prescription-print-sheet .prescription-header h1 {
      font-size: 18px !important;
      line-height: 1.15 !important;
    }

    #prescription-print-sheet .prescription-body {
      display: flex !important;
      flex-direction: column !important;
      gap: 3mm !important;
      padding: 3mm 4mm !important;
    }

    #prescription-print-sheet .prescription-body > * {
      margin-top: 0 !important;
      break-inside: avoid !important;
      page-break-inside: avoid !important;
    }

    #prescription-print-sheet .prescription-info-grid {
      display: grid !important;
      grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
      gap: 3mm !important;
    }

    #prescription-print-sheet .prescription-meta-grid {
      display: grid !important;
      grid-template-columns: repeat(4, minmax(0, 1fr)) !important;
      gap: 2mm !important;
    }

    #prescription-print-sheet .prescription-card {
      border-radius: 2mm !important;
      padding: 2.5mm !important;
    }

    #prescription-print-sheet .prescription-card-content {
      margin-top: 1.5mm !important;
      font-size: 9px !important;
      line-height: 1.25 !important;
    }

    #prescription-print-sheet .prescription-card-content > * + * {
      margin-top: .5mm !important;
    }

    #prescription-print-sheet .prescription-notes {
      padding: 2.5mm !important;
    }

    #prescription-print-sheet .prescription-notes p:last-child {
      margin-top: 1mm !important;
      font-size: 9px !important;
      line-height: 1.3 !important;
    }

    #prescription-print-sheet .prescription-medicines-heading {
      padding: 2mm 2.5mm !important;
    }

    #prescription-print-sheet .prescription-medicines-heading h2 {
      font-size: 13px !important;
      line-height: 1.2 !important;
    }

    #prescription-print-sheet .prescription-table-wrap {
      overflow: visible !important;
      padding: 2mm !important;
    }

    #prescription-print-sheet table {
      width: 100% !important;
      min-width: 0 !important;
      table-layout: fixed !important;
      font-size: 7.5px !important;
      line-height: 1.2 !important;
    }

    #prescription-print-sheet th,
    #prescription-print-sheet td {
      padding: 1.5mm 1.25mm !important;
      overflow-wrap: anywhere !important;
      word-break: normal !important;
    }

    #prescription-print-sheet th {
      font-size: 7px !important;
      letter-spacing: .04em !important;
    }

    #prescription-print-sheet tr {
      break-inside: avoid !important;
      page-break-inside: avoid !important;
    }

    #prescription-print-sheet .prescription-footer {
      padding-top: 2mm !important;
    }
  }
`;

export async function printPrescriptionElement(elementId = "prescription-print-sheet") {
  if (typeof window === "undefined") return false;

  const printableElement = document.getElementById(elementId);
  if (!printableElement) return false;

  const frame = document.createElement("iframe");
  frame.setAttribute("title", "Prescription print document");
  frame.setAttribute("aria-hidden", "true");
  frame.style.cssText = "position:fixed;left:-10000px;top:0;width:210mm;height:297mm;border:0;pointer-events:none;";
  document.body.appendChild(frame);

  const printDocument = frame.contentDocument;
  const printWindow = frame.contentWindow;

  if (!printDocument || !printWindow) {
    frame.remove();
    return false;
  }

  const documentStyles = Array.from(
    document.querySelectorAll('link[rel="stylesheet"], style'),
  ).map((node) => node.outerHTML).join("\n");

  printDocument.open();
  printDocument.write(`<!doctype html>
    <html>
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <base href="${escapeAttribute(document.baseURI)}" />
        <title>Prescription</title>
        ${documentStyles}
        <style>
          html, body { margin: 0 !important; padding: 0 !important; background: #fff !important; }
          body { min-width: 0 !important; }
          #prescription-print-sheet { display: block !important; }
        </style>
      </head>
      <body>${printableElement.outerHTML}</body>
    </html>`);
  printDocument.close();

  await waitForPrintDocument(printDocument);

  let removed = false;
  const removeFrame = () => {
    if (removed) return;
    removed = true;
    frame.remove();
  };

  printWindow.addEventListener("afterprint", removeFrame, { once: true });
  printWindow.focus();
  printWindow.print();
  window.setTimeout(removeFrame, 30000);

  return true;
}

export default function PrescriptionPrint({
  prescription = {},
  appointment = {},
  doctor: suppliedDoctor = {},
  patient: suppliedPatient = {},
}) {
  const prescriptionData = asObject(prescription);
  const appointmentData = asObject(appointment);
  const prescriptionAppointment = asObject(prescriptionData.appointment);
  const appointmentDetails = { ...prescriptionAppointment, ...appointmentData };
  const appointmentDoctor = asObject(appointmentDetails.doctor);
  const appointmentPatient = asObject(appointmentDetails.patient);
  const doctor = {
    ...asObject(prescriptionData.doctor),
    ...appointmentDoctor,
    ...asObject(appointmentDoctor.user),
    ...asObject(suppliedDoctor),
  };
  const patient = {
    ...asObject(prescriptionData.patient),
    ...appointmentPatient,
    ...asObject(appointmentPatient.user),
    ...asObject(suppliedPatient),
  };
  const payment = asObject(appointmentDetails.payment);
  const items = Array.isArray(prescriptionData.items)
    ? prescriptionData.items
    : Array.isArray(prescriptionData.prescription_items)
      ? prescriptionData.prescription_items
      : [];

  const prescriptionId = firstValue(
    prescriptionData.title,
    prescriptionData.prescriptionNo,
    prescriptionData.prescription_no,
    prescriptionData.id,
  );
  const issueDate = firstValue(
    prescriptionData.date,
    prescriptionData.issuedAt,
    prescriptionData.issued_at,
    prescriptionData.created_at,
  );
  const notes = firstValue(
    prescriptionData.summary,
    prescriptionData.notes,
    prescriptionData.clinicalNotes,
    prescriptionData.clinical_notes,
  );
  const followUpInDays = firstValue(
    prescriptionData.followUpInDays,
    prescriptionData.follow_up_in_days,
  );

  return (
    <article id="prescription-print-sheet" className="mx-auto w-full max-w-5xl bg-white text-slate-900 print:max-w-none">
      <style>{PRINT_STYLES}</style>

      <header className="prescription-header border-b-2 border-emerald-700 px-6 py-5">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-700">HealthPortal</p>
        <div className="mt-1 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold">Prescription</h1>
            <p className="mt-1 text-xs text-slate-500">{prescriptionId ? `Prescription #${prescriptionId}` : "Prescription #N/A"}</p>
          </div>
          <p className="text-sm font-semibold text-slate-600">Issued: {issueDate || "Not available"}</p>
        </div>
      </header>

      <div className="prescription-body space-y-6 px-6 py-5">
        <section className="prescription-info-grid grid gap-4 md:grid-cols-2">
          <InfoCard title="Doctor Information">
            <p className="font-bold text-slate-900">{firstValue(doctor.name, prescriptionData.doctorName, prescriptionData.doctor_name) || "Doctor"}</p>
            <p>{firstValue(doctor.email, prescriptionData.doctorEmail) || "No email available"}</p>
            <p>{firstValue(doctor.phone, prescriptionData.doctorPhone) || "No phone available"}</p>
            <p>{firstValue(doctor.specialty, doctor.specialization) || "Specialty not available"}</p>
            <p>{firstValue(doctor.licenseNo, doctor.license_no, doctor.registrationNo, doctor.registration_no) || "Registration not available"}</p>
            <p>{firstValue(doctor.chamberAddress, doctor.chamber_address, doctor.hospital, doctor.clinic) || "Clinic/hospital not available"}</p>
          </InfoCard>
          <InfoCard title="Patient Information">
            <p className="font-bold text-slate-900">{firstValue(patient.name, prescriptionData.patientName, prescriptionData.patient_name) || "Patient"}</p>
            <p>Patient ID: {firstValue(patient.mrn, patient.patientNo, patient.patient_no, patient.id) || "Not available"}</p>
            <p>Date of birth: {firstValue(patient.dateOfBirth, patient.date_of_birth, patient.dob) || "Not available"}</p>
            <p>Gender: {firstValue(patient.gender) || "Not available"}</p>
            <p>Phone: {firstValue(patient.phone) || "Not available"}</p>
            <p>Email: {firstValue(patient.email) || "Not available"}</p>
          </InfoCard>
        </section>

        <section className="prescription-meta-grid grid gap-4 md:grid-cols-4">
          <MetaCard label="Prescription ID" value={prescriptionId || "Not available"} />
          <MetaCard label="Appointment" value={firstValue(appointmentDetails.appointmentNo, appointmentDetails.appointment_no, prescriptionData.appointmentNo, appointmentDetails.id) || "Not available"} />
          <MetaCard label="Issue Date" value={issueDate || "Not available"} />
          <MetaCard
            label="Payment"
            value={firstValue(appointmentDetails.paymentStatus, appointmentDetails.payment_status, payment.status) || "Not available"}
            detail={firstValue(payment.method, appointmentDetails.paymentMethod, appointmentDetails.payment_method)}
          />
        </section>

        <section className="prescription-notes rounded-xl border border-slate-200 bg-slate-50 p-5">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">Clinical Notes</p>
          <p className="mt-2 whitespace-pre-wrap text-sm text-slate-700">{notes || "No clinical notes attached"}</p>
        </section>

        <section className="prescription-medicines overflow-hidden rounded-xl border border-slate-200">
          <div className="prescription-medicines-heading border-b border-slate-200 px-4 py-3">
            <h2 className="text-lg font-bold">Prescription Medicines</h2>
            <p className="text-xs text-slate-500">Prescribed medicines and instructions</p>
          </div>
          <div className="prescription-table-wrap overflow-x-auto p-4">
            <table className="min-w-full border-collapse border border-slate-300 text-left text-sm">
              <thead>
                <tr className="bg-emerald-50 text-xs font-extrabold uppercase tracking-[0.12em] text-emerald-950">
                  {["Medicine", "Strength", "Dosage", "Frequency", "Route", "Duration", "Qty", "Instructions"].map((heading) => (
                    <th key={heading} className="border border-slate-300 px-3 py-3">{heading}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-white text-slate-700">
                {items.length ? items.map((item, index) => {
                  const medicine = asObject(item);

                  return (
                    <tr key={medicine.id ?? index}>
                      <td className="border border-slate-300 px-3 py-3 font-medium text-slate-900">{firstValue(medicine.medicineName, medicine.medicine_name, medicine.name) || "-"}</td>
                      <td className="border border-slate-300 px-3 py-3">{firstValue(medicine.strength) || "-"}</td>
                      <td className="border border-slate-300 px-3 py-3">{firstValue(medicine.dosage, medicine.dose) || "-"}</td>
                      <td className="border border-slate-300 px-3 py-3">{firstValue(medicine.frequency, medicine.schedule) || "-"}</td>
                      <td className="border border-slate-300 px-3 py-3">{firstValue(medicine.route) || "-"}</td>
                      <td className="border border-slate-300 px-3 py-3">{firstValue(medicine.duration) || "-"}</td>
                      <td className="border border-slate-300 px-3 py-3">{firstValue(medicine.quantity, medicine.qty) || "-"}</td>
                      <td className="border border-slate-300 px-3 py-3">{firstValue(medicine.instructions, medicine.instruction) || "-"}</td>
                    </tr>
                  );
                }) : (
                  <tr><td colSpan={8} className="border border-slate-300 px-3 py-6 text-center text-slate-500">No medicines in this prescription.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section className="prescription-meta-grid grid gap-4 md:grid-cols-2">
          <MetaCard label="Follow-up" value={followUpInDays ? `${followUpInDays} day(s)` : "Not specified"} />
          <MetaCard label="Status" value={firstValue(prescriptionData.status) || "Issued"} />
        </section>

        <footer className="prescription-footer border-t border-slate-200 pt-4 text-xs text-slate-500">Generated from HealthPortal Medical Records</footer>
      </div>
    </article>
  );
}

function InfoCard({ title, children }) {
  return (
    <div className="prescription-card rounded-xl border border-slate-200 bg-slate-50 p-4">
      <p className="text-xs font-bold uppercase tracking-wide text-slate-500">{title}</p>
      <div className="prescription-card-content mt-3 space-y-1 text-sm text-slate-600">{children}</div>
    </div>
  );
}

function MetaCard({ label, value, detail }) {
  return (
    <div className="prescription-card rounded-xl border border-slate-200 bg-slate-50 p-4">
      <p className="text-xs font-bold uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-2 text-sm font-semibold text-slate-900">{value}</p>
      {detail ? <p className="text-xs text-slate-500">{detail}</p> : null}
    </div>
  );
}

function asObject(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}


function escapeAttribute(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

async function waitForPrintDocument(printDocument) {
  const printWindow = printDocument.defaultView;
  const stylesheets = Array.from(printDocument.querySelectorAll('link[rel="stylesheet"]'));
  const images = Array.from(printDocument.images);

  await Promise.all([
    ...stylesheets.map((stylesheet) => waitForResource(stylesheet, Boolean(stylesheet.sheet))),
    ...images.map((image) => waitForResource(image, image.complete)),
  ]);

  if (printDocument.fonts?.ready) {
    await printDocument.fonts.ready.catch(() => undefined);
  }

  if (printWindow) {
    await new Promise((resolve) => {
      printWindow.requestAnimationFrame(() => {
        printWindow.requestAnimationFrame(resolve);
      });
    });
  }
}

function waitForResource(element, isReady) {
  if (isReady) return Promise.resolve();

  return new Promise((resolve) => {
    const timer = window.setTimeout(resolve, 3000);
    const finish = () => {
      window.clearTimeout(timer);
      resolve();
    };

    element.addEventListener("load", finish, { once: true });
    element.addEventListener("error", finish, { once: true });
  });
}

function firstValue(...values) {
  return values.find((value) => value !== undefined && value !== null && value !== "");
}
