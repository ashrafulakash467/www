import { apiFetch, getStoredToken } from "@/utils/api";

const MEDICAL_RECORDS_CHANNEL = "healthPortal:medical-records";

const emptyRecords = {
  prescriptions: [],
  diagnostics: [],
  notes: [],
  uploads: [],
  invoices: [],
};

function resolveToken(role) {
  const token = getStoredToken(role);

  if (!token) {
    throw new Error(`Missing ${role} auth token.`);
  }

  return token;
}

async function parseJsonResponse(response) {
  const result = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(result.message ?? "Request failed.");
  }

  return result;
}

function notifyMedicalRecordsUpdated() {
  if (typeof BroadcastChannel === "undefined") {
    return;
  }

  const channel = new BroadcastChannel(MEDICAL_RECORDS_CHANNEL);
  channel.postMessage({ type: "medical-records-updated", at: Date.now() });
  channel.close();
}

export function createMedicalRecordsChannel() {
  if (typeof BroadcastChannel === "undefined") {
    return null;
  }

  return new BroadcastChannel(MEDICAL_RECORDS_CHANNEL);
}

export async function fetchMedicalRecords(role = "patient") {
  const token = resolveToken(role);
  const response = await apiFetch("/medical-records", {}, token);
  const result = await parseJsonResponse(response);

  return result.records ?? emptyRecords;
}

export async function saveConsultationMemo(
  { appointmentId, notes, chiefComplaint, diagnosis, treatmentPlan, attachments },
  role = "doctor",
) {
  const token = resolveToken(role);
  const response = await apiFetch(
    `/consultations/${appointmentId}/notes`,
    {
      method: "POST",
      body: JSON.stringify({
        notes,
        chiefComplaint,
        diagnosis,
        treatmentPlan,
        attachments,
      }),
    },
    token,
  );

  const result = await parseJsonResponse(response);
  notifyMedicalRecordsUpdated();
  return result.record;
}

export async function savePrescriptionRecord(
  { appointmentId, prescription, notes, followUpInDays },
  role = "doctor",
) {
  const token = resolveToken(role);
  const response = await apiFetch(
    `/consultations/${appointmentId}/prescriptions`,
    {
      method: "POST",
      body: JSON.stringify({
        prescription,
        notes,
        followUpInDays,
      }),
    },
    token,
  );

  const result = await parseJsonResponse(response);
  notifyMedicalRecordsUpdated();
  return result.record;
}

export async function saveDocumentRecord(
  {
    appointmentId,
    title,
    documentType,
    notes,
    referenceNo,
    documentDate,
    amountCents,
    documentUrl,
    documentFile,
  },
  role = "doctor",
) {
  const token = resolveToken(role);
  const formData = new FormData();

  formData.append("title", title);
  formData.append("documentType", documentType);

  if (notes) {
    formData.append("notes", notes);
  }

  if (referenceNo) {
    formData.append("referenceNo", referenceNo);
  }

  if (documentDate) {
    formData.append("documentDate", documentDate);
  }

  if (amountCents !== undefined && amountCents !== null && amountCents !== "") {
    formData.append("amountCents", String(amountCents));
  }

  if (documentUrl) {
    formData.append("documentUrl", documentUrl);
  }

  if (documentFile) {
    formData.append("documentFile", documentFile);
  }

  const response = await apiFetch(
    `/consultations/${appointmentId}/documents`,
    {
      method: "POST",
      body: formData,
    },
    token,
  );

  const result = await parseJsonResponse(response);
  notifyMedicalRecordsUpdated();
  return result.record;
}

export function emptyMedicalRecords() {
  return {
    prescriptions: [],
    diagnostics: [],
    notes: [],
    uploads: [],
    invoices: [],
  };
}
