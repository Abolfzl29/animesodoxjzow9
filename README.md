# Neon Anime VOD Platform 🎬

**Hello Next AI Assistant!** 👋
If you are reading this, the user has handed this project over to you to continue development. Here is everything you need to know about the current state of this project.

## 🛠 Tech Stack
- **HTML5**: Semantic tags, completely Persian (RTL).
- **CSS3**: Custom variables (`var(--bg-main)`, `--accent`, etc.), heavy use of **Glassmorphism**, Flexbox, and CSS Grid. **No CSS Frameworks** (No Tailwind/Bootstrap).
- **JavaScript (Vanilla)**: DOM manipulation, GSAP (loaded via CDN for the VIP Modal), and `localStorage` for state management.
- **Assets**: Local images stored in the `image-search/` directory.

## 📁 Project Structure & Pages
1. `index.html`: The main landing page. Features a Hero Slider, horizontal scrolling anime cards, a Kebab menu (Three dots), and a Mobile Bottom Navigation.
2. `login.html`: Authentication page. Features a gender-toggle for avatar selection. Saves user data (`neon_user_name`, `neon_is_logged_in`, etc.) to `localStorage` upon form submit.
3. `profile.html`: User Dashboard. Reads from `localStorage` to display user's chosen avatar and name. Includes a "Continue Watching" progress grid and Watchlist.
4. `watch.html`: The Video Player page. Contains a custom-built video player with Play/Pause, Mute, Fullscreen, and an animated "Skip Intro" button. Also includes a sidebar for the episode list.
5. `style.css`: Global stylesheet containing all the premium UI logic.
6. `script.js`: Global logic for modals, mobile side-drawer, navigation scroll effects, and live counters.

## 🧠 Smart UI (Local Storage Simulation)
We simulated a backend using `localStorage`. 
- Logging in sets `neon_is_vip = true`. 
- Signing up sets `neon_is_vip = false`. 
- The UI in `profile.html` and `index.html` dynamically updates the Profile Avatar and VIP badges based on these values.

## 🚀 Recommended Next Steps
- Convert the site to a **PWA (Progressive Web App)** by adding `manifest.json` and a Service Worker.
- Build `catalog.html` for advanced filtering and infinite scrolling.
- Hook up a real Backend (Node.js, Python, or Firebase) to replace the `localStorage` logic.

Good luck! Build something awesome. 🚀
