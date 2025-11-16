# 🚀 Quick Start - Test Trading System

## Start the App

```bash
cd moro-mobile
npm start
# or
yarn start
```

Then press `i` for iOS or `a` for Android.

## 🎯 5-Minute Trading Test

### 1️⃣ Home Screen (You start here)
- **See**: Portfolio balance of $10,000.00
- **See**: List of entities (OPENAI, MUSK, BTCHLV, etc.)
- **Do**: Tap on **"OPENAI"** entity

### 2️⃣ Entity Detail Screen
- **See**: Current price (e.g., $180.00)
- **See**: 30-day price chart
- **See**: Statistics (volume, market cap, etc.)
- **Do**: Tap **"Trade OPENAI"** button at bottom

### 3️⃣ Trade Modal (Buy)
- **See**: Modal slides up from bottom
- **See**: "Buy" tab is active (green)
- **Do**: Enter quantity **"10"** in the input
- **See**: Total cost updates (e.g., $1,800.00)
- **See**: Available cash shows $10,000.00
- **Do**: Tap **"Buy OPENAI"** button
- **See**: Success alert appears
- **Do**: Tap **"OK"** on alert

### 4️⃣ Back to Entity Screen
- **See**: "Your Position" card appears
- **See**: Shows 10 shares owned
- **See**: Shows avg cost, total value, P&L
- **Do**: Navigate to **Portfolio** tab (bottom nav)

### 5️⃣ Portfolio Screen
- **See**: Cash balance decreased to $8,200.00
- **See**: Total portfolio value
- **See**: OPENAI holding in "Holdings" tab
- **Do**: Tap on the OPENAI holding

### 6️⃣ Back to Entity (to Sell)
- **Do**: Tap **"Trade OPENAI"** button
- **Do**: Switch to **"Sell"** tab (red)
- **See**: "Shares Available to Sell: 10"
- **Do**: Enter quantity **"5"**
- **See**: Expected P&L (profit or loss)
- **Do**: Tap **"Sell OPENAI"** button
- **See**: Success alert
- **Do**: Tap **"OK"**

### 7️⃣ Verify Everything
- **Do**: Go back to **Portfolio** tab
- **See**: Cash balance increased
- **See**: OPENAI holding now shows 5 shares
- **Do**: Switch to **"History"** tab
- **See**: Both transactions (Buy and Sell)

## ✅ You've Tested Everything!

You just verified:
- ✅ Buy flow with token validation
- ✅ Portfolio tracking and updates
- ✅ Sell flow with share validation
- ✅ Transaction history recording
- ✅ Real-time P&L calculations
- ✅ Average cost calculations
- ✅ Navigation between screens
- ✅ UI feedback and animations

## 🎮 Try These Next

### Test Validation
- Try buying with more than $10,000 → **Should fail**
- Try selling more shares than you own → **Should fail**

### Test Percentage Buttons
- In trade modal, tap **"25%"** → Auto-fills quantity
- Tap **"100%"** → Fills max affordable/owned

### Test Multiple Entities
- Trade **MUSK**, **BTCHLV**, **AGI**
- See multiple holdings in portfolio
- Watch P&L update with price changes

### Test Price Updates
- Stay on entity screen for 10+ seconds
- **See**: Price updates every 5 seconds
- **See**: P&L recalculates automatically

## 📊 Sample Test Results

After a full test, your portfolio should look like:

**Starting:**
- Cash: $10,000.00
- Holdings: 0
- Transactions: 0

**After Trading:**
- Cash: ~$8,300.00 (varies with sells)
- Holdings: 1-3 entities
- Transactions: 2+ entries
- Total Portfolio Value: ~$10,000 ± changes

## 🐛 If Something Breaks

Check these common issues:
1. **Navigation error?** → Make sure EntityScreen is in RootStackParamList
2. **Chart not showing?** → react-native-chart-kit installed correctly
3. **Numbers wrong?** → Check TradingContext calculations
4. **Modal not opening?** → Check state in EntityScreen

## 🎉 Success!

If all tests pass, your trading system is **fully functional**! 

Next steps:
- Connect to backend API
- Add real-time subscriptions
- Implement persistence
- Add advanced order types

---

**Need help?** Check `TRADING_SYSTEM_GUIDE.md` for detailed documentation.

