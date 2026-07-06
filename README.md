# Brian Tools - Media Converter

A powerful web application for converting media files, including YouTube video downloads and MP4 to MP3 conversions.

## Features

- **YouTube to MP4**: Download any YouTube video as an MP4 file
- **YouTube to MP3**: Extract audio from YouTube videos as MP3
- **MP4 to MP3**: Convert uploaded MP4 files to MP3 format

## Technology Stack

### Backend
- **FastAPI**: Modern Python web framework
- **yt-dlp**: YouTube video downloader
- **FFmpeg**: Media processing
- **pytest**: Test-driven development

### Frontend
- **Next.js 15**: React framework
- **TypeScript**: Type-safe JavaScript
- **Responsive Design**: Clean, minimal UI

### DevOps
- **Docker**: Containerized deployment
- **Docker Compose**: Multi-container orchestration

## Project Structure

```
media-converter/
├── backend/
│   ├── src/
│   │   ├── api/          # API routes
│   │   ├── services/     # Business logic
│   │   └── utils/        # Utilities
│   └── tests/            # Unit & integration tests
├── frontend/
│   ├── app/              # Next.js pages
│   └── components/       # React components
├── docker-compose.yml
└── README.md
```

## Getting Started

### Prerequisites

- Docker and Docker Compose
- Git

### Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/media-converter.git
cd media-converter
```

2. Build and start the containers:
```bash
docker-compose up --build
```

3. Access the application:
- Frontend: http://localhost:3000
- Backend API: http://localhost:8000
- API Documentation: http://localhost:8000/docs

## Development

### Running Tests

Run unit tests (without integration tests):
```bash
docker-compose exec backend pytest -m "not integration"
```

Run all tests including integration tests:
```bash
docker-compose exec backend pytest
```

### Project Architecture

The project follows a clean architecture pattern with:

1. **Service Layer**: Business logic for media conversion
2. **API Layer**: RESTful endpoints
3. **UI Layer**: User interface components

### API Endpoints

- `POST /api/v1/youtube/download` - Download YouTube video
- `POST /api/v1/convert/mp4-to-mp3` - Convert MP4 to MP3
- `GET /api/v1/download/{file_id}` - Download converted file
- `GET /api/v1/status` - API health check

## Testing Approach

The project uses Test-Driven Development (TDD):

- **Unit Tests**: Test individual services
- **Integration Tests**: Test complete workflows
- **Vertical Slice Tests**: Test end-to-end functionality

## Deployment

### Vercel (Frontend)

1. Connect your GitHub repository to Vercel
2. Set environment variables:
   - `NEXT_PUBLIC_API_URL`: Your backend API URL
3. Deploy

### Backend Hosting

The backend can be deployed to:
- AWS ECS
- Google Cloud Run
- DigitalOcean App Platform
- Any Docker-compatible hosting

## Contributing

1. Create a feature branch
2. Write tests first (TDD)
3. Implement the feature
4. Ensure all tests pass
5. Commit with conventional commit messages

## License

MIT License

## Author

Brian Hsu (brianhsu1212@gmail.com)
