# WaterEjector - Clean & Eject Water Instantly 💦🔊

[![Live Site](https://img.shields.io/badge/Live%20Website-waterejector.devdeskapp.com-8B5CF6?style=for-the-badge&logo=google-chrome&logoColor=white)](https://waterejector.devdeskapp.com/)

**Live Website:** [https://waterejector.devdeskapp.com/](https://waterejector.devdeskapp.com/)

WaterEjector is an advanced, free web-based tool designed to help you safely eject water and remove dust from your smartphone speakers using specific high-frequency sound waves.

## Features ✨
- **Water Ejection:** Uses a 165Hz pulsed frequency (similar to Apple's water eject mechanism) to push water out of the speaker mesh.
- **Dust Removal:** Sweeps through a range of frequencies (200Hz - 1500Hz) to mechanically dislodge debris and lint.
- **Vibration Mode:** A continuous low-frequency (80Hz) rumble to loosen stubborn particles.
- **Dark Mode Support:** A sleek, premium dark theme that automatically syncs with your OS preference or can be toggled manually.
- **Premium UI/UX:** Built with modern glassmorphism, smooth CSS animations, and intersection observers for a native app feel.
- **Responsive Design:** Works flawlessly on all devices (iOS, Android, Desktop).

## Tech Stack 🛠️
- **Frontend:** HTML5, CSS3 (Custom Variables, Flexbox, CSS Grid), Vanilla JavaScript.
- **Audio Generation:** HTML5 Web Audio API (Oscillators, Gain Nodes) - no external audio files required!
- **CI/CD:** GitHub Actions for automated deployment to GitHub Pages.

## Local Development 🚀
1. Clone the repository:
   ```bash
   git clone https://github.com/WaterEjector/WaterEjector.github.io.git
   ```
2. Navigate to the project directory:
   ```bash
   cd WaterEjector
   ```
3. Start a local server:
   ```bash
   python -m http.server 8080
   # OR
   npx serve .
   ```
4. Open your browser and go to `http://localhost:8080`

## Deployment 🌐
This project is configured with a GitHub Actions workflow (`.github/workflows/deploy.yml`). 
Any changes merged into the `main` branch automatically build and deploy to **GitHub Pages** at:  
👉 **[https://waterejector.devdeskapp.com/](https://waterejector.devdeskapp.com/)**

## License 📄
&copy; 2026 WaterEjector. All rights reserved. | Supported by [DevDesk App](https://www.devdeskapp.com/).
