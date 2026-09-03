"use client";

import { useEffect, useState } from "react";
import MedicalRecordsView from "@/Components/Patient/medicalrecords-page";
import {
  createMedicalRecordsChannel,
  emptyMedicalRecords,
  fetchMedicalRecords,
} from "@/utils/medical-records";

export default function MedicalRecordsPage({ patient }) {
  const [recordCategory, setRecordCategory] = useState("prescriptions");
  const [records, setRecords] = useState(emptyMedicalRecords());
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let isMounted = true;

    async function loadRecords() {
      try {
        setError("");
        const nextRecords = await fetchMedicalRecords("patient");
        if (isMounted) {
          setRecords(nextRecords);
        }
      } catch (requestError) {
        if (isMounted) {
          setError(
            requestError instanceof Error
              ? requestError.message
              : "Failed to load medical records.",
          );
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadRecords();

    const channel = createMedicalRecordsChannel();
    if (channel) {
      channel.onmessage = () => {
        loadRecords();
      };
    }

    return () => {
      isMounted = false;
      channel?.close();
    };
  }, []);

  return (
    <MedicalRecordsView
      patient={patient}
      records={records}
      recordCategory={recordCategory}
      setRecordCategory={setRecordCategory}
      isLoading={isLoading}
      error={error}
    />
  );
}
