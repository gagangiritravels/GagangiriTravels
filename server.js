import express from "express";
import cors from "cors";
import fs from "fs";
import path from "path";
import multer from "multer";
import { fileURLToPath } from "url";

const app = express();
const PORT = 5000;

// ------------------ DIR SETUP ------------------
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(express.static("public"));
app.use("/uploads", express.static(path.join(__dirname, "uploads")));
app.use(cors());
app.use(express.json());

// ------------------ DATA FILES ------------------
const dataDir = path.join(__dirname, "data");
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir);

const files = {
  admins: path.join(dataDir, "admins.json"),
  packages: path.join(dataDir, "packages.json"),
  bookings: path.join(dataDir, "bookings.json"),
  inquiries: path.join(dataDir, "inquiries.json"),
  flights: path.join(dataDir, "flights.json"),
  visa: path.join(dataDir, "visa.json"),
  cruises: path.join(dataDir, "cruises.json"),
  hotels: path.join(dataDir, "hotels.json"),
  passports: path.join(dataDir, "passports.json"),
  reviews: path.join(dataDir, "reviews.json"),
  gallery: path.join(dataDir, "gallery.json")
};

// Create empty JSON files if missing
for (const file of Object.values(files)) {
  if (!fs.existsSync(file)) fs.writeFileSync(file, "[]", "utf8");
}

// ------------------ MULTER STORAGE ------------------
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, "uploads");
    if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir);
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    cb(null, `file_${Date.now()}${path.extname(file.originalname)}`);
  },
});
const upload = multer({ storage });

// ------------------ UTILITIES ------------------
const readJSON = (file) => {
  try { return JSON.parse(fs.readFileSync(file, "utf8")); } 
  catch { return []; }
};

const writeJSON = (file, data) =>
  fs.writeFileSync(file, JSON.stringify(data, null, 2), "utf8");

const cleanText = (t) => t?.replace(/\r?\n/g, "\n") || "";

const getNextId = (file) => {
  const data = readJSON(file);
  return data.length === 0 ? 1 : Math.max(...data.map((d) => d.id || 0)) + 1;
};

// ------------------ ADMIN ROUTES ------------------
app.post("/register", (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password) return res.json({ success: false, message: "Please fill all fields" });
  const admins = readJSON(files.admins);
  if (admins.find((a) => a.email === email)) return res.json({ success: false, message: "Email already registered" });
  admins.push({ id: getNextId(files.admins), name, email, password });
  writeJSON(files.admins, admins);
  res.json({ success: true, message: "Registration successful" });
});

app.post("/login", (req, res) => {
  const { email, password } = req.body;
  const admins = readJSON(files.admins);
  const admin = admins.find((a) => a.email === email && a.password === password);
  if (admin) res.json({ success: true, message: "Login successful" });
  else res.json({ success: false, message: "Invalid email or password" });
});

app.post("/forgot", (req, res) => {
  const { email } = req.body;
  const admins = readJSON(files.admins);
  const admin = admins.find((a) => a.email === email);
  if (admin) res.json({ success: true, message: `Password reset link sent to ${email} (demo)` });
  else res.json({ success: false, message: "Email not found" });
});

// ------------------ PACKAGES ------------------
app.get("/packages", (req, res) => res.json(readJSON(files.packages)));

app.post("/packages", upload.single("pdf"), (req, res) => {
  const packages = readJSON(files.packages);
  const newPkg = {
    id: getNextId(files.packages),
    category: req.body.category,
    name: req.body.name,
    duration: req.body.duration,
    price: req.body.price,
    image: req.body.image,
    overview: cleanText(req.body.overview),
    itinerary: cleanText(req.body.itinerary),
    inclusions: cleanText(req.body.inclusions),
    exclusions: cleanText(req.body.exclusions),
    terms: cleanText(req.body.terms),
    pdf: req.file ? `/uploads/${req.file.filename}` : "",
  };
  packages.push(newPkg);
  writeJSON(files.packages, packages);
  res.json({ message: "✅ Package added", data: newPkg });
});

app.put("/packages/:id", upload.single("pdf"), (req, res) => {
  const packages = readJSON(files.packages);
  const id = parseInt(req.params.id);
  const index = packages.findIndex(p => p.id === id);
  if (index === -1) return res.status(404).json({ error: "❌ Package not found" });
  packages[index] = { ...packages[index], ...req.body, pdf: req.file ? `/uploads/${req.file.filename}` : packages[index].pdf };
  writeJSON(files.packages, packages);
  res.json({ message: "✅ Package updated", data: packages[index] });
});

