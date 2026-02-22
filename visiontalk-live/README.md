# VisionTalk Live

A real-time communication platform powered by vision and voice technology.

## Project Structure

```
visiontalk-live/
├── backend/          # Node.js backend server
├── frontend/         # Frontend web application
├── deploy.sh         # Deployment script
├── README.md         # This file
└── architecture.png  # Architecture diagram
```

## Getting Started

### Backend Setup

```bash
cd backend
npm install
npm start
```

The server will run on `http://localhost:3000`

### Frontend

Open `frontend/index.html` in your browser.

## Docker Deployment

```bash
./deploy.sh
```

This will build and run the application in a Docker container.

## Technologies

- **Backend**: Node.js, Express
- **Frontend**: HTML, CSS, JavaScript
- **Deployment**: Docker

## License

MIT
