/**
 * Environment variables configuration.
 * Validates and exports typed environment variables used across the application.
 */

// Helper to parse boolean env vars safely
const parseBool = (val: string | undefined): boolean => {
  if (!val) return false;
  return val.toLowerCase() === "true" || val === "1";
};

export const env = {
  // Application settings
  APP_NAME: import.meta.env.VITE_APP_NAME || "PlotHole",
  
  // API Keys
  GEMINI_API_KEY: import.meta.env.VITE_GEMINI_API_KEY || "",
  MAP_API_KEY: import.meta.env.VITE_MAP_API_KEY || "",
  
  // Feature flags
  ENABLE_AI: parseBool(import.meta.env.VITE_ENABLE_AI),
  ENABLE_VOICE: parseBool(import.meta.env.VITE_ENABLE_VOICE),
  
  // Supervisor Auth
  SUPERVISOR: {
    USERNAME: import.meta.env.VITE_SUPERVISOR_USERNAME || "",
    PASSWORD: import.meta.env.VITE_SUPERVISOR_PASSWORD || "",
  }
} as const;
