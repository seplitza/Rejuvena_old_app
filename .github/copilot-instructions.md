# Rejuvena Project - AI Coding Guidelines

## Architecture Overview

**Rejuvena** is a multi-component beauty/anti-aging platform with three main subsystems:

1. **React Native Mobile App** (`app build downloaded Nov 2025/`) - Main user-facing iOS/Android app
2. **Age Estimation API** (`age-bot-api/`) - Flask microservice using InsightFace for face age detection
3. **Next.js Web App** (`web/`) - Web version reusing mobile API layer and Redux business logic

### Component Communication
- Mobile app → Backend API (`/contest/UploadImageAgeBot`) → Age-bot API
- Web app → Cloudflare proxy (`api.seplitza.ru`) → Age-bot API (37.252.20.170:5000)
- Age-bot API: `POST /api/estimate-age` accepts base64 images, returns `{age, confidence, status}`
- CORS configured for frontend origins

## Mobile App Structure

### State Management (Redux Toolkit + Sagas)
- **Store**: `app/redux/store.js` - Redux Toolkit with redux-persist (AsyncStorage)
- **Modules**: Feature-based in `app/modules/` - each with `{slice, sagas, selectors}`
  - `auth/` - Authentication (email/password, social login, guest)
  - `photo-diary/` - Photo tracking with age estimation
  - `course-description/`, `exercise/` - Workout content
  - `common/` - Global state (persisted)
- **Sagas**: Side effects in `app/redux/rootSagas.js` - combine all module sagas
- **API Layer**: `app/api/` - 50+ endpoints with JWT auth interceptors

### Key Patterns
- **Navigation**: React Navigation 5 (stack + drawer navigators in `app/navigator/`)
- **Translations**: i18next with Russian/English in `app/translations/`
- **Components**: Shared UI in `app/components/`, styles in `app/styles/`
- **Asset Management**: Lottie animations, vector icons, FastImage for performance

### Build & Deploy
```bash
# Mobile
npm install
npm run android  # or ios
npm run lint
fastlane android beta  # Deploy to App Center

# Web (Next.js)
cd web
npm run dev          # Local dev on :3000
npm run build        # Production build
npm run deploy       # Deploy to GitHub Pages
```

## Age-bot API

### Tech Stack
- **Framework**: Flask with InsightFace (`buffalo_sc` model from `insightface` Python package)
- **Model**: Face detection + age/gender estimation (det_size 640x640, CPU execution)
- **Deployment**: Gunicorn (4 workers) + systemd service on Timeweb
- **Alternative implementations**: `app_facepp.py` (Face++ API), `app_cv2.py`, `app_google_vision.py` (not in production)

### Development Workflow
```bash
cd age-bot-api
pip install -r requirements.txt
python app.py  # Local dev on :5000

# Deploy to Timeweb
./deploy.sh  # Automated deployment script
# or manually: ssh root@37.252.20.170, scp files, setup systemd
```

### API Contract
- Input: `{"image": "data:image/jpeg;base64,..."}` (base64 with/without data URI prefix)
- Output: `{"age": 35, "confidence": 0.95, "status": "success"}`
- Error handling: Returns `null` age if no face detected

## Project Conventions

### Code Style
- **Mobile**: ESLint config (`@react-native-community`), module aliases (`@app/`)
- **Web**: Next.js + TypeScript, Tailwind CSS for styling
- **Python**: Flask conventions, explicit error logging with traceback

### Critical Files
- `app/api/endpoints.js` - All backend endpoint definitions
- `app/redux/rootReducer.js` & `rootSagas.js` - Redux wiring
- `age-bot-api/app.py` - Age estimation service entrypoint
- `web/src/store/` - Redux state ported to web

### External Services
- **App Center**: Mobile CI/CD and crash reporting
- **OneSignal**: Push notifications
- **Branch.io**: Deep linking
- **IAP**: In-app purchases (iOS/Android)
- **Amplitude**: Analytics

## Testing
- Mobile: Jest with React Native Testing Library (`npm test`)
- Age-bot: Manual testing with `test_api.py` (POST samples to /api/estimate-age)
- No automated E2E tests currently

## Common Tasks

### Adding New Feature to Mobile
1. Create module in `app/modules/new-feature/`
2. Add slice (Redux Toolkit) + sagas for async logic
3. Wire into `rootReducer.js` & `rootSagas.js`
4. Create screen components, add to navigator
5. Update translations in `app/translations/`

### Porting Mobile Features to Web
1. Copy Redux logic from `app/modules/` to `web/src/store/modules/`
2. Adapt AsyncStorage → localStorage in persist config
3. Create Next.js pages in `web/src/pages/`
4. Reuse API layer from `web/src/api/` (same endpoints)

### Debugging Age Estimation Issues
- Check InsightFace model loaded: `GET /health` → `model_loaded: true`
- Verify image format: RGB, reasonable size (640x640 det_size)
- Review server logs: `systemctl status age-bot` on Timeweb
- Test locally: `python app.py` and use `test_api.py`

## Important Notes
- **Model location**: Age-bot models in `age-bot-api/models/` (not in git, copy manually)
- **Credentials**: Timeweb SSH password in `DEPLOYMENT.md`
- **Branch strategy**: Main branch, no documented branching model
- **Documentation**: READMEs in each subproject, API_DOCS.md for age-bot
