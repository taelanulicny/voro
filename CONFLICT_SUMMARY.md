# Conflict Summary - Plain English Explanation

## Overview
You have 9 files with merge conflicts. These conflicts happen because:
- **Your branch** (mobile) has changes
- **The base branch** (what you're rebasing onto) also has changes to the same files
- Git needs you to decide which changes to keep

## File-by-File Conflicts

### 1. **App.tsx** 
**What's conflicting:**
- **Base branch has:** Apollo Provider wrapper, imports for `BuyScreen`, and references to `BuyScreen` in navigation
- **Your branch has:** SideMenuProvider wrapper, imports for `SearchScreen`, `CategoryScreen`, `NewsFeedScreen`, and these screens in navigation

**The conflict:** The base branch uses Apollo GraphQL and has a BuyScreen, while your branch removed Apollo, renamed BuyScreen to SearchScreen, and added new screens.

**What needs deciding:**
- Do you want to keep Apollo Provider or remove it?
- Should the screen be called "BuyScreen" or "SearchScreen"?
- Should you include CategoryScreen and NewsFeedScreen in navigation?

---

### 2. **src/components/PostCard.tsx**
**What's conflicting:**
- **Base branch:** Original PostCard implementation (likely simpler version)
- **Your branch:** Enhanced PostCard with entity feed support, mention parsing, share functionality

**The conflict:** Your branch added significant features (entity feed mode, @mention parsing, share icon) that don't exist in the base.

**What needs deciding:**
- Should all the new PostCard features be kept?

---

### 3. **src/components/TradeModal.tsx**
**What's conflicting:**
- **Base branch:** Likely uses "Buy"/"Sell" terminology
- **Your branch:** Changed to "Positive"/"Negative" terminology

**The conflict:** Terminology differences for trade actions.

**What needs deciding:**
- Use "Buy/Sell" or "Positive/Negative"?

---

### 4. **src/context/NewsContext.tsx**
**What's conflicting:**
- **Base branch:** Original news context, possibly with "bullish/bearish" sentiment
- **Your branch:** Changed sentiment to "positive/negative", removed crypto news, updated entity references

**The conflict:** Sentiment terminology and content changes.

**What needs deciding:**
- Keep "positive/negative" or revert to "bullish/bearish"?
- Should crypto news articles be included?

---

### 5. **src/context/SocialContext.tsx**
**What's conflicting:**
- **Base branch:** Original social context with "bullish/bearish" sentiment
- **Your branch:** Changed to "positive/negative" sentiment

**The conflict:** Sentiment terminology in social posts.

**What needs deciding:**
- Keep "positive/negative" or revert to "bullish/bearish"?

---

### 6. **src/context/TradingContext.tsx**
**What's conflicting:**
- **Base branch:** Original trading context implementation
- **Your branch:** Possibly has modifications for price updates, holdings management

**The conflict:** Likely differences in how trading state is managed or price updates are handled.

**What needs deciding:**
- Which implementation of trading logic to keep?

---

### 7. **src/screens/EntityScreen.tsx**
**What's conflicting:**
- **Base branch:** Original entity screen (likely just the chart view)
- **Your branch:** Added tabs (Chart, About, Feed, News), entity feed functionality, feed posts

**The conflict:** Major feature additions - tabs and feed functionality.

**What needs deciding:**
- Should all the new tabs and feed features be kept?

---

### 8. **src/screens/HomeScreen.tsx**
**What's conflicting:**
- **Base branch:** Original home screen implementation
- **Your branch:** Added spotlights section, open positions module, category customization, position change indicators, and many other features

**The conflict:** Extensive new features and UI enhancements.

**What needs deciding:**
- Should all the new home screen features (spotlights, open positions, etc.) be kept?

---

### 9. **src/services/socialService.ts**
**What's conflicting:**
- **Base branch:** Original social service with "bullish/bearish" sentiment
- **Your branch:** Changed to "positive/negative" sentiment

**The conflict:** Sentiment terminology in service layer.

**What needs deciding:**
- Keep "positive/negative" or revert to "bullish/bearish"?

---

## How to View Conflicts
To see the actual conflict markers in any file, run:
```bash
cat <filename> | grep -A 30 "<<<<<<<"
```

Or open the file in your editor - the conflicts will look like:
```
<<<<<<< HEAD
(Your changes)
=======
(Base branch changes)
>>>>>>> commit-hash
```

## General Pattern
Most conflicts seem to fall into these categories:
1. **Terminology changes:** "Buy/Sell" vs "Positive/Negative", "Bullish/Bearish" vs "Positive/Negative"
2. **New features:** Tabs, feeds, spotlights, etc. that you added
3. **Screen/component renames:** BuyScreen → SearchScreen
4. **Provider changes:** Apollo Provider removal, SideMenuProvider addition

## Recommendation
Based on the work we've done together, you'll likely want to keep **your branch's changes** (the ones after `=======`) for most files since they represent the latest features and improvements.

