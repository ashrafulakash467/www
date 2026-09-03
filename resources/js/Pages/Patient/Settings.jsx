import PatientSettingsPage from "@/Components/Patient/settings-page";
import PatientLayout from "@/Layouts/PatientLayout";

export default function PatientSettings({ patient }) {
  return <PatientSettingsPage initialPatient={patient} />;
}

PatientSettings.layout = (page) => <PatientLayout>{page}</PatientLayout>;
