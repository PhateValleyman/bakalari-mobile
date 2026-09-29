// Load environment variables with proper priority (system > .env)
import "./scripts/load-env.js";
import type { ExpoConfig } from "expo/config";
import { withAppBuildGradle, type ConfigPlugin } from "expo/config-plugins";

// Bundle ID format: space.manus.<project_name_dots>.<timestamp>
// e.g., "my-app" created at 2024-01-15 10:30:45 -> "space.manus.my.app.t20240115103045"
// Bundle ID can only contain letters, numbers, and dots
// Android requires each dot-separated segment to start with a letter
const rawBundleId = "com.app.bakalarimobile";
const bundleId =
  rawBundleId
    .replace(/[-_]/g, ".") // Replace hyphens/underscores with dots
    .replace(/[^a-zA-Z0-9.]/g, "") // Remove invalid chars
    .replace(/\.+/g, ".") // Collapse consecutive dots
    .replace(/^\.+|\.+$/g, "") // Trim leading/trailing dots
    .toLowerCase()
    .split(".")
    .map((segment) => {
      // Android requires each segment to start with a letter
      // Prefix with 'x' if segment starts with a digit
      return /^[a-zA-Z]/.test(segment) ? segment : "x" + segment;
    })
    .join(".") || "space.manus.app";
// Extract timestamp from bundle ID and prefix with "manus" for deep link scheme
// e.g., "space.manus.my.app.t20240115103045" -> "manus20240115103045"
const timestamp = bundleId.split(".").pop()?.replace(/^t/, "") ?? "";
const schemeFromBundleId = `manus${timestamp}`;

const env = {
  // App branding - update these values directly (do not use env vars)
  appName: "Bakaláři Mobile",
  appSlug: "bakalari-mobile",
  // S3 URL of the app logo - set this to the URL returned by generate_image when creating custom logo
  // Leave empty to use the default icon from assets/images/icon.png
  logoUrl: "",
  scheme: schemeFromBundleId,
  iosBundleId: bundleId,
  androidPackage: bundleId,
};

const withAndroidNdkVersion: ConfigPlugin = (config) =>
  withAppBuildGradle(config, (app) => {
    if (app.modResults.language !== "groovy") {
      throw new Error("Bakaláři Mobile requires a Groovy android/app/build.gradle file.");
    }

    const ndkVersion = "29.0.14206865";
    const contents = app.modResults.contents;
    const ndkVersionDeclaration = `ndkVersion "${ndkVersion}"`;

    // Replace Expo/React Native's generated root-project NDK reference when present.
    if (/ndkVersion\s+rootProject\.ext\.ndkVersion/.test(contents)) {
      app.modResults.contents = contents.replace(
        /ndkVersion\s+rootProject\.ext\.ndkVersion/,
        ndkVersionDeclaration
      );
      return app;
    }

    // Keep an existing explicit NDK version untouched when it already matches the required version.
    if (contents.includes(ndkVersionDeclaration)) {
      return app;
    }

    // Add the required NDK version to the generated android { } block after a clean prebuild.
    const androidBlock = /android\s*\{/;
    if (!androidBlock.test(contents)) {
      throw new Error("Bakaláři Mobile could not find the Android configuration block in android/app/build.gradle.");
    }

    app.modResults.contents = contents.replace(
      androidBlock,
      (match) => `${match}\n    ${ndkVersionDeclaration}`
    );

    return app;
  });

const config: ExpoConfig = {
  name: env.appName,
  slug: env.appSlug,
  version: "1.0.0",
  orientation: "portrait",
  icon: "./assets/images/icon.png",
  scheme: env.scheme,
  extra: {
    eas: {
      projectId: "010c69e4-2210-435a-8cfc-d53470ec4431",
    },
  },
  userInterfaceStyle: "automatic",
  newArchEnabled: true,
  ios: {
    supportsTablet: true,
    bundleIdentifier: env.iosBundleId,
    "infoPlist": {
      "ITSAppUsesNonExemptEncryption": false,
    },
  },
  android: {
    adaptiveIcon: {
      backgroundColor: "#E6F4FE",
      foregroundImage: "./assets/images/android-icon-foreground.png",
      backgroundImage: "./assets/images/android-icon-background.png",
      monochromeImage: "./assets/images/android-icon-monochrome.png",
    },
    predictiveBackGestureEnabled: false,
    package: env.androidPackage,
    permissions: ["POST_NOTIFICATIONS"],
    intentFilters: [
      {
        action: "VIEW",
        autoVerify: true,
        data: [
          {
            scheme: env.scheme,
            host: "*",
          },
        ],
        category: ["BROWSABLE", "DEFAULT"],
      },
    ],
  },
  web: {
    bundler: "metro",
    output: "static",
    favicon: "./assets/images/favicon.png",
  },
  plugins: [
    "expo-router",
    [
      "expo-notifications",
      {
        color: "#2F7DF6",
      },
    ],
    withAndroidNdkVersion as unknown as NonNullable<ExpoConfig["plugins"]>[number],
    [
      "expo-audio",
      {
        microphonePermission: "Allow $(PRODUCT_NAME) to access your microphone.",
      },
    ],
    [
      "expo-video",
      {
        supportsBackgroundPlayback: true,
        supportsPictureInPicture: true,
      },
    ],
  ],
};

export default config;
