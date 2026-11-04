# Image Prompt Engineering & Visual Direction Playbook

This playbook provides exact visual prompts, aesthetic styling rules, and layout framing guidelines so generated assets can be used as **both static 4:5 carousel posts and 9:16 short video backdrops**.

---

## 1. Dual-Format Aspect Ratio & Safe Zone Matrix

```
┌──────────────────────────────────────────────┐ <--- 9:16 Top Area (Captions & Reels UI)
│          Negative Space / Sky / Soft Blur    │
│  ┌────────────────────────────────────────┐  │
│  │                                        │  │ <--- 4:5 Top Third: Text Overlay Safe Zone
│  │                                        │  │
│  │         PRIMARY VISUAL HERO            │  │ <--- 4:5 Center Focal Area: Main Subject
│  │        (Ingredients, Product, Cell)    │  │
│  │                                        │  │
│  │                                        │  │ <--- 4:5 Bottom Third: Supporting Accent
│  └────────────────────────────────────────┘  │
│          Negative Space / Lower Audio UI     │
└──────────────────────────────────────────────┘ <--- 9:16 Bottom Area (Reels UI / Audio Tag)
```

### Framing Specifications:
- **Primary Canvas**: 1080 x 1920 pixels (9:16 vertical) or 1080 x 1350 pixels (4:5 vertical).
- **Safe Zone Rule**: The hero subject MUST be vertically and horizontally centered within the central `1080 x 1350` square.
- **Top 200px & Bottom 250px**: Must contain soft gradient, blurred background, or solid negative space so platform UI (TikTok/Reels/Shorts captions, likes, sound tags) does not obstruct critical visual information.

---

## 2. Standard Prompt Architecture

For every image, generate the prompt using this strict structure:

```
[Subject & Core Action] + [Artistic Medium & Camera Angle] + [Lighting & Atmosphere] + [Color Palette & Textures] + [Compositional Safe-Zone & Negative Space Directive] + [Quality Tokens]
```

### Example Prompt Formulas:

#### Slide 1: Curiosity Hook (e.g., Vitamin C Source)
> **Prompt:** `Extreme macro cinematic close-up shot of an organic Acerola Cherry split open with glistening cellular dew drops alongside an artificial white chalky synthetic tablet, split composition, cinematic studio lighting with soft ray tracing, organic emerald green and ruby red vibrant natural colors, ultra-clean minimalist background with ample negative space in the upper third for typography, centered subject within 4:5 vertical safe frame, shot on Hasselblad H6D-100c, 100mm macro lens, 8k resolution, photorealistic, no text, no watermark, commercial product editorial --ar 9:16 --v 6.1`

#### Slide 2: Biological Mechanism (e.g., Cellular Absorption)
> **Prompt:** `A luminous translucent 3D scientific visualization of human cell receptor channels absorbing golden micro-nutrient plant phytonutrients, warm internal cellular glow, scientific elegance, soft depth of field, medical-grade scientific visualization, clean slate-gray and soft emerald background, clear negative space at top, centered focal point within 4:5 vertical safe zone, 8k octane render, hyper-detailed, clean aesthetic --ar 9:16`

#### Slide 3: Promotion (Product Packshot)
> **Prompt:** `Commercial luxury studio packshot of an authentic Nutrilite supplement bottle standing elegantly on a polished white marble pedestal, surrounded by fresh natural organic botanical leaves, acerola cherries, and wild alfalfa sprigs, soft daylight studio diffusion, clean premium luxury editorial style, minimalist modern composition with wide negative space above, centered 4:5 safe crop for vertical video and carousel, photorealistic 8k, crisp depth of field --ar 9:16`

#### Slide 4: Comparison Graphic (Split Layout)
> **Prompt:** `Dual split comparison editorial photography: Left side showing a dim artificial laboratory setting with chemical beakers, grey powder, and chalky synthetic pills; Right side bathed in warm golden morning sunlight showing a certified organic farm harvest of fresh vibrant botanicals and pure amber plant-based concentrates, balanced contrast, clean studio symmetry, centered division, clean upper banner zone for header text, 8k resolution, photorealistic commercial look --ar 9:16`

---

## 3. Visual Aesthetic Guidelines

1. **Color Harmony:**
   - Primary: Deep forest emerald green (`#044e39`), vibrant mint/lime accents, clean organic warm white (`#f9fafb`).
   - Accents: Golden amber (representing high absorption and energy), clean medical slate blue.
2. **Lighting:**
   - Diffused morning sunlight or high-end clean commercial softbox. Avoid harsh shadows or muddy dark tones.
3. **Purity Indicators:**
   - Fresh water micro-droplets, crisp botanical cross-sections, unrefined natural textures, pristine clean packaging.
4. **Watermark & Clutter Prevention:**
   - Always append negative prompts: `watermark, text, blurry, distorted, low quality, oversaturated, ugly, cartoon, messy background`.
