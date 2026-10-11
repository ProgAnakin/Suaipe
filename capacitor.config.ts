import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  // Change both to your own identity before publishing a native build (the id is permanent in the stores).
  appId: "app.suaipe.kiosk",
  appName: "Suaipe",
  webDir: "dist",
  android: {
    // Full-screen kiosk feel on Android tablets
    backgroundColor: "#0d1117",
  },
  ios: {
    // Extend layout into the safe area on notched iPhones / iPad Pro
    contentInset: "automatic",
    backgroundColor: "#0d1117",
  },
};

export default config;
