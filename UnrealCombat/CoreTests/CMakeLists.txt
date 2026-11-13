# Headless build of the engine-agnostic rules core plus its tests.
# Does not need Unreal Engine:  cmake -S . -B build && cmake --build build && ctest --test-dir build
cmake_minimum_required(VERSION 3.16)
project(UnrealCombatCoreTests CXX)

set(CMAKE_CXX_STANDARD 20)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_CXX_EXTENSIONS OFF)

set(CORE_DIR ${CMAKE_CURRENT_SOURCE_DIR}/../Source/UnrealCombatCore)
file(GLOB CORE_SOURCES ${CORE_DIR}/Private/*.cpp)
# The module registration file needs Unreal headers and is only compiled by UnrealBuildTool.
list(FILTER CORE_SOURCES EXCLUDE REGEX "UnrealCombatCoreModule\\.cpp$")

add_library(UnrealCombatCore STATIC ${CORE_SOURCES})
target_include_directories(UnrealCombatCore PUBLIC ${CORE_DIR}/Public)

add_executable(UCCoreTests CoreTests.cpp)
target_link_libraries(UCCoreTests PRIVATE UnrealCombatCore)

if(MSVC)
  target_compile_options(UnrealCombatCore PRIVATE /W4 /WX)
else()
  # Mirror Unreal's build: no exceptions, no RTTI, warnings are errors.
  target_compile_options(UnrealCombatCore PRIVATE -Wall -Wextra -Wshadow -Wconversion -Werror -fno-exceptions -fno-rtti)
  target_compile_options(UCCoreTests PRIVATE -Wall -Wextra -Werror)
endif()

enable_testing()
add_test(NAME UCCoreTests COMMAND UCCoreTests)
