const DOCTOR_DIRECTORY_CHANNEL = "healthPortal:doctor-directory";
const DOCTOR_DIRECTORY_UPDATE_EVENT = "doctor-directory-updated";

export function notifyDoctorDirectoryUpdated(detail = {}) {
  if (typeof window === "undefined") {
    return;
  }

  const payload = {
    type: DOCTOR_DIRECTORY_UPDATE_EVENT,
    at: Date.now(),
    ...detail,
  };

  window.dispatchEvent(new CustomEvent(DOCTOR_DIRECTORY_UPDATE_EVENT, { detail: payload }));

  if (typeof BroadcastChannel === "undefined") {
    return;
  }

  const channel = new BroadcastChannel(DOCTOR_DIRECTORY_CHANNEL);
  channel.postMessage(payload);
  channel.close();
}

export function createDoctorDirectoryChannel() {
  if (typeof BroadcastChannel === "undefined") {
    return null;
  }

  return new BroadcastChannel(DOCTOR_DIRECTORY_CHANNEL);
}

export function getDoctorDirectoryUpdateEventName() {
  return DOCTOR_DIRECTORY_UPDATE_EVENT;
}
