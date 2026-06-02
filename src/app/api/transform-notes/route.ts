import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { notes, format, tone, mode, answers } = body;

    if (mode === "guided") {
      // For guided Q&A mode, we need answers — not raw notes
      if (!answers || typeof answers !== "object") {
        return NextResponse.json(
          { error: "Guided answers are required in guided mode." },
          { status: 400 }
        );
      }
    } else {
      // Free-form mode: validate raw notes
      if (!notes || typeof notes !== "string" || notes.trim() === "") {
        return NextResponse.json(
          { error: "Notes content is required." },
          { status: 400 }
        );
      }
    }

    const apiKey = process.env.GEMINI_API_KEY;
    const isMockMode = !apiKey || apiKey.includes("your_gemini_api_key");

    if (isMockMode) {
      // Simulate highly realistic AI notes transformer for the reviewer/developer
      await new Promise((r) => setTimeout(r, 1200)); // AI-like delay

      const effectiveFormat = mode === "guided" ? "shift-notes" : (format || "handover");
      const mockResult = generateMockTransformation(notes || "", effectiveFormat, tone || "professional", answers);
      return NextResponse.json({
        text: mockResult,
        isMock: true,
        model: "gemini-2.5-flash (Simulated Sandbox Mode)"
      });
    }

    // Initialize Gemini AI
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash",
      generationConfig: {
        temperature: 0.2, // Keep it highly structured and deterministic
      }
    });

    const formatPrompts: Record<string, string> = {
      "handover": "Create an ultra-premium Shift Handover report. Organize it with these exact sections: '🚀 Executive Summary', '📦 Completed Work', '⚠️ Blockers & Risks', and '📅 Next Steps / Handover Checklist'.",
      "standup": "Create a clear, high-density Daily Standup summary. Use standard sections: 'Yesterday (What I Did)', 'Today (What I am Doing)', and 'Blockers'. Keep it concise and punchy.",
      "release-notes": "Generate clean, beautifully formatted release notes for engineering stakeholders. Include sections: '🆕 What\\'s New', '🛠️ Under the Hood', '🐛 Bug Fixes', and '⚡ Performance & Security'. Use markdown tables where appropriate.",
      "email": "Draft a highly professional engineering status email. Format it with a bold 'Subject: ...' at the very top, followed by a polite greeting, a bulleted list of key highlights, a section on blockers, and a professional sign-off.",
      "shift-notes": "Generate a structured, professional shift/incident note for a care or support worker. Use these exact sections in order: '📋 Participant(s) Supported', '✅ Activity / What Happened', '⚠️ Behavioural Incidents', '🤝 Support Provided', '🎯 Outcome', and '➡️ Next Shift Handover'. Use a calm, factual, person-centred tone. If a section has no information (e.g. no behavioural incident), write 'None reported' for that section. Do not invent facts that are not present in the answers."
    };

    const tonePrompts: Record<string, string> = {
      "professional": "Write in a highly articulate, crisp, and executive engineering tone. Avoid slang or overly wordy explanations.",
      "bullet-points": "Maintain maximum data density. Present information almost entirely in bullet points, using bolding to highlight key metrics or files. Avoid narrative paragraphs entirely.",
      "action-oriented": "Focus heavily on actionable items. Highlight 'WHO' is doing 'WHAT' and 'WHEN' (deadlines). Use checkboxes [ ] or [x] to emphasize deliverables.",
      "casual": "Use a friendly, approachable peer-to-peer tone. Like talking to a close teammate on Slack, but keep all technical specifications fully intact and highly clear."
    };

    const effectiveFormat = mode === "guided" ? "shift-notes" : (format || "handover");
    const formatInstruction = formatPrompts[effectiveFormat] || formatPrompts["handover"];
    const toneInstruction = tonePrompts[tone] || tonePrompts["professional"];

    // Build the prompt body depending on mode
    let promptBody: string;
    if (mode === "guided") {
      const a = answers || {};
      promptBody = `
You are DraftShift, an expert writer who turns simple worker Q&A into formal, professional shift notes.

The worker has just answered a small number of plain-language questions. Convert those answers into a polished, structured shift note that meets reporting standards.

--- WORKER ANSWERS ---
- Activity that occurred: ${a.activity || "(not provided)"}
- Behavioural incident: ${a.behaviour || "(none reported)"}
- Support provided: ${a.support || "(not provided)"}
- Outcome: ${a.outcome || "(not provided)"}
- Additional context (optional): ${a.extra || "(none)"}
--------------------------------
`;
    } else {
      promptBody = `
--- RAW NOTES TO TRANSFORM ---
${notes}
------------------------------
`;
    }

    const prompt = `
You are DraftShift, an expert technical communicator and AI developer assistant.
Your task is to transform the following raw, messy developer notes, logs, or meeting briefs into a stunning, beautifully formatted markdown document.

${promptBody}

--- TRANSFORMATION INSTRUCTIONS ---
1. Format: ${formatInstruction}
2. Tone: ${toneInstruction}
3. Presentation:
   - Use high-quality markdown including bold highlights, bullet points, clean section breaks, and standard HTML code blocks if code is mentioned.
   - Propose clear, sensible names for branches, files, or PRs if they are implied.
   - Group related points together into readable sections.
   - Do NOT include any meta-talk or introductory conversational filler like "Here is your transformed handover..." or "Sure, I can help with that...". Output ONLY the fully formatted markdown document directly.
`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const transformedText = response.text();

    return NextResponse.json({
      text: transformedText,
      isMock: false,
      model: "gemini-2.5-flash"
    });

  } catch (error: any) {
    console.error("Gemini AI Transformation Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to transform notes due to an internal server error." },
      { status: 500 }
    );
  }
}

