# ⚽ Football Match Coder

A video coding application for analyzing football matches, similar to Metrica Nexus but specifically designed for football data collection.

## Features

### Video Playback
- **Frame-by-frame navigation** - Use arrow keys or buttons to move frame by frame
- **Variable playback speed** - 0.25x to 2.0x speed control
- **Quick seek** - Jump forward/backward 5 seconds
- **Time display** - Current timestamp shown in HH:MM:SS format
- **Match info overlay** - Display current half, minute, and score on video

### Event Coding
- **Pass Events**: Pass complete, pass incomplete, key pass, assist
- **Shot Events**: Shot on target, shot off target, shot blocked, goal
- **Defensive Events**: Tackle, interception, clearance, block
- **Dribble Events**: Dribble success, dribble fail, take-on
- **Fouls & Cards**: Foul, yellow card, red card
- **Other Events**: Corner, free kick, throw-in, offside, substitution
- **Location Tracking**: Zone selection (defensive third, middle third, attacking third, penalty area, box)
- **Player Tracking**: Record player name/number and team
- **Match Context**: Half, minute, and score tracking

### Data Management
- **Auto-save** - Session data automatically saved to browser localStorage
- **Export to CSV** - Export all events as CSV for analysis
- **Save Session** - Save complete session as JSON file
- **Events Log** - Real-time log of all coded events with timestamps
- **Auto Score Update** - Score automatically increments when goals are recorded

### Keyboard Shortcuts
- `Space` - Play/Pause
- `←` / `→` - Previous/Next frame
- `P` - Pass Complete
- `I` - Pass Incomplete
- `K` - Key Pass
- `A` - Assist
- `S` - Shot On Target
- `O` - Shot Off Target
- `G` - Goal
- `B` - Shot Blocked
- `T` - Tackle
- `N` - Interception
- `C` - Clearance
- `L` - Block
- `D` - Dribble Success
- `F` - Dribble Fail
- `W` - Take-On
- `U` - Foul
- `Y` - Yellow Card
- `R` - Red Card
- `1-5` - Other events (1=Corner, 2=Free Kick, 3=Throw-In, 4=Offside, 5=Substitution)

## Usage

1. **Load Video**: Click "Load Video" and select your football match video file
2. **Set Match Info**: Enter session name, home team, away team
3. **Set Match Context**: Select half, enter minute, set current score
4. **Code Events**: 
   - Select team and enter player name/number
   - Play video and pause at key moments
   - Click event buttons or use keyboard shortcuts to code events
   - Select zone and add notes as needed
5. **Export Data**: Click "Export Data" to download CSV file with all events

## Data Structure

### Event Object
```json
{
  "id": 1234567890,
  "type": "goal",
  "timestamp": 45.5,
  "timeString": "00:00:45",
  "half": "1",
  "minute": 23,
  "homeScore": 1,
  "awayScore": 0,
  "team": "home",
  "playerName": "Player #10",
  "zone": "penalty-area",
  "notes": "Great finish from close range"
}
```

### CSV Export Format
- Timestamp (seconds)
- Time (HH:MM:SS)
- Half (1, 2, ET1, ET2)
- Minute
- Event Type
- Team (home/away)
- Player Name/Number
- Zone
- Home Score
- Away Score
- Notes

## Browser Compatibility

Works best in modern browsers (Chrome, Firefox, Safari, Edge). Video format support depends on browser codecs (MP4/H.264 recommended).

## Local Storage

Session data is automatically saved to browser localStorage. To clear:
- Use browser developer tools
- Or click "Clear Log" to remove events (session info remains)

### Advanced Features
- **Lineup Management** - Load lineups from CSV, Excel, or URLs (supports ACC boxscore format)
- **Button Presets** - Customize which event buttons are visible
- **Event Templates** - Save and reuse coding sequences
- **Tags System** - Tag events with custom labels for better organization
- **Event Filtering** - Filter events by type, team, player, tags, or time range
- **Event Timeline** - Visual timeline with color-coded events, zoom, and click-to-jump
- **Undo/Redo** - Full undo/redo support for event coding
- **Event Counters** - Track how many times each event type has been coded
- **Video Saving** - Save loaded videos in the browser for persistence
- **Resizable Panels** - Drag to resize video player and coding panel
- **Resizable Event Log** - Adjust event log height to your preference
- **Match Time Sync** - Sync video time with match time (half/minute)

## Installation & Setup

### Local Development
1. Clone or download this repository
2. Navigate to the directory
3. Start a local server:
   ```bash
   python3 -m http.server 8502
   ```
4. Open `http://localhost:8502` in your browser

### GitHub Pages Deployment
See deployment instructions below.

## Future Enhancements

Potential features to add:
- Multiple video support (different camera angles)
- Video synchronization
- Statistical summaries (pass accuracy, shot conversion, etc.)
- Player performance tracking
- Heat maps
- Integration with existing data pipeline
- xG (expected goals) tracking
- Pass network visualization
- AI player tracking
- Video drawing/annotation tools

