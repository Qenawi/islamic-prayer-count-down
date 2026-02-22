# Prayer Time Countdown (GitHub Pages)

Simple static app that shows:
- Today prayer times (`Fajr`, `Dhuhr`, `Asr`, `Maghrib`, `Isha`)
- Live countdown to the next prayer
- Browser geolocation support with manual `city + country` fallback

## Files

- `index.html`
- `styles.css`
- `script.js`

## Run locally

Open `index.html` in your browser.

## Deploy to GitHub Pages

1. Push this folder to a GitHub repository.
2. Open repository `Settings` -> `Pages`.
3. Under `Build and deployment`, set:
   - `Source`: `Deploy from a branch`
   - `Branch`: `main` (or your default branch), `/ (root)`
4. Save and wait for GitHub to publish.
5. Open the URL shown in the Pages section.

## Notes

- Prayer times are loaded from Aladhan API in the browser.
- Location access may be blocked on some browsers; manual location form is included.
