plugins {
    id("com.android.application")
}

val geckoVersion = "133.0.20241209150345"

android {
    namespace = "com.wahandri.pokemonwatch"
    compileSdk = 35

    defaultConfig {
        applicationId = "com.wahandri.pokemonwatch"
        minSdk = 26
        targetSdk = 35
        versionCode = 8
        versionName = "1.7"
    }

    buildTypes {
        release {
            isMinifyEnabled = false
            // Firma con la clave de debug para que el APK se pueda instalar
            // directamente en el reloj por ADB (sideload).
            signingConfig = signingConfigs.getByName("debug")
        }
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }

    packaging {
        jniLibs {
            useLegacyPackaging = true
        }
    }
}


dependencies {
    // Wear OS no tiene WebView: se embebe GeckoView (motor de Firefox).
    // -PgeckoX86 compila la variante x86_64 para el emulador.
    val geckoAbi = when {
        project.hasProperty("geckoX86") -> "x86_64"
        project.hasProperty("geckoArm32") -> "armeabi-v7a"
        project.hasProperty("geckoUniversal") -> "geckoview"
        else -> "arm64-v8a"
    }
    val geckoArtifact = if (geckoAbi == "geckoview") "geckoview" else "geckoview-$geckoAbi"
    implementation("org.mozilla.geckoview:$geckoArtifact:$geckoVersion")
    implementation("org.nanohttpd:nanohttpd:2.3.1")
}
