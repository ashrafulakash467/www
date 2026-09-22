"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faLocationCrosshairs,
  faMagnifyingGlass,
  faWandMagicSparkles,
  faXmark,
} from "@fortawesome/free-solid-svg-icons";
import DoctorCard from "@/Components/shared/DoctorCard";
import { apiFetch, getStoredToken } from "@/utils/api";

const SEARCH_DELAY = 350;

export default function SearchPage({ isOpen, onClose }) {
  const [query, setQuery] = useState("");
  const [doctors, setDoctors] = useState([]);
  const [status, setStatus] = useState("initial");
  const [recommendationDoctors, setRecommendationDoctors] = useState([]);
  const [recommendationStatus, setRecommendationStatus] = useState("idle");
  const [patientLocation, setPatientLocation] = useState(null);
  const [profileStatus, setProfileStatus] = useState("idle");
  const [geolocationStatus, setGeolocationStatus] = useState("idle");
  const [currentCoordinates, setCurrentCoordinates] = useState(null);
  const inputRef = useRef(null);

  const recommendations = useMemo(() => {
    if (!hasLocation(patientLocation) && !hasCoordinates(currentCoordinates)) {
      return [];
    }

    return recommendationDoctors
      .map((doctor) =>
        scoreDoctor(doctor, patientLocation, query, currentCoordinates),
      )
      .filter(({ distanceKm, locationScore }) => distanceKm !== null || locationScore > 0)
      .sort(compareRecommendations)
      .slice(0, 4);
  }, [currentCoordinates, patientLocation, query, recommendationDoctors]);

  const canRecommend =
    hasLocation(patientLocation) || hasCoordinates(currentCoordinates);

  useEffect(() => {
    if (!isOpen) {
      setQuery("");
      setDoctors([]);
      setStatus("initial");
      setRecommendationDoctors([]);
      setRecommendationStatus("idle");
      setPatientLocation(null);
      setProfileStatus("idle");
      setGeolocationStatus("idle");
      setCurrentCoordinates(null);
      return undefined;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    inputRef.current?.focus();

    function handleKeyDown(event) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  useEffect(() => {
    if (!isOpen) {
      return undefined;
    }

    const controller = new AbortController();

    async function loadRecommendationDoctors() {
      setRecommendationStatus("loading");

      try {
        const response = await apiFetch("/doctor/search?limit=50&sort=name_asc", {
          signal: controller.signal,
        });
        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.message ?? "Doctor recommendations failed.");
        }

        const availableDoctors = Array.isArray(result.data) ? result.data : [];
        setRecommendationDoctors(availableDoctors);
        setRecommendationStatus(availableDoctors.length > 0 ? "ready" : "empty");
      } catch (error) {
        if (error.name !== "AbortError") {
          setRecommendationDoctors([]);
          setRecommendationStatus("error");
        }
      }
    }

    async function loadPatientLocation() {
      if (!getStoredToken("patient")) {
        setProfileStatus("signed-out");
        return;
      }

      setProfileStatus("loading");

      try {
        const response = await apiFetch("/patient/me", {
          signal: controller.signal,
        });
        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.message ?? "Patient profile request failed.");
        }

        setPatientLocation(normalizePatientLocation(result.user?.patient));
        setProfileStatus("ready");
      } catch (error) {
        if (error.name !== "AbortError") {
          setPatientLocation(null);
          setProfileStatus("error");
        }
      }
    }

    loadRecommendationDoctors();
    loadPatientLocation();

    return () => controller.abort();
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) {
      return undefined;
    }

    const searchTerm = query.trim();

    if (!searchTerm) {
      setDoctors([]);
      setStatus("initial");
      return undefined;
    }

    const controller = new AbortController();
    setStatus("loading");

    const timeoutId = window.setTimeout(async () => {
      try {
        const response = await apiFetch(
          `/doctor/search?search=${encodeURIComponent(searchTerm)}`,
          { signal: controller.signal },
        );
        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.message ?? "Doctor search failed.");
        }

        const searchResults = Array.isArray(result.data) ? result.data : [];
        setDoctors(searchResults);
        setStatus(searchResults.length > 0 ? "results" : "empty");
      } catch (error) {
        if (error.name !== "AbortError") {
          setDoctors([]);
          setStatus("error");
        }
      }
    }, SEARCH_DELAY);

    return () => {
      window.clearTimeout(timeoutId);
      controller.abort();
    };
  }, [isOpen, query]);

  function useCurrentLocation() {
    if (!("geolocation" in navigator)) {
      setGeolocationStatus("unsupported");
      return;
    }

    setGeolocationStatus("loading");
    setCurrentCoordinates(null);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const coordinates = normalizeCoordinates(position.coords);

        if (!coordinates) {
          setGeolocationStatus("unavailable");
          return;
        }

        setCurrentCoordinates(coordinates);
        setGeolocationStatus("granted");
      },
      (error) => {
        setCurrentCoordinates(null);

        if (error.code === 1) {
          setGeolocationStatus("denied");
        } else if (error.code === 3) {
          setGeolocationStatus("timeout");
        } else {
          setGeolocationStatus("unavailable");
        }
      },
      {
        enableHighAccuracy: false,
        maximumAge: 300000,
        timeout: 10000,
      },
    );
  }

  if (!isOpen) {
    return null;
  }

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-start justify-center bg-slate-950/45 p-2 backdrop-blur-[3px] sm:px-5 sm:pb-5 sm:pt-4 lg:pt-5"
      role="dialog"
      aria-modal="true"
      aria-labelledby="doctor-search-title"
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <section
        className="flex max-h-[calc(100dvh-1rem)] w-full max-w-7xl flex-col overflow-hidden rounded-2xl bg-white shadow-[0_24px_70px_rgba(15,23,42,0.22)] sm:max-h-[calc(100dvh-2.5rem)]"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 px-4 pb-2 pt-4 sm:px-6 sm:pb-3 sm:pt-5">
          <div>
            <h2
              id="doctor-search-title"
              className="text-xl font-bold tracking-tight text-slate-950 sm:text-[22px]"
            >
              Search HealthCare
            </h2>
            <p className="mt-0.5 text-xs text-slate-400 sm:text-sm">
              Find doctors by name, specialty or location.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close doctor search"
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 focus:outline-none focus:ring-2 focus:ring-brand/30"
          >
            <FontAwesomeIcon icon={faXmark} />
          </button>
        </div>

        <div className="px-4 pb-4 pt-2 sm:px-6 sm:pb-5">
          <label htmlFor="global-doctor-search" className="sr-only">
            Search doctors, specialties or locations
          </label>
          <div className="relative">
            <FontAwesomeIcon
              icon={faMagnifyingGlass}
              className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-emerald-600/60"
            />
            <input
              ref={inputRef}
              id="global-doctor-search"
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search doctors, specialties or locations..."
              autoComplete="off"
              className="h-13 w-full rounded-2xl border border-slate-200 bg-white pl-11 pr-4 text-sm text-slate-900 shadow-[0_8px_28px_rgba(15,23,42,0.07)] outline-none transition placeholder:text-slate-400 hover:border-slate-300 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 sm:h-14 sm:text-base"
            />
          </div>

          <button
            type="button"
            onClick={useCurrentLocation}
            disabled={geolocationStatus === "loading"}
            className="mt-3 inline-flex h-9 items-center justify-center gap-2 rounded-full bg-emerald-50 px-4 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-100 disabled:cursor-wait disabled:opacity-50 sm:text-sm"
          >
            <FontAwesomeIcon icon={faLocationCrosshairs} />
            {geolocationStatus === "loading"
              ? "Getting location..."
              : "Use my current location"}
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto border-t border-slate-100 px-4 py-4 sm:px-6 sm:py-5">
          <section className="mb-5">
            <div className="pb-3">
              <div>
                <div className="flex items-center gap-2">
                  <FontAwesomeIcon icon={faWandMagicSparkles} className="text-sm text-emerald-600/80" />
                  <h3 className="text-base font-semibold text-slate-900">AI Doctor Finder</h3>
                </div>
                <p className="mt-0.5 text-xs text-slate-400 sm:text-sm">
                  Based on your location, these doctors may be closest to you.
                </p>
              </div>
            </div>

            <div className="space-y-3">
              <GeolocationMessage status={geolocationStatus} />
              <ProfileLocationMessage
                status={profileStatus}
                location={patientLocation}
              />

              <p className="text-[11px] font-medium text-slate-400">
                Nearby / Recommended Doctors
              </p>

              {canRecommend ? (
                <RecommendationResults
                  status={recommendationStatus}
                  recommendations={recommendations}
                  onBook={onClose}
                />
              ) : null}
            </div>
          </section>

          <h3 className="mb-3 text-xs font-semibold text-slate-500">
            All Search Results
          </h3>

          {status === "initial" ? (
            <StatusMessage>Start typing to search for a doctor.</StatusMessage>
          ) : null}

          {status === "loading" ? (
            <StatusMessage>Searching doctors...</StatusMessage>
          ) : null}

          {status === "empty" ? (
            <StatusMessage>No doctors matched your search.</StatusMessage>
          ) : null}

          {status === "error" ? (
            <StatusMessage isError>
              Unable to search doctors right now. Please try again.
            </StatusMessage>
          ) : null}

          {status === "results" ? (
            <div>
              <p className="mb-3 text-xs text-slate-400">
                {doctors.length} doctor{doctors.length === 1 ? "" : "s"} found
              </p>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {doctors.map((doctor) => (
                  <DoctorCard key={doctor.id} doctor={doctor} onBook={onClose} />
                ))}
              </div>
            </div>
          ) : null}
        </div>
      </section>
    </div>,
    document.body,
  );
}

