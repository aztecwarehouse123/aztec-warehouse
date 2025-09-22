# Warehouse Management System - Setup Guide

## 📋 Project Overview
This is a React-based warehouse management system built with TypeScript, Vite, and Tailwind CSS. The system includes inventory management, job tracking, and analytics features.

## 🚀 Quick Start Setup

### Prerequisites
- **Node.js** (version 18 or higher)
- **npm** (comes with Node.js)
- **Git** (for version control)

### Installation Steps

1. **Copy Project Files**
   ```bash
   # Copy the entire project folder to your new machine
   ```

2. **Install Dependencies**
   ```bash
   cd /path/to/project/frontend
   npm install
   ```

3. **Start Development Server**
   ```bash
   npm run dev
   ```

4. **Verify Setup**
   - Open browser to `http://localhost:5173`
   - Check that all pages load without errors

## 📦 Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server (localhost:5173) |
| `npm run build` | Build for production |
| `npm run preview` | Preview production build |
| `npm run lint` | Run ESLint for code quality |
| `npm run deploy` | Deploy to GitHub Pages |

## 🛠️ Technology Stack

### Core Technologies
- **React 18.3.1** - UI framework
- **TypeScript 5.5.3** - Type safety
- **Vite 5.4.2** - Build tool and dev server
- **Tailwind CSS 3.4.1** - Styling framework

### Key Dependencies
- **Firebase 11.7.3** - Backend services
- **React Query 5.85.9** - Data fetching and caching
- **React Router 6.22.3** - Client-side routing
- **Framer Motion 12.12.1** - Animations
- **Chart.js 4.4.9** - Data visualization
- **Recharts 2.12.2** - Additional charts
- **Lucide React 0.344.0** - Icons

### Development Tools
- **ESLint 9.9.1** - Code linting
- **TypeScript ESLint** - TypeScript-specific linting
- **PostCSS** - CSS processing
- **Autoprefixer** - CSS vendor prefixes

## 📁 Project Structure

```
frontend/
├── src/
│   ├── pages/           # Main application pages
│   │   ├── Settings/    # Settings page
│   │   ├── Stock/       # Inventory management
│   │   └── Jobs/        # Job tracking
│   ├── components/      # Reusable components
│   └── ...
├── public/              # Static assets
├── dist/               # Production build output
├── package.json        # Dependencies and scripts
├── vite.config.ts      # Vite configuration
├── tailwind.config.js  # Tailwind CSS configuration
├── tsconfig.json       # TypeScript configuration
└── eslint.config.js    # ESLint configuration
```

## ⚙️ Configuration Files

### Vite Configuration (`vite.config.ts`)
- React plugin enabled
- Optimized dependencies (excludes lucide-react)
- Base path set to `/`

### Tailwind Configuration (`tailwind.config.js`)
- Custom breakpoints (xs: 475px)
- Custom animations (slide-in, slide-out, fade-in, fade-out)
- Inter font family configured
- Content paths: `./index.html`, `./src/**/*.{js,ts,jsx,tsx}`

### TypeScript Configuration
- Project references setup
- Separate configs for app and node environments
- Strict type checking enabled

## 🔧 Common Setup Issues & Solutions

### Issue: npm install fails
**Solution:**
```bash
# Clear npm cache
npm cache clean --force

# Delete node_modules and package-lock.json
rm -rf node_modules package-lock.json

# Reinstall
npm install
```

### Issue: Port 5173 already in use
**Solution:**
```bash
# Kill process using the port
npx kill-port 5173

# Or use a different port
npm run dev -- --port 3000
```

### Issue: TypeScript errors
**Solution:**
```bash
# Check TypeScript version
npx tsc --version

# Run type checking
npx tsc --noEmit
```

### Issue: Firebase connection fails
**Solution:**
- Check Firebase configuration in your environment
- Verify API keys and project settings
- Ensure Firebase project is properly initialized

## 🚀 Deployment

### GitHub Pages Deployment
```bash
# Build and deploy
npm run predeploy
npm run deploy
```

### Manual Deployment
```bash
# Build for production
npm run build

# The dist/ folder contains deployable files
```

## 📝 Development Notes

### Key Features
- **Inventory Management**: Stock tracking and management
- **Job Management**: Job creation and tracking system
- **Settings**: Application configuration
- **Analytics**: Data visualization with charts
- **Responsive Design**: Mobile-friendly interface

### Code Quality
- ESLint configured with React hooks rules
- TypeScript strict mode enabled
- Consistent code formatting
- Component-based architecture

## 🆘 When to Ask for Help

### Setup Issues
- npm install fails with specific errors
- Development server won't start
- Build process fails
- TypeScript compilation errors

### Development Issues
- Component not rendering correctly
- Styling problems with Tailwind
- State management issues
- API integration problems
- Performance optimization needs

### Deployment Issues
- GitHub Pages deployment fails
- Build optimization needed
- Environment configuration problems

## 📞 Getting Help

When asking for help, please provide:
1. **Error messages** (exact text)
2. **Steps taken** before the error
3. **System information** (OS, Node.js version)
4. **Relevant code snippets** if applicable

## 🔄 Maintenance

### Regular Updates
- Keep dependencies updated
- Check for security vulnerabilities: `npm audit`
- Update Node.js when new LTS versions are available

### Backup Strategy
- Commit code changes regularly
- Backup environment configurations
- Keep deployment scripts updated

---

**Last Updated**: $(date)
**Project Version**: 0.1.0
**Node.js Requirement**: 18+
**Package Manager**: npm
