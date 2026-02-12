# Analytics & Monitoring - Quick Start Guide

## 🚀 Getting Started

### Backend Setup

1. **Install Dependencies** (Already installed)
   ```bash
   cd backend
   npm install
   ```

2. **Environment Variables**
   Add to your `.env` file:
   ```env
   # Optional: Sentry for error tracking
   SENTRY_DSN=your-sentry-backend-dsn
   SENTRY_TRACES_SAMPLE_RATE=0.2
   
   # Redis for analytics storage (optional but recommended)
   REDIS_URL=redis://localhost:6379
   ```

3. **Start the Backend**
   ```bash
   npm run dev
   ```

4. **Access Dashboards**
   - Status Monitor: http://localhost:5001/status-monitor
   - Analytics API: http://localhost:5001/api/analytics/overview

### Frontend Setup

1. **Environment Variables**
   Add to your `.env` file:
   ```env
   # Optional: Sentry for frontend error tracking
   EXPO_PUBLIC_SENTRY_DSN=your-sentry-mobile-dsn
   ```

2. **Start the App**
   ```bash
   npm start
   ```

## 📊 What's Been Implemented

### Backend Features
✅ Real-time metrics collection  
✅ Performance monitoring per endpoint  
✅ Error tracking and rate monitoring  
✅ Popular searches tracking  
✅ Popular content (movies/TV) tracking  
✅ Active user tracking  
✅ Cache hit/miss rates  
✅ Status monitor dashboard  
✅ Analytics API endpoints  

### Frontend Features
✅ Automatic screen view tracking  
✅ User action tracking (login, signup, etc.)  
✅ Search query tracking  
✅ Content view tracking  
✅ Watchlist action tracking  
✅ Favorite action tracking  
✅ Error tracking with Sentry  
✅ Performance monitoring  

## 🔍 Testing Analytics

### 1. Test Backend Analytics

```bash
# Get overview
curl http://localhost:5001/api/analytics/overview

# Get popular searches
curl http://localhost:5001/api/analytics/popular-searches

# Get popular content
curl http://localhost:5001/api/analytics/popular-content

# Get performance metrics
curl http://localhost:5001/api/analytics/performance
```

### 2. Test Frontend Analytics

Open the React Native app and:
1. **Login/Signup** - Tracks user authentication
2. **Search for a movie** - Tracks search query
3. **View movie details** - Tracks content view
4. **Add to favorites** - Tracks favorite action
5. **Add to watchlist** - Tracks watchlist action

Check the console logs - you should see:
```
📊 Analytics service initialized
📊 Event tracked: screen_view { screen_name: 'SearchScreen' }
📊 Event tracked: search { query: 'inception', results_count: 10 }
```

### 3. View Status Monitor

Navigate to: http://localhost:5001/status-monitor

You'll see:
- Real-time CPU, memory, and load graphs
- Response time distribution
- Requests per second
- Status code breakdown
- Health check status

## 📈 Monitoring Production

### Key Metrics to Watch

1. **Error Rate**
   - Target: < 1%
   - Alert if: > 5%

2. **Average Response Time**
   - Target: < 500ms
   - Alert if: > 2000ms

3. **Cache Hit Rate**
   - Target: > 80%
   - Alert if: < 50%

4. **Active Users**
   - Track daily active users
   - Monitor growth trends

### Setting Up Alerts

1. **Sentry** (Recommended)
   - Configure in Sentry dashboard
   - Set up email/Slack notifications
   - Define alert rules

2. **Custom Monitoring**
   - Query analytics API periodically
   - Compare against thresholds
   - Send notifications via your preferred method

## 🛠 Customization

### Add New Events

**Backend:**
```javascript
// In your route
await req.analytics.trackMovieView(movieId, title);

// Or use the service directly
const { metrics } = require('./services/analytics');
await metrics.trackSearch(query, userId);
```

**Frontend:**
```javascript
import analyticsService from '../services/analytics';

// Track custom action
analyticsService.trackAction('button_click', {
  button_name: 'play_trailer',
  movie_id: 123
});
```

### Create Custom Analytics Endpoints

```javascript
// backend/src/routes/analytics.js

router.get('/custom-metric', optionalAuth, async (req, res) => {
  try {
    // Your custom metric logic
    const data = await getCustomMetric();
    return ok(res, data);
  } catch (error) {
    // Error handling
  }
});
```

## 🔒 Privacy & Security

- ✅ No PII stored in analytics
- ✅ User IDs only (no emails/names in analytics)
- ✅ All data anonymized
- ✅ Optional authentication on analytics endpoints
- ✅ Rate limiting enabled

## 📝 Files Created/Modified

### New Files Created
```
backend/src/services/analytics/
  ├── index.js           # Main analytics service
  ├── events.js          # Event definitions
  ├── metrics.js         # Metrics calculations
  └── storage.js         # Redis/Firestore storage

backend/src/middleware/
  └── metrics.js         # Metrics middleware

backend/src/routes/
  └── analytics.js       # Analytics API endpoints

src/services/
  └── analytics.js       # Frontend analytics service

src/contexts/
  └── AnalyticsContext.js # Analytics provider

src/hooks/
  └── useAnalytics.js    # Analytics hooks

ANALYTICS_IMPLEMENTATION.md
ANALYTICS_QUICKSTART.md
```

### Modified Files
```
backend/src/app.js                 # Added middleware & status monitor
backend/src/middleware/auth.js     # Added optionalAuth
backend/src/routes/index.js        # Added analytics route
backend/src/routes/search.js       # Added tracking
backend/src/routes/movies.js       # Added tracking

App.js                             # Added Sentry & Analytics provider
src/screens/AuthScreen.js          # Added login/signup tracking
src/screens/SearchScreen.js        # Added search tracking
src/screens/DetailsScreen.js       # Added view/favorite/watchlist tracking
```

## 🎯 Next Steps

1. **Set up Sentry** (Optional but recommended)
   - Create account at sentry.io
   - Add DSN to environment variables
   - Deploy and monitor errors

2. **Configure Redis** (Optional but recommended)
   - Install Redis locally or use cloud service
   - Add REDIS_URL to environment
   - Restart backend

3. **Build Custom Dashboards**
   - Use analytics API to fetch data
   - Create visualization with Chart.js/D3
   - Display on admin panel

4. **Set Up Alerts**
   - Monitor key metrics
   - Configure thresholds
   - Set up notifications

## ❓ Troubleshooting

**Q: Analytics data not showing up?**
- Check Redis connection
- Verify middleware is loaded
- Check console for errors

**Q: Status monitor not loading?**
- Ensure express-status-monitor is installed
- Check browser console for errors
- Try http://localhost:5001/status-monitor directly

**Q: Sentry not capturing errors?**
- Verify DSN is correct
- Check if running in production mode
- Look for initialization errors in logs

## 📚 Documentation

For detailed information, see:
- [ANALYTICS_IMPLEMENTATION.md](./ANALYTICS_IMPLEMENTATION.md) - Complete implementation guide
- Backend README: [backend/README.md](./backend/README.md)
- Project README: [README.md](./README.md)

## 🎉 Success!

Your CineLink app now has comprehensive analytics and monitoring! 

Start the app, interact with it, and watch the metrics flow in real-time at:
- http://localhost:5001/status-monitor
- http://localhost:5001/api/analytics/overview
