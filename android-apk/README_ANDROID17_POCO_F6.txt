КОРУСКАНТ · ГОРИЗОНТ — СБОРКА APK ЧЕРЕЗ GITHUB ИЗ АРХИВА СТУДИИ
======================================================================

Вариант А (загрузка всего архива из студии на GitHub):
1. Загрузите все файлы проекта из архива студии (включая папку android-apk и .github/workflows/build-apk.yml) в репозиторий на GitHub.
2. Откройте вкладку Actions -> "Build Android 17 APK (Poco F6)" -> "Run workflow".
3. GitHub автоматически соберёт свежую 3D-версию игры и упакует её в app-debug.apk (раздел Artifacts внизу страницы выполненного запуска).

Вариант Б (загрузка только содержимого папки android-apk):
1. Откройте папку android-apk и загрузите её содержимое (app/, .github/, build.gradle.kts, settings.gradle.kts, gradle.properties) в корень нового репозитория на GitHub.
2. В папке android-apk/app/src/main/assets/index.html уже лежит готовая полная офлайн-сборка игры.
3. Перейдите в Actions -> "Build Android 17 APK (Poco F6)" -> "Run workflow" и скачайте готовый APK из Artifacts.
