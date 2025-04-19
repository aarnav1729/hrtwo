// server.cjs
const express = require("express");
const cors = require("cors");
const mssql = require("mssql");

const app = express();
const port = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

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

const poolPromise = mssql.connect(dbConfig);

app.get("/api/work-progress", async (req, res) => {
  try {
    // Default to Aarnav Singh’s code
    const empCode = req.query.empCode || "30874";
    const pool     = await poolPromise;
    const result   = await pool
      .request()
      .input("empCode", mssql.VarChar, empCode)
      .query(`
        SELECT TOP 1
          CONVERT(varchar(19), ATT_DATE, 120) AS inTimeStr
        FROM IDSL_PEL.DBO.SRAW
        WHERE EMP_CODE   = @empCode
          AND LOWER(IN_OUT) = 'in'
        ORDER BY ATT_DATE DESC;
      `);

    if (!result.recordset.length) {
      return res.status(404).json({ message: "No punch‑in record found" });
    }

    // inTimeStr comes back like "2025-04-19 11:02:00"
    const inTimeStr = result.recordset[0].inTimeStr;
    console.log("▶️  Fetched inTimeStr:", inTimeStr);

    // Parse as LOCAL time, not UTC
    const inDate = new Date(inTimeStr);
    const now    = new Date();
    const diffMs = now.getTime() - inDate.getTime();

    const hoursWorked     = diffMs / (1000 * 60 * 60);
    const totalShiftMins  = 9 * 60;
    const minutesLeft     = Math.max(totalShiftMins - hoursWorked * 60, 0);

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

app.listen(port, () => {
  console.log(`🚀 Server running on port ${port}`);
});
