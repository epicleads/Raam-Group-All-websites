# 🎨 Premium Theme System for MG Website

## Overview

A complete seasonal theme management system with premium visual effects, dynamic banners, and full customization for the MG website header.

---

## ✨ Features

### 1. **5 Premium Themes**
- ✅ **Default** - Classic MG red theme (simple, no effects)
- 🎆 **Diwali** - Golden theme with fireworks animation
- ❄️ **Christmas/New Year** - Blue theme with falling snow
- ☀️ **Summer** - Orange theme with heat shimmer & sun rays
- 🌧️ **Monsoon** - Blue-green theme with animated rain

### 2. **Dynamic Banner System**
- Separate text for desktop and mobile
- Animated gradient backgrounds
- Custom emojis (start & end)
- 3 animation speeds (slow, medium, fast)
- Auto-hides on scroll

### 3. **Premium Visual Effects**
- **Fireworks** - Bursting particles for Diwali
- **Snow** - Falling snowflakes with crystals for Christmas
- **Rain** - Realistic raindrops with splashes for Monsoon
- **Shimmer** - Heat waves with sun rays for Summer
- Intensity control (low, medium, high)
- Mobile-optimized performance

### 4. **Full Theme Customization**
- 6 color properties per theme
- 3 gradient properties
- Banner configuration
- Effect settings
- SEO-friendly metadata

---

## 🚀 Setup Instructions

### Step 1: Database Setup

1. Open your **Supabase Dashboard**
2. Go to **SQL Editor**
3. Run the premium schema:

```bash
Backend/raam-mg/SUPABASE_HEADER_THEME_SCHEMA_PREMIUM.sql
```

This will:
- Create/update `mg_header_theme` table with premium features
- Insert 5 pre-configured themes
- Set "default" theme as active
- Create views for easy querying

### Step 2: Verify Installation

Check that themes are created:

```sql
SELECT theme_name, is_active, effect_type, show_banner
FROM mg_header_theme
ORDER BY theme_name;
```

You should see:
- ✅ `default` (is_active = true, effect_type = 'none')
- `diwali` (effect_type = 'fireworks')
- `christmas-newyear` (effect_type = 'snow')
- `summer` (effect_type = 'shimmer')
- `monsoon` (effect_type = 'rain')

### Step 3: Frontend is Ready!

The Header component automatically:
- ✅ Fetches active theme on page load
- ✅ Applies colors and gradients
- ✅ Shows banner if enabled
- ✅ Renders effect component
- ✅ Responsive (desktop/mobile)

---

## 🎮 How to Use

### Activate a Theme

**Option 1: Admin Panel** (Recommended)
1. Go to `/mg/header-theme` in admin panel
2. Click "Activate Theme" on desired theme
3. Refresh your website to see changes

**Option 2: Direct SQL**
```sql
-- Deactivate all themes
UPDATE mg_header_theme SET is_active = false;

-- Activate Diwali theme
UPDATE mg_header_theme
SET is_active = true, activated_at = NOW()
WHERE theme_name = 'diwali';
```

### Test Each Theme

```bash
# Default (no effects)
theme_name = 'default'

# Diwali (fireworks + golden banner)
theme_name = 'diwali'

# Christmas (snow + winter banner)
theme_name = 'christmas-newyear'

# Summer (sun rays + heat banner)
theme_name = 'summer'

# Monsoon (rain + rainy banner)
theme_name = 'monsoon'
```

---

## 📋 Theme Structure

### Color Properties
```typescript
{
  primary_color: '#DA291C',       // Main brand color
  secondary_color: '#8B0000',     // Darker shade
  accent_color: '#FF4500',        // Highlight color
  text_color: '#1a1a1a',          // Dark text (scrolled)
  text_light_color: '#ffffff',    // Light text (top)
  glow_color: 'rgba(...)'         // Shadow/glow effect
}
```

### Gradient Properties
```typescript
{
  header_light_gradient: '...',   // When scrolled down (light bg)
  header_dark_gradient: '...',    // At top (dark bg)
  accent_gradient: '...'          // Buttons & accents
}
```

### Banner Properties
```typescript
{
  show_banner: true,
  banner_text_desktop: '🎆 Happy Diwali! Special Offers...',
  banner_text_mobile: '🎆 Happy Diwali! Offers 🪔',
  banner_gradient: 'linear-gradient(...)',
  banner_emoji_start: '🎆',
  banner_emoji_end: '🪔',
  banner_animation_speed: 'slow' // slow, medium, fast
}
```

### Effect Properties
```typescript
{
  show_effects: true,
  effect_type: 'fireworks', // fireworks, snow, rain, shimmer, none
  effects_intensity: 'high'  // low, medium, high
}
```

---

## 🎯 Customization Guide

### Create a Custom Theme

