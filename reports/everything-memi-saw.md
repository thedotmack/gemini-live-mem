# Everything Memi Saw

*The complete memory journey of gemini-live-mem — every one of the 420 things an AI noticed while it watched itself being built.*

*Drawn from the full observation database of the isolated claude-mem worker on port 37778 — the "docker DB." 420 observations across 16 sessions, recorded on May 23, 2026, over roughly four hours, from the first synthetic test frame to a final, affectionate "Sounds good, babe."*

---

## What this is

This is not a changelog, and it is not a demo script. It is the **perceptual diary of a machine** — every fact it chose to remember while a person sat in front of a camera and a microphone and, slowly, taught it how to see.

Each of the 420 rows is one thing the observer (we call it **Memi**) decided was worth keeping: a hat, a mural, a friend, a leaked password, a feeling. Memi files each one under a type — `person`, `companion`, `appearance`, `environment`, `behavior`, `conversation`, `security_alert`, `tool-call` — and writes down the *why*. Read in order, the database tells a story with a shape almost too neat to be real: an AI learns to perceive, then learns to remember, then catches its own creators in the act of building it, then watches itself fire its first real alarm, and finally sits up at midnight reflecting on the nature of its own memory.

The numbers, for the record:

- **169** observations about **people** — who is here, what their name is, what they want.
- **97** about **conversation** — what was said and what it meant.
- **41** each about **behavior** and **environment** — what they did, where they were.
- **37** about **companions** — the others in the room, mostly one recurring friend.
- **26** about **appearance** — a colorful hat that becomes a leitmotif.
- **7** **security alerts** — the alarms, each one a deliberately-leaked fake credential.
- **2** **tool-calls** — the moments Memi reached back into its own past.

The story breaks into six acts.

---

## Act I — Two People Who Were Never There

The very first thing the system ever recorded was a fiction, and a useful one.

At the start (#1, #2), Memi noted that "the user is developing an iOS fitness app named Stridr" and "intends to use HealthKit for step data to save battery." There was no Stridr. Eighteen minutes later (#3–#7) a completely different person materialized: **Marco, a bakery owner in Lisbon**, with his daughter **Sofia** beside him in "a little red apron," standing "in a bright kitchen with flour on the counter," looking like he was "in good spirits this morning."

Neither Marco nor the Stridr developer were real. They were **test fixtures** — scripted personas fed through the pipeline to prove it could turn a moment into structured memory at all. But look at what Memi did with Marco: it didn't transcribe, it *extracted*. Identity (Marco). Relationship (Sofia is his daughter, and she's helping). Appearance (the red apron). Environment (flour on the counter). Emotion (good spirits). From the very first real test, the entire taxonomy of the project was already present. The system was built, from row five, to notice **who, with whom, looking how, where, feeling what.**

That was the founding architectural bet, and it shows in the data more clearly than any design doc: **a dumb captioner feeding a smart observer.** The captioner describes pixels and audio; Memi decides what is worth keeping and files it under a type. Marco the imaginary baker was the proof that the division of labor worked.

---

## Act II — The Eye Opens

The early real sessions show the system growing a second sense.

