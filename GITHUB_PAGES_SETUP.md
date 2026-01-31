# GitHub Pages Setup Guide

Follow these steps to deploy your Football Match Coder app to GitHub Pages:

## Step 1: Create a GitHub Repository

1. Go to [GitHub.com](https://github.com) and sign in
2. Click the **"+"** icon in the top right → **"New repository"**
3. Name your repository (e.g., `football-match-coder`)
4. Make it **Public** (required for free GitHub Pages)
5. **Don't** initialize with README, .gitignore, or license (we already have these)
6. Click **"Create repository"**

## Step 2: Initialize Git and Push Your Code

Open Terminal and run these commands:

```bash
# Navigate to your project directory
cd "/Users/daniel/Documents/Smart Sports Lab/Coding App/Football"

# Initialize git repository
git init

# Add all files
git add .

# Create initial commit
git commit -m "Initial commit: Football Match Coder app"

# Add your GitHub repository as remote (replace YOUR_USERNAME and REPO_NAME)
git remote add origin https://github.com/YOUR_USERNAME/REPO_NAME.git

# Rename branch to main (if needed)
git branch -M main

# Push to GitHub
git push -u origin main
```

**Important:** Replace `YOUR_USERNAME` with your GitHub username and `REPO_NAME` with your repository name.

## Step 3: Enable GitHub Pages

1. Go to your repository on GitHub
2. Click **"Settings"** (top menu)
3. Scroll down to **"Pages"** in the left sidebar
4. Under **"Source"**, select:
   - **Branch:** `main`
   - **Folder:** `/ (root)`
5. Click **"Save"**

## Step 4: Access Your App

GitHub will provide you with a URL like:
```
https://YOUR_USERNAME.github.io/REPO_NAME/
```

It may take a few minutes for the site to be available. You'll see a green checkmark when it's ready.

## Step 5: Share with Your Classmates

Share the GitHub Pages URL with your classmates. They can access it from any device with an internet connection!

## Updating Your App

Whenever you make changes:

```bash
cd "/Users/daniel/Documents/Smart Sports Lab/Coding App/Football"
git add .
git commit -m "Description of your changes"
git push
```

GitHub Pages will automatically update within a few minutes.

## Troubleshooting

- **404 Error**: Wait a few minutes after enabling Pages, it takes time to build
- **Changes not showing**: Clear your browser cache or wait a few minutes
- **Repository not found**: Make sure the repository is set to **Public**

## Notes

- GitHub Pages is free for public repositories
- Your code will be publicly visible (which is fine for a class project)
- Videos loaded by users are stored locally in their browser (not uploaded to GitHub)
