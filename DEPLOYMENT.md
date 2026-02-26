# Deploying Hecate to Vercel

This guide will help you deploy your token tree visualization app to Vercel.

## Prerequisites

1. A Vercel account (sign up at https://vercel.com)
2. Git installed on your machine
3. Your OpenAI API key

## Step 1: Initialize Git Repository

If you haven't already, initialize a git repository:

```bash
cd /Users/omgokhale/Desktop/Coding/Hecate
git init
git add .
git commit -m "Initial commit"
```

## Step 2: Push to GitHub

1. Create a new repository on GitHub (https://github.com/new)
2. Don't initialize it with README, .gitignore, or license
3. Push your code:

```bash
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git
git branch -M main
git push -u origin main
```

## Step 3: Deploy to Vercel

### Option A: Deploy via Vercel Website (Recommended)

1. Go to https://vercel.com and log in
2. Click "Add New..." → "Project"
3. Import your GitHub repository
4. Vercel will auto-detect the configuration from `vercel.json`
5. **Important**: Add your environment variable:
   - Click "Environment Variables"
   - Add: `OPENAI_API_KEY` with your OpenAI API key
   - Make sure it's available for Production, Preview, and Development
6. Click "Deploy"

### Option B: Deploy via Vercel CLI

1. Install Vercel CLI:
```bash
npm install -g vercel
```

2. Login to Vercel:
```bash
vercel login
```

3. Deploy from the project root:
```bash
cd /Users/omgokhale/Desktop/Coding/Hecate
vercel
```

4. Follow the prompts:
   - Set up and deploy? **Y**
   - Which scope? Select your account
   - Link to existing project? **N**
   - What's your project's name? **hecate** (or your preferred name)
   - In which directory is your code located? **./**
   - Want to override settings? **N**

5. Add environment variable:
```bash
vercel env add OPENAI_API_KEY
```
   - Paste your OpenAI API key
   - Select all environments (Production, Preview, Development)

6. Redeploy to apply environment variable:
```bash
vercel --prod
```

## Step 4: Verify Deployment

Once deployed, Vercel will provide you with a URL (e.g., `https://hecate.vercel.app`).

1. Visit your deployment URL
2. Try the ASCII animation on the home page
3. Enter a prompt and verify the token tree generates correctly

## Troubleshooting

### Build Errors

If the frontend build fails:
```bash
cd frontend
npm install
npm run build
```
Fix any errors locally, commit, and redeploy.

### API Key Issues

If you see "OpenAI API key not configured":
1. Go to your Vercel project settings
2. Navigate to "Environment Variables"
3. Verify `OPENAI_API_KEY` is set correctly
4. Redeploy the project

### CORS Issues

The backend is configured to accept requests from any origin. If you want to restrict this in production:

Edit `backend/app.py`:
```python
CORS(app, resources={r"/api/*": {"origins": "https://your-domain.vercel.app"}})
```

## Custom Domain (Optional)

1. Go to your Vercel project settings
2. Navigate to "Domains"
3. Add your custom domain
4. Follow Vercel's instructions to configure DNS

## Environment Variables

The following environment variables are required:

| Variable | Description | Required |
|----------|-------------|----------|
| `OPENAI_API_KEY` | Your OpenAI API key | Yes |

## Monitoring

- View logs in Vercel dashboard under "Deployments" → Select deployment → "Logs"
- Monitor API usage in your OpenAI dashboard

## Updating the Deployment

To deploy updates:

```bash
git add .
git commit -m "Your commit message"
git push origin main
```

Vercel will automatically deploy the changes.

## Performance Notes

- Backend runs as serverless functions with cold starts (~1-2s)
- First API request may be slower due to cold start
- Subsequent requests are faster
- Frontend is served via Vercel's CDN for fast global access

## Cost Considerations

- Vercel: Free tier includes 100GB bandwidth and 6000 minutes serverless execution
- OpenAI: API costs depend on usage (GPT-3.5-turbo is cost-effective)
- Monitor usage in both dashboards

---

🎉 Your Hecate app is now live on Vercel!
