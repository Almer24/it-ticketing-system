# Ticketing System

A comprehensive IT support ticketing system built with React, Node.js, Express, and MySQL. This system allows departments to submit IT support tickets and enables IT teams to manage and track issues efficiently.

## Features

### 🎫 Core Features
- **Submit Tickets**: Complete form with department info, equipment type, problem description, and optional photo upload
- **Ticket Status Tracking**: Real-time status updates (Pending, In Progress, On Hold, Done, Closed)
- **Dashboard**: Comprehensive overview with statistics and recent tickets
- **Ticket History**: Complete audit trail of all ticket updates and changes
- **Role-based Access**: Different interfaces for users and IT/admin teams

### 🔐 Authentication & Security
- JWT-based authentication
- Role-based access control (User, IT, Admin)
- Secure password hashing with bcrypt
- Input validation and sanitization

### 📊 Admin Features
- **Dashboard Analytics**: Statistics, charts, and reports
- **User Management**: Create, edit, and manage user accounts
- **Ticket Assignment**: Assign tickets to IT team members
- **Status Management**: Update ticket status with notes
- **Reporting**: Monthly reports and recurring problem analysis

### 🎨 User Experience
- Modern, responsive UI with Tailwind CSS
- Real-time notifications with toast messages
- Drag-and-drop file uploads
- Mobile-friendly design
- Color-coded status indicators

## Tech Stack

### Backend
- **Node.js** with Express.js
- **MySQL** database
- **JWT** for authentication
- **Multer** for file uploads
- **bcryptjs** for password hashing
- **Express Validator** for input validation

### Frontend
- **React 18** with hooks
- **React Router** for navigation
- **React Hook Form** for form handling
- **Axios** for API calls
- **Tailwind CSS** for styling
- **Lucide React** for icons
- **React Dropzone** for file uploads

## Quick Start

### Prerequisites
- Node.js (v16 or higher)
- MySQL (v8.0 or higher)
- npm or yarn

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd ticketing-system
   ```

2. **Install dependencies**
   ```bash
   npm run install-all
   ```

3. **Database Setup**
   - Create a MySQL database named `ticketing_system`
   - Copy `server/env.example` to `server/.env`
   - Update the database credentials in `server/.env`:
     ```env
     DB_HOST=localhost
     DB_USER=root
     DB_PASSWORD=your_password
     DB_NAME=ticketing_system
     JWT_SECRET=your-super-secret-jwt-key
     ```

4. **Start the application**
   ```bash
   npm run dev
   ```

5. **Access the application**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:5000
   - Default admin credentials: `admin@company.com` / `admin123`

## API Endpoints

### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/register` - Create new user (admin only)
- `GET /api/auth/profile` - Get current user profile
- `PUT /api/auth/change-password` - Change password

### Tickets
- `GET /api/tickets` - Get all tickets (filtered by user role)
- `POST /api/tickets` - Create new ticket
- `GET /api/tickets/:id` - Get ticket details
- `PUT /api/tickets/:id/status` - Update ticket status
- `PUT /api/tickets/:id/assign` - Assign ticket
- `POST /api/tickets/:id/notes` - Add note to ticket
- `GET /api/tickets/:id/history` - Get ticket history

### Dashboard (Admin)
- `GET /api/dashboard/stats` - Get dashboard statistics
- `GET /api/dashboard/team` - Get IT team members
- `GET /api/dashboard/report/monthly` - Generate monthly report
- `GET /api/dashboard/my-tickets` - Get assigned tickets
- `GET /api/dashboard/unassigned` - Get unassigned tickets

### Users (Admin)
- `GET /api/users` - Get all users
- `GET /api/users/:id` - Get user details
- `PUT /api/users/:id` - Update user
- `DELETE /api/users/:id` - Delete user

## Database Schema

### Users Table
- `id` (Primary Key)
- `username` (Unique)
- `email` (Unique)
- `password` (Hashed)
- `department`
- `role` (user/admin/it)
- `created_at`, `updated_at`

### Tickets Table
- `id` (Primary Key)
- `ticket_number` (Unique)
- `department`
- `equipment_type` (PC/Laptop/Other)
- `problem_description`
- `issue_date`
- `photo_url`
- `status` (Pending/In Progress/On Hold/Done/Closed)
- `priority` (Low/Medium/High/Critical)
- `assigned_to` (Foreign Key to Users)
- `created_by` (Foreign Key to Users)
- `created_at`, `updated_at`

### Ticket Updates Table
- `id` (Primary Key)
- `ticket_id` (Foreign Key)
- `user_id` (Foreign Key)
- `update_type` (status_change/note/assignment)
- `old_value`, `new_value`
- `notes`
- `created_at`

## Features in Detail

### 1. Submit a Ticket
- Department name input
- Equipment type selection (PC/Laptop/Other)
- Detailed problem description
- Date and time picker
- Optional photo upload with drag-and-drop
- Form validation and error handling

### 2. Ticket Status Tracker
- **Pending**: New ticket, awaiting review
- **In Progress**: IT team actively working
- **On Hold**: Waiting for parts or further investigation
- **Done**: Issue resolved
- **Closed**: Final confirmation completed

### 3. Dashboard for IT Team
- Total tickets overview
- Status distribution charts
- Department-wise breakdown
- Recent tickets list
- Quick action buttons

### 4. Email Notifications (Optional)
- Ticket received confirmation
- Status change notifications
- Work completion alerts
- Configurable via environment variables

### 5. View Ticket History
- Complete audit trail
- Status change history
- Notes and comments
- Assignment changes
- Timestamp tracking

### 6. Login System
- **User Role**: Submit and view own tickets
- **IT Role**: Manage assigned tickets, update status
- **Admin Role**: Full system access, user management

## Development

### Project Structure
```
ticketing-system/
├── client/                 # React frontend
│   ├── src/
│   │   ├── components/     # Reusable components
│   │   ├── contexts/       # React contexts
│   │   ├── pages/          # Page components
│   │   └── index.js        # App entry point
│   └── package.json
├── server/                 # Node.js backend
│   ├── config/            # Database configuration
│   ├── middleware/        # Express middleware
│   ├── routes/            # API routes
│   ├── uploads/           # File uploads
│   └── index.js           # Server entry point
└── package.json           # Root package.json
```

### Available Scripts
- `npm run dev` - Start both frontend and backend
- `npm run server` - Start backend only
- `npm run client` - Start frontend only
- `npm run build` - Build frontend for production
- `npm run install-all` - Install all dependencies

## Deployment

### Backend Deployment
1. Set up a production MySQL database
2. Configure environment variables
3. Install dependencies: `npm install --production`
4. Start the server: `npm start`

### Frontend Deployment
1. Build the application: `npm run build`
2. Deploy the `build` folder to your web server
3. Configure the API endpoint in production

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is licensed under the MIT License.

## Support

For support and questions, please create an issue in the repository or contact the development team. 