```sql
INSERT INTO mg_header_theme (
  theme_name, theme_display_name, is_active,
  primary_color, secondary_color, accent_color,
  text_color, text_light_color, glow_color,
  header_light_gradient, header_dark_gradient, accent_gradient,
  effects_intensity, show_effects, effect_type,
  show_banner, banner_text_desktop, banner_text_mobile,
  banner_gradient, banner_emoji_start, banner_emoji_end,
  description
) VALUES (
  'holi', 'Holi Festival Theme', false,
  '#FF00FF', '#FF1493', '#FF69B4',
  '#1a1a1a', '#ffffff', 'rgba(255, 0, 255, 0.3)',
  'linear-gradient(135deg, rgba(255,240,255,0.97) 0%, rgba(255,235,255,0.95) 100%)',
  'linear-gradient(135deg, rgba(51,0,51,0.95) 0%, rgba(76,0,76,0.92) 100%)',
  'linear-gradient(135deg, #FF00FF 0%, #FF1493 50%, #FF69B4 100%)',
  'high', true, 'fireworks',
  true, '🎨 Happy Holi! Colorful Offers Available 🌈',
  '🎨 Happy Holi! 🌈',
  'linear-gradient(90deg, #FF00FF 0%, #FF1493 50%, #FF69B4 100%)',
  '🎨', '🌈',
  'Vibrant Holi theme with colors and effects'
);
```

### Update Existing Theme

```sql
UPDATE mg_header_theme
SET
  banner_text_desktop = '🎆 New Diwali Offer Text! 🪔',
  banner_text_mobile = '🎆 New Offer 🪔',
  effects_intensity = 'high',
  banner_animation_speed = 'fast'
WHERE theme_name = 'diwali';
```

### Disable Banner/Effects

```sql
-- Disable banner only
UPDATE mg_header_theme
SET show_banner = false
WHERE theme_name = 'diwali';

-- Disable effects only
UPDATE mg_header_theme
SET show_effects = false
WHERE theme_name = 'diwali';

-- Disable both
UPDATE mg_header_theme
SET show_banner = false, show_effects = false
WHERE theme_name = 'diwali';
```

---

## 🔧 API Endpoints

### Get Active Theme
```bash
GET https://raam-group-all-websites.onrender.com/admin/raam-mg/header-theme/active

Response:
{
  "success": true,
  "data": {
    "theme_name": "diwali",
    "primary_color": "#FF9900",
    "show_banner": true,
    "banner_text_desktop": "...",
    "effect_type": "fireworks",
    ...
  }
}
```

### Get All Themes
```bash
GET https://raam-group-all-websites.onrender.com/admin/raam-mg/header-themes
```

### Activate Theme
```bash
POST https://raam-group-all-websites.onrender.com/admin/raam-mg/header-themes/{id}/activate
Body: { "activatedBy": "admin" }
```

---

## 📱 Mobile Optimization

- **Effects**: Reduced particle count on mobile
- **Banner**: Shorter text on mobile screens
- **Performance**: Dynamic imports, lazy loading
- **Animations**: Reduced motion support

---

## 🐛 Troubleshooting

### Theme not showing?
```bash
# Check if theme is active
SELECT * FROM mg_header_theme WHERE is_active = true;

# Check browser console
# Should see: ✅ Theme loaded: diwali
```

### Effects not rendering?
```sql
-- Verify effect settings
SELECT theme_name, show_effects, effect_type, effects_intensity
FROM mg_header_theme
WHERE is_active = true;
```

### Banner not showing?
```sql
-- Check banner settings
SELECT theme_name, show_banner, banner_text_desktop
FROM mg_header_theme
WHERE is_active = true;
```

---

## 🎨 Theme Preview

### Default Theme (Simple)
- **Colors**: MG Red (#DA291C)
- **Effects**: None
- **Banner**: Hidden
- **Use Case**: Year-round default

### Diwali Theme (Premium)
- **Colors**: Golden/Orange (#FF9900, #FFD700)
- **Effects**: Bursting fireworks
- **Banner**: "🎆 Happy Diwali! Special Offers 🪔"
- **Use Case**: Diwali season (Oct-Nov)

### Christmas Theme (Premium)
- **Colors**: Blue/White (#0ea5e9, #bfdbfe)
- **Effects**: Falling snow with crystals
- **Banner**: "❄️ Happy Holidays! Winter Offers ☃️"
- **Use Case**: Dec-Jan

### Summer Theme (Premium)
- **Colors**: Orange/Yellow (#FF6B35, #FDC830)
- **Effects**: Sun rays & heat shimmer
- **Banner**: "☀️ Summer Sale! Cool Deals 🌴"
- **Use Case**: Apr-Jun

### Monsoon Theme (Premium)
- **Colors**: Blue/Green (#4A90E2, #50C878)
- **Effects**: Animated rain with splashes
- **Banner**: "🌧️ Monsoon Specials! 💧"
- **Use Case**: Jul-Sep

---

## 🚀 Performance

- ✅ Dynamic imports (code splitting)
- ✅ Lazy loading effects
- ✅ Canvas-based animations (60fps)
- ✅ Mobile-optimized particle counts
- ✅ Reduced motion support
- ✅ Minimal re-renders

---

## 📦 Files Structure

```
Backend/raam-mg/
├── SUPABASE_HEADER_THEME_SCHEMA_PREMIUM.sql  # Database schema
├── headerTheme.js                             # API handlers
└── router.js                                  # Routes

raam-mg/src/app/components/Header/
├── Header.tsx              # Main header with theme system
├── DiwaliFireworks.tsx     # Fireworks effect
├── ChristmasSnow.tsx       # Snow effect
├── MonsoonRain.tsx         # Rain effect
└── SummerShimmer.tsx       # Heat shimmer effect
```

---

## 🎉 Done!

Your premium theme system is ready! Switch themes from admin panel and watch your header transform with seasonal effects! 🚀

**Need help?** Check the console logs for theme loading status.
