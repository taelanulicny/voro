# Pull Request Guide

## Step-by-Step Instructions

### 1. Ensure all changes are committed
```bash
# Check status
git status

# Stage all changes
git add .

# Commit with a descriptive message
git commit -m "Add entity feed comments, category/entity tabs, spotlights improvements, and various UI enhancements"
```

### 2. Push your branch to GitHub
```bash
# Push your current branch (mobile)
git push origin mobile

# If the branch doesn't exist on remote yet:
git push -u origin mobile
```

### 3. Create Pull Request on GitHub

#### Option A: Using GitHub CLI (if installed)
```bash
gh pr create --title "Add entity feed comments and UI enhancements" --body "This PR includes:
- Entity-level feed comments with @mentions
- Category and entity tabs (About, Feed, News)
- Spotlights improvements (square cards)
- Category page treemap/list view selector
- Various UI enhancements"
```

#### Option B: Using GitHub Website
1. Go to: https://github.com/taelanulicny/voro
2. Click "Pull requests" tab
3. Click "New pull request"
4. Select base branch (usually `main` or `algo-dev`)
5. Select compare branch (`mobile`)
6. Add title: "Add entity feed comments and UI enhancements"
7. Add description of changes
8. Click "Create pull request"

### 4. Review Process
- Wait for code review
- Address any feedback
- Make additional commits if needed
- They will automatically be added to the PR

### 5. Merge the PR
- Once approved, merge via GitHub UI
- Delete the branch after merging (optional cleanup)

## Common Commands Reference

```bash
# Check current status
git status

# View branch history
git log --oneline --graph

# See what files changed
git diff

# Switch branches
git checkout main

# Create new branch
git checkout -b feature/new-feature

# Pull latest changes
git pull origin main
```

