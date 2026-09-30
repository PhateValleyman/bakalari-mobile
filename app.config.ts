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
    .replace(/[-_]/g, ".")
    .replace(/[^a-zA-Z0-9.]/g, "")
    .replace(/\.+/g, ".")
    .replace(/^\.+|\.+$/g, "")
    .toLowerCase()
    .split(".")
    .map((segment) => {
      return /^[a-zA-Z]/.test(segment) ? segment : "x" + segment;
    })
    .join(".") || "space.manus.app";
const timestamp = bundleId.split(".").pop()?.replace(/^t/, "") ?? "";
const schemeFromBundleId = `manus${timestamp}`;

const env = {
  appName: "Bakaláři Mobile",
  appSlug: "bakalari-mobile",
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

    if (/ndkVersion\s+rootProject\.ext\.ndkVersion/.test(contents)) {
      app.modResults.contents = contents.replace(
        /ndkVersion\s+rootProject\.ext\.ndkVersion/,
        ndkVersionDeclaration
      );
      return app;
    }

    if (contents.includes(ndkVersionDeclaration)) {
      return app;
    }

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
  version: "1.3.0",
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
    infoPlist: {
      ITSAppUsesNonExemptEncryption: false,
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
    [
      "expo-splash-screen",
      {
        image: "./assets/images/splash-icon.png",
        imageWidth: 200,
        resizeMode: "contain",
        backgroundColor: "#ffffff",
        dark: {
          backgroundColor: "#000000",
        },
      },
    ],
    [
      "expo-build-properties",
      {
        android: {
          buildArchs: ["armeabi-v7a", "arm64-v8a"],
          minSdkVersion: 24,
        },
      },
    ],
  ],
  experiments: {
    typedRoutes: true,
    reactCompiler: true,
  },
};

export default config;
