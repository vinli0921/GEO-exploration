# Extension Icons

This folder contains placeholder SVG icons. For production, you should:

1. Create PNG icons in required sizes: 16x16, 48x48, 128x128
2. Use a professional design tool or icon generator
3. Follow Chrome Web Store icon guidelines

## Generating PNG Icons from SVG

You can use librsvg, Inkscape, or online tools:

### Using librsvg:
```bash
rsvg-convert -w 16 -h 16 icon.svg > icon16.png
rsvg-convert -w 48 -h 48 icon.svg > icon48.png
rsvg-convert -w 128 -h 128 icon.svg > icon128.png
```

### Using Inkscape:
```bash
inkscape icon.svg --export-png=icon16.png --export-width=16 --export-height=16
inkscape icon.svg --export-png=icon48.png --export-width=48 --export-height=48
inkscape icon.svg --export-png=icon128.png --export-width=128 --export-height=128
```

### Online Tools:
- https://cloudconvert.com/svg-to-png
- https://convertio.co/svg-png/
