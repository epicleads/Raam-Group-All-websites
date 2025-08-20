const axios = require("axios");
const FormData = require("form-data");
const fs = require("fs");
const path = require("path");

async function uploadVehicle() {
  try {
    const form = new FormData();

    // Add fields (strings)
    form.append("brand", "Toyota");
    form.append("model", "Corolla");
    form.append("variant", "Altis");
    form.append("year", "2018");
    form.append("price", "1200000");
    form.append("original_price", "1400000");
    form.append("savings", "200000");
    form.append("mileage", "45000 km");
    form.append("fuel_type", "Petrol");
    form.append("transmission", "Automatic");
    form.append("engine_capacity", "1800 cc");
    form.append("drivetrain", "FWD");
    form.append("seating", "5");
    form.append("horsepower", "140");
    form.append("torque", "170 Nm");
    form.append("location", "Mumbai");
    form.append("condition", "Used");
    form.append("ownership", "First");
    form.append("health_engine", "90");
    form.append("health_tyres", "80");
    form.append("health_paint", "75");
    form.append("health_interior", "85");
    form.append("health_electrical", "90");
    form.append("color_exterior", "White");
    form.append("color_interior", "Black");
    form.append("video_url", "https://youtu.be/abcd1234");
    form.append("published", "true");
    form.append("featured", "false");
    form.append("features", JSON.stringify(["Sunroof", "ABS", "Leather seats"]));

    // Add images (replace with actual paths on your disk)
    const imagesFolder = path.join(__dirname, "images"); // folder containing images
    const imageFiles = ["car1.jpg", "car2.jpg"]; // example images

    imageFiles.forEach((filename) => {
      const filePath = path.join(imagesFolder, filename);
      form.append("images", fs.createReadStream(filePath));
    });

    const response = await axios.post(
  "http://localhost:5000/admin/upload-vehicle",
  form,
  {
    headers: form.getHeaders(),
  }
);

    console.log("Upload response:", response.data);
  } catch (err) {
    console.error("Error uploading vehicle:", err.response?.data || err.message);
  }
}

uploadVehicle();
