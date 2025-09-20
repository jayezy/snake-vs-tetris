# Snake ⚔️ Tetris

A unique retro-style arcade game that combines the classic Snake gameplay with falling Tetris pieces. Navigate your growing snake through a battlefield of descending blocks while collecting power-ups and avoiding obstacles!

## 📸 Game Play

https://github.com/user-attachments/assets/82119db1-3e57-4d17-b8ab-926768b700e9

*The game features retro styling with a golden color scheme, falling Tetris pieces, a growing snake, and power-ups like apples and stars.*

## 🎮 Game Features

- **Classic Snake Movement**: Control a growing snake that gets longer with each apple eaten
- **Falling Tetris Pieces**: Avoid or use the traditional Tetris pieces (I, O, T, L, J, S, Z) that fall from the sky
- **Power-ups**: Collect apples for points and star power-ups for special abilities
- **Destruction Mode**: Star power-ups activate a special mode where you can destroy Tetris pieces
- **Dynamic Difficulty**: Game speed increases as you eat more apples
- **Score System**: Points based on snake length and power-ups collected
- **Retro Aesthetics**: Classic pixel-perfect graphics with vintage arcade styling

## 🕹️ Controls

### Snake Movement
- **↑ Arrow Key**: Move Up
- **↓ Arrow Key**: Move Down
- **← Arrow Key**: Move Left
- **→ Arrow Key**: Move Right

### Game Controls
- **Enter**: Restart game when game over
- **Click "Play Again"**: Alternative restart option

## 📋 Game Rules

### Basic Gameplay
1. **Snake Movement**: Your snake moves continuously in the direction you choose
2. **Growth**: Each apple eaten makes your snake grow longer
3. **Collision**: Game ends if snake hits the walls, itself, or Tetris pieces
4. **Scoring**: Earn points based on your snake's length when eating apples

### Power-ups
- **🍎 Apples**:
  - Give points (10 × current snake length)
  - Make snake grow longer
  - Increase game speed
  - Spawn randomly on the board

- **⭐ Stars**:
  - Give 50 bonus points
  - Activate "Destruction Mode" for 5 seconds
  - Allow snake to destroy Tetris pieces on contact
  - Spawn randomly every 5-13 seconds

### Tetris Pieces
- **7 Classic Shapes**: I-piece, O-piece, T-piece, L-piece, J-piece, S-piece, Z-piece
- **Falling Behavior**: Pieces fall from the top of the screen at increasing speeds
- **Collision**: Touching a piece ends the game (unless in Destruction Mode)
- **Colors**: Each piece type has its own distinctive color

### Destruction Mode
- **Activation**: Triggered by collecting a star power-up
- **Duration**: Lasts for 5 seconds
- **Ability**: Snake can destroy Tetris pieces by running into them
- **Visual Effect**: Explosive animations when pieces are destroyed

### Difficulty Scaling
- **Speed Increase**: Both snake and Tetris pieces move faster as you progress
- **Apple Effect**: Each apple eaten increases speed by 10%
- **Tetris Frequency**: More pieces fall as the game progresses

## 🎯 Scoring System

- **Apple Collection**: 10 points × current snake length
- **Star Collection**: 50 bonus points
- **High Score**: Automatically saved and displayed
- **Snake Length**: Tracked and displayed in real-time

## 🎨 Visual Style

- **Font**: Press Start 2P (classic arcade font)
- **Color Scheme**: Retro gold and brown tones with dark background
- **Effects**: Smooth animations, particle explosions, and classic pixel art styling
- **UI**: Vintage-style borders, buttons, and score panels

## 🚀 How to Play

1. Open `index.html` in any modern web browser
2. Use arrow keys to control your snake
3. Eat apples to grow and score points
4. Avoid Tetris pieces (unless you have star power)
5. Collect stars for temporary invincibility and destruction abilities
6. Try to achieve the highest score possible!

## 🛠️ Technical Details

- **Built with**: HTML5 Canvas, JavaScript, CSS3
- **Audio**: Web Audio API for retro sound effects
- **Storage**: LocalStorage for high score persistence
- **Responsive**: Optimized for desktop gameplay
- **Performance**: Smooth 60fps gameplay with efficient rendering

## 🏆 Tips for High Scores

1. **Plan Your Route**: Think ahead to avoid getting trapped by Tetris pieces
2. **Star Timing**: Save stars for when you're surrounded by pieces
3. **Speed Management**: Remember that each apple makes the game faster
4. **Corner Strategy**: Use corners and edges to your advantage
5. **Destruction Mode**: Maximize the 5-second power-up window

---

**Enjoy the game and try to beat your high score!** 🎮✨