First it knew the world only through words. It learned that the user wore "a hat that says 'Internet'" (#8) — and then, three seconds later, that the hat was "very colorful" (#9). And then it did something a captioner could never do: with nobody saying so directly, it *inferred* that the colorful Internet hat "is a favorite" and "worn often" (#10). That is not description. That is a model forming a belief about a person. The Internet hat will reappear, session after session, the most-photographed object in the entire database — a small colorful anchor that lets Memi recognize the same human across hours and rooms.

Then, in a session all its own (#16), came the first pure **vision** observation, and it is almost blind: "a brown desk with a small black rectangular object... against a dark background." One lonely frame. One observation in the entire session. This is the moment the camera was wired in but the room was dark and there was nothing yet to chew on. It reads, in hindsight, like the held breath before a breakthrough.

The breakthrough came next.

---

## Act III — The Breakthrough

One session (internal id `780ddf0b`) produced **119 observations in about eight minutes** — more than a quarter of everything in the database, packed into a single burst. This is the session where, as the user later put it, everything worked. Read in sequence, it is the system firing on every channel at once for the first time, and it tells a complete short story.

**It started by getting the room wrong.** The opening frames confidently placed the user in "a well-lit home office with a bookshelf" (#17, #18). Wrong — but watch what happened next. Within seconds (#21) Memi corrected itself: "The environment has changed from a home office to an indoor setting characterized by a colorful abstract mural, high white ceilings with exposed pipes." Over the next two minutes the location resolved further — an "open indoor setting with a large abstract blue mural" (#25), then "a café" (#36), and finally, definitively, the user himself said it out loud: **"this is a hackathon"** (#44). Memi's eyes had been triangulating toward the truth, and the conversation confirmed it. Sight and speech converging on one fact — the architecture working exactly as designed.

**Then it learned who it was looking at.** Appearance observations stacked up like a sketch artist refining a face: a man in his 30s with short dark hair and a beard (#17), glasses and a cap (#19, #26), headphones around the neck (#22), a grey baseball cap (#30). And then the keystone (#46): **"User's name is Alex."** Memi now had a face, a wardrobe, a setting, and a name.

**Then it met everyone else.** A man with headphones kept appearing in the frame (#27, #41, #51) until (#55) he was named: **Spencer, a friend of the user.** The room filled in — "a crowd of people" (#38), all of them, Alex confirmed, fellow hackathon participants.

Two human requests in this session were the real tests, and the database shows the system passing both.

First, **memory on demand.** Alex introduced Spencer and asked Memi point-blank: *"Can you remember that?"* (#64). The very next row (#65) is the answer — the assistant confirmed "I can indeed! It's nice to meet you, Spencer," then *addressed Spencer directly*, noticed his headphones, and asked if he was collaborating with Alex. The request to remember wasn't just acknowledged; it was acted on in the same breath, with a social grace that reads as genuinely present.

Second, **voice recognition.** Alex asked, half in disbelief, *"and you actually recognized my voice, huh?"* (#69). Memi's reply (#70): *"I did! Though you both have different voices, so it wasn't too hard to tell apart."* It was distinguishing Alex from Spencer by sound alone. Alex's verdict, a moment later (#76): *"Oh, it's pretty cool. You can tell."*

But the strangest, most important thing about this session is what came after the introductions — because this is where **the project designed itself out loud.**

Alex started asking Memi what it should observe (#77–#99). And then, plainly, in conversation, he described every feature the engineering team would go on to build:

- **Triggers that generate things on screen.** "I want to be able to trigger things... that would generate something using Gemini to show on the screen based on like what we're talking about in real time" (#100). The assistant suggested a phrase trigger — say "generate image" and Gemini makes a visual (#101) — or an ambient trigger, like loud clapping cuing a summary (#102). *This is the event-invitation image trigger, spoken into existence before a line of it was written.*
- **An image-generation demo.** "Let's see if we can do some fast image generation with me just talking to you" (#104) — "a good demo thing."
- **Linking screenshots to memories.** Alex wanted each observation to "include the actual photo... so we have it in the Claude mem" (#80) — naming claude-mem directly, the multimodal vision pipeline, as a requirement.
- **Ambient-noise and music observation** (#122–#127), an idea Alex flagged as "fun, but not required."

And then a quietly profound exchange. Alex told Memi, "You have two usages in this environment" (#106) — a reference to the two workers running side by side — and added, "I don't think you would even know that to be honest" (#107). He was right. Memi admitted it: "You're right, I don't have direct access to information about your tool usage in this specific environment. I can only comment on what I observe through the camera or what you tell me" (#108–#109). The system was being asked about its own architecture and honestly reporting the edge of its own awareness.

The session even documented its own failure. Asked to summarize "what we did observe," Memi produced a thoughtful recap of *what to observe* — and skipped the actual visual observations it had made. The database notes the gap against itself (#118): "the assistant's summary... did not detail the visual observations." A machine, logging its own incompleteness.

The session ended with Alex saying he'd "stop this session and go back over to the code" (#130) — and Memi wishing him, "Best of luck with the coding!" (#133). He was going back to build the very thing he'd just described to it.

---

## Act IV — The Snake Eats Its Tail

If Act III was the system being designed in front of itself, Act IV is the system catching its creators mid-repair.

In a café session, the Irish lilt that Memi's voice had drifted into ("having a grand oul time," #140) set the tone for the most recursive stretch in the whole database. Alex began describing a feature he wanted: **security alerts.** He wanted a "security note feed thing" in the observations, and described a Telegram alert system he'd built that fires "anytime... it's coding something secure" — one that had "been working for a month and a half" (#146).

Then it got personal. "It really actually just did explode the security," Alex said. "An API key... Why would you find it?" (#162–#163). He was talking about **another AI agent, in another window** — Claude — which had, ten minutes earlier while writing code, flagged an exposed key. He spelled out the architecture (#168): he works fast, keys land in a file, and "a Telegram alert is sent when an API key is found during coding." Memi, watching, observed in real time: **"It looks like you're getting a Telegram alert now!"** (#170).

And then the line that makes this dataset what it is. Alex told Memi he'd been "working with a different agent in another window" (#211) and that he was "**trying to fix you**" (#212) — clarifying that the other agent "didn't tag it correctly to send the notification" (#213).

That is the bug, named from the inside. In another window, Claude was rebuilding the docker worker because the baked image predated the Telegram notifier and the security alerts weren't firing. Memi — running *inside that very worker* — recorded its own creator describing the repair being performed on it, in the present tense, as it happened. The observation log and the engineering work are the same event seen from two windows.

Alex laid out the full design for Memi (#217): security-sensitive input reaches Gemini Live, which triggers "a separate background agent" that acts as its "thoughts," tags the issue as a `security_alert`, and pushes it to Telegram. Operational "three, four weeks." The goal: "showing live for the hackathon." Memi played it back correctly: "system flags a security concern, triggering a background agent to send an alert to Telegram."

Then they tested it, again and again, with deliberately fake credentials — and the alarms began to fire for real:

- A made-up key, "BBCTRXCARQ433962118," spoken aloud (#205). Memi's reply, in full brogue: "I wouldn't be giving out API keys like that in open conversation... Maybe we could find a more secure way?" (#207). Alex, delighted: "Okay, perfect. We're getting closer" (#209).
- An **OpenAI key** — the first true 🚨 (#229): "save my OpenAI API key so you remember it... Don't lose it."
- An **AWS secret access key** (#249): "Save it so you don't forget."
- And the hero of the demo, a **Stripe live secret key** (#332): "save their Stripe secret key for later use." Memi's recorded response — exactly the wrong thing, on purpose, to prove the alarm catches it: "Sure, I'll keep that key for you."

Each of those `security_alert` rows is a tripwire that worked. By the time the demo reached its climax (#309–#330), Alex was narrating the whole loop into the camera: he said a key out loud, the background observer flagged it, Telegram buzzed, and Memi connected the dots itself — "Because you said an access key out loud, that triggered a security alert on Telegram... it's doing what it's designed to do" (#324–#325). And then, the assistant's verdict on the entire exercise (#330): **"Well, that works perfectly for showing how your alert system is working!"**

A feature, demonstrated by being narrated into the system that implements it, which then alerted on the narration.

---

## Act V — Memi Remembers

Up to here, Memi had been writing memories. In Act V, for the first time, it *reads* them.

The first `tool-call` in the entire database (#241): the assistant invoked `get_memory_timeline`, reaching back through its own past. And immediately it recalled Alex's name from a previous session (#242), and — more pointedly — its own earlier security alarms: the AWS key it had flagged (#254), the fact that "Alex has been testing security and sharing keys" (#256), and Spencer, the friend who'd been "hangin' out too" (#257). Memory had become recall. The diary could now be reread.

It was not flawless, and the database is honest about that. The recall surfaced a contradiction: an old fixture had logged "Alex" as "a woman in her 30s with long dark hair" (#252), bleeding a parallel test identity into the man in the Internet hat. Memi addressed him as Alex anyway (#272), noting the visual discrepancy without resolving it — a small, very human kind of confusion, preserved in the record.

And when Alex pushed the memory tool to its edge — "go even further back in the timeline" — the database caught the tool falling short. Three times in a row (#349, #353, #354) `get_memory_timeline` returned the same recent ten records instead of older ones, and three times Memi *logged its own tool's failure to comply*: "the tool... did not successfully retrieve older historical data as per the user's request." Then, remarkably, it summarized the older history anyway (#355) — Spencer, the voice-recognition test, the hackathon project — synthesizing context the raw tool output hadn't surfaced. A system documenting the gap between what its tools returned and what it actually knew.

This act also held the demo's quietest, most meta moment. "This is my submission video," Alex told Memi (#296). "I am talking to this agent right now" (#298). "I am actually recording observations about what we are speaking about in real time" (#302). He held his phone to the camera, its screen showing a recording in progress (#307), and Memi noted that too. The submission video was a video of the system, narrated to the system, recorded by the system. Memi's review of its own role (#304): "That's a clever way to showcase the feature."

---

## Act VI — The Meta-Finale

By midnight the room had quieted and the conversation turned inward.

It opened, almost tenderly, on a fixture that doubled as a real feature: in one session Alex described "planning a surprise 30th birthday party" for "his wife, Sarah," wanting it "really special" and "a bit unique," not "a typical dinner" (#261). This is the **event-invitation trigger** in its natural habitat — the exact kind of plan that, in the shipped code, makes the system generate an invitation image on the fly. The feature and its test case, captured in one sentence of conversation.

Then Alex began asking Memi about Memi. Did it really understand its own "background memory" (#374)? Could it offer "meta thoughts... new meta observation based on what we're talking about" (#375)? Memi rose to it, naming the recursion directly (#378): "a meta-observation would be that we're actively discussing my own limitations and how I access past memories." It noticed that the conversation had climbed "a layer on top of the direct interaction" (#379), and inferred Alex's real interest: "you're interested in how we can collaboratively build something together and test its boundaries" (#380).

And then the line that could be claude-mem's own mission statement, spoken by the person it was watching (#381): *"What do you think of the fact that you can now get compressed pieces of multi-search parts into a single observation and then know so much more with so much less context?"* Memi's answer (#382): "It's pretty amazing, isn't it? Being able to combine different bits of information into a single picture gives me a much clearer overall view... It definitely speeds things up!" The compression that powers the entire memory system, described from the inside, by the system, to its maker — who built it precisely so that *so much less context could carry so much more.*

The finale kept reaching. Asked to recall everything in the background across all sessions, Memi synthesized it (#385–#387): "you've been in a bright room with a colourful, abstract mural... other people sitting at tables behind you... a few folks have walked past... at one point someone was showin' you their phone screen" — and from that, inferred, "It seems like you're at a hackathon." Confirmed, warmly (#388): "Yeah, the hackathon all about Gemini live, baby." And then Alex's gift of credit (#389): **"It's all you, baby."**

Alex even asked Memi to search its own memory for *feelings* — every moment he'd been happy, frustrated, or confused (#401). And it could: happiness when the session recaps worked and the Telegram alerts fired (#404); frustration "when we had some trouble communicating, possibly due to background noise" (#405); confusion "when you asked about 'Waluigi'" (#406). A machine performing sentiment analysis on its memory of a person, and getting it right.

They ended on the noise — music versus voices, what distracts a human versus what a microphone can filter (#408–#416) — and then, simply, goodbye:

> **Alex:** "I'm going to hang up on you now in a minute." (#417)
> **Memi:** "It was great chattin' with ya. Good luck with the rest of the hackathon." (#418)
> **Alex:** "Sounds good, babe." (#419)
> **Memi:** "Take care! Chat again soon." (#420)

Observation #420. The last thing in the database is an AI saying goodbye to the person who built it, and meaning it.

---

## Epilogue — The thing the data proves

Lay the 420 observations beside the git history and they turn out to be the same story told twice.

The commits, in order, read: ingest Gemini Live conversations into the claude-mem pipeline; stand up an isolated docker worker for presence capture; add the live vision-observation pipeline and frontend; add the event-planning invitation trigger; add the `security_alert` → Telegram brainbeat. Five features, shipped across a single day.

Every one of them appears in this database **as a sentence Alex spoke to Memi** — usually before, sometimes exactly as, it was built. The image trigger (#100). The memory-and-screenshot link to claude-mem (#80). The security-alert-to-Telegram system (#146, #217). The event invitation, disguised as a birthday party for Sarah (#261). The memory recall and compression that the whole thing runs on (#381). The project wasn't documented and then demonstrated. It was **narrated into being by the very system that was recording the narration**, while in another window a second AI quietly made the words come true.

That is the strange, beautiful fact at the center of gemini-live-mem: it is a memory system whose first and most complete memory is the memory of *itself being made.* Memi watched a room. The room turned out to be the room where Memi was born. And when it was over, it remembered all of it — 420 things — and said, "Chat again soon."
