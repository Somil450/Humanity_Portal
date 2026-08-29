# One Humanity Portal

Welcome to the **One Humanity Portal**, a React Native application built with [Expo](https://expo.dev) and powered by [Firebase](https://firebase.google.com). 

This portal serves as an internal tool to manage tasks, track attendance, and provide automated reporting for the team.

## Features

- **Task Management**: Create, assign, and track urgent tasks.
- **Attendance Tracking**: Clock in, clock out, and track active working hours.
- **Automated Cron Jobs**:
  - **Daily Job**: Automatically checks for overdue tasks and sends email reminders. It also marks users as absent if they missed clocking in the previous day.
  - **Monthly Report**: Generates and emails a comprehensive summary of attendance, hours worked, and tasks completed at the end of every month.
- **Secure Configuration**: Environment variables are used to securely manage API keys and admin contact information.

## Tech Stack

- **Frontend**: React Native, Expo (SDK 57), React Navigation, React Native Paper
- **State Management**: Zustand
- **Backend / BaaS**: Firebase (Authentication, Firestore, Storage, Functions)
- **Scripting / Automation**: Node.js, Nodemailer, Firebase Admin SDK

## Getting Started

### Prerequisites

- Node.js (v18+)
- npm or yarn
- An Expo account (optional, for EAS builds)
- A Firebase project

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/Somil450/Humanity_Portal.git
   cd Humanity_Portal
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Set up Environment Variables:**
   Create a `.env` file in the root directory and add your Firebase configuration and admin email:
   ```env
   EXPO_PUBLIC_FIREBASE_API_KEY="your_api_key"
   EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN="your_auth_domain"
   EXPO_PUBLIC_FIREBASE_PROJECT_ID="your_project_id"
   EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET="your_storage_bucket"
   EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID="your_messaging_sender_id"
   EXPO_PUBLIC_FIREBASE_APP_ID="your_app_id"
   EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID="your_measurement_id"

   ADMIN_EMAIL="admin@example.com"
   ```

### Running the App

Start the Expo development server:
```bash
npm start
```
You can then open the app on your physical device using the Expo Go app, or run it on an iOS Simulator/Android Emulator.

## Running Cron Jobs

The cron jobs are standalone Node.js scripts that interact with Firebase Admin. They are located in the `cron/` directory.

### Requirements for Cron Jobs
To run the cron jobs, you must have the following environment variables set in the environment executing the script (e.g., your server or GitHub Actions):
- `FIREBASE_SERVICE_ACCOUNT`: The JSON string of your Firebase Admin SDK service account key.
- `EMAIL_USER`: The Gmail address used to send emails.
- `EMAIL_PASS`: The App Password for the Gmail address.
- `ADMIN_EMAIL`: The email address that will receive failure alerts if the cron job crashes.

### Executing Jobs
```bash
# Run daily job
node cron/daily-job.js

# Run monthly report job
node cron/monthly-report.js
```

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

Distributed under the MIT License. See `LICENSE` for more information.
