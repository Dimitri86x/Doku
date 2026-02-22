# Projekt-Zentrale (Refactor + Backend)

## Enthalten
- Frontend in Module aufgeteilt:
  - `public/index.html`
  - `public/css/styles.css`
  - `public/js/app.js`
- Backend mit API:
  - `backend/server.js`
  - `backend/db.js`
  - `backend/googleDrive.js`
- Datenbank: SQLite (`data/protocols.db`)
- Cloud-Export: Google Drive (JSON-Datei pro Protokoll)

## Start
1. Abhängigkeiten installieren:
   - `npm install`
2. Optional Google Drive konfigurieren:
   - `.env.example` nach `.env` kopieren
   - `GOOGLE_SERVICE_ACCOUNT_JSON` auf Service-Account-JSON setzen
   - `GOOGLE_DRIVE_FOLDER_ID` auf Zielordner setzen
3. Starten:
   - `npm start`
4. App öffnen:
   - `http://localhost:3000`

## API
- `POST /api/protocols` speichert alle erfassten Formulardaten in SQLite.
- Falls Google Drive konfiguriert ist, wird derselbe Datensatz als JSON in Drive hochgeladen.
- `GET /api/protocols` listet zuletzt gespeicherte Protokolle.
- `GET /api/health` Healthcheck.

## Wichtiger Hinweis zu Google Drive
Der Upload erfolgt über ein Google-Service-Konto. Der Zielordner in Google Drive muss mit der Service-Account-E-Mail geteilt sein, sonst scheitert der Upload.
