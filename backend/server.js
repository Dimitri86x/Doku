import "dotenv/config";
import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  initDb,
  insertProtocol,
  markUploaded,
  markUploadFailed,
  listProtocols,
  upsertProject,
  insertTrial,
  listProjects,
  listTrialsByProject
} from "./db.js";
import { uploadProtocolJson } from "./googleDrive.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const publicDir = path.resolve(__dirname, "../public");
const port = Number(process.env.PORT || 3000);

const app = express();
app.use(express.json({ limit: "10mb" }));

app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") {
    res.status(204).end();
    return;
  }
  next();
});

app.use(express.static(publicDir));

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, now: new Date().toISOString() });
});

app.get("/api/protocols", async (req, res) => {
  try {
    const limit = Math.min(Number(req.query.limit || 50), 200);
    const rows = await listProtocols(limit);
    res.json({ items: rows });
  } catch (error) {
    console.error("/api/protocols GET", error);
    res.status(500).json({ error: "Protokolle konnten nicht geladen werden." });
  }
});

app.post("/api/protocols", async (req, res) => {
  const payload = req.body;
  if (!payload || typeof payload !== "object") {
    res.status(400).json({ error: "Ungültiger Request-Body" });
    return;
  }
  if (!payload.moduleType) {
    res.status(400).json({ error: "moduleType fehlt" });
    return;
  }

  try {
    const row = await insertProtocol(payload);

    let driveResult = { uploaded: false, reason: "Nicht versucht" };
    try {
      driveResult = await uploadProtocolJson(row);
      if (driveResult.uploaded && driveResult.fileId) {
        await markUploaded(row.id, driveResult.fileId);
      } else {
        await markUploadFailed(row.id);
      }
    } catch (driveError) {
      console.error("Drive upload failed", driveError);
      await markUploadFailed(row.id);
      driveResult = { uploaded: false, reason: "Drive-Upload fehlgeschlagen" };
    }

    res.status(201).json({
      id: row.id,
      storedAt: row.created_at,
      drive: driveResult
    });
  } catch (error) {
    console.error("/api/protocols POST", error);
    res.status(500).json({ error: "Protokoll konnte nicht gespeichert werden." });
  }
});

app.post("/api/projects/save", async (req, res) => {
  const payload = req.body;
  if (!payload || typeof payload !== "object") {
    res.status(400).json({ error: "Ungültiger Request-Body" });
    return;
  }
  if (!payload.projekt?.kunde || !payload.projekt?.projekt) {
    res.status(400).json({ error: "Kunde und Projekt sind Pflichtfelder." });
    return;
  }
  if (!payload.moduleType) {
    res.status(400).json({ error: "moduleType fehlt." });
    return;
  }

  try {
    const project = await upsertProject(payload.projekt);
    const trial = await insertTrial(project.id, payload.moduleType, payload);

    res.status(201).json({
      ok: true,
      projectId: project.id,
      trialId: trial.id,
      moduleType: payload.moduleType
    });
  } catch (error) {
    console.error("/api/projects/save POST", error);
    res.status(500).json({ error: "Projekt/Versuch konnte nicht gespeichert werden." });
  }
});

app.get("/api/projects", async (req, res) => {
  try {
    const limit = Math.min(Number(req.query.limit || 100), 500);
    const items = await listProjects(limit);
    res.json({ items });
  } catch (error) {
    console.error("/api/projects GET", error);
    res.status(500).json({ error: "Projekte konnten nicht geladen werden." });
  }
});

app.get("/api/projects/:projectId/trials", async (req, res) => {
  try {
    const projectId = Number(req.params.projectId);
    if (!projectId) {
      res.status(400).json({ error: "Ungültige projectId." });
      return;
    }
    const limit = Math.min(Number(req.query.limit || 200), 1000);
    const items = await listTrialsByProject(projectId, limit);
    res.json({ items });
  } catch (error) {
    console.error("/api/projects/:projectId/trials GET", error);
    res.status(500).json({ error: "Versuche konnten nicht geladen werden." });
  }
});

app.get("*", (_req, res) => {
  res.sendFile(path.join(publicDir, "index.html"));
});

initDb()
  .then(() => {
    app.listen(port, () => {
      console.log(`Server läuft auf http://localhost:${port}`);
    });
  })
  .catch((error) => {
    console.error("DB init failed", error);
    process.exit(1);
  });
