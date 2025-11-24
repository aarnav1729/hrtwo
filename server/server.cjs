require("dotenv").config();

const path = require("path");
const fs = require("fs");
const https = require("https");
const http = require("http");
const express = require("express");
const cors = require("cors");
const mssql = require("mssql");
const morgan = require("morgan");

// Config
const APP_NAME = process.env.APP_NAME || "hrtwo by nav";
const HOST = process.env.HOST || "0.0.0.0";
const PORT = Number(process.env.PORT || 60443);

// HTTPS certificates (same certs for frontend+backend)
const CERT_DIR = process.env.CERT_DIR || path.join(__dirname, "certs");
const HTTPS_KEY_PATH =
  process.env.HTTPS_KEY_PATH || path.join(CERT_DIR, "mydomain.key");
const HTTPS_CERT_PATH =
  process.env.HTTPS_CERT_PATH || path.join(CERT_DIR, "d466aacf3db3f299.crt");
const HTTPS_CA_PATH =
  process.env.HTTPS_CA_PATH || path.join(CERT_DIR, "gd_bundle-g2-g1.crt");

const httpsOptions = {
  key: fs.readFileSync(HTTPS_KEY_PATH, "utf8"),
  cert: fs.readFileSync(HTTPS_CERT_PATH, "utf8"),
  ca: fs.readFileSync(HTTPS_CA_PATH, "utf8"),
};

// Database: using your IDSL_PEL for attendance endpoints
const dbConfig = {
  user: process.env.DB_USER || "SPOT_USER",
  password: process.env.DB_PASS || "Marvik#72@",
  server: process.env.DB_HOST || "10.0.40.10",
  port: Number(process.env.DB_PORT || 1433),
  database: process.env.DB_NAME || "IDSL_PEL",
  options: {
    trustServerCertificate: true,
    encrypt: false,
    connectionTimeout: 600000,
  },
};

