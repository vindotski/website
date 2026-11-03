---
title: Wireframing in code before content
date: 2026-11-17
tags:
  - wireframing
  - nextjs
  - process
tldr: I skipped the design tool and wireframed this site in code with grey boxes, one section per commit. Changing the structure stayed cheap, and it changed a lot.
---
## The question

Before writing any copy or picking any colours, I wanted to know what this site should contain and in what order. Usually that's a job for a design tool.

I wanted to try something else: wireframe in the real medium, the code, and see whether the structure settles faster.

## Setup

The rules were simple:

- No real copy, no visual design. Grey boxes only.
- One section per commit, reviewed before the next.
- Build each section as a real component, with real layout that works on a phone.

Two components did most of the work. A placeholder, which is just a grey box with a label:

```tsx
export default function Placeholder({ label, height = 48 }: PlaceholderProps) {
  return (
    <div className={styles.placeholder} style={{ minHeight: height }}>
      {label}
    </div>
  );
}
```

And a section wrapper with a heading, a width and an anchor, so the header could link to it.

## What I tried

The first pass was one section at a time: header, hero, work, "What I do", about, contact, footer. Each one was a commit.

Then the structure started moving, which was the point:

- **Added sections.** Samples for open-source projects, Process for how I work, and a Blog.
- **Reordered.** "What I do" sat between two sets of projects and split the proof. The final order is proof, person, pitch: work and samples, then about, then services and process right before contact.
- **Renamed.** "What I do" became Services.
- **Changed my mind.** The blog started as a second grid of project cards, became a list of story-style titles, and ended up as a plain list of posts.
- **Removed.** Work pages lost two sections, "What I built" and "Outcome", once the page read better without them.

Every one of those was a small change to real components, not a redraw.

I also held off on shared components until something needed one twice. The project card layout moved into its own component when Samples appeared next to Work. The detail-page pieces were extracted when the second detail page needed them.

## Results

The wireframe phase took more than 40 small commits, each one reviewable on its own. The structure changed more in those commits than I expected it to, and none of the changes were expensive.

Because the wireframe was real code, the next step was short. When the content data arrived, sections swapped placeholders for real fields one at a time, and the placeholder labels became the image alt text.

## Takeaways

Wireframing in code is good for structure and flow. You see real layout, real links and real phone widths from the first commit, and reordering a page is a one-line change.

It's poor for visual exploration. The site is still grey, on purpose. For typography, colour and the overall look, I'd still open a design tool, after the structure is settled.
