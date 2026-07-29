// 把 HeroUI 的 oklch token 批量转成 sRGB hex，方便塞进 wxss。
// 跑完即弃。
function oklchToSrgb(L, C, H) {
  const hr = H * Math.PI / 180;
  const a = C * Math.cos(hr);
  const b = C * Math.sin(hr);
  const l_ = L + 0.3963377774 * a + 0.2158037573 * b;
  const m_ = L - 0.1055613458 * a - 0.0638541728 * b;
  const s_ = L - 0.0894841775 * a - 1.2914855480 * b;
  const l = l_ ** 3;
  const m = m_ ** 3;
  const s = s_ ** 3;
  const r = +4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s;
  const g = -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s;
  const B = -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s;
  const linToSrgb = (x) => x <= 0.0031308 ? 12.92 * x : 1.055 * Math.pow(x, 1/2.4) - 0.055;
  const clamp = (x) => Math.max(0, Math.min(1, x));
  const R = Math.round(clamp(linToSrgb(r)) * 255);
  const G = Math.round(clamp(linToSrgb(g)) * 255);
  const Bb = Math.round(clamp(linToSrgb(B)) * 255);
  return '#' + [R, G, Bb].map((n) => n.toString(16).padStart(2, '0')).join('').toUpperCase();
}

const light = {
  accent: [0.6204, 0.1950, 297.32],
  'accent-foreground': [0.9911, 0, 0],
  background: [0.9702, 0.0015, 297.32],
  border: [0.9000, 0.0015, 297.32],
  danger: [0.6532, 0.2335, 30.96],
  'danger-foreground': [0.9911, 0, 0],
  default: [0.9400, 0.0015, 297.32],
  'default-foreground': [0.2103, 0.0059, 297.32],
  'field-background': [1.0000, 0.0008, 297.32],
  'field-foreground': [0.2103, 0.0015, 297.32],
  'field-placeholder': [0.5517, 0.0030, 297.32],
  focus: [0.6204, 0.1950, 297.32],
  foreground: [0.2103, 0.0015, 297.32],
  muted: [0.5517, 0.0030, 297.32],
  overlay: [1.0000, 0.0004, 297.32],
  'overlay-foreground': [0.2103, 0.0015, 297.32],
  scrollbar: [0.8710, 0.0015, 297.32],
  segment: [1.0000, 0.0015, 297.32],
  'segment-foreground': [0.2103, 0.0015, 297.32],
  separator: [0.9200, 0.0015, 297.32],
  success: [0.7329, 0.1941, 156.03],
  'success-foreground': [0.2103, 0.0059, 156.03],
  surface: [1.0000, 0.0008, 297.32],
  'surface-foreground': [0.2103, 0.0015, 297.32],
  'surface-secondary': [0.9524, 0.0012, 297.32],
  'surface-secondary-foreground': [0.2103, 0.0015, 297.32],
  'surface-tertiary': [0.9373, 0.0012, 297.32],
  'surface-tertiary-foreground': [0.2103, 0.0015, 297.32],
  warning: [0.7819, 0.1590, 77.55],
  'warning-foreground': [0.2103, 0.0059, 77.55]
};

console.log('=== Light ===');
for (const k of Object.keys(light)) {
  const [L, C, H] = light[k];
  console.log('  --' + k + ': ' + oklchToSrgb(L, C, H));
}