// App & middleware
const app = express();
app.use(
  cors({
    origin: (origin, cb) => cb(null, true),
    credentials: true,
  })
);
app.use(express.json({ limit: "5mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(morgan("combined"));

// Avoid caching index.html to ensure fresh SPA loads
app.use((req, res, next) => {
  if (req.path === "/" || req.path.endsWith("index.html")) {
    res.setHeader(
      "Cache-Control",
      "no-store, no-cache, must-revalidate, proxy-revalidate"
    );
    res.setHeader("Pragma", "no-cache");
    res.setHeader("Expires", "0");
    res.setHeader("Surrogate-Control", "no-store");
  }
  next();
});

// Static hosting of the built React app
const DIST_DIR = path.resolve(__dirname, "../dist");
app.use(express.static(DIST_DIR));

// MSSQL connection (single shared pool)
const poolPromise = new mssql.ConnectionPool(dbConfig)
  .connect()
  .then((pool) => {
    console.log("✅ Connected to MSSQL:", dbConfig.server, dbConfig.database);
    return pool;
  })
  .catch((err) => {
    console.error("⛔ MSSQL Connection Error:", err);
    process.exit(1);
  });

// Attendance & Team Endpoints (IDSL_PEL: SRAW + EMPLOYEE)

// Work-Progress: returns latest IN, derived hoursWorked & minutesLeft
// Work-Progress: uses FIRST IN of today's date
app.get("/api/work-progress", async (req, res) => {
  try {
    const empCode = String(req.query.empCode || "").trim();
    if (!empCode) {
      return res.status(400).json({ message: "empCode required" });
    }

    const pool = await poolPromise;

    // FIRST IN PUNCH of TODAY
    const result = await pool.request().input("empCode", mssql.VarChar, empCode)
      .query(`
        SELECT TOP 1 
          CONVERT(varchar(19), ATT_DATE, 120) AS inTimeStr
        FROM IDSL_PEL.DBO.SRAW
        WHERE EMP_CODE = @empCode
          AND LOWER(IN_OUT) = 'in'
          AND CONVERT(date, ATT_DATE) = CONVERT(date, GETDATE())
        ORDER BY ATT_DATE ASC;
      `);

    if (!result.recordset.length) {
      return res.status(404).json({ message: "No punch-in found for today" });
    }

    const inTimeStr = result.recordset[0].inTimeStr;
    const inDate = new Date(inTimeStr);
    const now = new Date();

    const diffMs = now - inDate;
    const hoursWorked = diffMs / (1000 * 60 * 60);

    const totalShiftMins = 9 * 60;
    const minutesLeft = Math.max(totalShiftMins - hoursWorked * 60, 0);

    res.json({
      inTime: inTimeStr,
      hoursWorked,
      minutesLeft,
    });
  } catch (error) {
    console.error("❌ Error in /api/work-progress:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// Earliest Check-In today
app.get("/api/earliest-checkin", async (_req, res) => {
  try {
    const pool = await poolPromise;

    const punch = await pool.request().query(`
      SELECT TOP 1
        CARDNO,
        CONVERT(varchar(19), ATT_DATE, 120) AS checkInTime
      FROM IDSL_PEL.DBO.SRAW
      WHERE LOWER(IN_OUT) = 'in'
        AND CONVERT(date, ATT_DATE) = CONVERT(date, GETDATE())
      ORDER BY ATT_DATE ASC;
    `);

    if (!punch.recordset.length) {
      return res.status(404).json({ message: "No check-in found today" });
    }

    const { CARDNO, checkInTime } = punch.recordset[0];

    const emp = await pool.request().input("cardno", mssql.VarChar, CARDNO)
      .query(`
        SELECT TOP 1 COALESCE(FIRSTNAME, EmpName) AS FIRSTNAME
        FROM IDSL_PEL.DBO.EMPLOYEE
        WHERE EMP_CARDNO = @cardno;
      `);

    const firstname = emp.recordset.length
      ? emp.recordset[0].FIRSTNAME
      : `#${CARDNO}`;

    res.json({ name: firstname, checkInTime });
  } catch (error) {
    console.error("❌ Error in /api/earliest-checkin:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// Latest Check-Out (yesterday)
app.get("/api/latest-checkout", async (_req, res) => {
  try {
    const pool = await poolPromise;
    const punch = await pool.request().query(`
      SELECT TOP 1
        s.CARDNO,
        CONVERT(varchar(19), s.ATT_DATE, 120) AS checkOutTime
      FROM IDSL_PEL.DBO.SRAW AS s
      WHERE LOWER(s.IN_OUT) = 'out'
        AND CONVERT(date, s.ATT_DATE) = CONVERT(date, DATEADD(day, -1, GETDATE()))
      ORDER BY s.ATT_DATE DESC;
    `);

    if (!punch.recordset.length) {
      return res.status(404).json({ message: "No check-out found yesterday" });
    }

    const { CARDNO, checkOutTime } = punch.recordset[0];
    const emp = await pool.request().input("cardno", mssql.VarChar, CARDNO)
      .query(`
        SELECT TOP 1 COALESCE(FIRSTNAME, EmpName) AS FIRSTNAME
        FROM IDSL_PEL.DBO.EMPLOYEE
        WHERE EMP_CARDNO = @cardno;
      `);

    const firstname = emp.recordset.length
      ? emp.recordset[0].FIRSTNAME
      : `#${CARDNO}`;

    res.json({ name: firstname, checkOutTime });
  } catch (error) {
    console.error("❌ Error in /api/latest-checkout:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// Recent activity (3 latest punches)
app.get("/api/recent-activity", async (_req, res) => {
  try {
    const pool = await poolPromise;
    const result = await pool.request().query(`
      SELECT TOP 3
        s.IN_OUT       AS action,
        COALESCE(emp.FIRSTNAME, emp.EmpName)  AS name,
        CONVERT(varchar(19), s.ATT_DATE, 120) AS time
      FROM IDSL_PEL.DBO.SRAW AS s
      LEFT JOIN IDSL_PEL.DBO.EMPLOYEE AS emp
        ON s.CARDNO = emp.EMP_CARDNO
      ORDER BY s.ATT_DATE DESC;
    `);

    const records = result.recordset.map((r) => ({
      action: String(r.action || "").toLowerCase(), // "in" | "out"
      name: r.name || "-",
      time: r.time, // "YYYY-MM-DD HH:mm:ss"
    }));

    res.json(records);
  } catch (error) {
    console.error("❌ Error in /api/recent-activity:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// Daily consistency streak (consecutive days with any IN)
app.get("/api/consistency-streak", async (req, res) => {
  try {
    const empCode = String(req.query.empCode || "").trim();
    if (!empCode) {
      return res.status(400).json({ message: "empCode required" });
    }
    const pool = await poolPromise;

    const result = await pool.request().input("empCode", mssql.VarChar, empCode)
      .query(`
        SELECT DISTINCT
          CAST(ATT_DATE AS date) AS d
        FROM IDSL_PEL.DBO.SRAW
        WHERE EMP_CODE      = @empCode
          AND LOWER(IN_OUT) = 'in'
          AND CAST(ATT_DATE AS date) <= CAST(GETDATE() AS date)
        ORDER BY d DESC;
      `);

    const dates = result.recordset.map((r) => {
      const dt = new Date(r.d);
      dt.setHours(0, 0, 0, 0);
      return dt.getTime();
    });

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let count = 0;
    for (let i = 0; i < dates.length; i++) {
      const expected = today.getTime() - i * 24 * 60 * 60 * 1000;
      if (dates[i] === expected) count++;
      else break;
    }
    const isActive = dates.length > 0 && dates[0] === today.getTime();

    res.json({ count, isActive });
  } catch (error) {
    console.error("❌ Error in /api/consistency-streak:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// Team punctuality: infer Dept from EMPLOYEE by EmpID -> compute members' scores
app.get("/api/team-punctuality", async (req, res) => {
  try {
    const empId = String(req.query.empId || "").trim();
    if (!empId) return res.status(400).json({ error: "empId required" });

    const pool = await poolPromise;

    const emp = await pool.request().input("id", mssql.NVarChar(50), empId)
      .query(`
        SELECT TOP 1
          CAST(EMPID as nvarchar(50)) as EmpID,
          ISNULL(Dept, DEPARTMENT) as Dept,
          COALESCE(FIRSTNAME, EmpName) as EmpName
        FROM IDSL_PEL.DBO.EMPLOYEE
        WHERE CAST(EMPID as nvarchar(50)) = @id
      `);
    if (!emp.recordset.length) return res.json({ teams: [], members: [] });

    const dept = emp.recordset[0].Dept || "Team";

    const members = await pool
      .request()
      .input("dept", mssql.NVarChar(128), dept).query(`
        SELECT
          CAST(EMPID as nvarchar(50)) as EmpID,
          COALESCE(FIRSTNAME, EmpName) as EmpName
        FROM IDSL_PEL.DBO.EMPLOYEE
        WHERE ISNULL(Dept, DEPARTMENT) = @dept
          AND (CASE WHEN EXISTS(SELECT 1 FROM sys.columns WHERE name='ActiveFlag' AND object_id=object_id('dbo.EMPLOYEE')) THEN ActiveFlag ELSE 1 END) = 1
      `);

    const from = new Date();
    from.setHours(0, 0, 0, 0);
    const to = new Date();
    to.setHours(23, 59, 59, 999);

    let onlineCount = 0;
    const memberStats = [];

    for (const m of members.recordset) {
      // First IN today
      const firstIn = await pool
        .request()
        .input("emp", mssql.NVarChar(50), m.EmpID)
        .input("from", mssql.DateTime2, from)
        .input("to", mssql.DateTime2, to).query(`
          SELECT TOP 1 ATT_DATE as EventTime
          FROM IDSL_PEL.DBO.SRAW
          WHERE EMP_CODE = @emp AND LOWER(IN_OUT)='in'
            AND ATT_DATE BETWEEN @from AND @to
          ORDER BY ATT_DATE ASC
        `);

      // Last OUT today
      const lastOut = await pool
        .request()
        .input("emp", mssql.NVarChar(50), m.EmpID)
        .input("from", mssql.DateTime2, from)
        .input("to", mssql.DateTime2, to).query(`
          SELECT TOP 1 ATT_DATE as EventTime
          FROM IDSL_PEL.DBO.SRAW
          WHERE EMP_CODE = @emp AND LOWER(IN_OUT)='out'
            AND ATT_DATE BETWEEN @from AND @to
          ORDER BY ATT_DATE DESC
        `);

      const inTime = firstIn.recordset.length
        ? new Date(firstIn.recordset[0].EventTime)
        : null;
      const outTime = lastOut.recordset.length
        ? new Date(lastOut.recordset[0].EventTime)
        : null;

      const cutoff = new Date(from);
      cutoff.setHours(9, 15, 0, 0);

      const onTime = !!inTime && inTime <= cutoff;
      const isOnline = !!inTime && (!outTime || outTime < inTime);
      if (isOnline) onlineCount++;

      const punctualityScore = onTime ? 100 : inTime ? 60 : 0;

      memberStats.push({
        employee: {
          id: m.EmpID,
          name: m.EmpName || m.EmpID,
          department: dept,
          profileImage: "",
        },
        punctualityScore,
        consistencyStreak: { count: 0, isActive: false },
        isOnline,
      });
    }

    const teams = [
      {
        teamName: dept,
        averagePunctuality:
          memberStats.length > 0
            ? Math.round(
                memberStats.reduce((s, x) => s + x.punctualityScore, 0) /
                  memberStats.length
              )
            : 0,
        onlineCount,
        membersCount: memberStats.length,
      },
    ];

    res.json({ teams, members: memberStats });
  } catch (e) {
    console.error("❌ Error in /api/team-punctuality:", e);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Last N punches for an employee (default 50, max 200)
app.get("/api/punches", async (req, res) => {
  try {
    const empCode = String(req.query.empCode || "").trim();
    const limitRaw = parseInt(String(req.query.limit || "50"), 10);
    const limit = Math.min(Math.max(isNaN(limitRaw) ? 50 : limitRaw, 1), 200);

    if (!empCode) {
      return res.status(400).json({ message: "empCode required" });
    }

    const pool = await poolPromise;
    const result = await pool
      .request()
      .input("empCode", mssql.VarChar, empCode)
      .input("limit", mssql.Int, limit).query(`
        SELECT TOP (@limit)
          CONVERT(varchar(19), ATT_DATE, 120) AS time,
          LOWER(IN_OUT) AS action
        FROM IDSL_PEL.DBO.SRAW
        WHERE EMP_CODE = @empCode
        ORDER BY ATT_DATE DESC;
      `);

    const punches = result.recordset.map((r) => ({
      time: r.time, // "YYYY-MM-DD HH:mm:ss"
      action: String(r.action || "").toLowerCase(), // "in" | "out"
    }));

    res.json(punches);
  } catch (error) {
    console.error("❌ Error in /api/punches:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// Total Minutes Out (OUT → next IN) — TODAY ONLY
app.get("/api/minutes-out", async (req, res) => {
  try {
    const empCode = String(req.query.empCode || "").trim();
    if (!empCode) {
      return res.status(400).json({ message: "empCode required" });
    }

    const pool = await poolPromise;

    // Fetch ONLY today's punches
    const punches = await pool
      .request()
      .input("empCode", mssql.VarChar, empCode).query(`
        SELECT
          CONVERT(varchar(19), ATT_DATE, 120) AS punchTime,
          LOWER(IN_OUT) AS action
        FROM IDSL_PEL.DBO.SRAW
        WHERE EMP_CODE = @empCode
          AND CONVERT(date, ATT_DATE) = CONVERT(date, GETDATE())
        ORDER BY ATT_DATE;
      `);

    if (!punches.recordset.length) {
      return res.status(200).json({
        empCode,
        totalMinutesOut: 0,
      });
    }

    let totalMinutesOut = 0;
    let lastOutTime = null; // ← FIXED

    for (let i = 0; i < punches.recordset.length; i++) {
      const { punchTime, action } = punches.recordset[i];
      const currentPunchTime = new Date(punchTime);

      if (action === "out") {
        lastOutTime = currentPunchTime;
      }

      if (action === "in" && lastOutTime) {
        const diffMs = currentPunchTime - lastOutTime;
        totalMinutesOut += diffMs / (1000 * 60);
        lastOutTime = null;
      }
    }

    res.json({
      empCode,
      totalMinutesOut: Math.round(totalMinutesOut),
    });
  } catch (error) {
    console.error("❌ Error in /api/minutes-out:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

/* SPA fallback (must be after API routes) */
app.get(/.*/, (req, res) => {
  res.sendFile(path.join(DIST_DIR, "index.html"));
});

// Start HTTPS server (frontend + backend on the SAME port)
https.createServer(httpsOptions, app).listen(PORT, HOST, () => {
  console.log(`🔒 HTTPS Server running at https://${HOST}:${PORT}`);
});

// Optional: lightweight HTTP (separate port) that redirects to HTTPS
const HTTP_PORT = process.env.HTTP_PORT || 8080;
http
  .createServer((req, res) => {
    const host = req.headers.host
      ? req.headers.host.split(":")[0]
      : "localhost";
    res.writeHead(301, { Location: `https://${host}:${PORT}${req.url}` });
    res.end();
  })
  .listen(HTTP_PORT, HOST, () => {
    console.log(`↪️  HTTP -> HTTPS redirect on http://${HOST}:${HTTP_PORT}`);
  });
