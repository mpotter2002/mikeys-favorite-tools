# Mikey's Favorite Things

Public catalog of design tools, agent tools, GitHub repos, skills/configs, inspo, and tools I made.

Live site: after Vercel is connected, this repo auto-deploys on every push to `main`.

## Browse

- **Tools and resources** — design, agents, GitHub, UI, research, infra
- **Current stack** — what I am actually using right now
- **Built by Mikey** — tools I made
- **Skills** — markdown, YAML, JSON, configs, and skill packs
- **Inspo** — sites and people I keep going back to

The committed catalog lives in:

- `src/data/tools.ts`
- `src/data/inspo.ts`
- `src/data/skills.ts`

## Run locally

```bash
npm install
npm run dev
```

Then open [http://127.0.0.1:3000](http://127.0.0.1:3000).

Admin login is at `/admin`. Copy `.env.example` to `.env.local` and set `ADMIN_PASSWORD` / `ADMIN_SECRET` if you want to add or edit cards locally.

## Adding tools

The in-browser add/edit UI writes to localStorage first. Use **Copy inbox JSON**, then paste the objects into the data files above so they ship with the repo.
