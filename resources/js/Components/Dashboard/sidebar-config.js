export const doctorSidebarItems = [
  { key: "visit-site", label: "Visit Site", icon: "share" },
  { key: "dashboard", label: "Dashboard", icon: "dashboard" },
  { key: "today", label: "Today's Appointments", icon: "calendar" },
  { key: "upcoming", label: "Upcoming Appointments", icon: "calendar" },
  { key: "pending", label: "Pending Requests", icon: "clipboard" },
  { key: "records", label: "Patient Records", icon: "records" },
  { key: "documents", label: "Documents", icon: "upload" },
  { key: "schedule", label: "Schedule Management", icon: "stethoscope" },
  { key: "earnings", label: "Earnings", icon: "wallet" },
  { key: "notifications", label: "Notifications", icon: "bell" },
  { key: "settings", label: "Settings", icon: "settings" },
];

export const adminSidebarItems = [
  { key: "visit-site", label: "Visit Site", icon: "share" },
  { key: "dashboard", label: "Dashboard Overview", icon: "dashboard" },
  { key: "users", label: "All Users", icon: "users" },
  { key: "doctors", label: "Doctors", icon: "doctors" },
  { key: "appointments", label: "Appointments", icon: "appointments" },

  {
    key: "payments",
    label: "Payments",
    icon: "payments",
    children: [
      {
        key: "payments-overview",
        label: "Overview",
      },
      {
        key: "payments-all",
        label: "All Payments",
      },
      {
        key: "payments-successful",
        label: "Successful Payments",
      },
      {
        key: "payments-pending",
        label: "Pending Payments",
      },
      {
        key: "payments-failed",
        label: "Failed Payments",
      },
      {
        key: "payments-transactions",
        label: "Transactions",
      },
      {
        key: "payments-revenue",
        label: "Revenue",
      },
    //   {
    //     key: "payments-settings",
    //     label: "Payment Settings",
    //   },

      // Nested Accordion
      {
        key: "payments-refunds",
        label: "Refunds",
        children: [
          {
            key: "refunds-all",
            label: "All Refunds",
          },
          {
            key: "refunds-pending",
            label: "Pending Requests",
          },
          {
            key: "refunds-approved",
            label: "Approved",
          },
          {
            key: "refunds-rejected",
            label: "Rejected",
          },
          {
            key: "refunds-completed",
            label: "Completed",
          },
        ],
      },
    ],
  },

  { key: "content", label: "Content", icon: "content" },
  { key: "reports", label: "Reports", icon: "reports" },
  { key: "notifications", label: "Notifications", icon: "notifications" },
  { key: "support", label: "Support", icon: "support" },
  { key: "roles", label: "Roles & Permissions", icon: "roles" },
  { key: "doctor-earnings", label: "Doctor Earnings", icon: "wallet" },
  { key: "audit", label: "Audit Logs", icon: "audit" },
  { key: "settings", label: "All Settings", icon: "settings" },
];
