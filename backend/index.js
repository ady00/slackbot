const express = require("express");
const bodyParser = require("body-parser");

const app = express();
app.use(bodyParser.json());

app.post("/slack/events", (req, res) => {
  const { type, challenge, event } = req.body;

  if (type === "url_verification") {
    return res.send({ challenge });
  }

  // currently just log stuff out
  if (event) {
    console.log("SLACK EVENT RECEIVED:");
    console.log(event);
  }

  res.sendStatus(200);
});

// health check!!
app.get("/", (req, res) => {
  res.send("Slackbot backend is running!");
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Backend listening on port ${PORT}`));
