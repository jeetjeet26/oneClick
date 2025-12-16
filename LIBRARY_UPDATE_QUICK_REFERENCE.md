# Library Update Quick Reference
**TL;DR for Busy Developers**

---

## 🚨 THE PROBLEM

Your app won't build on Vercel because:

```
package.json says:        Actually installed:
Next.js 16.0.8     ❌     Next.js 15.5.9
React 19.2.1       ❌     React 18.3.1  
React-DOM 19.2.1   ❌     React-DOM 18.3.1
uuid (missing)     ❌     uuid 11.1.0 (extraneous)
```

**Root Cause:** Next.js 16 doesn't exist yet. You specified a non-existent version.

---

## ✅ THE FIX (5 Minutes)

### Step 1: Edit `p11-platform/apps/web/package.json`

Change these lines:

```json
{
  "dependencies": {
    "next": "15.5.9",        // was: "16.0.8"
    "react": "18.3.1",       // was: "19.2.1"
    "react-dom": "18.3.1",   // was: "19.2.1"
    "uuid": "^11.1.0"        // ADD THIS LINE (was missing)
  }
}
```

### Step 2: Clean Install

```bash
cd p11-platform/apps/web
rm -rf node_modules
rm package-lock.json
npm install
```

### Step 3: Test

```bash
npm run build    # Should succeed
npm run dev      # Should work
```

### Step 4: Deploy

```bash
git add package.json package-lock.json
git commit -m "fix: correct package versions for Vercel build"
git push
```

**Your Vercel build should now succeed! ✅**

---

## 📊 WHAT TO UPDATE (After Fix Works)

### ✅ Safe to Update Now

| Package | Current | Latest | Risk | Command |
|---------|---------|--------|------|---------|
| lucide-react | 0.556.0 | 0.561.0 | 🟢 None | `npm install lucide-react@0.561.0` |
| eslint-config-next | 16.0.8 | 16.0.10 | 🟢 None | `npm install eslint-config-next@16.0.10` |

### ⚠️ Update Later (Needs Testing)

| Package | Current | Latest | Risk | Why Wait |
|---------|---------|--------|------|----------|
| React | 18.3.1 | 19.2.3 | 🟡 Medium | Breaking changes in refs, needs thorough testing |
| uuid | 11.1.0 | 13.0.0 | 🔴 High | 2 major versions, unknown breaking changes |
| @types/node | 20.x | 25.x | 🟡 Medium | Only update when upgrading Node.js runtime |

### ❌ Don't Update

| Package | Why Not |
|---------|---------|
| Next.js 16 | **Doesn't exist yet** - stay on 15.x |
| Node.js 22+ | Vercel defaults to Node 20 LTS, no urgent need |

---

## 🎯 Priority Order

1. **TODAY:** Fix package.json versions (see Step 1 above)
2. **THIS WEEK:** Deploy and verify Vercel build works
3. **NEXT WEEK:** Update lucide-react and eslint-config-next
4. **NEXT MONTH:** Consider React 19 migration (optional)
5. **LATER:** Monitor for Next.js 16 stable release

---

## 🧪 Test Checklist

After fixing versions, test these:

- [ ] Login works
- [ ] Dashboard loads  
- [ ] Asset upload works (uses uuid)
- [ ] No console errors
- [ ] Vercel build succeeds

---

## 🆘 If Still Broken

1. Clear Vercel build cache (Dashboard → Settings → Clear Build Cache)
2. Check environment variables are set in Vercel
3. Verify `package-lock.json` is committed to git
4. Check Vercel build logs for specific errors

---

## 📖 Full Details

See `LIBRARY_UPDATE_SAFETY_ANALYSIS.md` for:
- Complete risk analysis
- Breaking changes documentation  
- Detailed testing strategy
- Troubleshooting guide
- Prevention tips

---

**Remember:** Fix the current state FIRST, then update libraries LATER.



