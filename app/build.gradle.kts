import java.util.Properties

plugins {
    alias(libs.plugins.android.application)
    alias(libs.plugins.kotlin.android)
    alias(libs.plugins.kotlin.compose)
}

// Firebase (mobile-number OTP login + the "users" database) switches on only once the Firebase
// project's google-services.json is placed in app/. Debug builds without that file still build and
// run (login falls back to an on-device demo mode — see README "Login, ads and payments"), but a
// RELEASE build refuses to build without it, so the demo login can never ship to the Play Store.
val hasGoogleServices = file("google-services.json").exists()
if (hasGoogleServices) {
    apply(plugin = "com.google.gms.google-services")
}
val releaseRequested = gradle.startParameter.taskNames.any { it.contains("release", ignoreCase = true) }
if (releaseRequested && !hasGoogleServices) {
    throw GradleException(
        "A release build needs app/google-services.json (Firebase). Without it the app would ship in demo " +
            "login mode. Add the file from your Firebase project, or build the debug variant instead."
    )
}

// Release signing: keys are never committed. Provide keystore.properties (git-ignored) at the repository
// root with storeFile, storePassword, keyAlias, keyPassword — or the same four values as the environment
// variables TAASH_STORE_FILE, TAASH_STORE_PASSWORD, TAASH_KEY_ALIAS, TAASH_KEY_PASSWORD. With neither, the
// release bundle is built unsigned and must be signed before upload (Play App Signing upload key).
val keystoreProps = Properties().apply {
    val f = rootProject.file("keystore.properties")
    if (f.exists()) f.inputStream().use { load(it) }
}
fun signingValue(propName: String, envName: String): String? =
    (keystoreProps.getProperty(propName) ?: System.getenv(envName))?.takeIf { it.isNotBlank() }
val releaseStoreFile = signingValue("storeFile", "TAASH_STORE_FILE")

android {
    namespace = "com.rangepatte.app"
    compileSdk = 36

    defaultConfig {
        applicationId = "com.rangepatte.app"
        minSdk = 24
        targetSdk = 36
        versionCode = 1
        versionName = "1.0.0"

        testInstrumentationRunner = "androidx.test.runner.AndroidJUnitRunner"
        vectorDrawables {
            useSupportLibrary = true
        }
    }

    signingConfigs {
        if (releaseStoreFile != null) {
            create("release") {
                storeFile = rootProject.file(releaseStoreFile)
                storePassword = signingValue("storePassword", "TAASH_STORE_PASSWORD")
                keyAlias = signingValue("keyAlias", "TAASH_KEY_ALIAS")
                keyPassword = signingValue("keyPassword", "TAASH_KEY_PASSWORD")
            }
        }
    }

    buildTypes {
        release {
            // R8: shrink and obfuscate the code and drop unused resources. The app uses no reflection of
            // its own; the libraries (Firebase, Play services, Billing, Compose) ship their own keep rules.
            isMinifyEnabled = true
            isShrinkResources = true
            if (releaseStoreFile != null) signingConfig = signingConfigs.getByName("release")
            proguardFiles(
                getDefaultProguardFile("proguard-android-optimize.txt"),
                "proguard-rules.pro"
            )
        }
        debug {
            isMinifyEnabled = false
        }
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }

    kotlinOptions {
        jvmTarget = "17"
    }

    buildFeatures {
        compose = true
        buildConfig = true
    }

    packaging {
        resources {
            excludes += "/META-INF/{AL2.0,LGPL2.1}"
        }
    }
}

dependencies {
    implementation(libs.androidx.core.ktx)
    implementation(libs.androidx.lifecycle.runtime.ktx)
    implementation(libs.androidx.lifecycle.viewmodel.compose)
    implementation(libs.androidx.lifecycle.runtime.compose)
    implementation(libs.androidx.activity.compose)
    implementation(platform(libs.androidx.compose.bom))
    implementation(libs.androidx.ui)
    implementation(libs.androidx.ui.graphics)
    implementation(libs.androidx.ui.tooling.preview)
    implementation(libs.androidx.material3)
    implementation(libs.androidx.material.icons.extended)
    implementation(libs.androidx.navigation.compose)
    implementation(libs.kotlinx.coroutines.android)

    // Google AdMob ads + the consent (UMP) SDK Google requires alongside it.
    implementation(libs.play.services.ads)
    implementation(libs.google.ump)

    // Play with people nearby over Bluetooth / Wi-Fi, no internet needed.
    implementation(libs.play.services.nearby)

    // Google Play Billing: the ad-free subscription.
    implementation(libs.play.billing)

    // Firebase phone-OTP auth and Firestore user database (active only with google-services.json).
    implementation(platform(libs.firebase.bom))
    implementation(libs.firebase.auth)
    implementation(libs.firebase.firestore)

    debugImplementation(libs.androidx.ui.tooling)
    debugImplementation(libs.androidx.ui.test.manifest)

    testImplementation(libs.junit)
    testImplementation(libs.kotlinx.coroutines.test)

    androidTestImplementation(platform(libs.androidx.compose.bom))
    androidTestImplementation(libs.androidx.test.ext.junit)
    androidTestImplementation(libs.androidx.espresso.core)
    androidTestImplementation(libs.androidx.ui.test.junit4)
}
