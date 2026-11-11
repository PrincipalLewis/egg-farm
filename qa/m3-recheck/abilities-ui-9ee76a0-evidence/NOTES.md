# pr116 O1/O2 sheet lifecycle - NOT RUN
- URL loaded: http://127.0.0.1:5216/?marketSeed=3 (Tap to start visible; build id not read, no gameplay)
- Actual viewport via browser tool: 1920x1072. setViewportSize is blocked; 360x640 not achievable with sanctioned tools -> not run, nothing invented.
- Lock: .browser-test.lock is flock-based, wrapped around Shell-driven lane commands; acquiring needs Shell browser drive -> not acquired.
- Flows open/close/reopen, mid-anim close, panel switch, reload-open, O1, O2: NOTRUN. No screenshots. Server PID 1746941 untouched.