app.delete("/packages/:id", (req, res) => {
  const packages = readJSON(files.packages);
  const id = parseInt(req.params.id);
  const updated = packages.filter(p => p.id !== id);
  writeJSON(files.packages, updated);
  res.json({ message: "✅ Package deleted", id });
});

// ------------------ BOOKINGS ------------------
app.get("/bookings", (req, res) => res.json(readJSON(files.bookings)));
app.post("/bookings", (req, res) => {
  const bookings = readJSON(files.bookings);
  const packages = readJSON(files.packages);
  const pkg = packages.find(p => p.id === parseInt(req.body.packageId));
  const newBooking = {
    id: getNextId(files.bookings),
    status: "Pending",
    packageId: req.body.packageId,
    packageName: pkg ? pkg.name : "Unknown Package",
    name: req.body.name,
    email: req.body.email,
    phone: req.body.phone,
    travelers: {
      adults: parseInt(req.body.adults || 0),
      children: parseInt(req.body.children || 0),
      infants: parseInt(req.body.infants || 0)
    },
    fromDate: req.body.fromDate,
    toDate: req.body.toDate,
    requirements: req.body.requirements || "N/A",
  };
  bookings.push(newBooking);
  writeJSON(files.bookings, bookings);
  res.json({ message: "✅ Thank you for inquiring with Gagangiri Travels", data: newBooking });
});

app.delete("/bookings/:id", (req, res) => {
  const bookings = readJSON(files.bookings);
  const id = parseInt(req.params.id);
  const updated = bookings.filter(b => b.id !== id);
  writeJSON(files.bookings, updated);
  res.json({ message: "✅ Booking deleted", id });
});

// ------------------ FLIGHTS ------------------
app.get("/flights", (req, res) => res.json(readJSON(files.flights)));
app.post("/flights", (req, res) => {
  const flights = readJSON(files.flights);
  const newFlight = { id: getNextId(files.flights), ...req.body };
  flights.push(newFlight);
  writeJSON(files.flights, flights);
  res.json({ message: "✅ Flight inquiry saved", data: newFlight });
});
app.delete("/flights/:id", (req, res) => {
  const flights = readJSON(files.flights);
  const id = parseInt(req.params.id);
  writeJSON(files.flights, flights.filter(f => f.id !== id));
  res.json({ message: "✅ Flight inquiry deleted", id });
});

// ------------------ VISA ------------------
app.get("/visa", (req, res) => res.json(readJSON(files.visa)));
app.post("/visa", (req, res) => {
  const visa = readJSON(files.visa);
  const newVisa = { id: getNextId(files.visa), ...req.body, travellers: parseInt(req.body.travellers || 1), description: cleanText(req.body.description || "N/A"), submittedAt: new Date().toISOString() };
  visa.push(newVisa);
  writeJSON(files.visa, visa);
  res.json({ message: "✅ Thank you for visa inquiring with Gagangiri Travels", data: newVisa });
});
app.delete("/visa/:id", (req, res) => {
  const visa = readJSON(files.visa);
  const id = parseInt(req.params.id);
  writeJSON(files.visa, visa.filter(v => v.id !== id));
  res.json({ message: "✅ Visa request deleted", id });
});

// ------------------ CRUISES ------------------
app.get("/cruises", (req, res) => {
  const cruises = readJSON(files.cruises).map(c => ({
    ...c,
    passengers: parseInt(c.passengers ?? c.passenger ?? 1)
  }));
  res.json(cruises);
});

app.post("/cruises", (req, res) => {
  const cruises = readJSON(files.cruises);

  const newCruise = {
    id: getNextId(files.cruises),
    fullName: req.body.fullName?.trim() || "",
    email: req.body.email?.trim() || "",
    phone: req.body.phone?.trim() || "",
    passengers: parseInt(req.body.passengers || 1),
    travelDate: req.body.travelDate || "",
    travelTo: req.body.travelTo || "",
    submittedAt: new Date().toISOString()
  };

  cruises.push(newCruise);
  writeJSON(files.cruises, cruises);

  res.json({ message: "✅ Thank you for inquiring with Gagangiri Travels", data: newCruise });
});

app.put("/cruises/:id", (req, res) => {
  const cruises = readJSON(files.cruises);
  const id = parseInt(req.params.id);
  const index = cruises.findIndex(c => c.id === id);
  if (index === -1) return res.status(404).json({ error: "❌ Cruise not found" });

  cruises[index] = {
    ...cruises[index],
    fullName: req.body.fullName?.trim() || cruises[index].fullName,
    email: req.body.email?.trim() || cruises[index].email,
    phone: req.body.phone?.trim() || cruises[index].phone,
    passengers: parseInt(req.body.passengers || cruises[index].passengers),
    travelDate: req.body.travelDate || cruises[index].travelDate,
    travelTo: req.body.travelTo || cruises[index].travelTo,
    updatedAt: new Date().toISOString()
  };

  writeJSON(files.cruises, cruises);
  res.json({ message: "✅ Cruise updated", data: cruises[index] });
});

