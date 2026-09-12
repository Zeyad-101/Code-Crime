<div align="center">

# 🕵️ CODE CRIME SCENE

**A production-incident detective game for developers.**
*Something broke. You're the one who has to figure out why — and fix it.*

[![HTML5](https://img.shields.io/badge/HTML5-E34F26?style=for-the-badge&logo=html5&logoColor=white)](#tech-stack)
[![CSS3](https://img.shields.io/badge/CSS3-1572B6?style=for-the-badge&logo=css3&logoColor=white)](#tech-stack)
[![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black)](#tech-stack)
[![Vercel](https://img.shields.io/badge/Deployed%20on-Vercel-000000?style=for-the-badge&logo=vercel&logoColor=white)](https://code-crime.vercel.app/)

[**▶ Play the game**](https://code-crime.vercel.app/) · [Report a bug case](https://github.com/Zeyad-101/Code-Crime/issues) · [Leaderboard](https://code-crime.vercel.app/)

</div>

---

## What is this

Every case is a real-shaped production incident: something in the system failed, and you're handed a briefing, not an answer. You dig through evidence, build a theory about the root cause, and if you're right, you have to actually type the fix — not pick it from a list.

It's part whodunit, part debugging drill. Built for people who've stared at a stack trace at 2 AM and thought *"okay, detective mode."*

## How a case plays out

| Step | Screen | What happens |
|---|---|---|
| 1 | **Case Select** | Pick a case file from the board |
| 2 | **Briefing** | Read what went wrong and what's known so far |
| 3 | **Evidence Board** | Review evidence (logs, code, configs) connected by a red-string board |
| 4 | **Accusation — Theory** | Choose the root cause from a set of suspects |
| 5 | **Accusation — Fix** | Write the actual fix for the broken line — checked against the real one |
| 6 | **Case Closed** | Get a rank and a score breakdown, with the full explanation |
| 7 | **Hall of Detectives** | Save your score to the leaderboard |

Wrong theory or a broken fix doesn't end the case — it costs you attempts, and attempts cost you rank.

## Features

- 🗂️ Case-file structure — briefing, evidence, theory, fix, verdict
- 🧵 Evidence board with a red-string layout instead of a plain list
- ⌨️ You type the fix yourself, not multiple choice
- 🏅 Scoring and rank system based on theory accuracy and fix attempts
- 📋 Local leaderboard — Hall of Detectives
- 🎨 Typewriter case-file aesthetic (Special Elite) paired with a monospace code font (JetBrains Mono)
- ⚡ Zero build step — plain HTML/CSS/JS, no framework, no dependencies

## Tech stack

| Layer | Choice |
|---|---|
| Structure | HTML5 |
| Styling | CSS3 |
| Logic | Vanilla JavaScript (`cases.js`, `scoring.js`, `leaderboard.js`, `app.js`) |
| Fonts | Special Elite, JetBrains Mono (Google Fonts) |
| Hosting | Vercel |

No frameworks, no bundler, no package.json — the whole game is static files.

## Project structure

```
Code-Crime/
├── assets/          # images / static assets
├── css/
│   └── style.css
├── js/
│   ├── cases.js         # case data
│   ├── scoring.js        # rank + score logic
│   ├── leaderboard.js    # Hall of Detectives
│   └── app.js             # screen flow + rendering
└── index.html
```

## Run it locally

No build step required.

```bash
git clone https://github.com/Zeyad-101/Code-Crime.git
cd Code-Crime
```

Then either:
- Open `index.html` directly in a browser, or
- Serve it locally to avoid any browser file-access restrictions:

```bash
npx serve .
```

## Adding a new case

Cases live in `js/cases.js`. Each one needs a briefing, a set of evidence, the correct root-cause theory, and the expected fix string the player has to type. Follow the shape of an existing case and it'll pick up the scoring and rendering automatically.

## Contributing

Pull requests are welcome — new cases, harder evidence boards, UI polish, whatever. Open an issue first if you're planning something bigger than a case addition.

## Author

Built by **[Zeyad Waled](https://github.com/Zeyad-101)** — Software Engineering student, ECU Cairo.

---

<div align="center">

**Found the bug? Prove it. [Open a case →](https://code-crime.vercel.app/)**

</div>
