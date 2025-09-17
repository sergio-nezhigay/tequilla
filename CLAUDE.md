# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

**Shopify Theme Development:**
- `npm run dev` - Start theme development server
- `npm run push` - Push theme to Shopify store  
- `npm run pull` - Pull theme from Shopify store

**Store Configuration:**
- Store: 52d468-3.myshopify.com
- Theme ID: 180632486167

## Architecture Overview

This is a Shopify theme based on the Dawn theme framework with custom modifications. The codebase follows Shopify's standard theme structure:

### Core Structure
- `layout/` - Base HTML templates (theme.liquid, password.liquid)
- `sections/` - Modular content blocks that can be added to pages
- `snippets/` - Reusable template partials
- `templates/` - Page-specific layouts (JSON format for section-based templates)
- `assets/` - CSS, JavaScript, and static assets
- `config/` - Theme settings and configuration
- `locales/` - Multi-language translation files

### Custom Components
- **Product Showcase**: Custom section at `sections/index-product-showcase.liquid` with specialized styling
- **Logo Carousel**: Custom section at `sections/index-logo-carousel.liquid`
- **Business Owner Section**: Custom section at `sections/index-business-owner.liquid`
- **Video Hero**: Custom section at `sections/index-video-hero.liquid`
- **Tequila-specific Sections**: `our-promise.liquid`, `tequila-showcase.liquid`, `create-tequila.liquid`, `what-you-ll-taste.liquid`
- **Custom Contact Forms**: `custom-contact-form.liquid`, `corporate-contact.liquid`

### JavaScript Architecture
- Global utilities in `assets/global.js` including DOM manipulation helpers and HTML update utilities
- Component-specific JS files (cart-drawer.js, customer.js, etc.)
- Modern ES6 classes and modules pattern
- Key utilities: `SectionId` class for managing section identifiers, `HTMLUpdateUtility` for DOM updates

### CSS Organization
- Component-based CSS files prefixed with `component-`
- Section-specific stylesheets
- Global styles integrated into theme structure

### Key Features
- Multi-language support (40+ locales)
- Comprehensive cart and checkout functionality
- Advanced product filtering and search
- Responsive design patterns
- Custom color schemes and theming

### Template Patterns
- Uses Liquid templating language
- Section-based page building
- JSON template configuration
- Snippet-based code reuse

### Specialized Templates
- Custom product templates: `product.mczr.liquid`, `product.mczrmobile.liquid` for specific product types
- Page-specific templates: `page.corporate.json`, `page.our-tequila.json`, `page.about.json`

### Multi-Color Text Implementation

This theme uses a **standardized approach** for multi-color text within sections:

**CSS Pattern:**
- Use CSS custom properties (variables) for highlight colors:
  ```css
  #{{ section.id }}.section-name {
    --section-highlight-color: {{ section.settings.highlight_color | default: '#67B7A8' }};
    --section-highlight-color-2: {{ section.settings.highlight_color_2 | default: '#F4A261' }};
  }

  #{{ section.id }} strong {
    color: var(--section-highlight-color);
    font-weight: inherit;
  }

  #{{ section.id }} em,
  #{{ section.id }} i {
    color: var(--section-highlight-color-2);
    font-style: normal;
  }
  ```

**HTML Usage:**
- `<strong>text</strong>` - First highlight color (typically teal/green #67B7A8)
- `<em>text</em>` - Second highlight color (typically orange #F4A261)

**Schema Settings:**
- Always include color picker settings for both highlight colors
- Add helpful info text: `"info": "Use <strong>text</strong> for highlight color 1, and <em>text</em> for highlight color 2"`

**Examples:**
- `Welcome to <strong>Premium</strong> <em>Tequila</em>`
- `THIS IS TEQUILA WORTHY OF <strong>YOUR NAME</strong>`

**Existing Implementations:** `our-tequila-hero.liquid`, `index-hero.liquid`, `create-own-tequila.liquid`, `tequila-worthy-hero.liquid`

When making modifications:
- Follow existing naming conventions (e.g., `tps-` prefix for Tequila Product Showcase, `tequila-` prefix for video hero)
- Maintain responsive design patterns
- Test across different section combinations
- Preserve multi-language compatibility (40+ locales supported)
- Use existing utility classes from `global.js` for DOM manipulation
- **ALWAYS use the established multi-color text pattern** with CSS variables and `<strong>`/`<em>` tags