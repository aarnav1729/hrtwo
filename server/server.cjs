// server.cjs
const express = require("express");
const cors = require("cors");
const mssql = require("mssql");

const app = express();
const port = process.env.PORT || 3001;

// Enable CORS and JSON parsing
app.use(cors());
app.use(express.json());

// Database configuration
const dbConfig = {
  user: "SPOT_USER",
  password: "Premier#3801",
  server: "10.0.40.10",
  port: 1433,
  database: "IDSL_PEL",
  options: {
    trustServerCertificate: true,
    encrypt: false,
    connectionTimeout: 60000,
  },
};

// Shared connection pool
const poolPromise = mssql.connect(dbConfig);

// ─── Work‑Progress Endpoint ────────────────────────────────────────
// Returns punch‑in (inTime), hoursWorked, minutesLeft for empCode
app.get("/api/work-progress", async (req, res) => {
  try {
    const empCode = req.query.empCode || "30874";
    const pool = await poolPromise;

    const result = await pool
      .request()
      .input("empCode", mssql.VarChar, empCode)
      .query(`
        SELECT TOP 1
          CONVERT(varchar(19), ATT_DATE, 120) AS inTimeStr
        FROM IDSL_PEL.DBO.SRAW
        WHERE EMP_CODE      = @empCode
          AND LOWER(IN_OUT) = 'in'
        ORDER BY ATT_DATE DESC;
      `);

    if (!result.recordset.length) {
      return res.status(404).json({ message: "No punch‑in record found" });
    }

    const inTimeStr = result.recordset[0].inTimeStr; // "YYYY-MM-DD HH:mm:ss"
    console.log("▶️  Fetched inTimeStr:", inTimeStr);

    // Parse as local
    const inDate = new Date(inTimeStr);
    const now    = new Date();
    const diffMs = now.getTime() - inDate.getTime();

    const hoursWorked    = diffMs / (1000 * 60 * 60);
    const totalShiftMins = 9 * 60;
    const minutesLeft    = Math.max(totalShiftMins - hoursWorked * 60, 0);

    res.json({
      inTime:      inTimeStr,
      hoursWorked,
      minutesLeft,
    });
  } catch (error) {
    console.error("❌ Error in /api/work-progress:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// ─── Earliest Check‑In Endpoint ────────────────────────────────────
// Returns who checked‑in first today in AREA_ID = '30048'
app.get("/api/earliest-checkin", async (req, res) => {
  try {
    const pool = await poolPromise;

    const result = await pool.request().query(`
      SELECT TOP 1
        CARDNO,
        ATT_DATE AS checkInTime
      FROM IDSL_PEL.DBO.SRAW
      WHERE AREA_ID        = '30048'
        AND LOWER(IN_OUT)  = 'in'
        AND CONVERT(date, ATT_DATE) = CONVERT(date, GETDATE())
      ORDER BY ATT_DATE ASC;
    `);

    if (!result.recordset.length) {
      return res.status(404).json({ message: "No check‑in found today" });
    }

    const { CARDNO, checkInTime } = result.recordset[0];
    const iso = new Date(checkInTime).toISOString();
    console.log("▶️  Earliest check‑in:", { CARDNO, iso });

    res.json({
      cardNo:      CARDNO,
      checkInTime: iso,
    });
  } catch (error) {
    console.error("❌ Error in /api/earliest-checkin:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// ─── Start Server ─────────────────────────────────────────────────
app.listen(port, () => {
  console.log(`🚀 Server running on port ${port}`);
});
