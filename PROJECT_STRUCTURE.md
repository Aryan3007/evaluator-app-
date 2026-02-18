# Evaluator App - Project Structure

## 📁 Complete Folder Structure

The project follows a clean architecture with separation of concerns:

```
evaluator/
├── src/
│   ├── app/
│   │   ├── store.ts                    # Redux store configuration
│   │   └── navigation/
│   │       ├── RootNavigator.tsx       # Root navigation with auth flow
│   │       ├── AuthNavigator.tsx       # Authentication screens
│   │       └── MainNavigator.tsx       # Main app screens
│   │
│   ├── core/                           # Business logic layer
│   │   ├── api/
│   │   │   ├── axios.ts                # Axios instance with interceptors
│   │   │   ├── auth.api.ts             # Auth API calls
│   │   │   ├── evaluator.api.ts        # Evaluator API calls
│   │   │   └── scanning.api.ts         # Scanning API calls
│   │   │
│   │   ├── redux/
│   │   │   ├── authSlice.ts            # Auth state management
│   │   │   ├── evaluatorSlice.ts       # Evaluator state management
│   │   │   └── scanningSlice.ts        # Scanning state management
│   │   │
│   │   ├── hooks/
│   │   │   ├── useAuth.ts              # Auth custom hook
│   │   │   ├── useEvaluator.ts         # Evaluator custom hook
│   │   │   └── useScanning.ts          # Scanning custom hook
│   │   │
│   │   ├── types/
│   │   │   └── index.ts                # TypeScript type definitions
│   │   │
│   │   └── utils/
│   │       ├── storage.ts              # AsyncStorage utilities
│   │       ├── validators.ts           # Input validation
│   │       └── helpers.ts              # Helper functions
│   │
│   ├── features/                       # UI screens by feature
│   │   ├── auth/
│   │   │   ├── LoginScreen.tsx
│   │   │   └── SplashScreen.tsx
│   │   │
│   │   ├── evaluator/
│   │   │   ├── DashboardScreen.tsx
│   │   │   ├── DetailsScreen.tsx
│   │   │   └── ReportScreen.tsx
│   │   │
│   │   ├── scanning/
│   │   │   ├── CameraScreen.tsx
│   │   │   ├── PreviewScreen.tsx
│   │   │   └── PdfPreviewScreen.tsx
│   │   │
│   │   └── home/
│   │       └── HomeScreen.tsx
│   │
│   ├── components/                     # Reusable components
│   │   ├── Button.tsx
│   │   ├── Input.tsx
│   │   ├── Header.tsx
│   │   └── Loader.tsx
│   │
│   └── theme/                          # Design system
│       ├── colors.ts                   # Orange & white color palette
│       ├── spacing.ts                  # Spacing & border radius
│       └── typography.ts               # Typography styles
│
├── App.tsx                             # App entry with Redux & Navigation
└── index.js                            # React Native entry point
```

## 🎨 Design System

### Colors
- **Primary**: Orange shades (#FF6B35, #FF8C61, #E55A2B)
- **Background**: White (#FFFFFF, #F8F8F8)
- **Text**: Dark grays for readability

### Components
All screens use consistent:
- Orange headers with white text
- White cards with orange accents
- Orange primary buttons
- Emojis for visual identification

## 🧭 Navigation Flow

1. **Splash Screen** → Auto-navigates after 2 seconds
2. **Login Screen** → Auto-authenticates (demo mode)
3. **Home Screen** → Main menu with 3 options:
   - Evaluator Dashboard
   - Scan Documents
   - View Reports

### Screen Identifiers
Each screen displays a clear label so you know where you are:
- "SPLASH SCREEN"
- "LOGIN SCREEN"
- "HOME SCREEN"
- "EVALUATOR DASHBOARD"
- "EVALUATION DETAILS"
- "EVALUATION REPORT"
- "CAMERA SCREEN"
- "PREVIEW SCREEN"
- "PDF PREVIEW SCREEN"

## 🚀 Running the App

### iOS
\`\`\`bash
npm run ios
\`\`\`

### Android
\`\`\`bash
npm run android
\`\`\`

## 📦 Dependencies Installed

- `@react-navigation/native` - Navigation framework
- `@react-navigation/native-stack` - Stack navigator
- `@reduxjs/toolkit` - State management
- `react-redux` - Redux bindings
- `axios` - HTTP client
- `@react-native-async-storage/async-storage` - Local storage
- `react-native-screens` - Native screen optimization
- `react-native-gesture-handler` - Gesture handling
- `react-native-safe-area-context` - Safe area support

## 🎯 Features

### Authentication
- Splash screen with branding
- Login form with email/password inputs
- Auto-login after 2 seconds (demo)

### Home
- Welcome card
- Menu cards for navigation
- Orange-themed UI

### Evaluator
- Dashboard with evaluation list
- Details view with full information
- Report view with scores and analysis

### Scanning
- Camera screen with capture controls
- Image preview with document info
- PDF preview with page navigation

All screens have dummy content and clear visual indicators!
