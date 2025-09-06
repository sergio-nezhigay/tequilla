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

### JavaScript Architecture
- Global utilities in `assets/global.js` including DOM manipulation helpers
- Component-specific JS files (cart-drawer.js, customer.js, etc.)
- Modern ES6 classes and modules pattern

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

When making modifications:
- Follow existing naming conventions (e.g., `tps-` prefix for Tequila Product Showcase)
- Maintain responsive design patterns
- Test across different section combinations
- Preserve multi-language compatibility