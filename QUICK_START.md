# Quick Start Guide

## Step 1: Install Backend Dependencies
```bash
cd backend
npm install
```

## Step 2: Install Frontend Dependencies
```bash
cd ..
npm install
```

## Step 3: Start MongoDB
Make sure MongoDB is running on `localhost:27017`

## Step 4: Start Backend Server
```bash
cd backend
npm start
```
Backend will run on: http://localhost:5000

## Step 5: Start Frontend (in a new terminal)
```bash
npm run dev
```
Frontend will run on: http://localhost:5173

## Step 6: Use the Application
1. Open http://localhost:5173 in your browser
2. Click "Seed Show + 30 Seats" to create a show
3. Select a seat, enter your name, and hold/book it!

## Database Connection
The app connects to MongoDB database: **BookMyShow**

You can view it in MongoDB Compass:
- Connection String: `mongodb://localhost:27017`
- Database Name: `BookMyShow`



