# 🌸 Bloom & Bite — 3D Voxel Tower Defense

A stylized 3D voxel tower defense game built with vanilla **HTML5 WebGL 2.0 & WebAudio** — zero external runtime dependencies, 100% client-side, mobile-touch ready, and deployable on **GitHub Pages**.

---

## 🎮 How to Play

Defend your prize strawberry at the end of the garden path against 10 waves of hungry caterpillars!

- **Plant Towers**: Click/tap a plant in the bottom dock (`[1]–[4]`), then click any green grass tile. Press the same hotkey or tap the selected card again to deselect.
- **Inspect / Upgrade / Uproot**: Click any planted tower on the field to upgrade its damage & range, or uproot it for a Sun Dew refund.
- **Controls**:
  - **Right-Click Drag**: Orbit / Rotate 3D camera
  - **Left-Click**: Plant / Select / Inspect
  - **Middle-Click Drag**: Pan garden view
  - **Mouse Wheel / 2-Finger Pinch**: Zoom in & out
  - **Mobile / Tablet**: 1-Finger drag to orbit, 2-Finger pinch/pan, tap to plant
- **Hotkeys**:
  - `[1]–[4]`: Select / Deselect plant
  - `[Space]`: Start next wave
  - `[A]`: Toggle Auto Wave
  - `[P]`: Pause / Resume
  - `[M]`: Toggle Background Music
  - `[Q] / [E]` or `[Arrow Keys]`: Rotate camera

---

## 🌻 Plant Types

| Plant | Cost | Role | Special Effect |
| :--- | :---: | :--- | :--- |
| **Pea Sprout** | 💧 50 | Rapid Striker | High fire rate single-target damage |
| **Frost Bell** | 💧 75 | Area Support | Slows caterpillars by 50% with icy frost shards |
| **Puff Shroom** | 💧 100 | Area of Effect | Exploding spore cloud dealing splash damage |
| **Sun Flora** | 💧 125 | Long-Range Sniper | High single-hit solar beam with massive range |

---

## 🐛 Difficulty Levels

- **Easy**: 💧 200 starting Dew, ❤️ 15 lives, 0.75× smaller enemy swarms, 0.8× enemy HP.
- **Medium**: 💧 150 starting Dew, ❤️ 10 lives, standard balanced 10 waves.
- **Hard**: 💧 120 starting Dew, ❤️ 6 lives, **1.5× swarm size (highest enemy count)**, **1.45× enemy HP**, faster movement speed.

---

## 🚀 Deploying to GitHub Pages (Free Hosting)

1. Push this folder to a GitHub repository.
2. In your repository on GitHub, go to **Settings** → **Pages**.
3. Under **Branch**, select `main` (or `master`) and folder `/(root)`.
4. Click **Save**.
5. Within 1–2 minutes, your game is live at `https://<your-username>.github.io/<repo-name>/`!

---

## 🎵 Open-Source Assets & Licenses

- **3D Voxel Models & Animations**: Custom modeled in Blender (`Pea_Sprout`, `Frost_Bell`, `Puff_Shroom`, `Sun_Flora`, `Green_Inchworm`, `Yellow_Sprinter`, `Armored_Beetle`, `Monarch_Boss`, `Prize_Strawberry`, `Grass_Block`, `Hollow_Log`).
- **Sound & Music**:
  - WebAudio procedural endless garden marimba synthesizer.
  - CC0 (Public Domain) BGM & SFX from OpenGameArt.org (*rubberduck 100 CC0 SFX*, *Tower Defense Theme*).
