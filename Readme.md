# YouTube Backend with Twitter-Inspired Features

## Project Overview

**Project Name:** Backend Development for YouTube and Twitter  
**Description:**  
This project involves the development of a robust backend for a YouTube-like platform, combined with Twitter-inspired features for enhanced user interaction. Key functionalities include:

- User registration, authentication, and management.
- Video management: upload, view, like, comment, and subscribe functionalities.
- Social interactions: commenting, liking, and channel subscriptions.
- Tweet management: create, update, delete, and like tweets.
- Media upload and storage integration using **Cloudinary**.
- MongoDB serves as the database to manage all application data and relationships.

The project structure and functionality ensure scalability, modularity, and maintainability for future enhancements.

---

## Features

### User Management:
- Registration, login, and logout with JWT-based authentication.
- Password reset functionality.
- Profile management including avatar, cover image, and user details.
- Watch history tracking for videos.

### Video Management:
- Upload and publish videos with metadata (title, description, etc.).
- Search, sort, and paginate video content.
- Edit and delete videos.
- Control video visibility (publish/unpublish).

### Tweet Management:
- Create and publish tweets.
- View user tweets.
- Update and delete tweets.

### Subscription Management:
- Subscribe to user channels.
- View subscriber and subscribed channel lists.

### Playlist Management:
- Create, update, and delete playlists.
- Add and remove videos from playlists.
- View user playlists.

### Like Management:
- Like and unlike videos, comments, and tweets.
- View all liked videos.

### Comment Management:
- Add, update, and delete comments on videos.

### Dashboard:
- View channel statistics such as views, subscribers, videos, and likes.
- Access uploaded videos.

### Health Check:
- Endpoint to verify the backend's health status.

---

## Database Model

The project uses MongoDB as the database, designed to handle relationships between entities such as users, videos, comments, likes, subscriptions, and tweets.

- [Database Model Diagram](https://app.eraser.io/workspace/QLbxWSor94SvNuLcyUvz?origin=share)

---

## API Documentation

Detailed API documentation has been created using Postman. It outlines all endpoints, request formats, and responses.

- [API Documentation](https://documenter.getpostman.com/view/35001767/2sAYHzFhxT)

---

## Installation and Setup

### Prerequisites
Ensure the following are installed on your system:
- Node.js (v14+)
- MongoDB
- npm 

### Steps to Run the Project

1. **Clone the Repository:**
   ```bash
   git clone https://github.com/Shravan9393/Youtube-Backend-Including-Twitter.git

---

2  **Navigate to the Project Directory:**
   
    cd <project_directory>
---

3   **Set Up Environment Variables: Create a .env file in the root directory and add the following variables:**

    -MONGO_URI=<your_mongodb_connection_string>
    -JWT_SECRET=<your_jwt_secret>
    -CLOUDINARY_NAME=<your_cloudinary_cloud_name>
    -CLOUDINARY_API_KEY=<your_cloudinary_api_key>
    -CLOUDINARY_API_SECRET=<your_cloudinary_api_secret>

---

4 **Run the Application**

    npm run dev

---


