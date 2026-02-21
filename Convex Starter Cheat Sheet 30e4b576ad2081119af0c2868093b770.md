# Convex Starter Cheat Sheet

**Hey there 👋🏻**

These commands are very helpful and you can either tell your AI to use them or you can use them yourself.  **At the bottom of this page you will also find Pro tips and a CRITICAL SETTING that has cost me DAYS to solve when I first learned it. So make sure to read it!**

Have fun building,
- Rob

<aside>
💡

**Want to Learn More?**

10 months ago I stopped writing code, despite having 20 years of experience. I documented my entire process and now teach it to hundreds of non-technical students. It’s the perfect program for people looking for a proven process. 

</aside>

# Get Started (New Project)

1. Make sure you have a [Convex.dev](http://Convex.dev) account (obviously)
2. Setup a new Next.js project (`npx create-next-app@latest my-new-app`)
3. Run `npx convex dev` to start the setup process
4. The first time you do this on your system, you will have to link your account
5. The first time you  do this for a project, it will ask you a few questions
    1. What would you like to configure? **`New Project`**
    2. Project Name? **`my-new-app`** (usually pre-filled with folder name)
    3. Use cloud or local dev deployment? **`cloud deployment`**
6. Then kill the process (Control + C on macOS)
7. One time, add Convex to your project by running `npm add convex`

… and that’s literally it! ✅

<aside>
💡

You can do this manually (I do) or ask AI to help you. **But want my advice?** Spend 5 minutes going through this process, and learn it. You’ll thank yourself in the future!

</aside>

# Commands You'll Use Every Day

| **What You Want** | **Command** | **Plain English** |
| --- | --- | --- |
| Start your project | `npx convex dev` | First time? This creates your convex/ folder and connects everything. Run it once, you're set up. |
| Run the dev server | `npx convex dev` | Same command, different job. Watches your files. Changes go live instantly. Keep this running while you work. |
| Push to production | `npx convex deploy` | Takes your dev code and makes it real. Your app goes live. |

# Commands You'll Need Sometimes

<aside>
💡

For most commands you can add `--prod` to run them in production instead of your test environment. For example `npx convex env list --prod` lists all of your variables in production while `npx convex env list` shows you all development env variables.

</aside>

| **What You Want** | **Command** | **Plain English** |
| --- | --- | --- |
| See your logs | `npx convex logs` | Watch what's happening in real-time. Find bugs fast. |
| Open the dashboard | `npx convex dashboard` | See your database, functions, and logs in a nice visual interface. |
| Import data | `npx convex import --table users data.json` | Bring data into Convex from a file. |
| Export data | `npx convex export --path [backup.zip](http://backup.zip)` | Save your data to a file. Good for backups. |
| View your tables | `npx convex data` | Quick look at what tables you have. |
| View table data | `npx convex data users` | See what's inside a specific table. |
| Run any function | `npx convex run myFunction '{"key": "value"}'` | Test your functions without clicking around. Great for debugging functions and letting your AI test them. |
| See all env vars | `npx convex env list` | Lists all the environment variables set inside of Convex without going to the dashboard |
| Get one env var | `npx convex env get MY_KEY` | Lists a specific environment variables set inside of Convex without going to the dashboard |
| Set an env var | `npx convex env set MY_KEY "my-value"` | Sets a specific environment variables set inside of Convex without going to the dashboard |
| Delete an env var | `npx convex env remove MY_KEY` | Deletes a specific environment variables set inside of Convex without going to the dashboard |

# Teach Your AI Convex Rules

Your AI assistant (Cursor, Claude Code, Windsurf) builds 10x better with Convex when it has the right rules.

### Step 1: Get the Rules File

Download from: [https://convex.link/convex_rules.txt](https://convex.link/convex_rules.txt)

### Step 2: Put It In Your Project

**For Cursor:**

→ Save as `.cursor/rules/convex_rules.mdc` in your project.

**For Claude Code:**

→ Add the file to `.claude/rules/convex-rules.md` and point your `CLAUDE.md` to it.

**For Codex CLI:**

→ Add the file to `.codex/rules/convex-fules.md` and point your [`AGENT.md`](http://AGENT.md) to it.

<aside>
🔗

**The Two Links Your AI Needs:**

- Rules file: [https://convex.link/convex_rules.txt](https://convex.link/convex_rules.txt)
- AI docs: [https://docs.convex.dev/ai](https://docs.convex.dev/ai)
</aside>

---

# Quick Reference

These commands you will use *all* the time. Keep them close.

```
**# Setup (do once)**
npx convex dev

**# Development Server (keep running with npm run dev)**
npx convex dev

**# Deploy to Production (careful!)**
npx convex deploy
```

<aside>
💡

If you ever get an error like “Did you forget to run …” it’s probably the deploy command!

</aside>

# 🔴 Avoid My Big Mistake 🔴

When building with AI and your Convex project grows, **you will eventually run into this error.**

<aside>
❌

`"implicitly has type 'any' because it does not have a type annotation"`

`"Type instantiation is excessively deep and possibly infinite (TS2589)"`

</aside>

This happens because Convex generates code for your database, and AI isn’t “perfect enough” to deal with the strict requirements that TypeScript (the language most apps use now) demands. 

### The Fix

This took me DAYS to find, so you’re welcome, hah!

Create a file called `convex.json` in your project root (same folder as `package.json`):

```
{

	"$schema": "https://raw.githubusercontent.com/get-convex/convex-backend/refs/heads/main/npm-packages/convex/schemas/convex.schema.json",

	"codegen": {

		"staticApi": true,

		"staticDataModel": true

	}

}
```

### What This Does

- It makes Convex play nice with AI-generated code
- Simplifies its code generation to avoid basically infinite loops that crash your app
- Comes with tradeoffs that most AI coders won’t ever notice
- This feature is in beta, but it has worked great for me *(I suspect it will be default soon)*

# Pro Tips

- Always keep `npx convex dev` running together with `npm run dev` while building
- While your app is being deployed, push Convex changes live with `npx convex deploy`
- Before making big changes, backup your data with `npx convex export --path backup.zip`
- Add the `convex.json` early with the tip above to avoid big frustrations later
- Use the Convex rules file explained above for maximum compatibility
- Use [Ref.tools](http://Ref.tools) and [Exa.ai](http://Exa.ai) as MCP servers to perfect the build

# 👋🏻 Need Help Building?

You can work directly with me inside of my [**AI Builder’s Blueprint**](https://itsbyrob.in/9j3nisb) community.

**Everything Included:**

- My Full AI App Building Process
- Maya AI Coding Assistant
- Monthly Group Office Hours
- Student-Only Support Community
- Lifetime Access + Free Upgrades
- 30-Day Money-Back Guarantee

<aside>
💡

**Want to Learn More?**

10 months ago I stopped writing code, despite having 20 years of experience. I documented my entire process and now teach it to hundreds of non-technical students. It’s the perfect program for people looking for a proven process. 

</aside>