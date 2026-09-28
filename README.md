# IMT_27_Código

![Android](https://img.shields.io/badge/Android-8%2B-green)
![Languages](https://img.shields.io/badge/Languages-PT%20%7C%20EN%20%7C%20Punjabi-blue)
![Database](https://img.shields.io/badge/Database-SQLite-lightgrey)
![License](https://img.shields.io/badge/License-MIT-yellow)

**IMT_27_Código** is an unofficial Android learning and practice application for Portuguese driving-theory study, including TVDE / CMTVDE learning content.

The project is designed for multilingual study with support for **Portuguese, English and Punjabi (Gurmukhi)**, offline question data, exam practice, review tools and downloadable offline question images.

> This is an unofficial educational project. It is not affiliated with, endorsed by, or operated by IMT or any Portuguese government authority.

---

## Features

- Portuguese driving-theory practice
- TVDE / CMTVDE learning content
- Portuguese, English and Punjabi translations
- Offline SQLite question database
- Exam simulation
- Practice and review modes
- Progress tracking
- AI-assisted explanations
- Android native text-to-speech support
- Offline question-image support
- Small APK architecture
- GitHub-hosted image pack
- SHA-256 image-pack verification
- Capacitor-based Android application

---

## Database

The project uses a **single canonical SQLite database**:

```text
www/assets/db/segurancarodoviaria.db
```

This database is the source of truth for application question data.

The project does not maintain separate source/master/production database copies.

During Android packaging, the application build process generates the required APK asset from this canonical database.

---

## Languages

The learning database supports:

- Portuguese
- English
- Punjabi (Gurmukhi)

Translations are intended to preserve the meaning of the original Portuguese driving-theory questions and answers.

---

## Complete Offline Image Pack

To keep the Android APK smaller, the complete question-image library is distributed separately through **GitHub Releases**.

Main package:

```text
imt27-image-pack-v1.zip
```

The complete image pack contains approximately:

- **7,069 standard Portuguese driving-theory images**
- **387 TVDE / CMTVDE images**
- **7,456 images total**

The TVDE content includes:

- 256 TVDE signalling and traffic-rule images
- 131 TVDE Syllabus question images

Images cover topics such as:

- road signs
- road markings
- priority and right-of-way
- roundabouts
- overtaking
- stopping and parking
- motorway driving
- speed limits
- visibility
- lighting
- adverse weather
- braking and safety distance
- pedestrians
- cyclists
- defensive driving
- vehicle positioning
- accident situations
- TVDE road-safety scenarios

The image pack is optimized for mobile use and offline study.

---

## Offline Image System

Question images are **not bundled directly inside the APK**.

Instead, the app downloads the complete image ZIP from GitHub Releases and stores the extracted images in local app storage.

This approach provides:

- smaller APK size
- faster APK installation
- easier image updates
- offline access after the initial download
- no need to publish a new APK when only image content changes

After the image pack is installed, supported question images can be used offline.

---

## Image Pack Integrity

The release includes integrity-verification files such as:

```text
imt27-image-pack-v1.zip
imt27-image-pack-v1.zip.sha256
imt27-image-pack-v1.manifest.json
```

SHA-256 checksums can be used to verify that the downloaded ZIP is complete and has not been corrupted or unexpectedly modified.

Example verification on Windows:

```powershell
Get-FileHash .\imt27-image-pack-v1.zip -Algorithm SHA256
```

or:

```cmd
certutil -hashfile imt27-image-pack-v1.zip SHA256
```

---

## Project Structure

Important project locations:

```text
_MOBILE/
├── android/
├── data/
├── docs/
├── scripts/
├── www/
│   ├── assets/
│   │   └── db/
│   │       └── segurancarodoviaria.db
│   ├── js/
│   └── ...
├── capacitor.config.json
├── package.json
└── package-lock.json
```

The canonical database is located only at:

```text
www/assets/db/segurancarodoviaria.db
```

---

## Android Build

### Requirements

- Node.js
- npm
- Java / JDK compatible with the Android project
- Android SDK / Gradle environment
- Existing release signing key for signed production updates

### Install dependencies

```powershell
npm.cmd install
```

### Build a debug APK

```powershell
npm.cmd run build:debug
```

### Build a signed release APK

```powershell
npm.cmd run build:apk
```

Typical output location:

```text
android/app/build/outputs/apk/release/app-release.apk
```

For an update to an already-installed production APK, the same Android signing certificate must be used.

---

## Single-Database Architecture

The project intentionally uses only one source database.

Source database:

```text
www/assets/db/segurancarodoviaria.db
```

The Android build generates the APK copy automatically.

This reduces the risk of accidentally building the application with an outdated or incorrect database.

---

## TVDE / CMTVDE Content

The project includes additional TVDE learning material covering subjects such as:

- traffic signs
- traffic rules
- priority
- roundabouts
- overtaking
- safe driving
- weather and visibility
- emergency situations
- passenger transport
- driver conduct
- communication
- defensive driving
- eco-driving
- TVDE regulatory study topics

TVDE images are included in the same complete offline image pack as the standard driving-theory images.

---

## Educational Purpose

IMT_27_Código is intended to help learners:

- review driving-theory questions
- understand road-safety concepts
- practise exam-style questions
- study in multiple languages
- review difficult questions
- prepare for Portuguese driving-theory and TVDE-related learning

The application should be used as a supplementary learning tool.

For official requirements, current legislation, exam rules and regulatory information, users should consult official Portuguese authorities and official publications.

---

## Disclaimer

This project is **unofficial**.

It is not affiliated with, endorsed by, sponsored by, or operated by:

- Instituto da Mobilidade e dos Transportes (IMT)
- the Portuguese Government
- any official driving examination authority
- any TVDE platform or operator

Names, references and educational material are used only for learning and study purposes.

Official legislation and examination requirements may change. Users should verify current information with official Portuguese sources.

---

## License

This repository is distributed under the **MIT License**.

See:

```text
LICENSE
```

for the full license terms.

---

## Releases

GitHub Releases are used for distributing large application assets such as the complete offline image pack.

The main repository can remain lightweight while large binary content is distributed separately through release assets.

---

## Project Status

Current development focus includes:

- database quality improvements
- multilingual translation quality
- TVDE content validation
- explanation quality
- offline learning
- Android reliability
- image-pack integrity
- exam simulation
- progress and review tools

