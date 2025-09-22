# Quick Reference - Warehouse Management System

## 🚀 Essential Commands

```bash
# Development
npm run dev                 # Start dev server (localhost:5173)
npm run build              # Build for production
npm run preview            # Preview production build

# Code Quality
npm run lint               # Run ESLint
npm run lint -- --fix      # Fix auto-fixable lint issues

# Deployment
npm run deploy             # Deploy to GitHub Pages
npm run predeploy          # Build + prepare for deployment
```

## 🔧 Quick Fixes

### Project Won't Start
```bash
# 1. Clear cache and reinstall
npm cache clean --force
rm -rf node_modules package-lock.json
npm install

# 2. Check Node.js version
node --version  # Should be 18+

# 3. Kill port if occupied
npx kill-port 5173
```

### Build Errors
```bash
# Check TypeScript errors
npx tsc --noEmit

# Check for missing dependencies
npm ls --depth=0

# Clear build cache
rm -rf dist
npm run build
```

### Styling Issues
```bash
# Rebuild Tailwind
npx tailwindcss -i ./src/index.css -o ./dist/output.css --watch

# Check Tailwind config
cat tailwind.config.js
```

## 📱 Key URLs
- **Development**: http://localhost:5173
- **Production**: https://aztecwms.com
- **GitHub**: Check your repository URL

## 🗂️ Important Files
- `package.json` - Dependencies and scripts
- `vite.config.ts` - Build configuration
- `tailwind.config.js` - Styling configuration
- `src/pages/` - Main application pages
- `src/components/` - Reusable components

## 🐛 Common Error Messages

| Error | Solution |
|-------|----------|
| `Cannot find module` | Run `npm install` |
| `Port 5173 is already in use` | Run `npx kill-port 5173` |
| `TypeScript errors` | Run `npx tsc --noEmit` |
| `Tailwind classes not working` | Check `tailwind.config.js` content paths |
| `Firebase connection failed` | Verify Firebase config |

## 📋 Pre-Setup Checklist
- [ ] Node.js 18+ installed
- [ ] Git installed
- [ ] Project files copied
- [ ] Navigate to project directory
- [ ] Run `npm install`
- [ ] Run `npm run dev`
- [ ] Verify localhost:5173 loads

## 🆘 Emergency Commands
```bash
# Reset everything
rm -rf node_modules package-lock.json dist
npm install
npm run dev

# Check what's running on port 5173
netstat -ano | findstr :5173  # Windows
lsof -i :5173                 # macOS/Linux
```
