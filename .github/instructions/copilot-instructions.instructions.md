# AI Instructions: Shopify Section Creation

## Section and Functionality Description

- Each section must have a **name (max 25 characters)**.
- In **section settings**, always include:
  - Padding top (mobile & desktop)
  - Padding bottom (mobile & desktop)
  - Background for the section
  - Block types and their settings
  - Example output: `{{ section.settings.title }}`

## Schema Rules

- Wrap schema in `{% schema %}` and `{% endschema %}`.
- Always include `"presets": [ { "name": (max 25 characters) } ]`.
- Section must be available on any template (`"templates": ["*"]`).

## Functionality Description

### Order of Code Delivery

1. **Markup**
   - Add `section.id` to the main wrapper.
   - Add a custom wrapper class based on functionality or structure.
2. **Styles**
3. **Dynamic Styles**
   - Scoped with section ID for high specificity.
4. **Script (if needed)**
5. **Schema**
   - Global styles only, do not use section ID here.

### Important Notes

- All styles must use variables.
- Don’t render section title/description if fields are empty.
- Code must be well-structured, high quality, and SEO-optimized.
- Avoid inline styles.
- Provide the entire section in one file.
- Section must be fully responsive.
- Use `image_url` with width/height and modern responsive usage (`image_tag`, `srcset`, `sizes`).
- For spacing (margins, paddings), use **range type**, not text fields.
- Range `step` must not exceed 100.
- Range must include a **default value** between min and max.
- For headings/subheadings: include **font size settings for desktop & mobile**.
- Use `richtext` for large text blocks.
- Always include a **text field for custom classes** in section settings.

### Blocks & Layout

- Do not limit the number of blocks.
- Changing block order in admin must reflect on page.
- Support optional small icon near text (via `html` block).
- If section contains image + content:
  - Add **reverse option** for desktop.
  - Add **mobile order option** (image first or content first).

### Styling

- Markup must be cross-browser compatible.
- Each text element must have:
  - Title size (desktop & mobile)
  - Color setting
- Styles should not interfere with other sections.
- Use `<style>` and `<script>` tags with proper indentation.

### Additional Section Settings

- Max width (manual input, not range).
- Vertical & horizontal padding for both mobile & desktop.
- Maximum specificity in class names.

---

## Final Checklist

- Pixel-perfect reproduction of design.
- Section works across templates.
- Range defaults are selectable and valid.
- Responsive images (`srcset`, `sizes`) properly implemented.
- Blocks reorder correctly.
- Reverse layout and mobile order settings function.
- Scoped styles with section ID.
- SEO and accessibility ready (semantic tags, alt text, headings).
