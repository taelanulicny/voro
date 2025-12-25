# Pull Request Description Template

## Title
Add entity feed comments, category/entity tabs, spotlights improvements, and various UI enhancements

## Description

This PR includes comprehensive frontend UI/UX improvements and new features. All changes are frontend-only and do not affect backend services, authentication, or storage.

### 🎯 Key Features Added

#### 1. **Entity-Level Feed Comments**
- Added feed functionality to entity pages with `@EntityName` prefix (non-deletable)
- Users can tag other entities in comments (e.g., `@Drake`, `@Taylor Swift`)
- Clickable entity mentions that navigate to entity chart pages
- Matches the format used in category feeds

#### 2. **Category & Entity Tabs**
- **Category Pages**: Added horizontal selector with "Entities", "About", and "Feed" tabs
- **Entity Pages**: Added horizontal selector with "Chart", "About", "Feed", and "News" tabs
- Each "coming soon" page explicitly states its name

#### 3. **Spotlights Section Improvements**
- Changed spotlight cards from rectangles (140x100) to squares (140x140)
- Adjusted padding for better spacing from header

#### 4. **Categories Page Enhancement**
- Added treemap/list view selector (default: Treemap)
- List view shows categories with color indicators and percentages
- Clickable category items that navigate to category pages

#### 5. **Terminology Updates**
- Changed "Buy/Sell" to "Positive/Negative" in trading UI
- Changed "bullish/bearish" to "positive/negative" throughout
- Updated sentiment types and UI labels accordingly

#### 6. **Side Menu & Navigation**
- Added SideMenuContext for managing menu visibility
- Bottom navigation automatically hides when side menu opens
- Added Settings button to side menu

### 📝 Files Changed

**New Components:**
- `src/components/SideMenu.tsx`
- `src/components/FloatingBottomNav.tsx`
- `src/components/Treemap.tsx`
- `src/context/SideMenuContext.tsx`
- `src/screens/AllCategoriesScreen.tsx`
- `src/screens/NewsFeedScreen.tsx`
- `src/screens/SeasonalCompetitionScreen.tsx`

**Modified Components:**
- `src/components/PostCard.tsx` - Added entity feed support, mention parsing, share functionality
- `src/components/TradeModal.tsx` - Updated terminology
- `src/screens/EntityScreen.tsx` - Added tabs and feed functionality
- `src/screens/HomeScreen.tsx` - Added spotlights, open positions, category customization
- `src/screens/CategoryScreen.tsx` - Added tabs and category feed
- Multiple context files - Updated sentiment terminology

### 🔒 Backend Impact

**None** - This PR contains only frontend changes:
- ✅ No changes to authentication services
- ✅ No changes to Supabase integration
- ✅ No changes to Google/Apple login
- ✅ No changes to storage operations
- ✅ No changes to database queries
- Only TypeScript type definition updates (no API changes)

### 🧪 Testing Notes

- All new features use mock data
- Entity feeds, category feeds, and mentions are fully functional
- Navigation between screens works correctly
- Side menu and bottom navigation interactions work as expected

---

**Ready for Review** ✨

