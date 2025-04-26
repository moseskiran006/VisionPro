import express from 'express';
import axios from 'axios';
import cors from 'cors';

const app = express();
app.use(cors());
app.use(express.json());

// FastAPI Base URL
const FASTAPI_BASE_URL = "http://127.0.0.1:5000";

// Route to handle number plate detection
app.post("/detect-number-plate", async (req, res) => {
  try {
    // Forward the image file to FastAPI
    const response = await axios.post(`http://127.0.0.1:5000/detect-image/`, req.body, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    res.status(response.status).json(response.data);
  } catch (error) {
    console.error("Error connecting to FastAPI:", error.message);
    res.status(500).json({ error: "Failed to process request" });
  }
});

// Other endpoints can be proxied similarly...

const PORT = 5000; // Choose your port
app.listen(PORT, () => {
  console.log(`Node.js server running on http://localhost:5000`);
});
