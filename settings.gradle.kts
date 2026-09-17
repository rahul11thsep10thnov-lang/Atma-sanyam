pluginManagement {
    repositories {
        google()
        mavenCentral()
        gradlePluginPortal()
    }
}

dependencyResolutionManagement {
    repositoriesMode.set(RepositoriesMode.FAIL_ON_PROJECT_REPOS)
    repositories {
        google()
        mavenCentral()
    }
}

rootProject.name = "AtmaSanyam"

include(":app")
include(":core:model")
include(":core:navigation")
include(":core:designsystem")
include(":feature:home")
include(":feature:goods")
include(":feature:vehicle")
include(":feature:auth")
include(":feature:booking")