app.delete("/cruises/:id", (req, res) => {
  const cruises = readJSON(files.cruises);
  const id = parseInt(req.params.id);
  writeJSON(files.cruises, cruises.filter(c => c.id !== id));
  res.json({ message: "✅ Cruise booking deleted", id });
});

// ------------------ HOTELS ------------------
app.get("/hotels", (req, res) => res.json(readJSON(files.hotels)));
app.post("/hotels", (req, res) => {
  const hotels = readJSON(files.hotels);
  const { name, mobile, email, category, country, state, city, checkInDate, checkOutDate, guests, rooms } = req.body;
  if (!name || !mobile || !email || !checkInDate || !checkOutDate || !city) return res.status(400).json({ error: "❌ Missing required fields" });
  if (category?.toLowerCase() === "international" && !country) return res.status(400).json({ error: "❌ Please enter country" });
  if (category?.toLowerCase() === "domestic" && !state) return res.status(400).json({ error: "❌ Please enter state" });

  const newBooking = { id: getNextId(files.hotels), name, mobile, email, type: category, country, state, city, checkInDate, checkOutDate, guests: parseInt(guests), rooms: parseInt(rooms), status: "Pending", submittedAt: new Date().toISOString() };
  hotels.push(newBooking);
  writeJSON(files.hotels, hotels);
  res.status(201).json({ message: "✅ Hotel booking saved", data: newBooking });
});
app.delete("/hotels/:id", (req, res) => {
  const hotels = readJSON(files.hotels);
  const id = parseInt(req.params.id);
  const updated = hotels.filter(h => h.id !== id);
  writeJSON(files.hotels, updated);
  res.json({ message: "✅ Hotel booking deleted", id });
});

// ------------------ PASSPORTS ------------------
app.get("/passports", (req, res) => res.json(readJSON(files.passports)));
app.post("/passports", (req, res) => {
  const passports = readJSON(files.passports);
  const newPassport = { id: getNextId(files.passports), ...req.body, status: "Submitted", submittedAt: new Date().toISOString() };
  passports.push(newPassport);
  writeJSON(files.passports, passports);
  res.status(201).json({ message: "✅ Passport application saved", data: newPassport });
});
app.delete("/passports/:id", (req, res) => {
  const passports = readJSON(files.passports);
  const id = parseInt(req.params.id);
  writeJSON(files.passports, passports.filter(p => p.id !== id));
  res.json({ message: "✅ Passport application deleted", id });
});

// ------------------ REVIEWS ------------------
app.get("/reviews", (req, res) => res.json(readJSON(files.reviews)));
app.post("/reviews", upload.array("pictures"), (req, res) => {
  const { name, rating, review } = req.body;
  if (!name || !rating || !review) return res.status(400).json({ success: false, error: "Missing required fields" });
  const images = (req.files || []).map(f => `/uploads/${f.filename}`);
  const newReview = { id: getNextId(files.reviews), name, rating: parseInt(rating), comments: review, images, date: new Date().toISOString() };
  const reviews = readJSON(files.reviews);
  reviews.push(newReview);
  writeJSON(files.reviews, reviews);
  res.status(201).json({ success: true, review: newReview });
});

// ------------------ GALLERY ------------------
app.get("/gallery", (req, res) => res.json(readJSON(files.gallery)));

app.post("/gallery", upload.array("galleryPictures", 10), (req, res) => {
  if (!req.files || req.files.length === 0) return res.status(400).json({ success: false, error: "No images uploaded" });
  const gallery = readJSON(files.gallery);
  const startId = getNextId(files.gallery);
  let counter = 0;
  const newImages = req.files.map(file => ({ id: startId + counter++, path: `/uploads/${file.filename}`, uploadedAt: new Date().toISOString() }));
  gallery.push(...newImages);
  writeJSON(files.gallery, gallery);
  res.status(201).json({ success: true, images: newImages });
});

app.put("/gallery/:id", (req, res) => {
  const id = parseInt(req.params.id);
  const gallery = readJSON(files.gallery);
  const index = gallery.findIndex(img => img.id === id);
  if (index === -1) return res.status(404).json({ success: false, error: "Image not found" });
  gallery[index].path = req.body.path || gallery[index].path;
  gallery[index].uploadedAt = new Date().toISOString();
  writeJSON(files.gallery, gallery);
  res.json({ success: true, message: "Image updated", data: gallery[index] });
});

