import fs from "node:fs";
import path from "node:path";
import sqlite3 from "sqlite3";

const DATA_DIR = path.resolve(process.cwd(), "data");
const DB_PATH = path.join(DATA_DIR, "protocols.db");

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const db = new sqlite3.Database(DB_PATH);

function run(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function onRun(err) {
      if (err) reject(err);
      else resolve(this);
    });
  });
}

function get(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
}

function all(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
}

export async function initDb() {
  await run(`
    CREATE TABLE IF NOT EXISTS protocols (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      module_type TEXT NOT NULL,
      kunde TEXT,
      projekt TEXT,
      pruefer TEXT,
      email TEXT,
      payload_json TEXT NOT NULL,
      drive_file_id TEXT,
      drive_status TEXT NOT NULL DEFAULT 'pending',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS projects (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      kunde TEXT NOT NULL,
      projekt TEXT NOT NULL,
      pruefer TEXT,
      email TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      UNIQUE(kunde, projekt)
    )
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS trials (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      project_id INTEGER NOT NULL,
      module_type TEXT NOT NULL,
      payload_json TEXT NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY(project_id) REFERENCES projects(id)
    )
  `);
}

export async function insertProtocol(payload) {
  const timestamp = new Date().toISOString();
  const result = await run(
    `
      INSERT INTO protocols (
        module_type,
        kunde,
        projekt,
        pruefer,
        email,
        payload_json,
        drive_status,
        created_at,
        updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, 'pending', ?, ?)
    `,
    [
      payload.moduleType,
      payload.masterData?.kunde || null,
      payload.masterData?.projekt || null,
      payload.masterData?.pruefer || null,
      payload.masterData?.email || null,
      JSON.stringify(payload),
      timestamp,
      timestamp
    ]
  );

  return get("SELECT * FROM protocols WHERE id = ?", [result.lastID]);
}

export async function markUploaded(id, driveFileId) {
  const timestamp = new Date().toISOString();
  await run(
    `UPDATE protocols SET drive_file_id = ?, drive_status = 'uploaded', updated_at = ? WHERE id = ?`,
    [driveFileId, timestamp, id]
  );
}

export async function markUploadFailed(id) {
  const timestamp = new Date().toISOString();
  await run(
    `UPDATE protocols SET drive_status = 'failed', updated_at = ? WHERE id = ?`,
    [timestamp, id]
  );
}

export async function listProtocols(limit = 50) {
  return new Promise((resolve, reject) => {
    db.all(
      "SELECT id, module_type, kunde, projekt, pruefer, drive_status, drive_file_id, created_at FROM protocols ORDER BY id DESC LIMIT ?",
      [limit],
      (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      }
    );
  });
}

export async function upsertProject(project) {
  const timestamp = new Date().toISOString();
  const kunde = (project?.kunde || "").trim();
  const projekt = (project?.projekt || "").trim();
  const pruefer = (project?.pruefer || "").trim();
  const email = (project?.email || "").trim();

  await run(
    `
      INSERT INTO projects (kunde, projekt, pruefer, email, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?)
      ON CONFLICT(kunde, projekt)
      DO UPDATE SET
        pruefer = excluded.pruefer,
        email = excluded.email,
        updated_at = excluded.updated_at
    `,
    [kunde, projekt, pruefer || null, email || null, timestamp, timestamp]
  );

  return get("SELECT * FROM projects WHERE kunde = ? AND projekt = ?", [kunde, projekt]);
}

export async function insertTrial(projectId, moduleType, payload) {
  const timestamp = new Date().toISOString();
  const result = await run(
    `
      INSERT INTO trials (project_id, module_type, payload_json, created_at)
      VALUES (?, ?, ?, ?)
    `,
    [projectId, moduleType, JSON.stringify(payload), timestamp]
  );

  return get("SELECT * FROM trials WHERE id = ?", [result.lastID]);
}

export async function listProjects(limit = 100) {
  return all(
    `
      SELECT
        p.id,
        p.kunde,
        p.projekt,
        p.pruefer,
        p.email,
        p.created_at,
        p.updated_at,
        COUNT(t.id) AS trials_count
      FROM projects p
      LEFT JOIN trials t ON t.project_id = p.id
      GROUP BY p.id
      ORDER BY p.updated_at DESC
      LIMIT ?
    `,
    [limit]
  );
}

export async function listTrialsByProject(projectId, limit = 200) {
  return all(
    `
      SELECT
        id,
        project_id,
        module_type,
        payload_json,
        created_at
      FROM trials
      WHERE project_id = ?
      ORDER BY created_at DESC
      LIMIT ?
    `,
    [projectId, limit]
  );
}
