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

    const result = await pool.request().input("empCode", mssql.VarChar, empCode)
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
    const now = new Date();
    const diffMs = now.getTime() - inDate.getTime();

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

// ─── Earliest Check‑In Endpoint ────────────────────────────────────
// Returns who checked‑in first today in AREA_ID = '30048'
app.get("/api/earliest-checkin", async (req, res) => {
  try {
    const pool = await poolPromise;

    // 1) Grab first cardno + local timestamp
    const punch = await pool.request().query(`
      SELECT TOP 1
        CARDNO,
        CONVERT(varchar(19), ATT_DATE, 120) AS checkInTime
      FROM IDSL_PEL.DBO.SRAW
      WHERE AREA_ID = '30048'
        AND LOWER(IN_OUT) = 'in'
        AND CONVERT(date, ATT_DATE) = CONVERT(date, GETDATE())
      ORDER BY ATT_DATE ASC;
    `);

    if (!punch.recordset.length) {
      return res.status(404).json({ message: "No check‑in found today" });
    }

    const { CARDNO, checkInTime } = punch.recordset[0];
    console.log("▶️  Raw earliest punch:", { CARDNO, checkInTime });

    // 2) Lookup that CARDNO in EMPLOYEE to get FIRSTNAME
    const emp = await pool.request().input("cardno", mssql.VarChar, CARDNO)
      .query(`
        SELECT TOP 1 FIRSTNAME
        FROM IDSL_PEL.DBO.EMPLOYEE
        WHERE EMP_CARDNO = @cardno;
      `);

    const firstname = emp.recordset.length
      ? emp.recordset[0].FIRSTNAME
      : `#${CARDNO}`;

    // Return the name and the un‑zoned datetime string
    res.json({
      name: firstname,
      checkInTime, // still "YYYY-MM-DD HH:mm:ss"
    });
  } catch (error) {
    console.error("❌ Error in /api/earliest-checkin:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// ─── Latest Check‑Out Endpoint ────────────────────────────────────
// Returns who last checked‑out yesterday in AREA_ID = '30048'
app.get("/api/latest-checkout", async (req, res) => {
  try {
    const pool = await poolPromise;
    // 1) find yesterday’s last “out” punch + time
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
      return res.status(404).json({ message: "No check‑out found yesterday" });
    }
    const { CARDNO, checkOutTime } = punch.recordset[0];
    // 2) lookup that CARDNO in EMPLOYEE
    const emp = await pool.request().input("cardno", mssql.VarChar, CARDNO)
      .query(`
        SELECT TOP 1 FIRSTNAME
        FROM IDSL_PEL.DBO.EMPLOYEE
        WHERE EMP_CARDNO = @cardno;
      `);
    const firstname = emp.recordset.length
      ? emp.recordset[0].FIRSTNAME
      : `#${CARDNO}`;
    // respond with the name + local timestamp
    res.json({
      name: firstname,
      checkOutTime,
    });
  } catch (error) {
    console.error("❌ Error in /api/latest-checkout:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// ─── Recent Activity Endpoint ─────────────────────────────────────
// Returns the 3 most recent punches (in/out) with employee name + local timestamp
app.get("/api/recent-activity", async (req, res) => {
  try {
    const pool = await poolPromise;
    const result = await pool.request().query(`
      SELECT TOP 3
        s.IN_OUT       AS action,
        emp.FIRSTNAME  AS name,
        CONVERT(varchar(19), s.ATT_DATE, 120) AS time
      FROM IDSL_PEL.DBO.SRAW AS s
      JOIN IDSL_PEL.DBO.EMPLOYEE AS emp
        ON s.CARDNO = emp.EMP_CARDNO
      ORDER BY s.ATT_DATE DESC;
    `);

    // shape it exactly for the frontend
    const records = result.recordset.map(r => ({
      action: r.action.toLowerCase(),  // "in" or "out"
      name:   r.name,
      time:   r.time                     // "YYYY-MM-DD HH:mm:ss"
    }));

    console.log("▶️  Recent activity:", records);
    res.json(records);
  } catch (error) {
    console.error("❌ Error in /api/recent-activity:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

app.get("/api/consistency-streak", async (req, res) => {
  try {
    const empCode = req.query.empCode || "30874";
    const pool    = await poolPromise;

    // grab all distinct punch‑in dates up to today
    const result = await pool
      .request()
      .input("empCode", mssql.VarChar, empCode)
      .query(`
        SELECT DISTINCT
          CAST(ATT_DATE AS date) AS d
        FROM IDSL_PEL.DBO.SRAW
        WHERE EMP_CODE      = @empCode
          AND LOWER(IN_OUT) = 'in'
          AND CAST(ATT_DATE AS date) <= CAST(GETDATE() AS date)
        ORDER BY d DESC;
      `);

    const dates = result.recordset.map(r => {
      const dt = new Date(r.d);
      dt.setHours(0,0,0,0);
      return dt.getTime();
    });

    const today = new Date();
    today.setHours(0,0,0,0);
    let count = 0;
    for (let i = 0; i < dates.length; i++) {
      if (dates[i] === today.getTime() - (1000*60*60*24)*i) {
        count++;
      } else {
        break;
      }
    }

    const isActive = dates.length > 0 && dates[0] === today.getTime();

    console.log("▶️  Consistency streak:", { count, isActive });
    res.json({ count, isActive });
  } catch (error) {
    console.error("❌ Error in /api/consistency-streak:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

app.listen(port, () => {
  console.log(`🚀 Server running on port ${port}`);
});
