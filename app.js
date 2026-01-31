// Football Match Coder - Main Application Logic

class FootballMatchCoder {
    constructor() {
        this.video = document.getElementById('videoPlayer');
        this.events = [];
        this.lineups = {
            home: [],
            away: []
        };
        this.currentSession = {
            name: '',
            homeTeam: '',
            awayTeam: '',
            events: [],
            lineups: {
                home: [],
                away: []
            },
            createdAt: new Date().toISOString()
        };
        
        // Tags system
        this.currentEventTags = [];
        this.availableTags = [];
        this.tagPresets = [];
        
        // Filtering
        this.activeFilters = {
            search: '',
            eventTypes: [],
            team: '',
            player: '',
            tags: [],
            timeStart: null,
            timeEnd: null
        };
        this.filteredEvents = null;
        
        // Templates
        this.templates = {};
        this.templateSequence = [];
        
        // Match time sync
        this.matchStartOffset = 0;
        
        // Video storage
        this.currentVideoFile = null;
        this.videoFileName = '';
        
        // Space bar speed control
        this.spaceBarPressed = false;
        this.previousSpeed = 1.0;
        
        // Undo/Redo system
        this.eventHistory = [];
        this.undoStack = [];
        this.maxHistorySize = 100;
        
        // Event counters
        this.eventCounters = {};
        
        // Timeline zoom
        this.timelineZoom = 1.0;
        this.timelineStartTime = 0;
        this.timelineEndTime = null;
        
        // Define all event types for presets
        this.allEventTypes = {
            'pass': [
                { event: 'pass-complete', label: 'Pass Complete', key: 'P' },
                { event: 'pass-incomplete', label: 'Pass Incomplete', key: 'I' },
                { event: 'key-pass', label: 'Key Pass', key: 'K' },
                { event: 'assist', label: 'Assist', key: 'A' }
            ],
            'shot': [
                { event: 'shot-on-target', label: 'Shot On Target', key: 'S' },
                { event: 'shot-off-target', label: 'Shot Off Target', key: 'O' },
                { event: 'goal', label: 'Goal', key: 'G' },
                { event: 'shot-blocked', label: 'Shot Blocked', key: 'B' }
            ],
            'defensive': [
                { event: 'tackle', label: 'Tackle', key: 'T' },
                { event: 'interception', label: 'Interception', key: 'N' },
                { event: 'clearance', label: 'Clearance', key: 'C' },
                { event: 'block', label: 'Block', key: 'L' }
            ],
            'dribble': [
                { event: 'dribble-success', label: 'Dribble Success', key: 'D' },
                { event: 'dribble-fail', label: 'Dribble Fail', key: 'F' },
                { event: 'take-on', label: 'Take-On', key: 'W' }
            ],
            'foul': [
                { event: 'foul', label: 'Foul', key: 'U' },
                { event: 'yellow-card', label: 'Yellow Card', key: 'Y' },
                { event: 'red-card', label: 'Red Card', key: 'R' }
            ],
            'other': [
                { event: 'corner', label: 'Corner', key: '1' },
                { event: 'free-kick', label: 'Free Kick', key: '2' },
                { event: 'throw-in', label: 'Throw-In', key: '3' },
                { event: 'offside', label: 'Offside', key: '4' },
                { event: 'substitution', label: 'Substitution', key: '5' }
            ]
        };
        
        // Default preset (all events enabled)
        this.defaultPreset = {};
        Object.keys(this.allEventTypes).forEach(category => {
            this.allEventTypes[category].forEach(eventType => {
                this.defaultPreset[eventType.event] = true;
            });
        });
        
        this.currentPreset = { ...this.defaultPreset };
        
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.setupKeyboardShortcuts();
        this.loadSessionFromStorage();
        this.updateEventsList();
        this.updateMatchInfo();
    }

