// Shared by the consent script (server) and the consent banner (client). A
// plain module: a constant imported from a "use client" file is only a
// reference on the server, not its value

// localStorage key for the visitor's choice: "granted", "denied", or unset
export const CONSENT_KEY = "analytics-consent";