app.delete("/gallery/:id", (req, res) => {
  const id = parseInt(req.params.id);
  let gallery = readJSON(files.gallery);
  const index = gallery.findIndex(img => img.id === id);
  if (index === -1) return res.status(404).json({ success: false, error: "Image not found" });
  const removed = gallery.splice(index, 1)[0];
  const filePath = path.join(__dirname, "uploads", path.basename(removed.path));
  if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  writeJSON(files.gallery, gallery);
  res.json({ success: true, message: "Image deleted", deleted: removed });
});


// ------------------ CRUISES DATA ------------------
const cruiseDataFile = path.join(dataDir, "cruisesData.json");

// Create file if missing
if (!fs.existsSync(cruiseDataFile)) fs.writeFileSync(cruiseDataFile, "[]", "utf8");

// 🟢 GET all cruises
app.get("/cruisesData", (req, res) => {
  const cruises = readJSON(cruiseDataFile);
  res.json(cruises);
});

// 🟡 GET single cruise by ID
app.get("/cruisesData/:id", (req, res) => {
  const cruises = readJSON(cruiseDataFile);
  const cruise = cruises.find(c => c.id === parseInt(req.params.id));
  if (!cruise) return res.status(404).json({ message: "❌ Cruise not found" });
  res.json(cruise);
});

// 🟠 POST - Add new cruise
app.post("/cruisesData", (req, res) => {
  const cruises = readJSON(cruiseDataFile);

  const newCruise = {
    id: getNextId(cruiseDataFile),
    title: req.body.title,
    cruiseLine: req.body.cruiseLine,
    ship: req.body.ship,
    departsFrom: req.body.departsFrom,
    departureDate: req.body.departureDate || "",
    duration: parseInt(req.body.duration) || 0,
    destination: req.body.destination,
    price: req.body.price,
    image: req.body.image,
    itinerary: Array.isArray(req.body.itinerary)
      ? req.body.itinerary.map(day => ({
          day: parseInt(day.day),
          port: day.port,
          details: day.details,
          times: day.times,
        }))
      : [],
    shipDetails: {
      gallery: req.body.shipDetails?.gallery || [],
      amenities: req.body.shipDetails?.amenities || [],
    },
    whatsIncluded: req.body.whatsIncluded || [],
    knowBeforeYouGo: req.body.knowBeforeYouGo || [],
    submittedAt: new Date().toISOString(),
  };

  cruises.push(newCruise);
  writeJSON(cruiseDataFile, cruises);
  res.json({ message: "✅ Cruise added successfully", data: newCruise });
});

// 🔵 PUT - Update cruise
app.put("/cruisesData/:id", (req, res) => {
  const cruises = readJSON(cruiseDataFile);
  const id = parseInt(req.params.id);
  const index = cruises.findIndex(c => c.id === id);
  if (index === -1) return res.status(404).json({ message: "❌ Cruise not found" });

  cruises[index] = {
    ...cruises[index],
    ...req.body,
    itinerary: Array.isArray(req.body.itinerary)
      ? req.body.itinerary.map(day => ({
          day: parseInt(day.day),
          port: day.port,
          details: day.details,
          times: day.times,
        }))
      : cruises[index].itinerary,
    shipDetails: {
      gallery: req.body.shipDetails?.gallery || cruises[index].shipDetails?.gallery || [],
      amenities: req.body.shipDetails?.amenities || cruises[index].shipDetails?.amenities || [],
    },
    whatsIncluded: req.body.whatsIncluded || cruises[index].whatsIncluded,
    knowBeforeYouGo: req.body.knowBeforeYouGo || cruises[index].knowBeforeYouGo,
    updatedAt: new Date().toISOString(),
  };

  writeJSON(cruiseDataFile, cruises);
  res.json({ message: "✏️ Cruise updated successfully", data: cruises[index] });
});

// 🔴 DELETE - Remove cruise
app.delete("/cruisesData/:id", (req, res) => {
  const cruises = readJSON(cruiseDataFile);
  const id = parseInt(req.params.id);
  const index = cruises.findIndex(c => c.id === id);
  if (index === -1) return res.status(404).json({ message: "❌ Cruise not found" });

  const deletedCruise = cruises.splice(index, 1)[0];
  writeJSON(cruiseDataFile, cruises);
  res.json({ message: "🗑️ Cruise deleted successfully", data: deletedCruise });
});



// ------------------ START SERVER ------------------
app.listen(PORT, () => console.log(`✅ Server running at http://localhost:${PORT}`));
