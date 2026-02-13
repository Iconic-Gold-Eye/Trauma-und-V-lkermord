# Trauma-und-V-lkermord

A browser-based **3D JavaScript first-person shooter prototype** with a simple dialogue system.

## Features
- WASD movement + jump + mouse look (pointer lock)
- FPS shooting with ammo/reload behavior
- Enemy NPCs that chase the player
- Dialogue interaction with a guide NPC (`E` key)
- Placeholder story dialogue ready for your custom plot later

## Run locally
```bash
python3 -m http.server 8000
```
Open: `http://localhost:8000`

## Controls
- **W/A/S/D**: Move
- **Space**: Jump
- **Left Click**: Shoot
- **E**: Start/advance dialogue

## Story customization
Edit the `dialogueScript` array in `game.js` and replace the placeholder lines with your own story when you're ready.
