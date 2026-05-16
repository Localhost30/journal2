---
name: Institutional Dark
colors:
  surface: '#10131a'
  surface-dim: '#10131a'
  surface-bright: '#363941'
  surface-container-lowest: '#0b0e15'
  surface-container-low: '#191b23'
  surface-container: '#1d2027'
  surface-container-high: '#272a31'
  surface-container-highest: '#32353c'
  on-surface: '#e1e2ec'
  on-surface-variant: '#c2c6d6'
  inverse-surface: '#e1e2ec'
  inverse-on-surface: '#2e3038'
  outline: '#8c909f'
  outline-variant: '#424754'
  surface-tint: '#adc6ff'
  primary: '#adc6ff'
  on-primary: '#002e6a'
  primary-container: '#4d8eff'
  on-primary-container: '#00285d'
  inverse-primary: '#005ac2'
  secondary: '#4cd7f6'
  on-secondary: '#003640'
  secondary-container: '#03b5d3'
  on-secondary-container: '#00424e'
  tertiary: '#ffb786'
  on-tertiary: '#502400'
  tertiary-container: '#df7412'
  on-tertiary-container: '#461f00'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#d8e2ff'
  primary-fixed-dim: '#adc6ff'
  on-primary-fixed: '#001a42'
  on-primary-fixed-variant: '#004395'
  secondary-fixed: '#acedff'
  secondary-fixed-dim: '#4cd7f6'
  on-secondary-fixed: '#001f26'
  on-secondary-fixed-variant: '#004e5c'
  tertiary-fixed: '#ffdcc6'
  tertiary-fixed-dim: '#ffb786'
  on-tertiary-fixed: '#311400'
  on-tertiary-fixed-variant: '#723600'
  background: '#10131a'
  on-background: '#e1e2ec'
  surface-variant: '#32353c'
typography:
  display-lg:
    fontFamily: Geist
    fontSize: 48px
    fontWeight: '600'
    lineHeight: '1.1'
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Geist
    fontSize: 32px
    fontWeight: '600'
    lineHeight: '1.2'
    letterSpacing: -0.02em
  headline-lg-mobile:
    fontFamily: Geist
    fontSize: 24px
    fontWeight: '600'
    lineHeight: '1.2'
  title-md:
    fontFamily: Geist
    fontSize: 18px
    fontWeight: '500'
    lineHeight: '1.4'
  body-md:
    fontFamily: Geist
    fontSize: 14px
    fontWeight: '400'
    lineHeight: '1.6'
  label-mono:
    fontFamily: JetBrains Mono
    fontSize: 12px
    fontWeight: '500'
    lineHeight: '1.0'
    letterSpacing: 0.05em
  caption:
    fontFamily: Geist
    fontSize: 12px
    fontWeight: '400'
    lineHeight: '1.4'
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  base: 4px
  xs: 4px
  sm: 8px
  md: 16px
  lg: 24px
  xl: 40px
  gutter: 16px
  margin: 24px
---

## Brand & Style
The design system is engineered for high-performance financial analysis and meticulous trade journaling. It targets professional traders and institutional-grade users who require a high-density, low-fatigue environment for extended periods of market exposure.

The aesthetic is a sophisticated fusion of **Minimalism** and **Glassmorphism**, drawing inspiration from precision developer tools and professional trading terminals. It prioritizes clarity, data hierarchy, and a sense of "technological calm." Visual depth is achieved through semi-transparent layers, frosted glass effects, and subtle secondary glows that mimic an illuminated physical console. The interface should feel expensive, precise, and authoritative.

## Colors
The palette is built on a deep "Midnight Navy" foundation to reduce eye strain.
- **Foundation:** The background uses `#0B1020`, providing a high-contrast base for data.
- **Accents:** Primary Blue (`#3B82F6`) and Cyan (`#06B6D4`) are used sparingly for calls to action, active states, and focus indicators to maintain a professional atmosphere.
- **Semantic Logic:** Green and Red are reserved strictly for profit/loss and directional market indicators. Use a slight desaturation on background fills for these colors to prevent "vibration" against the dark UI.
- **Transparency:** Glass surfaces utilize `#172033` with an alpha channel ranging from 60% to 80% over blurred backgrounds.

## Typography
This design system utilizes **Geist** for its neutral, technical aesthetic and high legibility in dense data environments.
- **Data Display:** For numerical values, price ticks, and timestamps, use **JetBrains Mono** to ensure tabular alignment and a "terminal" feel.
- **Hierarchy:** Use heavy weights (600) for section headers and lighter weights (400) for body text. 
- **Scale:** Maintain a tight typographic scale. Body text is set to 14px to maximize information density without sacrificing readability.

## Layout & Spacing
The layout follows a **12-column fluid grid** for dashboard views, with a 1200px max-width for document-heavy journal entries.
- **Density:** Use a 4px baseline grid. Components like data tables should use "Compact" (8px vertical padding) or "Standard" (12px vertical padding) modes.
- **Padding:** Containers and cards utilize `md` (16px) or `lg` (24px) internal padding to provide "breathing room" amidst complex data.
- **Mobile:** Reflow 12-column layouts into a single stack, reducing horizontal margins to 16px.

## Elevation & Depth
Depth is signaled through a combination of stacking order and light-based effects:
- **Surface 1 (Base):** `#0B1020` - Flat.
- **Surface 2 (Sidebar/Nav):** `#121A2B` - No shadow, subtle 1px right/bottom border.
- **Surface 3 (Cards/Modals):** `#172033` with 80% opacity and `backdrop-filter: blur(12px)`.
- **Shadows:** Use extremely soft, large-radius shadows (`box-shadow: 0 20px 40px rgba(0,0,0,0.4)`).
- **Light Leak:** Apply a subtle 1px solid border at 10% white (`#ffffff10`) to the top and left edges of cards to simulate a light source from the top-left.

## Shapes
The design system uses a consistent **Rounded** geometry to soften the technical edge of the data. 
- **Standard UI:** 8px (`0.5rem`) for inputs, small buttons, and tags.
- **Containers:** 12px-16px for primary cards and dashboard panels.
- **Interactions:** Hover states should subtly increase the brightness of the background fill rather than changing the border radius.

## Components
- **Buttons:** Primary buttons use a linear gradient from Primary Blue to Cyan. Secondary buttons use a transparent fill with a 1px white border at 10% opacity.
- **Input Fields:** Darker than the card surface (`#0B1020`), with 8px corner radius. Focus state is a 1px Cyan glow.
- **Cards:** Must feature the "Light Leak" border (`#ffffff10`) and backdrop blur. Title areas should be separated by a subtle 1px horizontal line.
- **Chips/Badges:** Small, monospaced text. For P/L indicators, use a low-opacity background of the semantic color (e.g., 15% green) with 100% opacity text.
- **Trading Chart:** Integrate with a dark-themed TradingView library. Crosshairs should be thin, 1px dashed lines in `#94A3B8`.
- **Data Tables:** Zebra striping is discouraged. Use 1px bottom borders in `#172033` to separate rows. Hover states should highlight the entire row in `#ffffff05`.