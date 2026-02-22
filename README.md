# Movie Roulette 🎬

A dynamic web application to pick a random movie from Letterboxd lists with real-time progress tracking.

## Features
- **Honest Progress:** Transparent loading states synchronized with backend operations.
- **Granular API:** Segmented fetching (Metadata -> Selection -> Details) for a better UX.
- **Mobile Friendly:** Optimized for both desktop and mobile viewing.

## Tech Stack
- **Backend:** Flask (Python) + Letterboxdpy
- **Frontend:** Vanilla JS + CSS (Glassmorphism)
- **Deployment:** Vercel

## Local Development
1. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
2. Run the server:
   ```bash
   python -m api.index
   ```

## License
MIT