function RecommendationResults({ status, recommendations, onBook }) {
  if (status === "loading" || status === "idle") {
    return <InlineMessage>Finding nearby doctor recommendations...</InlineMessage>;
  }

  if (status === "error") {
    return <InlineMessage isError>Unable to load doctor recommendations right now.</InlineMessage>;
  }

  if (status === "empty" || recommendations.length === 0) {
    return (
      <InlineMessage>
        No doctors have usable chamber coordinates or matching profile location information.
      </InlineMessage>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {recommendations.map(
          ({ doctor, distanceKm, explanation, score, scoreParts }) => (
            <div key={doctor.id} className="flex min-w-0 flex-col">
              <div className="mb-2 flex-1 rounded-xl bg-emerald-50/70 px-3 py-2.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[11px] font-semibold text-emerald-700/80">
                    {distanceKm !== null
                      ? `${formatDistance(distanceKm)} km away`
                      : `Match score ${score}`}
                  </span>
                </div>
                <p className="mt-1 text-xs leading-5 text-slate-500/80">{explanation}</p>
                {scoreParts.length > 0 ? (
                  <p className="mt-1.5 text-[10px] text-slate-400">
                    {scoreParts.join(" | ")}
                  </p>
                ) : null}
              </div>
              <DoctorCard doctor={doctor} onBook={onBook} />
            </div>
          ),
        )}
    </div>
  );
}

function ProfileLocationMessage({ status, location }) {
  if (status === "loading" || status === "idle") {
    return <InlineMessage>Loading your patient profile location...</InlineMessage>;
  }

  if (status === "signed-out") {
    return (
      <InlineMessage>
        Sign in as a patient.
      </InlineMessage>
    );
  }

  if (status === "error") {
    return <InlineMessage isError>Unable to load your patient profile location.</InlineMessage>;
  }

  if (!hasLocation(location)) {
    return (
      <InlineMessage>
        Add your location to your patient profile for better nearby doctor recommendations.
      </InlineMessage>
    );
  }

  return (
    <p className="text-xs text-slate-400">
      Using profile location: {formatLocation(location)}
    </p>
  );
}

function GeolocationMessage({ status }) {
  const messages = {
    granted:
      "Current location is active.",
    denied:
      "Location permission was denied. You can still use your saved patient profile location.",
    unsupported: "This browser does not support location access.",
    timeout: "Location access timed out. Please try again.",
    unavailable: "Your current location could not be determined. Please try again.",
  };

  if (!messages[status]) {
    return null;
  }

  return (
    <p
      className={`rounded-lg px-3 py-2 text-xs ${
        status === "granted"
          ? "bg-emerald-50 text-emerald-700/80"
          : "bg-amber-50/70 text-amber-700/80"
      }`}
    >
      {messages[status]}
    </p>
  );
}

function InlineMessage({ children, isError = false }) {
  return (
    <p
      className={`rounded-lg px-3 py-2 text-xs ${
        isError
          ? "bg-red-50 text-red-600"
          : "bg-slate-50 text-slate-400"
      }`}
    >
      {children}
    </p>
  );
}

function normalizePatientLocation(patient) {
  return {
    city: cleanValue(patient?.city),
    state: cleanValue(patient?.state),
    country: cleanValue(patient?.country),
    address: cleanValue(
      patient?.address ||
        [patient?.addressLine1, patient?.addressLine2].filter(Boolean).join(", "),
    ),
  };
}

function scoreDoctor(doctor, patientLocation, query, currentCoordinates) {
  const doctorAddress = cleanValue(doctor.chamberAddress);
  const sameCity = locationMatches(patientLocation?.city, doctor.city, doctorAddress);
  const sameState = locationMatches(patientLocation?.state, doctor.state, doctorAddress);
  const sameCountry = locationMatches(
    patientLocation?.country,
    doctor.country,
    doctorAddress,
  );
  const sameAddress = addressMatches(patientLocation?.address, doctorAddress);
  const isRelevant = searchMatchesDoctor(query, doctor);
  const distanceKm = calculateDistanceKm(
    currentCoordinates,
    normalizeCoordinates(doctor),
  );
  const scoreParts = [];
  let locationScore = 0;
  let score = 0;

  if (sameCity || sameAddress) {
    locationScore += 50;
    scoreParts.push(sameCity ? "Same city" : "Chamber/address match");
  }

  if (sameState) {
    locationScore += 25;
    scoreParts.push("Same state");
  }

  if (sameCountry) {
    locationScore += 10;
    scoreParts.push("Same country");
  }

  score += locationScore;

  if (doctor.isAvailable) {
    score += 20;
    scoreParts.push("Available");
  }

  if (isRelevant) {
    score += 10;
    scoreParts.push("Search relevance");
  }

  return {
    doctor,
    distanceKm,
    locationScore,
    score,
    scoreParts,
    explanation: recommendationExplanation({
      sameCity,
      sameState,
      sameCountry,
      sameAddress,
      isAvailable: doctor.isAvailable,
      isRelevant,
      distanceKm,
    }),
  };
}

function recommendationExplanation(matches) {
  if (matches.distanceKm !== null) {
    return matches.isAvailable
      ? "Distance from current location ."
      : "Recommended by straight-line distance from your current location.";
  }

  if ((matches.sameCity || matches.sameAddress) && matches.isAvailable) {
    return "This doctor is near your profile location and available.";
  }

  if (matches.sameCity) {
    return "Recommended because this doctor's chamber is in the same city as your profile location.";
  }

  if (matches.sameAddress) {
    return "Recommended because the chamber address matches your profile location.";
  }

  if (matches.sameState) {
    return matches.isAvailable
      ? "Recommended because this doctor is in the same state and currently available."
      : "Recommended because this doctor is in the same state as your profile location.";
  }

  if (matches.sameCountry) {
    return matches.isAvailable
      ? "Recommended because this doctor is in your country and currently available."
      : "Recommended because this doctor is in the same country as your profile location.";
  }

  if (matches.isRelevant && matches.isAvailable) {
    return "Recommended because this doctor matches your search and is currently available.";
  }

  if (matches.isAvailable) {
    return "Recommended because this doctor is currently available; detailed location data is limited.";
  }

  return "Recommended using the available profile, doctor location and search information.";
}

function compareRecommendations(first, second) {
  const firstHasDistance = first.distanceKm !== null;
  const secondHasDistance = second.distanceKm !== null;

  if (firstHasDistance && secondHasDistance) {
    return (
      first.distanceKm - second.distanceKm ||
      Number(second.doctor.isAvailable) - Number(first.doctor.isAvailable) ||
      second.score - first.score ||
      first.doctor.name.localeCompare(second.doctor.name)
    );
  }

  if (firstHasDistance !== secondHasDistance) {
    return firstHasDistance ? -1 : 1;
  }

  return (
    second.score - first.score ||
    first.doctor.name.localeCompare(second.doctor.name)
  );
}

function calculateDistanceKm(origin, destination) {
  if (!hasCoordinates(origin) || !hasCoordinates(destination)) {
    return null;
  }

  const earthRadiusKm = 6371;
  const latitudeDelta = toRadians(destination.latitude - origin.latitude);
  const longitudeDelta = toRadians(destination.longitude - origin.longitude);
  const originLatitude = toRadians(origin.latitude);
  const destinationLatitude = toRadians(destination.latitude);
  const haversine =
    Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos(originLatitude) *
      Math.cos(destinationLatitude) *
      Math.sin(longitudeDelta / 2) ** 2;
  const boundedHaversine = Math.min(1, Math.max(0, haversine));

  return (
    earthRadiusKm *
    2 *
    Math.atan2(Math.sqrt(boundedHaversine), Math.sqrt(1 - boundedHaversine))
  );
}

function normalizeCoordinates(value) {
  const latitude = parseCoordinate(value?.latitude, -90, 90);
  const longitude = parseCoordinate(value?.longitude, -180, 180);

  if (latitude === null || longitude === null) {
    return null;
  }

  return { latitude, longitude };
}

function parseCoordinate(value, minimum, maximum) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const coordinate = Number(value);
  return Number.isFinite(coordinate) && coordinate >= minimum && coordinate <= maximum
    ? coordinate
    : null;
}

