const axios = require("axios");
const FormData = require("form-data");
const fs = require("fs");
const path = require("path");

// Backend upload URL
const BACKEND_URL = "http://localhost:5000/admin/upload-vehicle";

// Images folder with image files named 1.png, 2.png, ..., 5.png
const imagesFolder = path.join(__dirname, "images");

// Read and parse vehicle.json
const vehicleDataPath = path.join(__dirname, "vehicle.json");
const vehicles = JSON.parse(fs.readFileSync(vehicleDataPath, "utf-8"));

// Function to upload a single vehicle entry
async function uploadVehicle(vehicle) {
  try {
    const form = new FormData();

    // Append all vehicle fields to form-data
    for (const [key, value] of Object.entries(vehicle)) {
      if (key === "image") {
        // Append image file stream from images folder
        const imagePath = path.join(imagesFolder, value);
        form.append("images", fs.createReadStream(imagePath));
      } else if (key === "features") {
        // Features as JSON string
        form.append("features", JSON.stringify(value));
      } else {
        // Append other scalar fields as strings
        form.append(key, value.toString());
      }
    }

    // Send POST request with form data headers
    const response = await axios.post(BACKEND_URL, form, {
      headers: form.getHeaders(),
    });

    console.log(`Uploaded vehicle: ${vehicle.brand} ${vehicle.model} (${vehicle.year})`);
    console.log("Response:", response.data);
  } catch (err) {
    console.error(
      `Failed to upload vehicle: ${vehicle.brand} ${vehicle.model}`,
      err.response?.data || err.message
    );
  }
}

// Function to upload all vehicles sequentially
async function uploadAllVehicles() {
  for (const vehicle of vehicles) {
    await uploadVehicle(vehicle);
  }
}

// Run the upload for all vehicles in vehicle.json
uploadAllVehicles();
