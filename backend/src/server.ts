import "dotenv/config";
import path from "path";
import { fileURLToPath } from "url";
import express from "express";
import cors from "cors";
import { feedbackRouter } from "./routes/feedback.js";
import { scanRouter } from "./routes/scan.js";
import { speciesRouter } from "./routes/species.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();

app.use(cors());
// Bilder sendes som base64 i JSON, så vi hever grensen.
app.use(express.json({ limit: "12mb" }));

app.get("/health", (_req, res) => res.json({ ok: true }));

// Artsbilder, jf. backend/src/lib/images.ts
app.use("/images", express.static(path.join(__dirname, "../public/images")));

app.use("/scan", scanRouter);
app.use("/feedback", feedbackRouter);
app.use("/", speciesRouter); // /species, /categories

const port = Number(process.env.PORT) || 8787;
app.listen(port, () => {
  console.log(`Pestulus backend kjører på http://localhost:${port}`);
});