function hasCoordinates(value) {
  return Boolean(
    value &&
      Number.isFinite(value.latitude) &&
      Number.isFinite(value.longitude),
  );
}

function toRadians(value) {
  return (value * Math.PI) / 180;
}

function formatDistance(distanceKm) {
  return distanceKm.toFixed(1);
}

function locationMatches(patientValue, doctorValue, doctorAddress) {
  const expected = normalizeForComparison(patientValue);

  if (!expected) {
    return false;
  }

  return (
    normalizeForComparison(doctorValue) === expected ||
    normalizeForComparison(doctorAddress).includes(expected)
  );
}

function addressMatches(patientAddress, doctorAddress) {
  const patientValue = normalizeForComparison(patientAddress);
  const doctorValue = normalizeForComparison(doctorAddress);

  if (patientValue.length < 6 || doctorValue.length < 6) {
    return false;
  }

  return patientValue.includes(doctorValue) || doctorValue.includes(patientValue);
}

function searchMatchesDoctor(query, doctor) {
  const searchTerm = normalizeForComparison(query);

  if (!searchTerm) {
    return false;
  }

  return [
    doctor.name,
    doctor.specialty,
    doctor.city,
    doctor.state,
    doctor.country,
    doctor.location,
    doctor.chamberAddress,
  ].some((value) => normalizeForComparison(value).includes(searchTerm));
}

function hasLocation(location) {
  return Boolean(
    location && (location.city || location.state || location.country || location.address),
  );
}

function formatLocation(location) {
  return [location.city, location.state, location.country, location.address]
    .filter(Boolean)
    .filter((value, index, values) => values.indexOf(value) === index)
    .join(", ");
}

function cleanValue(value) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeForComparison(value) {
  return cleanValue(value).toLocaleLowerCase().replace(/\s+/g, " ");
}

function StatusMessage({ children, isError = false }) {
  return (
    <p
      className={`rounded-xl px-4 py-7 text-center text-sm ${
        isError
          ? "bg-red-50 text-red-600"
          : "bg-slate-50/70 text-slate-400"
      }`}
    >
      {children}
    </p>
  );
}
