import express from "express";
import core from "cors";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(core());
app.use(express.json());

app.get("/", (req , res ) => {
    res.send("Hello from the backend");
});

app.listen(PORT, () => console.log(`Server is running on port ${PORT}`));