    setupEventListeners() {
        // Video file input
        document.getElementById('loadVideoBtn').addEventListener('click', () => {
            document.getElementById('videoFileInput').click();
        });

        document.getElementById('videoFileInput').addEventListener('change', async (e) => {
            const file = e.target.files[0];
            if (file) {
                await this.loadVideoFile(file);
            }
        });

        // Save video button
        document.getElementById('saveVideoBtn').addEventListener('click', () => {
            this.saveVideoFile();
        });

        // Video controls
        document.getElementById('playPause').addEventListener('click', () => this.togglePlayPause());
        document.getElementById('playPauseMain').addEventListener('click', () => this.togglePlayPause());
        document.getElementById('rewind').addEventListener('click', () => this.seek(-5));
        document.getElementById('forward').addEventListener('click', () => this.seek(5));
        document.getElementById('slowMotion').addEventListener('click', () => this.setSpeed(0.5));
        document.getElementById('normalSpeed').addEventListener('click', () => this.setSpeed(1.0));
        document.getElementById('fastForward').addEventListener('click', () => this.setSpeed(2.0));

        // Frame controls
        const prevFrameBtn = document.getElementById('prevFrame');
        const nextFrameBtn = document.getElementById('nextFrame');
        
        if (prevFrameBtn) {
            prevFrameBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.seekFrame(-1, true);
            });
        }
        
        if (nextFrameBtn) {
            nextFrameBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.seekFrame(1, true);
            });
        }
        
        // Sync time button
        document.getElementById('syncTimeBtn').addEventListener('click', () => {
            this.syncMatchTimeWithVideo();
        });

        // Speed slider
        const speedSlider = document.getElementById('speedSlider');
        speedSlider.addEventListener('input', (e) => {
            const speed = parseFloat(e.target.value);
            this.setSpeed(speed);
        });

        // Video time update
        this.video.addEventListener('timeupdate', () => {
            this.updateTimeDisplay();
            this.updateTimeline();
            this.autoUpdateMatchTime();
        });

        // Video loaded metadata
        this.video.addEventListener('loadedmetadata', () => {
            this.updateTimeline();
            this.updateTimelineEvents();
        });

        // Video duration change
        this.video.addEventListener('durationchange', () => {
            this.updateTimeline();
        });

        // Setup timeline
        this.setupTimeline();
        this.setupTimelineZoom();

        // Event buttons - use event delegation on coding panel to prevent duplicate listeners
        const codingPanel = document.querySelector('.coding-panel');
        if (codingPanel) {
            codingPanel.addEventListener('click', (e) => {
                const btn = e.target.closest('.event-btn');
                if (btn) {
                    e.preventDefault();
                    e.stopPropagation();
                    const eventType = btn.getAttribute('data-event');
                    if (eventType) {
                        this.recordEvent(eventType);
                    }
                }
            });
        }

        // Save and export
        document.getElementById('saveBtn').addEventListener('click', () => this.saveSession());
        
        // Export dropdown
        const exportBtn = document.getElementById('exportBtn');
        const exportMenu = document.getElementById('exportMenu');
        
        exportBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            exportMenu.style.display = exportMenu.style.display === 'block' ? 'none' : 'block';
        });
        
        document.querySelectorAll('.export-option').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const format = btn.getAttribute('data-format');
                this.exportData(format);
                exportMenu.style.display = 'none';
            });
        });
        
        // Close dropdown when clicking outside
        document.addEventListener('click', () => {
            exportMenu.style.display = 'none';
        });

        // Clear log
        document.getElementById('clearLog').addEventListener('click', () => {
            if (confirm('Clear all events?')) {
                this.events = [];
                this.currentSession.events = [];
                this.updateEventsList();
                this.saveToStorage();
            }
        });

        // Session info
        document.getElementById('sessionName').addEventListener('input', (e) => {
            this.currentSession.name = e.target.value;
            this.saveToStorage();
        });

        document.getElementById('homeTeam').addEventListener('input', (e) => {
            this.currentSession.homeTeam = e.target.value;
            this.saveToStorage();
        });

        document.getElementById('awayTeam').addEventListener('input', (e) => {
            this.currentSession.awayTeam = e.target.value;
            this.saveToStorage();
        });

        // Match info updates
        document.getElementById('half').addEventListener('change', () => this.updateMatchInfo());
        document.getElementById('minute').addEventListener('input', () => this.updateMatchInfo());
        document.getElementById('homeScore').addEventListener('input', () => this.updateMatchInfo());
        document.getElementById('awayScore').addEventListener('input', () => this.updateMatchInfo());

        // Lineup loading
        document.getElementById('loadLineupFileBtn').addEventListener('click', () => {
            document.getElementById('lineupFileInput').click();
        });

        document.getElementById('lineupFileInput').addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                this.loadLineupFromFile(file);
            }
        });

        document.getElementById('loadLineupUrlBtn').addEventListener('click', () => {
            const url = document.getElementById('lineupUrlInput').value.trim();
            if (url) {
                this.loadLineupFromUrl(url);
            } else {
                alert('Please enter a URL');
            }
        });

        // Update player selection when team changes
        document.getElementById('team').addEventListener('change', () => {
            this.updatePlayerList();
        });
        
        // Sync player selection to team dropdown
        document.getElementById('homePlayerSelect').addEventListener('change', () => {
            document.getElementById('team').value = 'home';
        });
        
        document.getElementById('awayPlayerSelect').addEventListener('change', () => {
            document.getElementById('team').value = 'away';
        });

        // Preset management
        this.setupPresetManagement();

        // Shortcuts modal
        this.setupShortcutsModal();
        
        // Tags system
        this.setupTagsSystem();
        
        // Filtering system
        this.setupFilteringSystem();
        
        // Templates system
        this.setupTemplatesSystem();
        
        // Load saved data
        this.loadTagsFromStorage();
        this.loadTemplatesFromStorage();
        this.loadMatchStartOffset();
        
        // Initialize event counters
        this.initializeEventCounters();
        
        // Setup events log resizer
        this.setupEventsLogResizer();
        
        // Setup video and panel resizers
        this.setupVideoResizer();
        this.setupPanelResizer();
        
        // Try to restore video from storage
        this.restoreVideoFromStorage();
    }

    setupVideoResizer() {
        const resizer = document.getElementById('videoResizer');
        const videoSection = document.getElementById('videoSection');
        const mainContent = document.querySelector('.main-content');
        let isResizing = false;
        let startX = 0;
        let startWidth = 0;
        let startPanelWidth = 0;

        resizer.addEventListener('mousedown', (e) => {
            isResizing = true;
            startX = e.clientX;
            startWidth = parseInt(window.getComputedStyle(videoSection).width, 10);
            const codingPanel = document.getElementById('codingPanel');
            startPanelWidth = parseInt(window.getComputedStyle(codingPanel).width, 10);
            document.body.style.cursor = 'ew-resize';
            document.body.style.userSelect = 'none';
            e.preventDefault();
        });

        document.addEventListener('mousemove', (e) => {
            if (!isResizing) return;
            
            const diff = e.clientX - startX;
            const newWidth = startWidth + diff;
            const minWidth = 300;
            const maxWidth = window.innerWidth - 350; // Leave room for panel
            
            if (newWidth >= minWidth && newWidth <= maxWidth) {
                videoSection.style.width = `${newWidth}px`;
                videoSection.style.flex = 'none';
                
                // Adjust panel width to maintain total
                const codingPanel = document.getElementById('codingPanel');
                const totalWidth = startWidth + startPanelWidth;
                const newPanelWidth = totalWidth - newWidth;
                if (newPanelWidth >= 300 && newPanelWidth <= 800) {
                    codingPanel.style.width = `${newPanelWidth}px`;
                }
            }
        });

        document.addEventListener('mouseup', () => {
            if (isResizing) {
                isResizing = false;
                document.body.style.cursor = '';
                document.body.style.userSelect = '';
                
                // Save widths
                const videoWidth = parseInt(window.getComputedStyle(videoSection).width, 10);
                const panelWidth = parseInt(window.getComputedStyle(document.getElementById('codingPanel')).width, 10);
                localStorage.setItem('footballMatchCoder_videoWidth', videoWidth.toString());
                localStorage.setItem('footballMatchCoder_panelWidth', panelWidth.toString());
            }
        });
    }

    setupPanelResizer() {
        const resizer = document.getElementById('panelResizer');
        const codingPanel = document.getElementById('codingPanel');
        const videoSection = document.getElementById('videoSection');
        let isResizing = false;
        let startX = 0;
        let startWidth = 0;
        let startVideoWidth = 0;

        resizer.addEventListener('mousedown', (e) => {
            isResizing = true;
            startX = e.clientX;
            startWidth = parseInt(window.getComputedStyle(codingPanel).width, 10);
            startVideoWidth = parseInt(window.getComputedStyle(videoSection).width, 10);
            document.body.style.cursor = 'ew-resize';
            document.body.style.userSelect = 'none';
            e.preventDefault();
        });

        document.addEventListener('mousemove', (e) => {
            if (!isResizing) return;
            
            const diff = startX - e.clientX; // Inverted for left resizer
            const newWidth = startWidth + diff;
            const minWidth = 300;
            const maxWidth = 800;
            
            if (newWidth >= minWidth && newWidth <= maxWidth) {
                codingPanel.style.width = `${newWidth}px`;
                
                // Adjust video width to maintain total
                const totalWidth = startWidth + startVideoWidth;
                const newVideoWidth = totalWidth - newWidth;
                if (newVideoWidth >= 300) {
                    videoSection.style.width = `${newVideoWidth}px`;
                    videoSection.style.flex = 'none';
                }
            }
        });

        document.addEventListener('mouseup', () => {
            if (isResizing) {
                isResizing = false;
                document.body.style.cursor = '';
                document.body.style.userSelect = '';
                
                // Save widths
                const panelWidth = parseInt(window.getComputedStyle(codingPanel).width, 10);
                const videoWidth = parseInt(window.getComputedStyle(videoSection).width, 10);
                localStorage.setItem('footballMatchCoder_panelWidth', panelWidth.toString());
                localStorage.setItem('footballMatchCoder_videoWidth', videoWidth.toString());
            }
        });

        // Restore saved widths
        const savedPanelWidth = localStorage.getItem('footballMatchCoder_panelWidth');
        const savedVideoWidth = localStorage.getItem('footballMatchCoder_videoWidth');
        if (savedPanelWidth) {
            codingPanel.style.width = `${savedPanelWidth}px`;
        }
        if (savedVideoWidth) {
            videoSection.style.width = `${savedVideoWidth}px`;
            videoSection.style.flex = 'none';
        }
    }

    setupEventsLogResizer() {
        const resizer = document.getElementById('eventsLogResizer');
        const eventsLog = document.getElementById('eventsLog');
        let isResizing = false;
        let startY = 0;
        let startHeight = 0;

        resizer.addEventListener('mousedown', (e) => {
            isResizing = true;
            startY = e.clientY;
            startHeight = parseInt(window.getComputedStyle(eventsLog).height, 10);
            document.body.style.cursor = 'ns-resize';
            e.preventDefault();
        });

        document.addEventListener('mousemove', (e) => {
            if (!isResizing) return;
            
            const height = startHeight - (e.clientY - startY);
            const minHeight = 100;
            const maxHeight = window.innerHeight * 0.8;
            const newHeight = Math.max(minHeight, Math.min(maxHeight, height));
            
            eventsLog.style.height = `${newHeight}px`;
            eventsLog.style.maxHeight = `${newHeight}px`;
            
            // Save height to localStorage
            localStorage.setItem('footballMatchCoder_eventsLogHeight', newHeight.toString());
        });

        document.addEventListener('mouseup', () => {
            if (isResizing) {
                isResizing = false;
                document.body.style.cursor = '';
            }
        });

        // Restore saved height
        const savedHeight = localStorage.getItem('footballMatchCoder_eventsLogHeight');
        if (savedHeight) {
            eventsLog.style.height = `${savedHeight}px`;
            eventsLog.style.maxHeight = `${savedHeight}px`;
        }
    }

    loadMatchStartOffset() {
        try {
            const saved = localStorage.getItem('footballMatchCoder_matchStartOffset');
            if (saved) {
                this.matchStartOffset = parseFloat(saved) || 0;
            }
        } catch (e) {
            console.warn('Could not load match start offset:', e);
        }
    }

    autoUpdateMatchTime() {
        // Only auto-update if match start offset is set
        if (this.matchStartOffset === undefined || this.matchStartOffset === 0) {
            return;
        }

        const videoTime = this.video.currentTime;
        const matchTime = videoTime - this.matchStartOffset;
        
        if (matchTime < 0) return; // Before match start
        
        // Calculate half and minute
        const halfLength = 45 * 60; // 45 minutes in seconds
        let half = '1';
        let minute = 0;
        
        if (matchTime < halfLength) {
            half = '1';
            minute = Math.floor(matchTime / 60);
        } else if (matchTime < halfLength * 2) {
            half = '2';
            minute = Math.floor((matchTime - halfLength) / 60);
        } else if (matchTime < halfLength * 3) {
            half = 'ET1';
            minute = Math.floor((matchTime - halfLength * 2) / 60);
        } else {
            half = 'ET2';
            minute = Math.floor((matchTime - halfLength * 3) / 60);
        }
        
        // Update form fields (only if they haven't been manually changed recently)
        const currentHalf = document.getElementById('half').value;
        const currentMinute = parseInt(document.getElementById('minute').value) || 0;
        
        // Only update if significantly different to avoid constant flickering
        if (half !== currentHalf || Math.abs(minute - currentMinute) > 1) {
            document.getElementById('half').value = half;
            document.getElementById('minute').value = minute;
            this.updateMatchInfo();
        }
    }

    setupShortcutsModal() {
        const shortcutsBtn = document.getElementById('shortcutsBtn');
        const shortcutsModal = document.getElementById('shortcutsModal');
        const closeBtn = document.getElementById('closeShortcutsBtn');

        shortcutsBtn.addEventListener('click', () => {
            this.showShortcutsModal();
        });

        closeBtn.addEventListener('click', () => {
            this.hideShortcutsModal();
        });

        // User Manual download
        const downloadManualBtn = document.getElementById('downloadManualBtn');
        if (downloadManualBtn) {
            downloadManualBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                console.log('Manual button clicked');
                try {
                    this.downloadUserManual();
                } catch (error) {
                    console.error('Error downloading manual:', error);
                    alert('Error generating manual: ' + error.message);
                }
            });
        } else {
            console.error('downloadManualBtn not found in DOM');
        }

        // Close modal when clicking outside
        shortcutsModal.addEventListener('click', (e) => {
            if (e.target === shortcutsModal) {
                this.hideShortcutsModal();
            }
        });

        // Close modal with Escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && shortcutsModal.style.display === 'block') {
                this.hideShortcutsModal();
            }
        });
    }

    showShortcutsModal() {
        const modal = document.getElementById('shortcutsModal');
        const content = document.getElementById('shortcutsContent');
        
        // Build shortcuts content
        content.innerHTML = this.buildShortcutsHTML();
        modal.style.display = 'block';
    }

    hideShortcutsModal() {
        document.getElementById('shortcutsModal').style.display = 'none';
    }

    buildShortcutsHTML() {
        const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
        const ctrlKey = isMac ? '⌘' : 'Ctrl';
        const altKey = isMac ? '⌥' : 'Alt';
        const shiftKey = '⇧';

        return `
            <div class="shortcuts-section">
                <h3>Video Playback Controls</h3>
                <table class="shortcuts-table">
                    <thead>
                        <tr>
                            <th>Windows</th>
                            <th>Mac</th>
                            <th>Action</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td><span class="shortcut-key">Space</span></td>
                            <td><span class="shortcut-key">Space</span></td>
                            <td>Play/Pause</td>
                        </tr>
                        <tr>
                            <td><span class="shortcut-key">←</span></td>
                            <td><span class="shortcut-key">←</span></td>
                            <td>5 seconds backward</td>
                        </tr>
                        <tr>
                            <td><span class="shortcut-key">→</span></td>
                            <td><span class="shortcut-key">→</span></td>
                            <td>5 seconds forward</td>
                        </tr>
                        <tr>
                            <td><span class="shortcut-key">${altKey}</span><span class="shortcut-key">←</span></td>
                            <td><span class="shortcut-key">${altKey}</span><span class="shortcut-key">←</span></td>
                            <td>15 seconds backward</td>
                        </tr>
                        <tr>
                            <td><span class="shortcut-key">${altKey}</span><span class="shortcut-key">→</span></td>
                            <td><span class="shortcut-key">${altKey}</span><span class="shortcut-key">→</span></td>
                            <td>15 seconds forward</td>
                        </tr>
                        <tr>
                            <td><span class="shortcut-key">${ctrlKey}</span><span class="shortcut-key">${altKey}</span><span class="shortcut-key">←</span></td>
                            <td><span class="shortcut-key">${ctrlKey}</span><span class="shortcut-key">${altKey}</span><span class="shortcut-key">←</span></td>
                            <td>1 frame backward</td>
                        </tr>
                        <tr>
                            <td><span class="shortcut-key">${ctrlKey}</span><span class="shortcut-key">${altKey}</span><span class="shortcut-key">→</span></td>
                            <td><span class="shortcut-key">${ctrlKey}</span><span class="shortcut-key">${altKey}</span><span class="shortcut-key">→</span></td>
                            <td>1 frame forward</td>
                        </tr>
                        <tr>
                            <td><span class="shortcut-key">J</span></td>
                            <td><span class="shortcut-key">J</span></td>
                            <td>Rewind or decrease speed</td>
                        </tr>
                        <tr>
                            <td><span class="shortcut-key">K</span></td>
                            <td><span class="shortcut-key">K</span></td>
                            <td>Pause</td>
                        </tr>
                        <tr>
                            <td><span class="shortcut-key">L</span></td>
                            <td><span class="shortcut-key">L</span></td>
                            <td>Fast forward or increase speed</td>
                        </tr>
                        <tr>
                            <td><span class="shortcut-key">${ctrlKey}</span><span class="shortcut-key">J</span></td>
                            <td><span class="shortcut-key">${ctrlKey}</span><span class="shortcut-key">J</span></td>
                            <td>Decrease speed</td>
                        </tr>
                        <tr>
                            <td><span class="shortcut-key">${ctrlKey}</span><span class="shortcut-key">L</span></td>
                            <td><span class="shortcut-key">${ctrlKey}</span><span class="shortcut-key">L</span></td>
                            <td>Increase speed</td>
                        </tr>
                        <tr>
                            <td><span class="shortcut-key">M</span></td>
                            <td><span class="shortcut-key">M</span></td>
                            <td>Mute/Unmute Audio</td>
                        </tr>
                    </tbody>
                </table>
            </div>

            <div class="shortcuts-section">
                <h3>Event Coding</h3>
                <table class="shortcuts-table">
                    <thead>
                        <tr>
                            <th>Key</th>
                            <th>Event</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td><span class="shortcut-key">P</span></td>
                            <td>Pass Complete</td>
                        </tr>
                        <tr>
                            <td><span class="shortcut-key">I</span></td>
                            <td>Pass Incomplete</td>
                        </tr>
                        <tr>
                            <td><span class="shortcut-key">${shiftKey}</span><span class="shortcut-key">K</span></td>
                            <td>Key Pass</td>
                        </tr>
                        <tr>
                            <td><span class="shortcut-key">A</span></td>
                            <td>Assist</td>
                        </tr>
                        <tr>
                            <td><span class="shortcut-key">S</span></td>
                            <td>Shot On Target</td>
                        </tr>
                        <tr>
                            <td><span class="shortcut-key">O</span></td>
                            <td>Shot Off Target</td>
                        </tr>
                        <tr>
                            <td><span class="shortcut-key">G</span></td>
                            <td>Goal</td>
                        </tr>
                        <tr>
                            <td><span class="shortcut-key">B</span></td>
                            <td>Shot Blocked</td>
                        </tr>
                        <tr>
                            <td><span class="shortcut-key">T</span></td>
                            <td>Tackle</td>
                        </tr>
                        <tr>
                            <td><span class="shortcut-key">N</span></td>
                            <td>Interception</td>
                        </tr>
                        <tr>
                            <td><span class="shortcut-key">C</span></td>
                            <td>Clearance</td>
                        </tr>
                        <tr>
                            <td><span class="shortcut-key">${shiftKey}</span><span class="shortcut-key">L</span></td>
                            <td>Block</td>
                        </tr>
                        <tr>
                            <td><span class="shortcut-key">D</span></td>
                            <td>Dribble Success</td>
                        </tr>
                        <tr>
                            <td><span class="shortcut-key">F</span></td>
                            <td>Dribble Fail</td>
                        </tr>
                        <tr>
                            <td><span class="shortcut-key">W</span></td>
                            <td>Take-On</td>
                        </tr>
                        <tr>
                            <td><span class="shortcut-key">U</span></td>
                            <td>Foul</td>
                        </tr>
                        <tr>
                            <td><span class="shortcut-key">Y</span></td>
                            <td>Yellow Card</td>
                        </tr>
                        <tr>
                            <td><span class="shortcut-key">${shiftKey}</span><span class="shortcut-key">R</span></td>
                            <td>Red Card</td>
                        </tr>
                        <tr>
                            <td><span class="shortcut-key">1</span></td>
                            <td>Corner</td>
                        </tr>
                        <tr>
                            <td><span class="shortcut-key">2</span></td>
                            <td>Free Kick</td>
                        </tr>
                        <tr>
                            <td><span class="shortcut-key">3</span></td>
                            <td>Throw-In</td>
                        </tr>
                        <tr>
                            <td><span class="shortcut-key">4</span></td>
                            <td>Offside</td>
                        </tr>
                        <tr>
                            <td><span class="shortcut-key">5</span></td>
                            <td>Substitution</td>
                        </tr>
                    </tbody>
                </table>
            </div>

            <div class="shortcuts-section">
                <h3>General</h3>
                <table class="shortcuts-table">
                    <thead>
                        <tr>
                            <th>Windows</th>
                            <th>Mac</th>
                            <th>Action</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td><span class="shortcut-key">${ctrlKey}</span><span class="shortcut-key">S</span></td>
                            <td><span class="shortcut-key">${ctrlKey}</span><span class="shortcut-key">S</span></td>
                            <td>Save Session</td>
                        </tr>
                        <tr>
                            <td><span class="shortcut-key">Esc</span></td>
                            <td><span class="shortcut-key">Esc</span></td>
                            <td>Close this dialog</td>
                        </tr>
                        <tr>
                            <td><span class="shortcut-key">${ctrlKey}</span><span class="shortcut-key">Z</span></td>
                            <td><span class="shortcut-key">${ctrlKey}</span><span class="shortcut-key">Z</span></td>
                            <td>Undo</td>
                        </tr>
                        <tr>
                            <td><span class="shortcut-key">${ctrlKey}</span><span class="shortcut-key">${shiftKey}</span><span class="shortcut-key">Z</span></td>
                            <td><span class="shortcut-key">${ctrlKey}</span><span class="shortcut-key">${shiftKey}</span><span class="shortcut-key">Z</span></td>
                            <td>Redo</td>
                        </tr>
                    </tbody>
                </table>
            </div>
        `;
    }

    setupPresetManagement() {
        const presetBtn = document.getElementById('presetBtn');
        const presetMenu = document.getElementById('presetMenu');
        
        presetBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            presetMenu.style.display = presetMenu.style.display === 'block' ? 'none' : 'block';
            if (presetMenu.style.display === 'block') {
                this.buildPresetCheckboxes();
                this.loadPresetList();
            }
        });
        
        // Close dropdown when clicking outside
        document.addEventListener('click', (e) => {
            if (!presetMenu.contains(e.target) && e.target !== presetBtn) {
                presetMenu.style.display = 'none';
            }
        });
        
        // Save preset
        document.getElementById('savePresetBtn').addEventListener('click', () => {
            const presetName = document.getElementById('presetNameInput').value.trim();
            if (!presetName) {
                alert('Please enter a preset name');
                return;
            }
            this.savePreset(presetName);
        });
        
        // Load preset
        document.getElementById('loadPresetBtn').addEventListener('click', () => {
            const presetName = document.getElementById('presetSelect').value;
            if (!presetName) {
                alert('Please select a preset');
                return;
            }
            this.loadPreset(presetName);
        });
        
        // Reset to default
        document.getElementById('resetPresetBtn').addEventListener('click', () => {
            if (confirm('Reset to default preset (show all buttons)?')) {
                this.currentPreset = { ...this.defaultPreset };
                this.applyPreset();
                this.buildPresetCheckboxes();
            }
        });
        
        // Load default preset on init
        this.loadPresetFromStorage();
        this.applyPreset();
    }

    buildPresetCheckboxes() {
        const container = document.getElementById('presetCheckboxes');
        container.innerHTML = '';
        
        Object.keys(this.allEventTypes).forEach(category => {
            const categoryDiv = document.createElement('div');
            categoryDiv.className = 'preset-category';
            categoryDiv.textContent = category.charAt(0).toUpperCase() + category.slice(1) + ' Events';
            container.appendChild(categoryDiv);
            
            this.allEventTypes[category].forEach(eventType => {
                const item = document.createElement('div');
                item.className = 'preset-checkbox-item';
                
                const checkbox = document.createElement('input');
                checkbox.type = 'checkbox';
                checkbox.id = `preset-${eventType.event}`;
                checkbox.checked = this.currentPreset[eventType.event] !== false;
                checkbox.addEventListener('change', () => {
                    this.currentPreset[eventType.event] = checkbox.checked;
                    this.applyPreset();
                });
                
                const label = document.createElement('label');
                label.htmlFor = `preset-${eventType.event}`;
                // Update key display for modified shortcuts
                let keyDisplay = eventType.key;
                if (eventType.event === 'key-pass') keyDisplay = '⇧K';
                if (eventType.event === 'block') keyDisplay = '⇧L';
                if (eventType.event === 'red-card') keyDisplay = '⇧R';
                label.textContent = `${eventType.label} (${keyDisplay})`;
                
                item.appendChild(checkbox);
                item.appendChild(label);
                container.appendChild(item);
            });
        });
    }

    applyPreset() {
        // Show/hide event buttons based on preset
        document.querySelectorAll('.event-btn').forEach(btn => {
            const eventType = btn.getAttribute('data-event');
            if (this.currentPreset[eventType] === false) {
                btn.style.display = 'none';
            } else {
                btn.style.display = '';
            }
        });
        
        // Show/hide entire sections if all buttons are hidden
        document.querySelectorAll('.section[data-category]').forEach(section => {
            const category = section.getAttribute('data-category');
            const buttons = section.querySelectorAll('.event-btn');
            const visibleButtons = Array.from(buttons).filter(btn => {
                const eventType = btn.getAttribute('data-event');
                return this.currentPreset[eventType] !== false;
            });
            
            if (visibleButtons.length === 0) {
                section.style.display = 'none';
            } else {
                section.style.display = '';
            }
        });
        
        this.savePresetToStorage();
    }

    savePreset(name) {
        const presets = this.getPresets();
        presets[name] = { ...this.currentPreset };
        localStorage.setItem('footballMatchCoder_presets', JSON.stringify(presets));
        this.loadPresetList();
        document.getElementById('presetNameInput').value = '';
        alert(`Preset "${name}" saved!`);
    }

    loadPreset(name) {
        const presets = this.getPresets();
        if (presets[name]) {
            this.currentPreset = { ...presets[name] };
            this.applyPreset();
            this.buildPresetCheckboxes();
            alert(`Preset "${name}" loaded!`);
        } else {
            alert(`Preset "${name}" not found`);
        }
    }

    loadPresetList() {
        const presets = this.getPresets();
        const select = document.getElementById('presetSelect');
        select.innerHTML = '<option value="">Select a preset...</option>';
        
        Object.keys(presets).forEach(name => {
            const option = document.createElement('option');
            option.value = name;
            option.textContent = name;
            select.appendChild(option);
        });
    }

    getPresets() {
        try {
            const saved = localStorage.getItem('footballMatchCoder_presets');
            return saved ? JSON.parse(saved) : {};
        } catch (e) {
            return {};
        }
    }

    loadPresetFromStorage() {
        try {
            const saved = localStorage.getItem('footballMatchCoder_currentPreset');
            if (saved) {
                const preset = JSON.parse(saved);
                // Merge with default to ensure all events are defined
                this.currentPreset = { ...this.defaultPreset, ...preset };
            }
        } catch (e) {
            console.warn('Could not load preset from storage:', e);
        }
    }

    savePresetToStorage() {
        try {
            localStorage.setItem('footballMatchCoder_currentPreset', JSON.stringify(this.currentPreset));
        } catch (e) {
            console.warn('Could not save preset to storage:', e);
        }
    }

    setupKeyboardShortcuts() {
        // Handle space bar keyup for speed control
        document.addEventListener('keyup', (e) => {
            if (e.key === ' ' && this.spaceBarPressed) {
                e.preventDefault();
                this.spaceBarPressed = false;
                // Pause video when space is released
                this.video.pause();
                // Restore previous speed
                this.video.playbackRate = this.previousSpeed;
                this.setSpeed(this.previousSpeed);
                const btnMain = document.getElementById('playPauseMain');
                const btn = document.getElementById('playPause');
                if (btnMain) {
                    btnMain.textContent = '▶';
                    btnMain.classList.remove('playing');
                }
                if (btn) btn.textContent = '▶ Play';
            }
        });

        document.addEventListener('keydown', (e) => {
            // Don't trigger shortcuts when typing in inputs
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT') {
                return;
            }

            const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
            const ctrlKey = isMac ? e.metaKey : e.ctrlKey;
            const altKey = isMac ? e.altKey : e.altKey;
            const shiftKey = e.shiftKey;
            const key = e.key.toLowerCase();

            // Metrica Nexus-style Video Controls
            // Arrow keys with modifiers
            if (key === 'arrowleft') {
                e.preventDefault();
                if (ctrlKey && altKey) {
                    // Ctrl/Cmd + Alt/Opt + Left: 1 frame backward
                    this.seekFrame(-1);
                } else if (altKey) {
                    // Alt/Opt + Left: 15 seconds backward
                    this.seek(-15);
                } else {
                    // Left: 5 seconds backward
                    this.seek(-5);
                }
                return;
            }

            if (key === 'arrowright') {
                e.preventDefault();
                if (ctrlKey && altKey) {
                    // Ctrl/Cmd + Alt/Opt + Right: 1 frame forward
                    this.seekFrame(1);
                } else if (altKey) {
                    // Alt/Opt + Right: 15 seconds forward
                    this.seek(15);
                } else {
                    // Right: 5 seconds forward
                    this.seek(5);
                }
                return;
            }

            // Space bar: Hold for 2x speed, release to pause
            if (key === ' ') {
                e.preventDefault();
                if (!this.spaceBarPressed) {
                    // Space bar just pressed - start 2x speed
                    this.spaceBarPressed = true;
                    this.previousSpeed = this.video.playbackRate;
                    this.video.playbackRate = 2.0;
                    this.setSpeed(2.0);
                    if (this.video.paused) {
                        this.video.play();
                        const btnMain = document.getElementById('playPauseMain');
                        const btn = document.getElementById('playPause');
                        if (btnMain) {
                            btnMain.textContent = '⏸';
                            btnMain.classList.add('playing');
                        }
                        if (btn) btn.textContent = '⏸ Pause';
                    }
                }
                return;
            }

            // J: Rewind or decrease speed
            if (key === 'j' && !ctrlKey && !altKey && !shiftKey) {
                e.preventDefault();
                if (this.video.playbackRate > 0.25) {
                    this.setSpeed(Math.max(0.25, this.video.playbackRate - 0.25));
                } else {
                    this.seek(-5);
                }
                return;
            }

            // K: Pause (Metrica style) - but preserve K for key-pass with modifier
            if (key === 'k' && !ctrlKey && !altKey && !shiftKey) {
                e.preventDefault();
                if (!this.video.paused) {
                    this.video.pause();
                    document.getElementById('playPause').textContent = '▶ Play';
                }
                return;
            }

            // L: Fast forward or increase speed (Metrica style) - preserve L for block with modifier
            if (key === 'l' && !ctrlKey && !altKey && !shiftKey) {
                e.preventDefault();
                if (this.video.playbackRate < 2.0) {
                    this.setSpeed(Math.min(2.0, this.video.playbackRate + 0.25));
                } else {
                    this.seek(5);
                }
                return;
            }

            // Ctrl/Cmd + J: Decrease speed
            if (key === 'j' && ctrlKey && !altKey && !shiftKey) {
                e.preventDefault();
                this.setSpeed(Math.max(0.25, this.video.playbackRate - 0.25));
                return;
            }

            // Ctrl/Cmd + L: Increase speed
            if (key === 'l' && ctrlKey && !altKey && !shiftKey) {
                e.preventDefault();
                this.setSpeed(Math.min(2.0, this.video.playbackRate + 0.25));
                return;
            }

            // Note: K+J and K+L combinations are handled by holding K first, then pressing J/L
            // This requires tracking key state, which we'll implement if needed

            // M: Mute/Unmute Audio
            if (key === 'm' && !ctrlKey && !altKey && !shiftKey) {
                e.preventDefault();
                this.video.muted = !this.video.muted;
                return;
            }

            // +: Zoom In (if video supports it)
            if ((key === '+' || key === '=') && !ctrlKey && !altKey && !shiftKey) {
                e.preventDefault();
                // Zoom functionality can be added later
                return;
            }

            // -: Zoom Out
            if (key === '-' && !ctrlKey && !altKey && !shiftKey) {
                e.preventDefault();
                // Zoom functionality can be added later
                return;
            }

            // R: Record Event (Metrica style) - preserve R for red-card with modifier
            if (key === 'r' && !ctrlKey && !altKey && !shiftKey) {
                e.preventDefault();
                // Quick record - could open a quick event menu or record last event type
                // For now, we'll keep R for red-card, but add shift+R for quick record
                return;
            }

            // Ctrl/Cmd + S: Save Session (standard shortcut)
            if (key === 's' && ctrlKey && !altKey && !shiftKey) {
                e.preventDefault();
                this.saveSession();
                return;
            }

            // Ctrl/Cmd + Z: Undo
            if (key === 'z' && ctrlKey && !altKey && !shiftKey) {
                e.preventDefault();
                this.undo();
                return;
            }

            // Ctrl/Cmd + Shift + Z: Redo
            if (key === 'z' && ctrlKey && !altKey && shiftKey) {
                e.preventDefault();
                this.redo();
                return;
            }

            // Event Coding Shortcuts (preserved with modifiers where needed)
            if (!ctrlKey && !altKey) {
                switch(key) {
                    case 'p':
                        if (!shiftKey) this.recordEvent('pass-complete');
                        break;
                    case 'i':
                        if (!shiftKey) this.recordEvent('pass-incomplete');
                        break;
                    case 'k':
                        if (shiftKey) this.recordEvent('key-pass');
                        break;
                    case 'a':
                        if (!shiftKey) this.recordEvent('assist');
                        break;
                    case 's':
                        if (!shiftKey) this.recordEvent('shot-on-target');
                        break;
                    case 'o':
                        if (!shiftKey) this.recordEvent('shot-off-target');
                        break;
                    case 'g':
                        if (!shiftKey) this.recordEvent('goal');
                        break;
                    case 'b':
                        if (!shiftKey) this.recordEvent('shot-blocked');
                        break;
                    case 't':
                        if (!shiftKey) this.recordEvent('tackle');
                        break;
                    case 'n':
                        if (!shiftKey) this.recordEvent('interception');
                        break;
                    case 'c':
                        if (!shiftKey) this.recordEvent('clearance');
                        break;
                    case 'l':
                        if (shiftKey) this.recordEvent('block');
                        break;
                    case 'd':
                        if (!shiftKey) this.recordEvent('dribble-success');
                        break;
                    case 'f':
                        if (!shiftKey) this.recordEvent('dribble-fail');
                        break;
                    case 'w':
                        if (!shiftKey) this.recordEvent('take-on');
                        break;
                    case 'u':
                        if (!shiftKey) this.recordEvent('foul');
                        break;
                    case 'y':
                        if (!shiftKey) this.recordEvent('yellow-card');
                        break;
                    case 'r':
                        if (shiftKey) this.recordEvent('red-card');
                        break;
                    case '1':
                        if (!shiftKey) this.recordEvent('corner');
                        break;
                    case '2':
                        if (!shiftKey) this.recordEvent('free-kick');
                        break;
                    case '3':
                        if (!shiftKey) this.recordEvent('throw-in');
                        break;
                    case '4':
                        if (!shiftKey) this.recordEvent('offside');
                        break;
                    case '5':
                        if (!shiftKey) this.recordEvent('substitution');
                        break;
                }
            }
        });
    }

    togglePlayPause() {
        const btn = document.getElementById('playPause');
        const btnMain = document.getElementById('playPauseMain');
        
        if (this.video.paused) {
            this.video.play();
            btn.textContent = '⏸ Pause';
            btnMain.textContent = '⏸';
            btnMain.classList.add('playing');
        } else {
            this.video.pause();
            btn.textContent = '▶ Play';
            btnMain.textContent = '▶';
            btnMain.classList.remove('playing');
        }
    }

    seek(seconds) {
        this.video.currentTime = Math.max(0, Math.min(this.video.duration, this.video.currentTime + seconds));
    }

    seekFrame(direction, force = false) {
        if (!this.video || !this.video.duration || isNaN(this.video.duration)) {
            console.log('Video not loaded or duration not available');
            return;
        }
        
        // Get actual video frame rate if available, otherwise use 30fps
        // For more precise frame-by-frame, use 1/30 or try to get actual FPS
        const frameTime = 1 / 30; // ~0.033 seconds per frame
        
        // Pause video if playing to allow frame-by-frame
        if (!this.video.paused) {
            this.video.pause();
            const btnMain = document.getElementById('playPauseMain');
            const btn = document.getElementById('playPause');
            if (btnMain) {
                btnMain.textContent = '▶';
                btnMain.classList.remove('playing');
            }
            if (btn) btn.textContent = '▶ Play';
        }
        
        const currentTime = this.video.currentTime || 0;
        const newTime = Math.max(0, Math.min(this.video.duration, currentTime + (direction * frameTime)));
        
        console.log(`Seeking frame: ${direction > 0 ? 'forward' : 'backward'}, from ${currentTime.toFixed(3)}s to ${newTime.toFixed(3)}s`);
        
        this.video.currentTime = newTime;
    }

    setSpeed(speed) {
        // Handle reverse playback (negative speed)
        if (speed < 0) {
            // Note: HTML5 video doesn't support negative playback rates natively
            // For reverse playback, we'd need to implement frame-by-frame reverse
            // For now, just set to minimum forward speed
            speed = 0.25;
        }
        
        this.video.playbackRate = Math.abs(speed);
        const speedValue = Math.abs(speed);
        document.getElementById('speedSlider').value = speedValue;
        document.getElementById('speedValue').textContent = speedValue.toFixed(2) + 'x';
        
        // Update active button
        document.querySelectorAll('.control-btn').forEach(btn => btn.classList.remove('active'));
        if (speedValue === 0.5) {
            document.getElementById('slowMotion').classList.add('active');
        } else if (speedValue === 1.0) {
            document.getElementById('normalSpeed').classList.add('active');
        } else if (speedValue === 2.0) {
            document.getElementById('fastForward').classList.add('active');
        }
    }

    updateTimeDisplay() {
        const time = this.video.currentTime;
        const hours = Math.floor(time / 3600);
        const minutes = Math.floor((time % 3600) / 60);
        const seconds = Math.floor(time % 60);
        const timeString = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
        document.getElementById('currentTime').textContent = timeString;
        document.getElementById('timelineCurrent').textContent = timeString;
    }

    setupTimeline() {
        const timelineTrack = document.getElementById('timelineTrack');
        let isDragging = false;

        // Click to seek
        timelineTrack.addEventListener('click', (e) => {
            if (!isDragging && this.video.duration) {
                const rect = timelineTrack.getBoundingClientRect();
                const clickX = e.clientX - rect.left;
                const percentage = clickX / rect.width;
                const newTime = percentage * this.video.duration;
                this.video.currentTime = newTime;
            }
        });

        // Drag to seek
        const handle = document.getElementById('timelineHandle');
        
        handle.addEventListener('mousedown', (e) => {
            isDragging = true;
            e.preventDefault();
        });

        document.addEventListener('mousemove', (e) => {
            if (isDragging && this.video.duration) {
                const rect = timelineTrack.getBoundingClientRect();
                const mouseX = e.clientX - rect.left;
                const percentage = Math.max(0, Math.min(1, mouseX / rect.width));
                const newTime = percentage * this.video.duration;
                this.video.currentTime = newTime;
            }
        });

        document.addEventListener('mouseup', () => {
            isDragging = false;
        });

        // Touch support for mobile
        handle.addEventListener('touchstart', (e) => {
            isDragging = true;
            e.preventDefault();
        });

        document.addEventListener('touchmove', (e) => {
            if (isDragging && this.video.duration && e.touches.length > 0) {
                const rect = timelineTrack.getBoundingClientRect();
                const touchX = e.touches[0].clientX - rect.left;
                const percentage = Math.max(0, Math.min(1, touchX / rect.width));
                const newTime = percentage * this.video.duration;
                this.video.currentTime = newTime;
            }
        });

        document.addEventListener('touchend', () => {
            isDragging = false;
        });
    }

    updateTimeline() {
        const progressBar = document.getElementById('timelineProgress');
        const handle = document.getElementById('timelineHandle');
        const durationEl = document.getElementById('timelineDuration');
        
        if (!this.video.duration || isNaN(this.video.duration)) {
            if (progressBar) progressBar.style.width = '0%';
            if (handle) handle.style.left = '0%';
            if (durationEl) durationEl.textContent = '00:00:00';
            return;
        }

        const progress = (this.video.currentTime / this.video.duration) * 100;
        
        if (progressBar) progressBar.style.width = `${progress}%`;
        if (handle) handle.style.left = `${progress}%`;

        // Update duration display
        const duration = this.video.duration;
        const hours = Math.floor(duration / 3600);
        const minutes = Math.floor((duration % 3600) / 60);
        const seconds = Math.floor(duration % 60);
        const durationString = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
        if (durationEl) durationEl.textContent = durationString;
    }

    updateTimelineEvents() {
        const timelineEvents = document.getElementById('timelineEvents');
        const timelineTrack = document.getElementById('timelineTrack');
        timelineEvents.innerHTML = '';

        if (!this.video.duration || this.events.length === 0) {
            if (timelineTrack) timelineTrack.style.width = '100%';
            return;
        }

        const duration = this.timelineEndTime || this.video.duration;
        const startTime = this.timelineStartTime;
        const visibleDuration = duration - startTime;
        const trackWidth = 100 * this.timelineZoom; // Base width times zoom
        if (timelineTrack) timelineTrack.style.width = `${trackWidth}%`;

        // Draw time marks
        this.drawTimeMarks(startTime, visibleDuration, trackWidth);

        // Draw events
        this.events.forEach(event => {
            if (event.timestamp < startTime || event.timestamp > duration) return;
            
            const relativeTime = event.timestamp - startTime;
            const percentage = (relativeTime / visibleDuration) * 100;
            const marker = document.createElement('div');
            marker.className = 'timeline-event-marker';
            
            // Color code by event category
            const category = this.getEventCategory(event.type);
            marker.classList.add(category);
            
            // Special handling for goals and cards
            if (event.type === 'goal') {
                marker.classList.add('goal');
            } else if (event.type === 'yellow-card' || event.type === 'red-card') {
                marker.classList.add('card');
            }
            
            marker.style.left = `${percentage}%`;
            marker.title = `${this.getEventDisplayName(event.type)} - ${event.timeString}${event.playerName ? ' - ' + event.playerName : ''}`;
            
            // Make clickable to jump to timestamp
            marker.addEventListener('click', (e) => {
                e.stopPropagation();
                this.video.currentTime = event.timestamp;
                if (this.video.paused) {
                    this.video.play();
                    const btnMain = document.getElementById('playPauseMain');
                    const btn = document.getElementById('playPause');
                    if (btnMain) {
                        btnMain.textContent = '⏸';
                        btnMain.classList.add('playing');
                    }
                    if (btn) btn.textContent = '⏸ Pause';
                }
            });
            
            timelineEvents.appendChild(marker);
        });
    }

    drawTimeMarks(startTime, duration, trackWidth) {
        const timeMarks = document.getElementById('timelineTimeMarks');
        if (!timeMarks) return;
        timeMarks.innerHTML = '';

        const interval = duration / 10; // 10 marks
        const majorInterval = duration / 2; // Major marks at 0%, 50%, 100%

        for (let i = 0; i <= 10; i++) {
            const time = startTime + (i * interval);
            const percentage = (i / 10) * 100;
            const isMajor = i % 5 === 0;

            const mark = document.createElement('div');
            mark.className = `timeline-time-mark ${isMajor ? 'major' : ''}`;
            mark.style.left = `${percentage}%`;

            if (isMajor) {
                const label = document.createElement('div');
                label.className = 'timeline-time-mark-label';
                label.textContent = this.formatTime(time);
                mark.appendChild(label);
            }

            timeMarks.appendChild(mark);
        }
    }

    setupTimelineZoom() {
        const zoomInBtn = document.getElementById('timelineZoomIn');
        const zoomOutBtn = document.getElementById('timelineZoomOut');
        const resetZoomBtn = document.getElementById('timelineResetZoom');
        const zoomLevel = document.getElementById('timelineZoomLevel');

        if (!zoomInBtn || !zoomOutBtn || !resetZoomBtn) return;

        zoomInBtn.addEventListener('click', () => {
            this.timelineZoom = Math.min(this.timelineZoom * 1.5, 10);
            this.updateTimelineZoom();
        });

        zoomOutBtn.addEventListener('click', () => {
            this.timelineZoom = Math.max(this.timelineZoom / 1.5, 0.5);
            this.updateTimelineZoom();
        });

        resetZoomBtn.addEventListener('click', () => {
            this.timelineZoom = 1.0;
            this.timelineStartTime = 0;
            this.timelineEndTime = null;
            this.updateTimelineZoom();
        });

        // Mouse wheel zoom
        const timelineTrackContainer = document.getElementById('timelineTrackContainer');
        if (timelineTrackContainer) {
            timelineTrackContainer.addEventListener('wheel', (e) => {
                if (e.ctrlKey || e.metaKey) {
                    e.preventDefault();
                    const delta = e.deltaY > 0 ? 0.9 : 1.1;
                    this.timelineZoom = Math.max(0.5, Math.min(10, this.timelineZoom * delta));
                    this.updateTimelineZoom();
                }
            });
        }
    }

    updateTimelineZoom() {
        const zoomLevel = document.getElementById('timelineZoomLevel');
        if (zoomLevel) {
            zoomLevel.textContent = `${this.timelineZoom.toFixed(1)}x`;
        }

        if (this.timelineZoom > 1.0 && this.video.duration) {
            // When zoomed in, show a portion of the timeline
            const centerTime = this.video.currentTime || 0;
            const visibleDuration = this.video.duration / this.timelineZoom;
            this.timelineStartTime = Math.max(0, centerTime - visibleDuration / 2);
            this.timelineEndTime = Math.min(this.video.duration, this.timelineStartTime + visibleDuration);
        } else {
            this.timelineStartTime = 0;
            this.timelineEndTime = null;
        }

        this.updateTimelineEvents();
    }

    updateMatchInfo() {
        const half = document.getElementById('half').value;
        const minute = document.getElementById('minute').value || 0;
        const homeScore = document.getElementById('homeScore').value || 0;
        const awayScore = document.getElementById('awayScore').value || 0;
        
        document.getElementById('currentHalf').textContent = half;
        document.getElementById('currentMinute').textContent = minute;
        document.getElementById('currentScore').textContent = `${homeScore}-${awayScore}`;
    }

    syncMatchTimeWithVideo() {
        // Calculate match time from video timestamp
        // This assumes the video starts at the beginning of the match
        const videoTime = this.video.currentTime;
        
        // Ask user for match start time or use a default
        const matchStartTime = prompt('Enter the match start time in the video (seconds).\n\nFor example, if the match starts at 00:05:00 in the video, enter 300.\n\nLeave empty to use video start (0):', '0');
        
        if (matchStartTime === null) return; // User cancelled
        
        const startOffset = parseFloat(matchStartTime) || 0;
        const matchTime = videoTime - startOffset;
        
        if (matchTime < 0) {
            alert('Video time is before match start. Please set a correct match start time.');
            return;
        }
        
        // Calculate half and minute
        // Assuming 45 minutes per half (2700 seconds)
        const halfLength = 45 * 60; // 45 minutes in seconds
        let half = '1';
        let minute = 0;
        
        if (matchTime < halfLength) {
            half = '1';
            minute = Math.floor(matchTime / 60);
        } else if (matchTime < halfLength * 2) {
            half = '2';
            minute = Math.floor((matchTime - halfLength) / 60);
        } else if (matchTime < halfLength * 3) {
            half = 'ET1';
            minute = Math.floor((matchTime - halfLength * 2) / 60);
        } else {
            half = 'ET2';
            minute = Math.floor((matchTime - halfLength * 3) / 60);
        }
        
        // Update form fields
        document.getElementById('half').value = half;
        document.getElementById('minute').value = minute;
        
        // Update display
        this.updateMatchInfo();
        
        // Save sync offset for future use
        this.matchStartOffset = startOffset;
        localStorage.setItem('footballMatchCoder_matchStartOffset', startOffset.toString());
    }

    recordEvent(eventType) {
        const team = document.getElementById('team').value;
        const homePlayerSelect = document.getElementById('homePlayerSelect');
        const awayPlayerSelect = document.getElementById('awayPlayerSelect');
        
        // Get player name from the appropriate dropdown
        let playerName = '';
        if (team === 'home') {
            playerName = homePlayerSelect.value || '';
        } else {
            playerName = awayPlayerSelect.value || '';
        }
        
        // Get the current count for this event type (before incrementing)
        const eventCount = (this.eventCounters[eventType] || 0) + 1;
        
        const event = {
            id: Date.now(),
            type: eventType,
            timestamp: this.video.currentTime,
            timeString: this.formatTime(this.video.currentTime),
            half: document.getElementById('half').value,
            minute: parseInt(document.getElementById('minute').value) || null,
            homeScore: parseInt(document.getElementById('homeScore').value) || 0,
            awayScore: parseInt(document.getElementById('awayScore').value) || 0,
            team: team,
            playerName: playerName,
            zone: document.getElementById('zone').value || '',
            notes: document.getElementById('notes').value || '',
            tags: [...this.currentEventTags], // Add tags to event
            eventCount: eventCount // Store the count for this event
        };
        
        // Add to template sequence
        this.templateSequence.push({
            type: eventType,
            team: team,
            playerName: playerName,
            zone: document.getElementById('zone').value || '',
            tags: [...this.currentEventTags]
        });

        // Auto-increment score for goals
        if (eventType === 'goal') {
            if (event.team === 'home') {
                const newScore = (parseInt(document.getElementById('homeScore').value) || 0) + 1;
                document.getElementById('homeScore').value = newScore;
                event.homeScore = newScore;
            } else {
                const newScore = (parseInt(document.getElementById('awayScore').value) || 0) + 1;
                document.getElementById('awayScore').value = newScore;
                event.awayScore = newScore;
            }
            this.updateMatchInfo();
        }

        // Update event counter BEFORE adding to history (so count matches)
        this.incrementEventCounter(eventType);
        
        // Add to history for undo
        this.addToHistory(event);
        
        // Clear redo stack when new event is recorded
        this.undoStack = [];
        
        this.events.push(event);
        this.currentSession.events.push(event);
        
        this.updateEventsList();
        this.updateTimelineEvents();
        this.saveToStorage();
        
        // Clear player selection, notes, and tags after recording
        homePlayerSelect.value = '';
        awayPlayerSelect.value = '';
        document.getElementById('notes').value = '';
        this.currentEventTags = [];
        this.updateSelectedTags();

        // Visual feedback
        this.showEventFeedback(eventType);
    }

    formatTime(seconds) {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = Math.floor(seconds % 60);
        return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    }

    updateEventsList() {
        const eventsList = document.getElementById('eventsList');
        eventsList.innerHTML = '';

        const eventsToShow = this.filteredEvents !== null ? this.filteredEvents : this.events;
        const totalEvents = this.events.length;
        const filteredCount = this.filteredEvents !== null ? this.filteredEvents.length : null;

        if (eventsToShow.length === 0) {
            if (this.filteredEvents !== null) {
                eventsList.innerHTML = `<div style="padding: 1rem; text-align: center; color: #94a3b8;">No events match the current filters (${totalEvents} total events)</div>`;
            } else {
                eventsList.innerHTML = '<div style="padding: 1rem; text-align: center; color: #94a3b8;">No events recorded yet</div>';
            }
            return;
        }

        // Show filter status
        if (this.filteredEvents !== null) {
            const filterStatus = document.createElement('div');
            filterStatus.style.cssText = 'padding: 0.5rem 1rem; background: #334155; color: #22c55e; font-size: 0.85rem; border-bottom: 1px solid #475569;';
            filterStatus.textContent = `Showing ${filteredCount} of ${totalEvents} events`;
            eventsList.appendChild(filterStatus);
        }

        eventsToShow.forEach(event => {
            const item = document.createElement('div');
            item.className = `event-item ${this.getEventCategory(event.type)}`;
            
            const eventName = this.getEventDisplayName(event.type);
            let details = [];
            
            if (event.playerName) details.push(`Player: ${event.playerName}`);
            if (event.team) details.push(`Team: ${event.team}`);
            if (event.minute !== null) details.push(`${event.half}H ${event.minute}'`);
            if (event.zone) details.push(`Zone: ${event.zone}`);
            if (event.type === 'goal') details.push(`Score: ${event.homeScore}-${event.awayScore}`);
            if (event.notes) details.push(event.notes);
            
            // Add tags display
            let tagsHTML = '';
            if (event.tags && event.tags.length > 0) {
                tagsHTML = '<div style="margin-top: 0.25rem;">' + 
                    event.tags.map(tag => `<span class="event-tag">${tag}</span>`).join('') + 
                    '</div>';
            }

            // Get event count label - show the count for this specific event type
            const eventCount = this.eventCounters[event.type] || 0;
            const countLabel = eventCount > 0 ? `<span class="event-count-badge">#${event.eventCount || eventCount}</span>` : '';
            
            item.innerHTML = `
                <div class="event-info">
                    <div>
                        <span class="event-time">${event.timeString}</span>
                        ${countLabel}
                        <span class="event-type">${eventName}</span>
                    </div>
                    <div class="event-details">${details.join(' | ')}</div>
                    ${tagsHTML}
                </div>
                <button class="delete-btn" onclick="app.deleteEvent(${event.id})">Delete</button>
            `;

            eventsList.appendChild(item);
        });

        // Scroll to bottom
        eventsList.scrollTop = eventsList.scrollHeight;
    }

    getEventCategory(type) {
        if (type.startsWith('pass') || type === 'assist' || type === 'key-pass') return 'pass';
        if (type.startsWith('shot') || type === 'goal') return 'shot';
        if (['tackle', 'interception', 'clearance', 'block'].includes(type)) return 'defensive';
        if (type.startsWith('dribble') || type === 'take-on') return 'dribble';
        if (type.includes('foul') || type.includes('card')) return 'foul';
        return 'other';
    }

    getEventDisplayName(type) {
        const names = {
            'pass-complete': 'Pass Complete',
            'pass-incomplete': 'Pass Incomplete',
            'key-pass': 'Key Pass',
            'assist': 'Assist',
            'shot-on-target': 'Shot On Target',
            'shot-off-target': 'Shot Off Target',
            'shot-blocked': 'Shot Blocked',
            'goal': 'Goal ⚽',
            'tackle': 'Tackle',
            'interception': 'Interception',
            'clearance': 'Clearance',
            'block': 'Block',
            'dribble-success': 'Dribble Success',
            'dribble-fail': 'Dribble Fail',
            'take-on': 'Take-On',
            'foul': 'Foul',
            'yellow-card': 'Yellow Card',
            'red-card': 'Red Card',
            'corner': 'Corner',
            'free-kick': 'Free Kick',
            'throw-in': 'Throw-In',
            'offside': 'Offside',
            'substitution': 'Substitution'
        };
        return names[type] || type;
    }

    deleteEvent(id) {
        const event = this.events.find(e => e.id === id);
        if (event) {
            // Add to history for undo
            this.addToHistory({ action: 'delete', event: event });
            this.undoStack = [];
            
            // Decrement counter
            this.decrementEventCounter(event.type);
        }
        
        this.events = this.events.filter(e => e.id !== id);
        this.currentSession.events = this.currentSession.events.filter(e => e.id !== id);
        this.updateEventsList();
        this.updateTimelineEvents();
        this.saveToStorage();
    }

    // ==================== UNDO/REDO SYSTEM ====================
    addToHistory(actionData) {
        this.eventHistory.push({
            timestamp: Date.now(),
            data: actionData
        });
        
        // Limit history size
        if (this.eventHistory.length > this.maxHistorySize) {
            this.eventHistory.shift();
        }
    }

    undo() {
        if (this.eventHistory.length === 0) {
            return; // Nothing to undo
        }
        
        const lastAction = this.eventHistory.pop();
        const actionData = lastAction.data;
        
        if (actionData.action === 'delete') {
            // Restore deleted event
            this.events.push(actionData.event);
            this.currentSession.events.push(actionData.event);
            this.incrementEventCounter(actionData.event.type);
        } else {
            // Remove last added event
            const lastEvent = this.events.pop();
            if (lastEvent) {
                this.currentSession.events = this.currentSession.events.filter(e => e.id !== lastEvent.id);
                this.decrementEventCounter(lastEvent.type);
                
                // Handle score adjustment for goals
                if (lastEvent.type === 'goal') {
                    if (lastEvent.team === 'home') {
                        const currentScore = parseInt(document.getElementById('homeScore').value) || 0;
                        document.getElementById('homeScore').value = Math.max(0, currentScore - 1);
                    } else {
                        const currentScore = parseInt(document.getElementById('awayScore').value) || 0;
                        document.getElementById('awayScore').value = Math.max(0, currentScore - 1);
                    }
                    this.updateMatchInfo();
                }
            }
        }
        
        // Add to redo stack
        this.undoStack.push(lastAction);
        
        this.updateEventsList();
        this.updateTimelineEvents();
        this.saveToStorage();
    }

    redo() {
        if (this.undoStack.length === 0) {
            return; // Nothing to redo
        }
        
        const actionToRedo = this.undoStack.pop();
        const actionData = actionToRedo.data;
        
        if (actionData.action === 'delete') {
            // Delete the event again
            this.events = this.events.filter(e => e.id !== actionData.event.id);
            this.currentSession.events = this.currentSession.events.filter(e => e.id !== actionData.event.id);
            this.decrementEventCounter(actionData.event.type);
        } else {
            // Re-add the event
            this.events.push(actionData);
            this.currentSession.events.push(actionData);
            this.incrementEventCounter(actionData.type);
            
            // Handle score adjustment for goals
            if (actionData.type === 'goal') {
                if (actionData.team === 'home') {
                    const currentScore = parseInt(document.getElementById('homeScore').value) || 0;
                    document.getElementById('homeScore').value = currentScore + 1;
                } else {
                    const currentScore = parseInt(document.getElementById('awayScore').value) || 0;
                    document.getElementById('awayScore').value = currentScore + 1;
                }
                this.updateMatchInfo();
            }
        }
        
        // Add back to history
        this.eventHistory.push(actionToRedo);
        
        this.updateEventsList();
        this.updateTimelineEvents();
        this.saveToStorage();
    }

    // ==================== EVENT COUNTERS ====================
    incrementEventCounter(eventType) {
        if (!this.eventCounters[eventType]) {
            this.eventCounters[eventType] = 0;
        }
        this.eventCounters[eventType]++;
        this.updateEventCounterDisplay(eventType);
    }

    decrementEventCounter(eventType) {
        if (this.eventCounters[eventType] && this.eventCounters[eventType] > 0) {
            this.eventCounters[eventType]--;
            this.updateEventCounterDisplay(eventType);
        }
    }

    updateEventCounterDisplay(eventType) {
        const counter = this.eventCounters[eventType] || 0;
        const counterEl = document.querySelector(`.event-counter[data-event="${eventType}"]`);
        if (counterEl) {
            counterEl.textContent = counter;
            // Hide if zero
            if (counter === 0) {
                counterEl.style.display = 'none';
            } else {
                counterEl.style.display = 'block';
            }
        }
    }

    initializeEventCounters() {
        // Initialize all counters to 0
        document.querySelectorAll('.event-counter').forEach(counter => {
            const eventType = counter.getAttribute('data-event');
            if (eventType) {
                this.eventCounters[eventType] = 0;
                counter.textContent = '0';
                counter.style.display = 'none';
            }
        });
        
        // Count existing events
        this.events.forEach(event => {
            this.incrementEventCounter(event.type);
        });
    }

    showEventFeedback(eventType) {
        // Visual feedback when event is recorded
        const btn = document.querySelector(`[data-event="${eventType}"]`);
        if (btn) {
            btn.style.transform = 'scale(0.95)';
            setTimeout(() => {
                btn.style.transform = '';
            }, 150);
        }
    }

    saveSession() {
        const dataStr = JSON.stringify(this.currentSession, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(dataBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${this.currentSession.name || 'football-session'}-${Date.now()}.json`;
        link.click();
        URL.revokeObjectURL(url);
    }

    exportData(format = 'csv') {
        if (this.events.length === 0) {
            alert('No events to export');
            return;
        }

        const timestamp = Date.now();
        const baseName = this.currentSession.name || 'football-events';

        switch(format) {
            case 'csv':
                this.exportCSV(baseName, timestamp);
                break;
            case 'excel':
                this.exportExcel(baseName, timestamp);
                break;
            case 'xml':
                this.exportXML(baseName, timestamp);
                break;
            case 'json':
                this.exportJSONEvents(baseName, timestamp);
                break;
            case 'jsonl':
                this.exportJSONLines(baseName, timestamp);
                break;
            case 'sql':
                this.exportSQL(baseName, timestamp);
                break;
            default:
                this.exportCSV(baseName, timestamp);
        }
    }

    exportCSV(baseName, timestamp) {
        let csv = 'Timestamp,Time,Half,Minute,Event Type,Team,Player,Zone,Home Score,Away Score,Notes\n';

        this.events.forEach(event => {
            const row = [
                event.timestamp,
                event.timeString,
                event.half,
                event.minute || '',
                this.getEventDisplayName(event.type),
                event.team || '',
                event.playerName || '',
                event.zone || '',
                event.homeScore || 0,
                event.awayScore || 0,
                (event.notes || '').replace(/"/g, '""')
            ];
            csv += row.map(cell => `"${cell}"`).join(',') + '\n';
        });

        this.downloadFile(csv, `${baseName}-${timestamp}.csv`, 'text/csv');
    }

    exportExcel(baseName, timestamp) {
        // Prepare data for Excel
        const headers = ['Timestamp', 'Time', 'Half', 'Minute', 'Event Type', 'Team', 'Player', 'Zone', 'Home Score', 'Away Score', 'Notes'];
        const data = this.events.map(event => [
            event.timestamp,
            event.timeString,
            event.half,
            event.minute || '',
            this.getEventDisplayName(event.type),
            event.team || '',
            event.playerName || '',
            event.zone || '',
            event.homeScore || 0,
            event.awayScore || 0,
            event.notes || ''
        ]);

        // Create workbook
        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.aoa_to_sheet([headers, ...data]);
        
        // Set column widths
        ws['!cols'] = [
            { wch: 12 }, // Timestamp
            { wch: 10 }, // Time
            { wch: 6 },  // Half
            { wch: 8 },  // Minute
            { wch: 15 }, // Event Type
            { wch: 8 },  // Team
            { wch: 15 }, // Player
            { wch: 15 }, // Zone
            { wch: 12 }, // Home Score
            { wch: 12 }, // Away Score
            { wch: 30 }  // Notes
        ];

        XLSX.utils.book_append_sheet(wb, ws, 'Events');
        
        // Add session info sheet
        const sessionData = [
            ['Session Name', this.currentSession.name || ''],
            ['Home Team', this.currentSession.homeTeam || ''],
            ['Away Team', this.currentSession.awayTeam || ''],
            ['Created At', this.currentSession.createdAt || ''],
            ['Total Events', this.events.length]
        ];
        const sessionWs = XLSX.utils.aoa_to_sheet(sessionData);
        XLSX.utils.book_append_sheet(wb, sessionWs, 'Session Info');

        XLSX.writeFile(wb, `${baseName}-${timestamp}.xlsx`);
    }

    exportXML(baseName, timestamp) {
        let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
        xml += '<football-match>\n';
        xml += `  <session>\n`;
        xml += `    <name>${this.escapeXML(this.currentSession.name || '')}</name>\n`;
        xml += `    <home-team>${this.escapeXML(this.currentSession.homeTeam || '')}</home-team>\n`;
        xml += `    <away-team>${this.escapeXML(this.currentSession.awayTeam || '')}</away-team>\n`;
        xml += `    <created-at>${this.currentSession.createdAt || ''}</created-at>\n`;
        xml += `  </session>\n`;
        xml += `  <events>\n`;

        this.events.forEach(event => {
            xml += `    <event>\n`;
            xml += `      <id>${event.id}</id>\n`;
            xml += `      <timestamp>${event.timestamp}</timestamp>\n`;
            xml += `      <time>${this.escapeXML(event.timeString)}</time>\n`;
            xml += `      <type>${this.escapeXML(this.getEventDisplayName(event.type))}</type>\n`;
            xml += `      <half>${this.escapeXML(event.half)}</half>\n`;
            xml += `      <minute>${event.minute || ''}</minute>\n`;
            xml += `      <team>${this.escapeXML(event.team || '')}</team>\n`;
            xml += `      <player>${this.escapeXML(event.playerName || '')}</player>\n`;
            xml += `      <zone>${this.escapeXML(event.zone || '')}</zone>\n`;
            xml += `      <home-score>${event.homeScore || 0}</home-score>\n`;
            xml += `      <away-score>${event.awayScore || 0}</away-score>\n`;
            xml += `      <notes>${this.escapeXML(event.notes || '')}</notes>\n`;
            xml += `    </event>\n`;
        });

        xml += `  </events>\n`;
        xml += `</football-match>\n`;

        this.downloadFile(xml, `${baseName}-${timestamp}.xml`, 'application/xml');
    }

    exportJSONEvents(baseName, timestamp) {
        const eventsOnly = {
            session: {
                name: this.currentSession.name,
                homeTeam: this.currentSession.homeTeam,
                awayTeam: this.currentSession.awayTeam
            },
            events: this.events
        };
        const json = JSON.stringify(eventsOnly, null, 2);
        this.downloadFile(json, `${baseName}-${timestamp}.json`, 'application/json');
    }

    exportJSONLines(baseName, timestamp) {
        // JSON Lines format (one JSON object per line)
        let jsonl = '';
        this.events.forEach(event => {
            jsonl += JSON.stringify(event) + '\n';
        });
        this.downloadFile(jsonl, `${baseName}-${timestamp}.jsonl`, 'application/x-ndjson');
    }

    exportSQL(baseName, timestamp) {
        let sql = `-- Football Match Events Export\n`;
        sql += `-- Session: ${this.currentSession.name || 'Unnamed'}\n`;
        sql += `-- Home Team: ${this.currentSession.homeTeam || ''}\n`;
        sql += `-- Away Team: ${this.currentSession.awayTeam || ''}\n`;
        sql += `-- Exported: ${new Date().toISOString()}\n\n`;
        sql += `CREATE TABLE IF NOT EXISTS football_events (\n`;
        sql += `  id BIGINT PRIMARY KEY,\n`;
        sql += `  timestamp DECIMAL(10,3),\n`;
        sql += `  time_string VARCHAR(10),\n`;
        sql += `  half VARCHAR(10),\n`;
        sql += `  minute INT,\n`;
        sql += `  event_type VARCHAR(50),\n`;
        sql += `  team VARCHAR(10),\n`;
        sql += `  player_name VARCHAR(100),\n`;
        sql += `  zone VARCHAR(50),\n`;
        sql += `  home_score INT,\n`;
        sql += `  away_score INT,\n`;
        sql += `  notes TEXT\n`;
        sql += `);\n\n`;

        this.events.forEach(event => {
            const values = [
                event.id,
                event.timestamp,
                this.escapeSQL(event.timeString),
                this.escapeSQL(event.half),
                event.minute || 'NULL',
                this.escapeSQL(this.getEventDisplayName(event.type)),
                this.escapeSQL(event.team || ''),
                this.escapeSQL(event.playerName || ''),
                this.escapeSQL(event.zone || ''),
                event.homeScore || 0,
                event.awayScore || 0,
                this.escapeSQL(event.notes || '')
            ];
            sql += `INSERT INTO football_events VALUES (${values.join(', ')});\n`;
        });

        this.downloadFile(sql, `${baseName}-${timestamp}.sql`, 'text/plain');
    }

    escapeXML(str) {
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&apos;');
    }

    escapeSQL(str) {
        if (!str) return 'NULL';
        return `'${String(str).replace(/'/g, "''")}'`;
    }

    downloadFile(content, filename, mimeType) {
        const blob = new Blob([content], { type: mimeType });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        link.click();
        URL.revokeObjectURL(url);
    }

    saveToStorage() {
        try {
            localStorage.setItem('footballMatchCoder_session', JSON.stringify(this.currentSession));
        } catch (e) {
            console.warn('Could not save to localStorage:', e);
        }
    }

    loadSessionFromStorage() {
        try {
            const saved = localStorage.getItem('footballMatchCoder_session');
            if (saved) {
                this.currentSession = JSON.parse(saved);
                this.events = this.currentSession.events || [];
                this.lineups = this.currentSession.lineups || { home: [], away: [] };
                
                // Extract all tags from events to populate available tags
                this.events.forEach(event => {
                    if (event.tags && Array.isArray(event.tags)) {
                        event.tags.forEach(tag => {
                            if (!this.availableTags.includes(tag)) {
                                this.availableTags.push(tag);
                            }
                        });
                    }
                });
                this.saveTagsToStorage();
                
                // Restore form values
                document.getElementById('sessionName').value = this.currentSession.name || '';
                document.getElementById('homeTeam').value = this.currentSession.homeTeam || '';
                document.getElementById('awayTeam').value = this.currentSession.awayTeam || '';
                
                this.updateEventsList();
                this.updateMatchInfo();
                this.updatePlayerList();
                this.updateLineupStatus();
            }
        } catch (e) {
            console.warn('Could not load from localStorage:', e);
        }
    }

    async loadLineupFromFile(file) {
        const statusEl = document.getElementById('lineupStatus');
        statusEl.style.display = 'block';
        statusEl.textContent = 'Loading lineup file...';
        statusEl.className = 'lineup-status loading';

        try {
            const fileExtension = file.name.split('.').pop().toLowerCase();
            
            if (fileExtension === 'csv') {
                await this.parseCSVLineup(file);
            } else if (fileExtension === 'xlsx' || fileExtension === 'xls') {
                await this.parseExcelLineup(file);
            } else {
                throw new Error('Unsupported file format. Please use CSV or Excel files.');
            }
        } catch (error) {
            statusEl.textContent = `Error: ${error.message}`;
            statusEl.className = 'lineup-status error';
            console.error('Error loading lineup:', error);
        }
    }

    async parseCSVLineup(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const text = e.target.result;
                    const lines = text.split('\n').filter(line => line.trim());
                    
                    if (lines.length < 2) {
                        throw new Error('CSV file must have at least a header row and one data row');
                    }

                    // Parse header
                    const header = lines[0].split(',').map(h => h.trim().toLowerCase());
                    const nameIndex = header.findIndex(h => h.includes('name') || h.includes('player'));
                    const numberIndex = header.findIndex(h => h.includes('number') || h.includes('num') || h.includes('#'));
                    const teamIndex = header.findIndex(h => h.includes('team'));

                    if (nameIndex === -1 && numberIndex === -1) {
                        throw new Error('CSV must contain "name" or "player" column and/or "number" column');
                    }

                    const players = [];
                    for (let i = 1; i < lines.length; i++) {
                        const values = this.parseCSVLine(lines[i]);
                        const name = nameIndex !== -1 ? values[nameIndex]?.trim() : '';
                        const number = numberIndex !== -1 ? values[numberIndex]?.trim() : '';
                        const team = teamIndex !== -1 ? values[teamIndex]?.trim().toLowerCase() : '';

                        if (name || number) {
                            const player = this.createPlayerObject(name, number);

                            if (team === 'home' || team === 'away') {
                                this.lineups[team].push(player);
                            } else {
                                // If no team specified, add to both (user can filter later)
                                players.push(player);
                            }
                        }
                    }

                    // If no team column, distribute players
                    if (teamIndex === -1 && players.length > 0) {
                        const midPoint = Math.ceil(players.length / 2);
                        this.lineups.home = players.slice(0, midPoint);
                        this.lineups.away = players.slice(midPoint);
                    }

                    this.currentSession.lineups = { ...this.lineups };
                    this.updatePlayerList();
                    this.updateLineupStatus();
                    this.saveToStorage();

                    const statusEl = document.getElementById('lineupStatus');
                    statusEl.textContent = `Loaded ${this.lineups.home.length + this.lineups.away.length} players`;
                    statusEl.className = 'lineup-status success';
                    resolve();
                } catch (error) {
                    reject(error);
                }
            };
            reader.onerror = () => reject(new Error('Failed to read file'));
            reader.readAsText(file);
        });
    }

    parseCSVLine(line) {
        const values = [];
        let current = '';
        let inQuotes = false;

        for (let i = 0; i < line.length; i++) {
            const char = line[i];
            if (char === '"') {
                inQuotes = !inQuotes;
            } else if (char === ',' && !inQuotes) {
                values.push(current);
                current = '';
            } else {
                current += char;
            }
        }
        values.push(current);
        return values;
    }

    async parseExcelLineup(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const data = new Uint8Array(e.target.result);
                    const workbook = XLSX.read(data, { type: 'array' });
                    const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
                    const jsonData = XLSX.utils.sheet_to_json(firstSheet);

                    if (jsonData.length === 0) {
                        throw new Error('Excel file is empty');
                    }

                    // Find columns
                    const firstRow = jsonData[0];
                    const nameKey = Object.keys(firstRow).find(k => 
                        k.toLowerCase().includes('name') || k.toLowerCase().includes('player')
                    );
                    const numberKey = Object.keys(firstRow).find(k => 
                        k.toLowerCase().includes('number') || k.toLowerCase().includes('num') || k.includes('#')
                    );
                    const teamKey = Object.keys(firstRow).find(k => 
                        k.toLowerCase().includes('team')
                    );

                    if (!nameKey && !numberKey) {
                        throw new Error('Excel must contain "name" or "player" column and/or "number" column');
                    }

                    const players = [];
                    jsonData.forEach(row => {
                        const name = nameKey ? String(row[nameKey] || '').trim() : '';
                        const number = numberKey ? String(row[numberKey] || '').trim() : '';
                        const team = teamKey ? String(row[teamKey] || '').trim().toLowerCase() : '';

                        if (name || number) {
                            const player = this.createPlayerObject(name, number);

                            if (team === 'home' || team === 'away') {
                                this.lineups[team].push(player);
                            } else {
                                players.push(player);
                            }
                        }
                    });

                    // If no team column, distribute players
                    if (!teamKey && players.length > 0) {
                        const midPoint = Math.ceil(players.length / 2);
                        this.lineups.home = players.slice(0, midPoint);
                        this.lineups.away = players.slice(midPoint);
                    }

                    this.currentSession.lineups = { ...this.lineups };
                    this.updatePlayerList();
                    this.updateLineupStatus();
                    this.saveToStorage();

                    const statusEl = document.getElementById('lineupStatus');
                    statusEl.textContent = `Loaded ${this.lineups.home.length + this.lineups.away.length} players`;
                    statusEl.className = 'lineup-status success';
                    resolve();
                } catch (error) {
                    reject(error);
                }
            };
            reader.onerror = () => reject(new Error('Failed to read file'));
            reader.readAsArrayBuffer(file);
        });
    }

    async loadLineupFromUrl(url) {
        const statusEl = document.getElementById('lineupStatus');
        statusEl.style.display = 'block';
        statusEl.textContent = 'Loading lineup from URL...';
        statusEl.className = 'lineup-status loading';

        try {
            let response;
            let text;
            
            // Try direct fetch first
            try {
                response = await fetch(url);
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                text = await response.text();
            } catch (corsError) {
                // If CORS fails, try using a CORS proxy
                statusEl.textContent = 'CORS error detected. Trying CORS proxy...';
                const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`;
                response = await fetch(proxyUrl);
                if (!response.ok) {
                    throw new Error(`Failed to fetch via proxy: ${response.status}`);
                }
                text = await response.text();
            }

            // Check if it's an ACC boxscore page
            if (url.includes('theacc.com') && url.includes('boxscore')) {
                this.parseACCBoxscore(text);
            } else if (text.trim().startsWith('{') || text.trim().startsWith('[')) {
                // Try to parse as JSON
                try {
                    const data = JSON.parse(text);
                    this.parseJSONLineup(data);
                } catch (e) {
                    // Not valid JSON, try HTML
                    this.parseHTMLLineup(text);
                }
            } else if (text.trim().startsWith('<')) {
                // Parse as HTML
                this.parseHTMLLineup(text);
            } else {
                // Try as CSV
                await this.parseCSVFromText(text);
            }

            this.currentSession.lineups = { ...this.lineups };
            this.updatePlayerList();
            this.updateLineupStatus();
            this.saveToStorage();

            statusEl.textContent = `Loaded ${this.lineups.home.length + this.lineups.away.length} players from URL`;
            statusEl.className = 'lineup-status success';
        } catch (error) {
            statusEl.textContent = `Error: ${error.message}. If this is a CORS issue, try copying the page HTML and saving it as a file.`;
            statusEl.className = 'lineup-status error';
            console.error('Error loading lineup from URL:', error);
        }
    }

    parseJSONLineup(data) {
        // Try to find player arrays in the JSON
        const players = [];
        
        // Common JSON structures
        if (Array.isArray(data)) {
            players.push(...data);
        } else if (data.players) {
            players.push(...(Array.isArray(data.players) ? data.players : []));
        } else if (data.home && data.away) {
            this.lineups.home = this.extractPlayersFromData(data.home);
            this.lineups.away = this.extractPlayersFromData(data.away);
            return;
        } else {
            // Try to find any array that looks like players
            for (const key in data) {
                if (Array.isArray(data[key]) && data[key].length > 0) {
                    const firstItem = data[key][0];
                    if (firstItem && (firstItem.name || firstItem.player || firstItem.number)) {
                        players.push(...data[key]);
                        break;
                    }
                }
            }
        }

        if (players.length === 0) {
            throw new Error('Could not find player data in JSON');
        }

        const processedPlayers = players.map(p => {
            const name = p.name || p.player || p.playerName || '';
            const number = p.number || p.num || p.jerseyNumber || '';
            return this.createPlayerObject(name, number);
        });

        const midPoint = Math.ceil(processedPlayers.length / 2);
        this.lineups.home = processedPlayers.slice(0, midPoint);
        this.lineups.away = processedPlayers.slice(midPoint);
    }

    extractPlayersFromData(data) {
        if (Array.isArray(data)) {
            return data.map(p => {
                const name = p.name || p.player || p.playerName || '';
                const number = p.number || p.num || p.jerseyNumber || '';
                return this.createPlayerObject(name, number);
            });
        }
        return [];
    }

    parseHTMLLineup(html) {
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');
        
        // Try to find player information in common HTML structures
        const players = [];
        
        // Look for tables with player data
        const tables = doc.querySelectorAll('table');
        tables.forEach(table => {
            const rows = table.querySelectorAll('tr');
            rows.forEach((row, index) => {
                if (index === 0) return; // Skip header
                const cells = row.querySelectorAll('td, th');
                if (cells.length >= 2) {
                    const name = cells[0]?.textContent?.trim() || '';
                    const number = cells[1]?.textContent?.trim() || '';
                    if (name || number) {
                        players.push(this.createPlayerObject(name, number));
                    }
                }
            });
        });

        // Look for lists with player data
        if (players.length === 0) {
            const lists = doc.querySelectorAll('ul, ol');
            lists.forEach(list => {
                const items = list.querySelectorAll('li');
                items.forEach(item => {
                    const text = item.textContent.trim();
                    const numberMatch = text.match(/#?(\d+)/);
                    const number = numberMatch ? numberMatch[1] : '';
                    const name = text.replace(/#?\d+\s*/, '').trim();
                    if (name || number) {
                        players.push(this.createPlayerObject(name, number));
                    }
                });
            });
        }

        if (players.length === 0) {
            throw new Error('Could not find player data in HTML');
        }

        const midPoint = Math.ceil(players.length / 2);
        this.lineups.home = players.slice(0, midPoint);
        this.lineups.away = players.slice(midPoint);
    }

    parseACCBoxscore(html) {
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');
        
        // Clear existing lineups
        this.lineups.home = [];
        this.lineups.away = [];
        
        // Find team names from the page
        const headers = Array.from(doc.querySelectorAll('h1, h2, h3, h4, h5, h6'));
        let team1Name = '';
        let team2Name = '';
        
        // Look for VS pattern in headers
        headers.forEach(header => {
            const text = header.textContent || '';
            const match = text.match(/([^-]+)\s*-VS-\s*(.+)/i);
            if (match) {
                team1Name = match[1].trim();
                team2Name = match[2].trim();
            }
        });
        
        // Find all sections with "Player Stats" - ACC format has "__MSU - Player Stats__" and "__STAN - Player Stats__"
        const msuPlayers = [];
        const stanPlayers = [];
        
        // Look for all headings that contain "Player Stats"
        const allHeadings = Array.from(doc.querySelectorAll('h1, h2, h3, h4, h5, h6, div, span, p'));
        
        allHeadings.forEach(heading => {
            const text = heading.textContent || '';
            
            // Check if this is a "Player Stats" section header
            if (text.includes('Player Stats')) {
                // Determine which team
                const isMSU = text.includes('MSU') || text.includes('Michigan St') || text.includes('Michigan St.');
                const isSTAN = text.includes('STAN') || text.includes('Stanford');
                
                if (isMSU || isSTAN) {
                    // Find the table that follows this heading
                    let element = heading.nextElementSibling;
                    let searchDepth = 0;
                    
                    // Look for the next table
                    while (element && searchDepth < 10) {
                        if (element.tagName === 'TABLE') {
                            // Found the table, parse it
                            const rows = element.querySelectorAll('tr');
                            rows.forEach((row, index) => {
                                if (index === 0) return; // Skip header
                                
                                const cells = row.querySelectorAll('td, th');
                                if (cells.length >= 3) {
                                    // ACC format: Pos | # | Player | SH | SOG | G | A
                                    let number = (cells[1]?.textContent || '').trim().replace(/\D/g, '');
                                    let name = (cells[2]?.textContent || '').trim();
                                    
                                    // Clean name - remove any leading number that might be in the name field
                                    name = this.cleanPlayerName(name, number);
                                    
                                    // Skip headers, totals, team rows, and empty rows
                                    if (name.toLowerCase().includes('player') || 
                                        name.toLowerCase().includes('totals') || 
                                        name.toLowerCase().includes('team') ||
                                        name.toLowerCase() === 'tm' ||
                                        (!name && !number)) {
                                        return;
                                    }
                                    
                                    if (name || number) {
                                        const player = this.createPlayerObject(name, number);
                                        
                                        if (isMSU) {
                                            msuPlayers.push(player);
                                        } else if (isSTAN) {
                                            stanPlayers.push(player);
                                        }
                                    }
                                }
                            });
                            break; // Found the table for this team, move on
                        }
                        element = element.nextElementSibling;
                        searchDepth++;
                    }
                }
            }
        });
        
        // If we didn't find players using the heading method, try finding tables directly
        if (msuPlayers.length === 0 && stanPlayers.length === 0) {
            const allTables = doc.querySelectorAll('table');
            let currentTeamSection = null;
            
            allTables.forEach(table => {
                const headerRow = table.querySelector('tr');
                if (!headerRow) return;
                
                const headerCells = headerRow.querySelectorAll('th, td');
                const headerText = Array.from(headerCells).map(c => c.textContent.toLowerCase()).join(' ');
                
                // Check if this is a player stats table
                if (headerText.includes('player') && (headerText.includes('#') || headerText.includes('pos'))) {
                    // Look backwards to find team indicator
                    let element = table;
                    let searchDepth = 0;
                    
                    while (element && searchDepth < 10) {
                        const text = (element.textContent || '').toUpperCase();
                        
                        // Check if we found a team section
                        if (text.includes('MSU') || text.includes('MICHIGAN ST')) {
                            currentTeamSection = 'MSU';
                            break;
                        } else if (text.includes('STAN') || text.includes('STANFORD')) {
                            currentTeamSection = 'STAN';
                            break;
                        }
                        
                        element = element.previousElementSibling || element.parentElement;
                        searchDepth++;
                    }
                    
                    // Parse the table
                    const rows = table.querySelectorAll('tr');
                    rows.forEach((row, index) => {
                        if (index === 0) return;
                        
                        const cells = row.querySelectorAll('td, th');
                        if (cells.length >= 3) {
                            let number = (cells[1]?.textContent || '').trim().replace(/\D/g, '');
                            let name = (cells[2]?.textContent || '').trim();
                            
                            // Clean name first - remove any leading number
                            name = this.cleanPlayerName(name, number);
                            
                            if (name.toLowerCase().includes('player') || 
                                name.toLowerCase().includes('totals') || 
                                name.toLowerCase().includes('team') ||
                                name.toLowerCase() === 'tm' ||
                                (!name && !number)) {
                                return;
                            }
                            
                            if (name || number) {
                                const player = this.createPlayerObject(name, number);
                                
                                if (currentTeamSection === 'MSU') {
                                    msuPlayers.push(player);
                                } else if (currentTeamSection === 'STAN') {
                                    stanPlayers.push(player);
                                }
                            }
                        }
                    });
                }
            });
        }
        
        // Determine home/away - check page order
        const htmlLower = html.toLowerCase();
        const msuIndex = htmlLower.indexOf('michigan st');
        const stanIndex = htmlLower.indexOf('stanford');
        
        if (msuPlayers.length > 0 && stanPlayers.length > 0) {
            // Both teams found - determine order
            if (msuIndex !== -1 && stanIndex !== -1) {
                if (msuIndex < stanIndex) {
                    // MSU appears first (away), Stanford second (home)
                    this.lineups.away = msuPlayers;
                    this.lineups.home = stanPlayers;
                } else {
                    // Stanford appears first (away), MSU second (home)
                    this.lineups.away = stanPlayers;
                    this.lineups.home = msuPlayers;
                }
            } else {
                // Default: first team found is away
                this.lineups.away = msuPlayers;
                this.lineups.home = stanPlayers;
            }
        } else if (msuPlayers.length > 0) {
            this.lineups.away = msuPlayers;
        } else if (stanPlayers.length > 0) {
            this.lineups.home = stanPlayers;
        }
        
        // Update team names in session
        if (team1Name && !this.currentSession.awayTeam) {
            document.getElementById('awayTeam').value = team1Name;
            this.currentSession.awayTeam = team1Name;
        }
        if (team2Name && !this.currentSession.homeTeam) {
            document.getElementById('homeTeam').value = team2Name;
            this.currentSession.homeTeam = team2Name;
        }
        
        if (this.lineups.home.length === 0 && this.lineups.away.length === 0) {
            throw new Error('Could not find player data in ACC boxscore. The page structure may have changed.');
        }
    }

    async parseCSVFromText(text) {
        const lines = text.split('\n').filter(line => line.trim());
        if (lines.length < 2) {
            throw new Error('CSV data must have at least a header row and one data row');
        }

        const header = lines[0].split(',').map(h => h.trim().toLowerCase());
        const nameIndex = header.findIndex(h => h.includes('name') || h.includes('player'));
        const numberIndex = header.findIndex(h => h.includes('number') || h.includes('num') || h.includes('#'));

        if (nameIndex === -1 && numberIndex === -1) {
            throw new Error('CSV must contain "name" or "player" column and/or "number" column');
        }

        const players = [];
        for (let i = 1; i < lines.length; i++) {
            const values = this.parseCSVLine(lines[i]);
            const name = nameIndex !== -1 ? values[nameIndex]?.trim() : '';
            const number = numberIndex !== -1 ? values[numberIndex]?.trim() : '';

            if (name || number) {
                players.push(this.createPlayerObject(name, number));
            }
        }

        const midPoint = Math.ceil(players.length / 2);
        this.lineups.home = players.slice(0, midPoint);
        this.lineups.away = players.slice(midPoint);
    }

    cleanPlayerName(name, number) {
        // Remove any leading number from name (we'll add it back in displayName)
        if (!name) return name;
        
        const nameTrimmed = name.trim();
        
        // Pattern 1: "#0 Name" or "# 0 Name" or "#0  Name"
        let match = nameTrimmed.match(/^#?\s*(\d+)\s+(.+)$/);
        if (match) {
            return match[2].trim();
        }
        
        // Pattern 2: "0 Name" (number at start, possibly with extra spaces)
        match = nameTrimmed.match(/^(\d+)\s+(.+)$/);
        if (match) {
            return match[2].trim();
        }
        
        // Pattern 3: "0Name" (number directly attached, less common)
        match = nameTrimmed.match(/^(\d+)([A-Za-z].+)$/);
        if (match) {
            return match[2].trim();
        }
        
        return nameTrimmed;
    }

    createPlayerObject(name, number) {
        const cleanedName = this.cleanPlayerName(name, number);
        return {
            name: cleanedName || `#${number}`,
            number: number || '',
            displayName: number ? `#${number} ${cleanedName}`.trim() : cleanedName
        };
    }

    updatePlayerList() {
        // Update home team dropdown
        const homeSelect = document.getElementById('homePlayerSelect');
        const homePlayers = this.lineups.home || [];
        
        // Keep the first option (placeholder)
        homeSelect.innerHTML = '<option value="">Select Home Player</option>';
        homePlayers.forEach(player => {
            const option = document.createElement('option');
            option.value = player.displayName || player.name;
            option.textContent = player.displayName || player.name;
            homeSelect.appendChild(option);
        });
        
        // Update away team dropdown
        const awaySelect = document.getElementById('awayPlayerSelect');
        const awayPlayers = this.lineups.away || [];
        
        // Keep the first option (placeholder)
        awaySelect.innerHTML = '<option value="">Select Away Player</option>';
        awayPlayers.forEach(player => {
            const option = document.createElement('option');
            option.value = player.displayName || player.name;
            option.textContent = player.displayName || player.name;
            awaySelect.appendChild(option);
        });

        // Update info display
        const infoEl = document.getElementById('loadedPlayersInfo');
        const totalPlayers = homePlayers.length + awayPlayers.length;
        if (totalPlayers > 0) {
            infoEl.style.display = 'block';
            infoEl.textContent = `Home: ${homePlayers.length} players | Away: ${awayPlayers.length} players`;
            infoEl.className = 'loaded-players-info';
        } else {
            infoEl.style.display = 'none';
        }
    }

    updateLineupStatus() {
        const totalPlayers = this.lineups.home.length + this.lineups.away.length;
        if (totalPlayers > 0) {
            const statusEl = document.getElementById('lineupStatus');
            statusEl.style.display = 'block';
            statusEl.textContent = `Home: ${this.lineups.home.length} players | Away: ${this.lineups.away.length} players`;
            statusEl.className = 'lineup-status success';
        }
    }

    // ==================== TAGS SYSTEM ====================
    setupTagsSystem() {
        const tagInput = document.getElementById('tagInput');
        const addTagBtn = document.getElementById('addTagBtn');

        addTagBtn.addEventListener('click', () => this.addTag());
        tagInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                this.addTag();
            }
        });

        tagInput.addEventListener('input', () => {
            this.showTagSuggestions(tagInput.value);
        });

        this.updateSelectedTags();
        this.updateTagSuggestions();
    }

    addTag() {
        const tagInput = document.getElementById('tagInput');
        const tag = tagInput.value.trim().toLowerCase();
        
        if (tag && !this.currentEventTags.includes(tag)) {
            this.currentEventTags.push(tag);
            if (!this.availableTags.includes(tag)) {
                this.availableTags.push(tag);
                this.saveTagsToStorage();
            }
            tagInput.value = '';
            this.updateSelectedTags();
            this.updateTagSuggestions();
        }
    }

    removeTag(tag) {
        this.currentEventTags = this.currentEventTags.filter(t => t !== tag);
        this.updateSelectedTags();
    }

    updateSelectedTags() {
        const container = document.getElementById('selectedTags');
        container.innerHTML = '';
        
        this.currentEventTags.forEach(tag => {
            const tagEl = document.createElement('span');
            tagEl.className = 'tag';
            tagEl.innerHTML = `
                ${tag}
                <button class="tag-remove" onclick="app.removeTag('${tag}')">&times;</button>
            `;
            container.appendChild(tagEl);
        });
    }

    updateTagSuggestions() {
        const container = document.getElementById('tagSuggestions');
        const unusedTags = this.availableTags.filter(t => !this.currentEventTags.includes(t));
        
        if (unusedTags.length === 0) return;
        
        container.innerHTML = '<div style="font-size: 0.8rem; color: #94a3b8; margin-bottom: 0.25rem;">Suggestions:</div>';
        unusedTags.slice(0, 10).forEach(tag => {
            const suggestion = document.createElement('span');
            suggestion.className = 'tag-suggestion';
            suggestion.textContent = tag;
            suggestion.addEventListener('click', () => {
                if (!this.currentEventTags.includes(tag)) {
                    this.currentEventTags.push(tag);
                    this.updateSelectedTags();
                    this.updateTagSuggestions();
                }
            });
            container.appendChild(suggestion);
        });
    }

    showTagSuggestions(query) {
        if (!query) {
            this.updateTagSuggestions();
            return;
        }
        
        const container = document.getElementById('tagSuggestions');
        const matching = this.availableTags.filter(t => 
            t.includes(query.toLowerCase()) && !this.currentEventTags.includes(t)
        );
        
        container.innerHTML = '';
        if (matching.length > 0) {
            container.innerHTML = '<div style="font-size: 0.8rem; color: #94a3b8; margin-bottom: 0.25rem;">Suggestions:</div>';
            matching.slice(0, 10).forEach(tag => {
                const suggestion = document.createElement('span');
                suggestion.className = 'tag-suggestion';
                suggestion.textContent = tag;
                suggestion.addEventListener('click', () => {
                    if (!this.currentEventTags.includes(tag)) {
                        this.currentEventTags.push(tag);
                        document.getElementById('tagInput').value = '';
                        this.updateSelectedTags();
                        this.updateTagSuggestions();
                    }
                });
                container.appendChild(suggestion);
            });
        }
    }

    saveTagsToStorage() {
        try {
            localStorage.setItem('footballMatchCoder_tags', JSON.stringify(this.availableTags));
        } catch (e) {
            console.warn('Could not save tags:', e);
        }
    }

    loadTagsFromStorage() {
        try {
            const saved = localStorage.getItem('footballMatchCoder_tags');
            if (saved) {
                this.availableTags = JSON.parse(saved);
            }
        } catch (e) {
            console.warn('Could not load tags:', e);
        }
    }

    // ==================== FILTERING SYSTEM ====================
    setupFilteringSystem() {
        const filterBtn = document.getElementById('filterBtn');
        const filterPanel = document.getElementById('filterPanel');
        const applyFilterBtn = document.getElementById('applyFilterBtn');
        const clearFilterBtn = document.getElementById('clearFilterBtn');
        const exportFilteredBtn = document.getElementById('exportFilteredBtn');
        const searchInput = document.getElementById('searchInput');
        const filterTagInput = document.getElementById('filterTagInput');

        filterBtn.addEventListener('click', () => {
            filterPanel.style.display = filterPanel.style.display === 'none' ? 'block' : 'none';
        });

        applyFilterBtn.addEventListener('click', () => this.applyFilters());
        clearFilterBtn.addEventListener('click', () => this.clearFilters());
        exportFilteredBtn.addEventListener('click', () => this.exportFilteredEvents());

        searchInput.addEventListener('input', () => {
            this.activeFilters.search = searchInput.value;
            this.applyFilters();
        });

        filterTagInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                const tag = filterTagInput.value.trim().toLowerCase();
                if (tag && !this.activeFilters.tags.includes(tag)) {
                    this.activeFilters.tags.push(tag);
                    filterTagInput.value = '';
                    this.updateFilterTags();
                    this.applyFilters();
                }
            }
        });

        this.updateFilterTags();
    }

    applyFilters() {
        // Get filter values
        const eventTypeSelect = document.getElementById('filterEventType');
        this.activeFilters.eventTypes = Array.from(eventTypeSelect.selectedOptions).map(opt => opt.value);
        this.activeFilters.team = document.getElementById('filterTeam').value;
        this.activeFilters.player = document.getElementById('filterPlayer').value.toLowerCase();
        
        const timeStart = document.getElementById('filterTimeStart').value;
        const timeEnd = document.getElementById('filterTimeEnd').value;
        this.activeFilters.timeStart = timeStart ? parseFloat(timeStart) : null;
        this.activeFilters.timeEnd = timeEnd ? parseFloat(timeEnd) : null;

        // Filter events
        this.filteredEvents = this.events.filter(event => {
            // Search filter
            if (this.activeFilters.search) {
                const searchLower = this.activeFilters.search.toLowerCase();
                const matchesSearch = 
                    event.playerName.toLowerCase().includes(searchLower) ||
                    event.notes.toLowerCase().includes(searchLower) ||
                    this.getEventDisplayName(event.type).toLowerCase().includes(searchLower) ||
                    (event.tags && event.tags.some(tag => tag.toLowerCase().includes(searchLower)));
                if (!matchesSearch) return false;
            }

            // Event type filter
            if (this.activeFilters.eventTypes.length > 0 && !this.activeFilters.eventTypes.includes(event.type)) {
                return false;
            }

            // Team filter
            if (this.activeFilters.team && event.team !== this.activeFilters.team) {
                return false;
            }

            // Player filter
            if (this.activeFilters.player && !event.playerName.toLowerCase().includes(this.activeFilters.player)) {
                return false;
            }

            // Tags filter
            if (this.activeFilters.tags.length > 0) {
                const eventTags = event.tags || [];
                const hasAllTags = this.activeFilters.tags.every(tag => eventTags.includes(tag));
                if (!hasAllTags) return false;
            }

            // Time range filter
            if (this.activeFilters.timeStart !== null && event.timestamp < this.activeFilters.timeStart) {
                return false;
            }
            if (this.activeFilters.timeEnd !== null && event.timestamp > this.activeFilters.timeEnd) {
                return false;
            }

            return true;
        });

        this.updateEventsList();
    }

    clearFilters() {
        this.activeFilters = {
            search: '',
            eventTypes: [],
            team: '',
            player: '',
            tags: [],
            timeStart: null,
            timeEnd: null
        };
        this.filteredEvents = null;

        document.getElementById('searchInput').value = '';
        document.getElementById('filterEventType').selectedIndex = -1;
        document.getElementById('filterTeam').value = '';
        document.getElementById('filterPlayer').value = '';
        document.getElementById('filterTimeStart').value = '';
        document.getElementById('filterTimeEnd').value = '';
        this.activeFilters.tags = [];
        this.updateFilterTags();
        this.updateEventsList();
    }

    updateFilterTags() {
        const container = document.getElementById('filterTags');
        container.innerHTML = '';
        
        this.activeFilters.tags.forEach(tag => {
            const tagEl = document.createElement('span');
            tagEl.className = 'filter-tag';
            tagEl.innerHTML = `
                ${tag}
                <button class="filter-tag-remove" onclick="app.removeFilterTag('${tag}')">&times;</button>
            `;
            container.appendChild(tagEl);
        });
    }

    removeFilterTag(tag) {
        this.activeFilters.tags = this.activeFilters.tags.filter(t => t !== tag);
        this.updateFilterTags();
        this.applyFilters();
    }

    exportFilteredEvents() {
        const eventsToExport = this.filteredEvents || this.events;
        if (eventsToExport.length === 0) {
            alert('No events to export');
            return;
        }

        // Create a temporary session with filtered events
        const tempSession = {
            ...this.currentSession,
            events: eventsToExport
        };

        const dataStr = JSON.stringify(tempSession, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(dataBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${this.currentSession.name || 'filtered-events'}-${Date.now()}.json`;
        link.click();
        URL.revokeObjectURL(url);
    }

    // ==================== TEMPLATES SYSTEM ====================
    setupTemplatesSystem() {
        const templateBtn = document.getElementById('templateBtn');
        const templateMenu = document.getElementById('templateMenu');
        const saveTemplateBtn = document.getElementById('saveTemplateBtn');
        const loadTemplateBtn = document.getElementById('loadTemplateBtn');
        const deleteTemplateBtn = document.getElementById('deleteTemplateBtn');
        const templateSelect = document.getElementById('templateSelect');

        templateBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            templateMenu.style.display = templateMenu.style.display === 'block' ? 'none' : 'block';
            if (templateMenu.style.display === 'block') {
                this.loadTemplateList();
            }
        });

        document.addEventListener('click', (e) => {
            if (!templateMenu.contains(e.target) && e.target !== templateBtn) {
                templateMenu.style.display = 'none';
            }
        });

        saveTemplateBtn.addEventListener('click', () => {
            const templateName = document.getElementById('templateNameInput').value.trim();
            if (!templateName) {
                alert('Please enter a template name');
                return;
            }
            if (this.templateSequence.length === 0) {
                alert('No events in sequence. Record some events first.');
                return;
            }
            this.saveTemplate(templateName);
        });

        loadTemplateBtn.addEventListener('click', () => {
            const templateName = templateSelect.value;
            if (!templateName) {
                alert('Please select a template');
                return;
            }
            this.loadTemplate(templateName);
        });

        deleteTemplateBtn.addEventListener('click', () => {
            const templateName = templateSelect.value;
            if (!templateName) {
                alert('Please select a template to delete');
                return;
            }
            if (confirm(`Delete template "${templateName}"?`)) {
                this.deleteTemplate(templateName);
            }
        });

        templateSelect.addEventListener('change', () => {
            const templateName = templateSelect.value;
            if (templateName) {
                this.previewTemplate(templateName);
            } else {
                document.getElementById('templatePreview').innerHTML = '';
            }
        });
    }

    saveTemplate(name) {
        this.templates[name] = [...this.templateSequence];
        this.saveTemplatesToStorage();
        this.loadTemplateList();
        document.getElementById('templateNameInput').value = '';
        this.templateSequence = [];
        alert(`Template "${name}" saved!`);
    }

    loadTemplate(name) {
        const template = this.templates[name];
        if (!template) {
            alert(`Template "${name}" not found`);
            return;
        }

        if (confirm(`Apply template "${name}"? This will record ${template.length} events.`)) {
            template.forEach((eventData, index) => {
                setTimeout(() => {
                    // Set form values
                    document.getElementById('team').value = eventData.team;
                    if (eventData.playerName) {
                        const select = eventData.team === 'home' 
                            ? document.getElementById('homePlayerSelect')
                            : document.getElementById('awayPlayerSelect');
                        select.value = eventData.playerName;
                    }
                    document.getElementById('zone').value = eventData.zone || '';
                    this.currentEventTags = eventData.tags || [];
                    this.updateSelectedTags();
                    
                    // Record event
                    this.recordEvent(eventData.type);
                }, index * 100); // Small delay between events
            });
        }
    }

    deleteTemplate(name) {
        delete this.templates[name];
        this.saveTemplatesToStorage();
        this.loadTemplateList();
        document.getElementById('templatePreview').innerHTML = '';
    }

    previewTemplate(name) {
        const template = this.templates[name];
        if (!template) return;

        const preview = document.getElementById('templatePreview');
        preview.innerHTML = `<strong>Template Preview (${template.length} events):</strong><br>`;
        
        template.forEach((event, index) => {
            const item = document.createElement('div');
            item.className = 'template-event-item';
            item.innerHTML = `
                ${index + 1}. ${this.getEventDisplayName(event.type)} 
                (${event.team}${event.playerName ? ' - ' + event.playerName : ''})
                ${event.tags && event.tags.length > 0 ? event.tags.map(t => `<span class="event-tag">${t}</span>`).join('') : ''}
            `;
            preview.appendChild(item);
        });
    }

    loadTemplateList() {
        const select = document.getElementById('templateSelect');
        select.innerHTML = '<option value="">Select a template...</option>';
        
        Object.keys(this.templates).forEach(name => {
            const option = document.createElement('option');
            option.value = name;
            option.textContent = `${name} (${this.templates[name].length} events)`;
            select.appendChild(option);
        });
    }

    saveTemplatesToStorage() {
        try {
            localStorage.setItem('footballMatchCoder_templates', JSON.stringify(this.templates));
        } catch (e) {
            console.warn('Could not save templates:', e);
        }
    }

    loadTemplatesFromStorage() {
        try {
            const saved = localStorage.getItem('footballMatchCoder_templates');
            if (saved) {
                this.templates = JSON.parse(saved);
            }
        } catch (e) {
            console.warn('Could not load templates:', e);
        }
    }

    // ==================== VIDEO STORAGE ====================
    async loadVideoFile(file) {
        try {
            // Check if there's a previous session with events
            const hasPreviousSession = this.events.length > 0 || 
                                      (this.currentSession.videoFileName && 
                                       this.currentSession.videoFileName !== file.name);
            
            if (hasPreviousSession && this.events.length > 0) {
                // Offer to save previous session as XML
                const shouldSave = confirm(
                    `You have ${this.events.length} events recorded for the previous video.\n\n` +
                    `Would you like to save the previous session as XML before loading the new video?`
                );
                
                if (shouldSave) {
                    this.exportData('xml');
                    // Small delay to ensure export completes
                    await new Promise(resolve => setTimeout(resolve, 500));
                }
            }
            
            // Clear all data for new video
            this.clearSessionForNewVideo();
            
            // Store the file
            this.currentVideoFile = file;
            this.videoFileName = file.name;
            
            // Create object URL for playback
            const url = URL.createObjectURL(file);
            this.video.src = url;
            this.video.load();
            
            // Show save button
            document.getElementById('saveVideoBtn').style.display = 'inline-block';
            
            // Save video to IndexedDB for persistence
            await this.saveVideoToIndexedDB(file);
            
            // Update session with video info
            this.currentSession.videoFileName = file.name;
            this.currentSession.videoFileSize = file.size;
            this.currentSession.videoFileType = file.type;
            this.saveToStorage();
            
            console.log('Video loaded:', file.name, `(${(file.size / 1024 / 1024).toFixed(2)} MB)`);
        } catch (error) {
            console.error('Error loading video:', error);
            alert('Error loading video: ' + error.message);
        }
    }

    clearSessionForNewVideo() {
        // Clear all events
        this.events = [];
        this.currentSession.events = [];
        
        // Clear history
        this.eventHistory = [];
        this.undoStack = [];
        
        // Clear event counters
        this.eventCounters = {};
        this.initializeEventCounters();
        
        // Clear lineups
        this.lineups = {
            home: [],
            away: []
        };
        this.currentSession.lineups = {
            home: [],
            away: []
        };
        
        // Clear player selections
        document.getElementById('homePlayerSelect').innerHTML = '<option value="">Select Home Player</option>';
        document.getElementById('awayPlayerSelect').innerHTML = '<option value="">Select Away Player</option>';
        
        // Clear tags
        this.currentEventTags = [];
        this.updateSelectedTags();
        
        // Clear template sequence
        this.templateSequence = [];
        
        // Reset match info
        document.getElementById('half').value = '1';
        document.getElementById('minute').value = '0';
        document.getElementById('homeScore').value = '0';
        document.getElementById('awayScore').value = '0';
        
        // Clear notes
        document.getElementById('notes').value = '';
        
        // Clear filters
        this.clearFilters();
        
        // Update UI
        this.updateEventsList();
        this.updatePlayerList();
        this.updateLineupStatus();
        this.updateMatchInfo();
        this.updateTimelineEvents();
        
        // Clear lineup status display
        const lineupStatus = document.getElementById('lineupStatus');
        if (lineupStatus) {
            lineupStatus.style.display = 'none';
        }
        
        // Clear loaded players info
        const loadedPlayersInfo = document.getElementById('loadedPlayersInfo');
        if (loadedPlayersInfo) {
            loadedPlayersInfo.style.display = 'none';
        }
        
        // Reset video time
        if (this.video) {
            this.video.currentTime = 0;
        }
        
        console.log('Session cleared for new video');
    }

    async saveVideoToIndexedDB(file) {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open('FootballMatchCoderDB', 1);
            
            request.onerror = () => reject(request.error);
            request.onsuccess = () => {
                const db = request.result;
                const transaction = db.transaction(['videos'], 'readwrite');
                const store = transaction.objectStore('videos');
                
                // Read file as ArrayBuffer for storage
                const reader = new FileReader();
                reader.onload = () => {
                    const videoData = {
                        id: 'current-video',
                        fileData: reader.result,
                        name: file.name,
                        type: file.type,
                        size: file.size,
                        lastModified: file.lastModified,
                        timestamp: Date.now()
                    };
                    
                    const putRequest = store.put(videoData);
                    putRequest.onsuccess = () => resolve();
                    putRequest.onerror = () => reject(putRequest.error);
                };
                reader.onerror = () => reject(reader.error);
                reader.readAsArrayBuffer(file);
            };
            
            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                if (!db.objectStoreNames.contains('videos')) {
                    db.createObjectStore('videos', { keyPath: 'id' });
                }
            };
        });
    }

    async loadVideoFromIndexedDB() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open('FootballMatchCoderDB', 1);
            
            request.onerror = () => reject(request.error);
            request.onsuccess = () => {
                const db = request.result;
                if (!db.objectStoreNames.contains('videos')) {
                    resolve(null);
                    return;
                }
                
                const transaction = db.transaction(['videos'], 'readonly');
                const store = transaction.objectStore('videos');
                const getRequest = store.get('current-video');
                
                getRequest.onsuccess = () => {
                    const videoData = getRequest.result;
                    if (videoData && videoData.fileData) {
                        resolve(videoData);
                    } else {
                        resolve(null);
                    }
                };
                
                getRequest.onerror = () => reject(getRequest.error);
            };
            
            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                if (!db.objectStoreNames.contains('videos')) {
                    db.createObjectStore('videos', { keyPath: 'id' });
                }
            };
        });
    }

    async saveVideoFile() {
        if (!this.currentVideoFile) {
            // Try to load from IndexedDB
            try {
                const videoData = await this.loadVideoFromIndexedDB();
                if (videoData && videoData.fileData) {
                    // Recreate File object from stored data
                    const blob = new Blob([videoData.fileData], { type: videoData.type });
                    const file = new File([blob], videoData.name, { type: videoData.type, lastModified: videoData.lastModified });
                    this.downloadVideoFile(file, videoData.name);
                    return;
                }
            } catch (error) {
                console.error('Error loading video from storage:', error);
            }
            
            alert('No video file available to save. Please load a video first.');
            return;
        }
        
        this.downloadVideoFile(this.currentVideoFile, this.videoFileName);
    }

    downloadVideoFile(file, filename) {
        // Create download link
        const url = URL.createObjectURL(file);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename || 'video.mp4';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        // Clean up the object URL after a delay
        setTimeout(() => {
            URL.revokeObjectURL(url);
        }, 100);
    }

    async restoreVideoFromStorage() {
        try {
            const videoData = await this.loadVideoFromIndexedDB();
            if (videoData && videoData.fileData) {
                // Recreate File object from stored data
                const blob = new Blob([videoData.fileData], { type: videoData.type });
                const file = new File([blob], videoData.name, { type: videoData.type, lastModified: videoData.lastModified });
                
                // Store reference
                this.currentVideoFile = file;
                this.videoFileName = videoData.name;
                
                // Load video
                const url = URL.createObjectURL(file);
                this.video.src = url;
                this.video.load();
                
                // Show save button
                document.getElementById('saveVideoBtn').style.display = 'inline-block';
                
                console.log('Video restored from storage:', videoData.name);
            }
        } catch (error) {
            console.warn('Could not restore video from storage:', error);
        }
    }

    downloadUserManual() {
        try {
            console.log('Generating user manual...');
            const manualHTML = this.generateUserManual();
            console.log('Manual HTML generated, length:', manualHTML.length);
            
            // Create a blob URL for the HTML
            const blob = new Blob([manualHTML], { type: 'text/html;charset=utf-8' });
            const url = URL.createObjectURL(blob);
            
            // Open in new window with print-friendly styling
            const printWindow = window.open(url, '_blank');
            
            if (!printWindow) {
                // Fallback: download HTML file
                const a = document.createElement('a');
                a.href = url;
                a.download = 'Football-Match-Coder-User-Manual.html';
                a.style.display = 'none';
                document.body.appendChild(a);
                a.click();
                setTimeout(() => {
                    document.body.removeChild(a);
                    URL.revokeObjectURL(url);
                }, 100);
                alert('Popup blocked. HTML file downloaded instead. Open it and use Print → Save as PDF.');
                return;
            }
            
            // Wait for window to load, then show print dialog
            printWindow.onload = () => {
                setTimeout(() => {
                    printWindow.print();
                    // Clean up URL after a delay
                    setTimeout(() => {
                        URL.revokeObjectURL(url);
                    }, 1000);
                }, 500);
            };
            
            // Fallback if onload doesn't fire
            setTimeout(() => {
                if (printWindow.document.readyState === 'complete') {
                    printWindow.print();
                    setTimeout(() => {
                        URL.revokeObjectURL(url);
                    }, 1000);
                }
            }, 1000);
            
            console.log('Manual opened in new window. Use Print → Save as PDF.');
        } catch (error) {
            console.error('Error generating PDF:', error);
            // Fallback to HTML download if PDF generation fails
            try {
                const manualHTML = this.generateUserManual();
                const blob = new Blob([manualHTML], { type: 'text/html;charset=utf-8' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = 'Football-Match-Coder-User-Manual.html';
                a.style.display = 'none';
                document.body.appendChild(a);
                a.click();
                setTimeout(() => {
                    document.body.removeChild(a);
                    URL.revokeObjectURL(url);
                }, 100);
                alert('PDF generation failed. HTML version downloaded instead.');
            } catch (fallbackError) {
                console.error('Fallback also failed:', fallbackError);
                alert('Error generating manual. Please check the console for details.');
            }
        }
    }

    generateUserManual() {
        const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
        const modKey = isMac ? 'Cmd' : 'Ctrl';
        
        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Football Match Coder - User Manual</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
            line-height: 1.6;
            max-width: 900px;
            margin: 0 auto;
            padding: 2rem;
            background: #ffffff;
            color: #1e293b;
        }
        h1 {
            color: #22c55e;
            border-bottom: 3px solid #22c55e;
            padding-bottom: 0.5rem;
        }
        h2 {
            color: #334155;
            margin-top: 2rem;
            border-bottom: 2px solid #e2e8f0;
            padding-bottom: 0.5rem;
        }
        h3 {
            color: #475569;
            margin-top: 1.5rem;
        }
        code {
            background: #f1f5f9;
            padding: 0.2rem 0.4rem;
            border-radius: 3px;
            font-family: 'Courier New', monospace;
            font-size: 0.9em;
        }
        .keyboard-shortcut {
            background: #1e293b;
            color: #22c55e;
            padding: 0.2rem 0.5rem;
            border-radius: 4px;
            font-family: 'Courier New', monospace;
            font-weight: bold;
        }
        table {
            width: 100%;
            border-collapse: collapse;
            margin: 1rem 0;
        }
        th, td {
            border: 1px solid #e2e8f0;
            padding: 0.75rem;
            text-align: left;
        }
        th {
            background: #f8fafc;
            font-weight: 600;
        }
        ul, ol {
            margin: 1rem 0;
            padding-left: 2rem;
        }
        li {
            margin: 0.5rem 0;
        }
        .feature-box {
            background: #f8fafc;
            border-left: 4px solid #22c55e;
            padding: 1rem;
            margin: 1rem 0;
        }
        .tip {
            background: #fef3c7;
            border-left: 4px solid #f59e0b;
            padding: 1rem;
            margin: 1rem 0;
        }
        .footer {
            margin-top: 3rem;
            padding-top: 2rem;
            border-top: 2px solid #e2e8f0;
            text-align: center;
            color: #64748b;
            font-size: 0.9rem;
        }
    </style>
</head>
<body>
    <h1>⚽ Football Match Coder - User Manual</h1>
    
    <p><strong>Version:</strong> 1.0<br>
    <strong>Last Updated:</strong> ${new Date().toLocaleDateString()}</p>

    <h2>Table of Contents</h2>
    <ol>
        <li><a href="#getting-started">Getting Started</a></li>
        <li><a href="#video-playback">Video Playback</a></li>
        <li><a href="#event-coding">Event Coding</a></li>
        <li><a href="#keyboard-shortcuts">Keyboard Shortcuts</a></li>
        <li><a href="#lineup-management">Lineup Management</a></li>
        <li><a href="#advanced-features">Advanced Features</a></li>
        <li><a href="#data-export">Data Export</a></li>
        <li><a href="#tips">Tips & Best Practices</a></li>
    </ol>

    <h2 id="getting-started">1. Getting Started</h2>
    
    <h3>Loading a Video</h3>
    <ol>
        <li>Click the <strong>"Load Video"</strong> button in the header</li>
        <li>Select your football match video file (MP4/H.264 recommended)</li>
        <li>The video will load and appear in the main video player</li>
        <li>You can save the video in the app for quick access later using the <strong>"Save Video"</strong> button</li>
    </ol>

    <h3>Setting Up Your Session</h3>
    <ol>
        <li>Enter a <strong>Session Name</strong> (e.g., "Match 1 - Team A vs Team B")</li>
        <li>Enter the <strong>Home Team</strong> name</li>
        <li>Enter the <strong>Away Team</strong> name</li>
        <li>All session data is automatically saved to your browser's local storage</li>
    </ol>

    <h3>Match Context</h3>
    <p>Before coding events, set the current match context:</p>
    <ul>
        <li><strong>Half:</strong> Select which half you're in (1, 2, ET1, ET2)</li>
        <li><strong>Minute:</strong> Enter the current minute of play</li>
        <li><strong>Score:</strong> Set the current home and away scores</li>
        <li>Use the <strong>"🔄 Sync"</strong> button to sync video time with match time</li>
    </ul>

    <h2 id="video-playback">2. Video Playback</h2>

    <h3>Basic Controls</h3>
    <ul>
        <li><strong>Play/Pause:</strong> Click the play button or press <span class="keyboard-shortcut">Space</span></li>
        <li><strong>Speed Control:</strong> Use the speed slider (0.25x to 2.0x) or buttons</li>
        <li><strong>Seek:</strong> Click anywhere on the timeline to jump to that time</li>
        <li><strong>Quick Seek:</strong> Use ⏪ (rewind 5s) or ⏩ (forward 5s) buttons</li>
    </ul>

    <h3>Frame-by-Frame Navigation</h3>
    <ul>
        <li>Use <span class="keyboard-shortcut">←</span> and <span class="keyboard-shortcut">→</span> arrow keys</li>
        <li>Or use the frame navigation buttons</li>
        <li>Video automatically pauses for precise frame-by-frame control</li>
    </ul>

    <h3>Event Timeline</h3>
    <div class="feature-box">
        <p><strong>Visual Timeline Features:</strong></p>
        <ul>
            <li>Color-coded event markers show all coded events</li>
            <li>Click any event marker to jump to that timestamp</li>
            <li>Zoom in/out using the zoom controls (+/- buttons)</li>
            <li>Use <span class="keyboard-shortcut">${isMac ? 'Cmd' : 'Ctrl'}</span> + Mouse Wheel to zoom</li>
            <li>Time marks show major intervals for easy navigation</li>
        </ul>
    </div>

    <h2 id="event-coding">3. Event Coding</h2>

    <h3>Event Types</h3>
    <p>The app supports coding the following event types:</p>

    <h4>Pass Events</h4>
    <ul>
        <li><strong>Pass Complete</strong> - Successful pass</li>
        <li><strong>Pass Incomplete</strong> - Unsuccessful pass</li>
        <li><strong>Key Pass</strong> - Pass leading to a shot</li>
        <li><strong>Assist</strong> - Pass leading to a goal</li>
    </ul>

    <h4>Shot Events</h4>
    <ul>
        <li><strong>Shot On Target</strong> - Shot that would go in or is saved</li>
        <li><strong>Shot Off Target</strong> - Shot that misses the goal</li>
        <li><strong>Goal</strong> - Successful shot resulting in a goal</li>
        <li><strong>Shot Blocked</strong> - Shot blocked by a defender</li>
    </ul>

    <h4>Defensive Events</h4>
    <ul>
        <li><strong>Tackle</strong> - Successful tackle</li>
        <li><strong>Interception</strong> - Ball intercepted from opponent</li>
        <li><strong>Clearance</strong> - Ball cleared from danger</li>
        <li><strong>Block</strong> - Shot or pass blocked</li>
    </ul>

    <h4>Dribble Events</h4>
    <ul>
        <li><strong>Dribble Success</strong> - Successful dribble past opponent</li>
        <li><strong>Dribble Fail</strong> - Unsuccessful dribble attempt</li>
        <li><strong>Take-On</strong> - Attempt to beat an opponent</li>
    </ul>

    <h4>Fouls & Cards</h4>
    <ul>
        <li><strong>Foul</strong> - Foul committed</li>
        <li><strong>Yellow Card</strong> - Yellow card shown</li>
        <li><strong>Red Card</strong> - Red card shown</li>
    </ul>

    <h4>Other Events</h4>
    <ul>
        <li><strong>Corner</strong> - Corner kick</li>
        <li><strong>Free Kick</strong> - Free kick awarded</li>
        <li><strong>Throw-In</strong> - Throw-in</li>
        <li><strong>Offside</strong> - Offside call</li>
        <li><strong>Substitution</strong> - Player substitution</li>
    </ul>

    <h3>Recording an Event</h3>
    <ol>
        <li>Play or navigate to the moment in the video where the event occurs</li>
        <li>Select the <strong>Team</strong> (Home or Away)</li>
        <li>Select the <strong>Player</strong> from the dropdown (if lineups are loaded)</li>
        <li>Select the <strong>Zone</strong> where the event occurred (optional)</li>
        <li>Add any <strong>Notes</strong> (optional)</li>
        <li>Click the event button or use the keyboard shortcut</li>
        <li>The event is automatically recorded with the current timestamp</li>
    </ol>

    <h3>Event Information</h3>
    <p>Each event records:</p>
    <ul>
        <li>Timestamp (video time)</li>
        <li>Match time (half and minute)</li>
        <li>Event type</li>
        <li>Team and player</li>
        <li>Zone location</li>
        <li>Score at the time of the event</li>
        <li>Any notes you added</li>
        <li>Event count (shows how many times this event type has been coded)</li>
    </ul>

    <h2 id="keyboard-shortcuts">4. Keyboard Shortcuts</h2>

    <p>Keyboard shortcuts make coding much faster. All shortcuts are shown on the event buttons.</p>

    <h3>Video Controls</h3>
    <table>
        <tr>
            <th>Shortcut</th>
            <th>Action</th>
        </tr>
        <tr>
            <td><span class="keyboard-shortcut">Space</span></td>
            <td>Play/Pause</td>
        </tr>
        <tr>
            <td><span class="keyboard-shortcut">←</span> / <span class="keyboard-shortcut">→</span></td>
            <td>Previous/Next frame</td>
        </tr>
        <tr>
            <td><span class="keyboard-shortcut">J</span></td>
            <td>Rewind 5 seconds</td>
        </tr>
        <tr>
            <td><span class="keyboard-shortcut">L</span></td>
            <td>Forward 5 seconds</td>
        </tr>
        <tr>
            <td><span class="keyboard-shortcut">K</span></td>
            <td>Pause</td>
        </tr>
        <tr>
            <td><span class="keyboard-shortcut">M</span></td>
            <td>Mute/Unmute</td>
        </tr>
        <tr>
            <td><span class="keyboard-shortcut">${modKey} + Z</span></td>
            <td>Undo last action</td>
        </tr>
        <tr>
            <td><span class="keyboard-shortcut">${modKey} + Shift + Z</span></td>
            <td>Redo action</td>
        </tr>
        <tr>
            <td><span class="keyboard-shortcut">Space (hold)</span></td>
            <td>Play at 2x speed while held</td>
        </tr>
    </table>

    <h3>Event Coding Shortcuts</h3>
    <table>
        <tr>
            <th>Shortcut</th>
            <th>Event</th>
        </tr>
        <tr>
            <td><span class="keyboard-shortcut">P</span></td>
            <td>Pass Complete</td>
        </tr>
        <tr>
            <td><span class="keyboard-shortcut">I</span></td>
            <td>Pass Incomplete</td>
        </tr>
        <tr>
            <td><span class="keyboard-shortcut">Shift + K</span></td>
            <td>Key Pass</td>
        </tr>
        <tr>
            <td><span class="keyboard-shortcut">A</span></td>
            <td>Assist</td>
        </tr>
        <tr>
            <td><span class="keyboard-shortcut">S</span></td>
            <td>Shot On Target</td>
        </tr>
        <tr>
            <td><span class="keyboard-shortcut">O</span></td>
            <td>Shot Off Target</td>
        </tr>
        <tr>
            <td><span class="keyboard-shortcut">G</span></td>
            <td>Goal</td>
        </tr>
        <tr>
            <td><span class="keyboard-shortcut">B</span></td>
            <td>Shot Blocked</td>
        </tr>
        <tr>
            <td><span class="keyboard-shortcut">T</span></td>
            <td>Tackle</td>
        </tr>
        <tr>
            <td><span class="keyboard-shortcut">N</span></td>
            <td>Interception</td>
        </tr>
        <tr>
            <td><span class="keyboard-shortcut">C</span></td>
            <td>Clearance</td>
        </tr>
        <tr>
            <td><span class="keyboard-shortcut">Shift + L</span></td>
            <td>Block</td>
        </tr>
        <tr>
            <td><span class="keyboard-shortcut">D</span></td>
            <td>Dribble Success</td>
        </tr>
        <tr>
            <td><span class="keyboard-shortcut">F</span></td>
            <td>Dribble Fail</td>
        </tr>
        <tr>
            <td><span class="keyboard-shortcut">W</span></td>
            <td>Take-On</td>
        </tr>
        <tr>
            <td><span class="keyboard-shortcut">U</span></td>
            <td>Foul</td>
        </tr>
        <tr>
            <td><span class="keyboard-shortcut">Y</span></td>
            <td>Yellow Card</td>
        </tr>
        <tr>
            <td><span class="keyboard-shortcut">Shift + R</span></td>
            <td>Red Card</td>
        </tr>
        <tr>
            <td><span class="keyboard-shortcut">1</span></td>
            <td>Corner</td>
        </tr>
        <tr>
            <td><span class="keyboard-shortcut">2</span></td>
            <td>Free Kick</td>
        </tr>
        <tr>
            <td><span class="keyboard-shortcut">3</span></td>
            <td>Throw-In</td>
        </tr>
        <tr>
            <td><span class="keyboard-shortcut">4</span></td>
            <td>Offside</td>
        </tr>
        <tr>
            <td><span class="keyboard-shortcut">5</span></td>
            <td>Substitution</td>
        </tr>
    </table>

    <h2 id="lineup-management">5. Lineup Management</h2>

    <h3>Loading Lineups</h3>
    <p>You can load player lineups in three ways:</p>

    <h4>From File (CSV or Excel)</h4>
    <ol>
        <li>Click <strong>"Load from File"</strong></li>
        <li>Select a CSV or Excel file</li>
        <li>The file should have columns for: Player Name, Number, and Team (Home/Away)</li>
        <li>Players will be automatically loaded into the dropdown menus</li>
    </ol>

    <h4>From URL</h4>
    <ol>
        <li>Paste a URL containing lineup data</li>
        <li>Click <strong>"Load from URL"</strong></li>
        <li>Supports ACC boxscore format and other common formats</li>
        <li>The app will automatically parse and load players</li>
    </ol>

    <h3>Using Player Dropdowns</h3>
    <ul>
        <li>Once lineups are loaded, use the <strong>Home Team</strong> and <strong>Away Team</strong> dropdowns</li>
        <li>Select a player before coding an event to automatically assign them</li>
        <li>Player names are cleaned automatically (duplicate numbers removed)</li>
    </ol>

    <h2 id="advanced-features">6. Advanced Features</h2>

    <h3>Button Presets</h3>
    <div class="feature-box">
        <p>Customize which event buttons are visible:</p>
        <ol>
            <li>Click <strong>"Button Presets ▼"</strong> in the header</li>
            <li>Check/uncheck event types to show or hide them</li>
            <li>Enter a preset name and click <strong>"Save Current"</strong></li>
            <li>Load saved presets anytime to quickly switch between different button configurations</li>
        </ol>
    </div>

    <h3>Event Templates</h3>
    <div class="feature-box">
        <p>Save and reuse coding sequences:</p>
        <ol>
            <li>Code a sequence of events</li>
            <li>Click <strong>"Templates ▼"</strong> in the header</li>
            <li>Enter a template name</li>
            <li>Click <strong>"Save Current Sequence"</strong></li>
            <li>Apply templates later to quickly code common event patterns</li>
        </ol>
    </div>

    <h3>Tags System</h3>
    <div class="feature-box">
        <p>Organize events with custom tags:</p>
        <ul>
            <li>Add tags to events for better organization</li>
            <li>Filter events by tags</li>
            <li>Create tag presets for common tagging patterns</li>
        </ul>
    </div>

    <h3>Event Filtering</h3>
    <div class="feature-box">
        <p>Filter events by multiple criteria:</p>
        <ul>
            <li><strong>Search:</strong> Search event notes or player names</li>
            <li><strong>Event Types:</strong> Filter by specific event types</li>
            <li><strong>Team:</strong> Show only home or away team events</li>
            <li><strong>Player:</strong> Filter by specific player</li>
            <li><strong>Tags:</strong> Filter by tags</li>
            <li><strong>Time Range:</strong> Filter events within a specific time range</li>
        </ul>
    </div>

    <h3>Undo/Redo</h3>
    <ul>
        <li>Use <span class="keyboard-shortcut">${modKey} + Z</span> to undo the last action</li>
        <li>Use <span class="keyboard-shortcut">${modKey} + Shift + Z</span> to redo</li>
        <li>Supports up to 100 actions in history</li>
    </ul>

    <h3>Event Counters</h3>
    <ul>
        <li>Each event button shows a counter in the top-left corner</li>
        <li>Counters show how many times each event type has been coded</li>
        <li>Events in the log also show their count number for easy matching</li>
    </ul>

    <h3>Resizable Panels</h3>
    <ul>
        <li>Drag the border between video player and coding panel to resize</li>
        <li>Drag the top of the event log to adjust its height</li>
        <li>All panel sizes are saved and restored automatically</li>
    </ul>

    <h3>Match Time Sync</h3>
    <ul>
        <li>Click <strong>"🔄 Sync"</strong> to set the match start offset</li>
        <li>Enter the video timestamp where the match actually begins</li>
        <li>The app will automatically calculate and display the correct half and minute</li>
    </ul>

    <h2 id="data-export">7. Data Export</h2>

    <h3>Export Formats</h3>
    <p>You can export your coded data in multiple formats:</p>

    <h4>CSV Export</h4>
    <ul>
        <li>Click <strong>"Export Data"</strong> → <strong>"CSV"</strong></li>
        <li>Perfect for analysis in Excel, Google Sheets, or data analysis tools</li>
        <li>Includes all event data: timestamp, time, half, minute, event type, team, player, zone, scores, notes</li>
    </ul>

    <h4>JSON Export</h4>
    <ul>
        <li>Click <strong>"Export Data"</strong> → <strong>"JSON"</strong></li>
        <li>Full session data including events, lineups, and session info</li>
        <li>Can be imported back into the app using <strong>"Load Session"</strong></li>
    </ul>

    <h4>XML Export</h4>
    <ul>
        <li>Click <strong>"Export Data"</strong> → <strong>"XML"</strong></li>
        <li>Structured XML format for integration with other systems</li>
    </ul>

    <h4>JSON Lines Export</h4>
    <ul>
        <li>Click <strong>"Export Data"</strong> → <strong>"JSON Lines"</strong></li>
        <li>One JSON object per line, useful for streaming or processing large datasets</li>
    </ul>

    <h3>Saving Sessions</h3>
    <ul>
        <li>Click <strong>"Save Session"</strong> to save your complete session</li>
        <li>Sessions are saved as JSON files</li>
        <li>Load saved sessions later to continue coding or review data</li>
        <li>All session data is also automatically saved to browser local storage</li>
    </ul>

    <h2 id="tips">8. Tips & Best Practices</h2>

    <div class="tip">
        <h3>💡 Efficiency Tips</h3>
        <ul>
            <li><strong>Use keyboard shortcuts:</strong> They're much faster than clicking buttons</li>
            <li><strong>Load lineups first:</strong> Makes player selection much quicker</li>
            <li><strong>Create button presets:</strong> Hide unused event types to reduce clutter</li>
            <li><strong>Use the timeline:</strong> Click event markers to quickly jump to key moments</li>
            <li><strong>Zoom the timeline:</strong> Use zoom controls to focus on specific periods</li>
            <li><strong>Save frequently:</strong> Export your data regularly to avoid data loss</li>
        </ul>
    </div>

    <div class="tip">
        <h3>📊 Coding Best Practices</h3>
        <ul>
            <li><strong>Be consistent:</strong> Use the same definitions for events throughout</li>
            <li><strong>Add notes:</strong> Notes help provide context when analyzing data later</li>
            <li><strong>Use tags:</strong> Tag events to group related actions (e.g., "counter-attack", "set-piece")</li>
            <li><strong>Sync match time:</strong> Use the sync feature to ensure accurate match time tracking</li>
            <li><strong>Review events:</strong> Use the event log to review and verify coded events</li>
            <li><strong>Filter strategically:</strong> Use filters to focus on specific aspects of the match</li>
        </ul>
    </div>

    <div class="tip">
        <h3>🎥 Video Tips</h3>
        <ul>
            <li><strong>Video format:</strong> MP4 with H.264 codec works best across all browsers</li>
            <li><strong>Frame-by-frame:</strong> Use arrow keys for precise event timing</li>
            <li><strong>Speed control:</strong> Use slower speeds (0.25x, 0.5x) for detailed analysis</li>
            <li><strong>Save videos:</strong> Save videos in the app to avoid reloading them</li>
            <li><strong>Timeline navigation:</strong> Use the timeline to quickly jump between events</li>
        </ul>
    </div>

    <h2>Browser Compatibility</h2>
    <p>Football Match Coder works best in modern browsers:</p>
    <ul>
        <li>Google Chrome (recommended)</li>
        <li>Mozilla Firefox</li>
        <li>Microsoft Edge</li>
        <li>Apple Safari</li>
    </ul>
    <p>Video format support depends on browser codecs. MP4/H.264 is recommended for best compatibility.</p>

    <h2>Data Storage</h2>
    <p>All session data is automatically saved to your browser's local storage. This means:</p>
    <ul>
        <li>Your data persists between browser sessions</li>
        <li>Data is stored locally on your device (not uploaded to any server)</li>
        <li>To clear data, use browser developer tools or click "Clear Log"</li>
        <li>For backup, regularly export your data using the export functions</li>
    </ul>

    <h2>Support & Feedback</h2>
    <p>For questions, feedback, or issues, please contact:</p>
    <p><strong>Email:</strong> <a href="mailto:daniellevitt32@gmail.com">daniellevitt32@gmail.com</a></p>

    <div class="footer">
        <p>Football Match Coder - Created by Daniel Levitt</p>
        <p>This manual was generated on ${new Date().toLocaleString()}</p>
    </div>
</body>
</html>`;
    }
}

// Initialize app
const app = new FootballMatchCoder();

