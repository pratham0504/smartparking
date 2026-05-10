# parkEz - Smart Parking Management System

## 📋 Overview

parkEz is an all-in-one smart parking management web application designed to streamline and innovate the way parking is reserved, managed, and secured — from both the user and admin perspectives.

🎥 [Watch the full demo](https://link-to-demo)

🔗 **Try it Live**: [front-end-front-office.vercel.app](https://front-end-front-office.vercel.app)

## 💡 About parkEz

parkEz is a modern full-stack solution that includes:

- ✔️ User Front-Office (React.js)
- ✔️ Admin Back-Office (React.js)
- ✔️ Node.js & MongoDB Backend
- ✔️ CI/CD with Jenkins, Docker, and DevOps tools

## ✨ Key Features

### 👤 User Side

- **Face Recognition Login**: Secure biometric authentication
- **Smart Parking Search**: Search by location, availability, and vehicle type
- **Live Availability Map**: Includes meteorological data per parking location
- **2D Customization**: Parking owners can design their spot layouts
- **Reservation System**: Book parking with QR-code-based access
- **Subscription Plans**: Free, Standard, and Premium
- **Favorite Parkings**: Save preferred locations

### 🚨 Reclamation System with Deep Learning

If someone parks in your reserved spot:

1. **Plate Detection Model** checks the license plate against the database
2. **If recognized**: Sends an email to the driver to move their vehicle
3. **If unrecognized**: Sends an alert to the on-duty parking employee

### 🧠 AI & ML Integrations

- **Gemini API**: For analytical insights
- **Smart Stats** in Admin Dashboard
- **ML Predictions**:
  - Price optimization
  - Hotspot detection for new parking areas
  - User preference analysis

### 📊 Admin Dashboard Highlights

- Live occupancy tracking
- Revenue and region-based analytics
- Employee and facility management
- Weather overlays
- Multi-step parking approval workflows
- Statistics

## ⚙️ DevOps & Monitoring Tools

- **CI/CD Pipelines** with Jenkins
- **SonarQube**: Code quality metrics
- **Grafana & Prometheus**: Real-time system monitoring
- **Jest**: Unit testing
- **Docker**: Seamless containerization

## 🧱 Tech Stack

| Category | Technologies |
|----------|-------------|
| **Frontend** | React.js, Tailwind CSS, Axios, Map APIs |
| **Backend** | Node.js, Express.js, MongoDB, Mongoose |
| **Authentication** | JWT + Face Recognition |
| **Media & File Handling** | Multer, Cloudinary, QRCode |
| **AI & ML** | Gemini API, Deep Learning for plate detection |
| **DevOps** | Docker, Jenkins, SonarQube, Grafana, Prometheus |

## 🚀 Getting Started

### Prerequisites

Before running the project, ensure you have the following installed:

- **Node.js** (v16 or higher): [Download here](https://nodejs.org/)
- **Docker & Docker Compose**: [Installation guide](https://docs.docker.com/get-docker/)
- **Git**: [Download here](https://git-scm.com/)

### 1. Clone the Repository

```bash
git clone https://github.com/PiDev-2025/parkEz.git
cd parkEz
```

### 2. Environment Setup

#### For Docker Deployment (Recommended)

The easiest way to run the project is using Docker Compose, which handles all dependencies automatically.

1. Copy the environment file:
   ```bash
   cp Backend/.env.sample Backend/.env
   ```

2. Edit `Backend/.env` and fill in your actual values (MongoDB URI, API keys, etc.). The sample file contains placeholder values.

3. Start all services:
   ```bash
   docker-compose up --build
   ```

4. Access the applications:
   - **User Front-Office**: http://localhost:3000
   - **Admin Back-Office**: http://localhost:5173
   - **Backend API**: http://localhost:3001

#### For Local Development

If you prefer to run components individually for development:

1. **Backend Setup**:
   ```bash
   cd Backend
   cp .env.sample .env
   # Edit .env with your values
   npm install
   npm start
    env $(cat .env | grep -v '^#' | xargs) npm start
   ```
   Backend will run on http://localhost:3001

2. **User Front-Office Setup**:
   ```bash
   cd Front-end-Front-Office
   npm install
   npm start
   ```
   Frontend will run on http://localhost:3000

3. **Admin Back-Office Setup**:
   ```bash
   cd Front-end-Back-Office
   npm install
   npm run dev
   ```
   Admin panel will run on http://localhost:5173

### 3. Database Configuration

The application uses MongoDB Atlas. Make sure your `MONGO_ATLAS_URI` in `Backend/.env` points to a valid MongoDB database.

### 4. Additional Services

- **AI Model**: The plate detection model is included in the Backend container
- **Email Service**: Configure SMTP settings in the backend for email notifications
- **Cloudinary**: Set up your Cloudinary account for image uploads

## 🧪 Testing

Run tests for the backend:

```bash
cd Backend
npm test
```

## 📁 Project Structure

```
parkEz/
├── Backend/                    # Node.js Express API
│   ├── src/
│   │   ├── controllers/        # Route controllers
│   │   ├── models/            # Mongoose models
│   │   ├── routes/            # API routes
│   │   ├── services/          # Business logic
│   │   ├── utils/             # Utility functions
│   │   └── config/            # Configuration files
│   ├── uploads/               # File uploads
│   └── Dockerfile
├── Front-end-Front-Office/     # User-facing React app
│   ├── src/
│   ├── public/
│   └── Dockerfile
├── Front-end-Back-Office/      # Admin React app
│   ├── src/
│   └── Dockerfile
├── Car-Number-Plates-Detection-IA-Model/  # AI model
├── docker-compose.yml          # Docker orchestration
└── Jenkinsfile                 # CI/CD pipeline
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 📞 Support

For support, email support@parkEz.com or join our Discord community.

---

**Made with ❤️ by the parkEz Team**

backend
 env $(cat .env | grep -v '^#' | xargs) npm start