// High-fidelity Mock Handoff Transformer
function generateMockTransformation(notes: string, format: string, tone: string, answers?: Record<string, string>): string {
  const currentDate = new Date().toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  // ---- Guided Q&A mock (shift notes) ----
  if (format === "shift-notes") {
    const a = answers || {};
    const activity = a.activity || "(no activity recorded)";
    const behaviour = a.behaviour || "None reported";
    const support = a.support || "(no support recorded)";
    const outcome = a.outcome || "(no outcome recorded)";
    const extra = a.extra || "";

    return `# 🩺 Shift Note — ${currentDate}
*Generated by DraftShift • Tone: ${tone.toUpperCase()} (Sandbox Simulation)*

## 📋 Participant(s) Supported
- ${extra ? extra.split(/[,\n]/).map((s) => s.trim()).filter(Boolean).join("\n- ") : "Participant details not provided."}

## ✅ Activity / What Happened
${activity}

## ⚠️ Behavioural Incidents
${behaviour}

## 🤝 Support Provided
${support}

## 🎯 Outcome
${outcome}

## ➡️ Next Shift Handover
- [ ] Continue to monitor mood and engagement at the start of the next shift.
- [ ] Review the activity plan with the oncoming worker.
- [ ] Update the participant's support plan if the incident recurs.
`;
  }

  // ---- Existing engineering-format mocks (unchanged) ----
  // Quick analyzer of raw notes to extract key phrases
  const hasDB = /db|database|postgres|sql|prisma/i.test(notes);
  const hasAuth = /auth|login|firebase|jwt|signup/i.test(notes);
  const hasError = /bug|error|crash|broken|fail/i.test(notes);
  const hasUI = /ui|css|tailwind|screen|page|panel/i.test(notes);

  let extractedTopic = "Feature Implementation";
  if (hasDB) extractedTopic = "Database Schema Migration & Integration";
  else if (hasAuth) extractedTopic = "Firebase Auth and State Management";
  else if (hasUI) extractedTopic = "Premium UI Dashboard and Styles";
  else if (hasError) extractedTopic = "Critical Bug Investigation & Hotfix";

  if (format === "standup") {
    return `### 📅 Standup Report — ${currentDate}
*Tone: ${tone.toUpperCase()} (Sandbox Simulation)*

**Yesterday (What I Did):**
- Completed the core implementation of the **${extractedTopic}**.
- Traced raw notes and refined structural layout.
- Added client-side error boundaries and loading states.

**Today (What I'm Doing):**
- Integrating the newly refined endpoints.
- Verifying cross-device layout rendering and interactive states.
- Writing high-coverage test cases for the main module.

**Blockers:**
${hasError ? "- ⚠️ Investigating a potential connection timeout issue mentioned in the logs." : "- None currently. Continuing on track."}
`;
  }

  if (format === "release-notes") {
    return `# 📦 Release Notes: ${extractedTopic} v1.1.0
*Published: ${currentDate} • Tone: ${tone.toUpperCase()} (Sandbox Simulation)*

## 🆕 What's New
- **Advanced Dynamic Processing:** Successfully shipped the core pipeline for handling raw technical information.
- **Glassmorphism Theme:** Embedded premium styling parameters using Tailwind CSS v4 variables.
- **Local Sandbox Engine:** Built-in seamless client-side storage simulation to ensure zero crashes.

## 🛠️ Under the Hood
- Refactored state flow to use robust React hooks.
- Optimized performance for parsing raw inputs with complex characters.
- Structured new API routes to handle payload headers gracefully.

## 🐛 Bug Fixes
- Fixed a state-desynchronization issue that occurred when clearing input fields mid-process.
- Cleaned up duplicate rendering triggers in active event listeners.
`;
  }

  if (format === "email") {
    return `**Subject:** Engineering Update: Progress on ${extractedTopic} 🚀

Hi Team,

I wanted to provide a quick update on the implementation of the **${extractedTopic}** based on our latest logs.

Here are the key takeaways:
* **Current Status:** The core structure is completed and verified locally.
* **UI styling:** Styled fully with custom glassmorphic panels and responsive grids.
* **Integrations:** API routes are configured and support full dual-mode sandbox fallbacks.

**Next Steps:**
- Run local lint checks and package compilation (\`npm run build\`).
- Finalize the hosting details for deployment.

Best regards,
*The DraftShift Sandbox Engine*
`;
  }

  // Default: Handover
  return `# 🚀 Shift Handover: ${extractedTopic}
*Generated on ${currentDate} • Tone: ${tone.toUpperCase()} (Sandbox Simulation)*

## 📋 Executive Summary
We have finalized the core architecture and layouts for **${extractedTopic}**. The codebase is fully prepared for local verification and final packaging. All visual modules are operating smoothly under Tailwind v4.

## 📦 Completed Work
- **Dual-Mode SDK Layer:** Configured dynamic fallback handling for client tokens.
- **UI Workspace Panels:** Created modern split-screen views with active character counting and template injection.
- **Timeline Engine:** Added persistent local history log for quick copy-pasting.

## ⚠️ Blockers & Risks
${hasError ? "- **Resolved Bugs:** We detected and neutralized several warning signs in the raw notes stream." : "- **No critical blockers:** The pipeline is clear and ready for review."}

## 📅 Next Steps & Handover Checklist
- [x] Integrate mock schemas and auth controllers
- [ ] Execute standard production bundle build
- [ ] Connect production cloud environment values
`;
}
