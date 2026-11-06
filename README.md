# 🐯 TigerPDF

### A Modern Full-Stack PDF Utility Web Application

Convert, Merge and Compress PDFs & Images with a clean, fast and responsive interface.

Built using **React.js**, **Node.js**, **Express.js**, **JavaScript**, **HTML5**, and **CSS3**.

---

# 📌 About the Project

TigerPDF is a modern full-stack PDF utility web application that provides commonly used PDF and image tools through a clean and responsive interface.

The project focuses on simplicity, speed and ease of use. Users can process PDF and image files directly from the browser without creating an account or storing personal data.

This project demonstrates practical full-stack web development skills using React.js for the frontend and Node.js with Express.js for the backend.

---

# ✨ Features

### 🖼️ Image to PDF

- Convert multiple images into one PDF
- Supports JPG, JPEG, PNG and WEBP
- Maximum 50 images
- Fast conversion
- Instant download

---

### 📄 Merge PDF

- Merge multiple PDF files
- Maximum 15 PDF files
- Preserve page order
- Instant download

---

### 📉 Compress PDF

- Compress PDF files
- One PDF at a time
- Reduce file size
- Instant download

---

### 🖼️ Compress Image

- Compress JPG, PNG and WEBP images
- Maintain image quality
- One image at a time
- Instant download

---

# 🚀 Tech Stack

## Frontend

- React.js
- JavaScript (ES6)
- HTML5
- CSS3
- React Router
- Axios
- React Icons

---

## Backend

- Node.js
- Express.js
- Multer
- Sharp
- PDF-Lib
- dotenv
- CORS

---

# 🎨 User Interface

- Modern Dark Theme
- Glassmorphism Design
- Responsive Layout
- Gradient Buttons
- Interactive Cards
- Drag & Drop Upload
- Mobile Friendly
- Desktop Friendly

---

# 📷 Project Screenshots

## 🏠 Hero Section

![Hero](screenshots/home-hero.png)

---

## 🛠️ Tools Section

![Tools](screenshots/home-tools.png)

---

## ⚡ How It Works

![Workflow](screenshots/how-it-works.png)

---

## 🖼️ Image to PDF

![Image to PDF](screenshots/image-to-pdf.png)

---

## 📄 Merge PDF

![Merge PDF](screenshots/merge-pdf.png)

---

## 📉 Compress PDF

![Compress PDF](screenshots/compress-pdf.png)

---

## 🖼️ Compress Image

![Compress Image](screenshots/compress-image.png)

---

# 📁 Project Structure

```text
TigerPDF
│
├── frontend
│   ├── public
│   ├── src
│   ├── package.json
│   └── vite.config.js
│
├── backend
│   ├── controllers
│   ├── routes
│   ├── middleware
│   ├── uploads
│   ├── server.js
│   └── package.json
│
└── README.md
```

---

# ⚙️ Installation

## Runtime requirements

Use a patched supported Node.js release:

- Node.js `22.23.4` or later within the 22.x line
- Node.js `24.22.1` or later within the 24.x line
- Node.js `26.12.1` or later

The repository declares this requirement in both package manifests. The backend also supports the optional `MAX_CONCURRENT_JOBS` environment variable; it defaults to two simultaneous processing jobs.

## Clone

```bash
git clone https://github.com/ayushpandey28/TigerPDF.git
```

## Frontend

```bash
cd TigerPDF/frontend
npm ci
npm run dev
```

Runs on

```
http://localhost:5173
```

## Backend

```bash
cd TigerPDF/backend
npm ci
npm run dev
```

Runs on

```
http://localhost:5000
```

## Verification commands

```bash
cd TigerPDF/backend
npm test

cd ../frontend
npm run build
```

`npm test` exercises the production Express application assembly and document-processing regression cases. The frontend build is the production compilation check.

---

# 🌐 API Endpoints

| Method | Endpoint | Description |
|---------|----------|-------------|
| POST | /api/image-to-pdf | Convert Images to PDF |
| POST | /api/merge-pdf | Merge PDF Files |
| POST | /api/compress-pdf | Compress PDF |
| POST | /api/compress-image | Compress Image |

---

# 📂 Upload Limits

| Tool | Limit |
|------|-------|
| Image to PDF | 50 Images, 100 MB combined, 120 million combined pixels |
| Merge PDF | 15 PDF Files, 100 MB combined, 200 total pages |
| Compress PDF | 1 PDF |
| Compress Image | 1 Image |

Individual files are limited to 20 MB. Encrypted PDFs, PDF forms during merge, animated WebP compression, and animated WebP image-to-PDF conversion are rejected explicitly because the current processing libraries cannot preserve them safely.

## Deployment configuration

Set `VITE_API_BASE_URL` when the frontend should use an API other than the built-in production fallback. Its value should include the `/api` path, for example `https://api.example.com/api`.

The frontend is a single-page application. The static host must rewrite direct navigation requests such as `/merge-pdf` to `index.html` while leaving `/assets/*` and other static files untouched. The backend should run with a patched Node.js release and a private temporary directory; uploaded files are isolated per process and request and are removed after processing.

---

# 🎯 Highlights

- Full-Stack Application
- Clean Folder Structure
- Responsive Design
- REST API Integration
- Drag & Drop Upload
- Modular Components
- Beginner-Friendly Code
- Interview Friendly

---

# 🔮 Future Improvements

- Split PDF
- Rotate PDF
- Watermark PDF
- Password Protected PDF
- PDF to Image
- Image Resize
- Dark / Light Theme
- Cloud Storage Support

---

# 🌐 Live Demo

👉 [Try TigerPDF](https://tigerpdf.vercel.app)

---

# 👨‍💻 Author

**Ayush Pandey**

B.Tech Computer Science and Engineering

KIET Group of Institutions

GitHub:
https://github.com/ayushpandey28

---

# ⭐ Support

If you found this project useful, consider giving it a ⭐ on GitHub.

---

<div align="center">

## 🐯 TigerPDF

Built with ❤️ using React.js, Node.js and Express.js

</div>
