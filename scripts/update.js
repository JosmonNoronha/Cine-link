#!/usr/bin/env node
const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

// Get command line arguments
const message = process.argv[2] || "Update available";
const description = process.argv[3] || "";
const changelog = process.argv[4] || "";
const branch = process.argv[5] || "preview";

// Update app.json with metadata
const appJsonPath = path.join(__dirname, "../app.json");
const appJson = JSON.parse(fs.readFileSync(appJsonPath, "utf8"));

if (!appJson.expo.extra) appJson.expo.extra = {};
appJson.expo.extra.updateMetadata = {
  message,
  description,
  changelog,
  timestamp: new Date().toISOString(),
  version: appJson.expo.version,
};

fs.writeFileSync(appJsonPath, JSON.stringify(appJson, null, 2));

console.log("Updated app.json with metadata");

// Run the EAS update
try {
  execSync(`npx eas update --branch ${branch} --message "${message}"`, {
    stdio: "inherit",
  });
  console.log("Update published successfully!");
} catch (error) {
  console.error("Failed to publish update:", error.message);
}
