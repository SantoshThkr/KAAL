# Performance Notes

- The particle field is one canvas draw loop rather than thousands of React elements.
- Particle count is capped at 11,500 desktop particles and reduced to a lower density on smaller screens.
- Per-frame animation is kept outside React state; React only receives scroll progress and accessibility toggles.
- The experience uses CSS radial lighting and a fixed canvas to keep the empty prototype inexpensive while production assets are pending.
- Production GLBs should use Draco compression, KTX2 textures, and scene-level lazy loading.
