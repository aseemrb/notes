import math

def isox(x, y):
    return 300 - 1.2 * x + 1.2 * y

def isoy(x, y, z):
    return 250 + 0.6 * x + 0.6 * y - 1.5 * z

svg = []
svg.append('<svg viewBox="0 0 600 450" xmlns="http://www.w3.org/2000/svg" font-family="system-ui, sans-serif">')
svg.append('  <style>')
svg.append('    :root { --axis: #555; --text: #444; --grid: #d1d5db; --bowl: #dc2626; --plane: #f3f4f6; --bowl-opacity: 0.85; --bowl-stroke: #b91d47;}')
svg.append('    @media (prefers-color-scheme: dark) {')
svg.append('      :root { --axis: #999; --text: #ddd; --grid: #374151; --bowl: #ef4444; --plane: #1f2937; --bowl-opacity: 0.8; --bowl-stroke: #fca5a5;}')
svg.append('    }')
svg.append('    .axis { stroke: var(--axis); stroke-width: 1.5; }')
svg.append('    .axis-dash { stroke: var(--axis); stroke-width: 1.5; stroke-dasharray: 4 4; opacity: 0.7; }')
svg.append('    .grid { stroke: var(--grid); stroke-width: 1; }')
svg.append('    .text { fill: var(--text); font-size: 13px; font-weight: 500; }')
svg.append('    .plane { fill: var(--plane); }')
svg.append('    .bowl-stroke { stroke: var(--bowl-stroke); stroke-width: 1; fill: none; }')
svg.append('  </style>')

svg.append('  <defs>')
svg.append('    <linearGradient id="bowlGrad" x1="0%" y1="0%" x2="0%" y2="100%">')
svg.append('      <stop offset="0%" stop-color="var(--bowl)" stop-opacity="0.1" />')
svg.append('      <stop offset="100%" stop-color="var(--bowl)" stop-opacity="0.6" />')
svg.append('    </linearGradient>')
svg.append('    <radialGradient id="bowlInner" cx="50%" cy="50%" r="50%">')
svg.append('      <stop offset="0%" stop-color="var(--bowl)" stop-opacity="0.05" />')
svg.append('      <stop offset="100%" stop-color="var(--bowl)" stop-opacity="0.25" />')
svg.append('    </radialGradient>')
svg.append('  </defs>')

# Draw ground polygon
x_min, x_max = -120, 120
y_min, y_max = -120, 120
svg.append(f'  <polygon points="{isox(x_min,y_min)},{isoy(x_min,y_min,0)} {isox(x_max,y_min)},{isoy(x_max,y_min,0)} {isox(x_max,y_max)},{isoy(x_max,y_max,0)} {isox(x_min,y_max)},{isoy(x_min,y_max,0)}" class="plane" />')

# Draw grid
for x in range(x_min, x_max+1, 30):
    svg.append(f'  <line x1="{isox(x, y_min)}" y1="{isoy(x, y_min, 0)}" x2="{isox(x, y_max)}" y2="{isoy(x, y_max, 0)}" class="grid" />')
for y in range(y_min, y_max+1, 30):
    svg.append(f'  <line x1="{isox(x_min, y)}" y1="{isoy(x_min, y, 0)}" x2="{isox(x_max, y)}" y2="{isoy(x_max, y, 0)}" class="grid" />')

# Axes
svg.append(f'  <line x1="{isox(0,0)}" y1="{isoy(0,0,0)}" x2="{isox(-120,0)}" y2="{isoy(-120,0,0)}" class="axis-dash" />')
svg.append(f'  <line x1="{isox(0,0)}" y1="{isoy(0,0,0)}" x2="{isox(0,-120)}" y2="{isoy(0,-120,0)}" class="axis-dash" />')
svg.append(f'  <line x1="{isox(0,0)}" y1="{isoy(0,0,0)}" x2="{isox(0,0)}" y2="{isoy(0,0,-40)}" class="axis-dash" />')
svg.append(f'  <line x1="{isox(0,0)}" y1="{isoy(0,0,0)}" x2="{isox(150,0)}" y2="{isoy(150,0,0)}" class="axis" />')
svg.append(f'  <line x1="{isox(0,0)}" y1="{isoy(0,0,0)}" x2="{isox(0,150)}" y2="{isoy(0,150,0)}" class="axis" />')
svg.append(f'  <line x1="{isox(0,0)}" y1="{isoy(0,0,0)}" x2="{isox(0,0)}" y2="{isoy(0,0,140)}" class="axis" />')

# Labels
svg.append(f'  <text x="{isox(160,0)}" y="{isoy(160,0,0)}" class="text" text-anchor="end">x (a)</text>')
svg.append(f'  <text x="{isox(0,160)}" y="{isoy(0,160,0) + 12}" class="text" text-anchor="start">y (b)</text>')
svg.append(f'  <text x="{isox(0,0)}" y="{isoy(0,0,150)}" class="text" text-anchor="middle">f(a,b)</text>')

def path_from_pts(pts):
    return "M " + " L ".join([f"{p[0]:.1f},{p[1]:.1f}" for p in pts])

Z_max = 120
R = 80
coeff = Z_max / (R**2) 

t_left = math.radians(135)
t_right = math.radians(315)
pt_left = (isox(R*math.cos(t_left), R*math.sin(t_left)), isoy(R*math.cos(t_left), R*math.sin(t_left), Z_max))
pt_right = (isox(R*math.cos(t_right), R*math.sin(t_right)), isoy(R*math.cos(t_right), R*math.sin(t_right), Z_max))
pt_vertex = (isox(0,0), isoy(0,0,0))

pts_back_arc = []
for deg in range(135, 316, 5):
    t = math.radians(deg)
    pts_back_arc.append((isox(R*math.cos(t), R*math.sin(t)), isoy(R*math.cos(t), R*math.sin(t), Z_max)))

pts_front_arc = []
for deg in range(315, 315+181, 5):
    t = math.radians(deg)
    pts_front_arc.append((isox(R*math.cos(t), R*math.sin(t)), isoy(R*math.cos(t), R*math.sin(t), Z_max)))

# Solid fills
p1_y = 2 * pt_vertex[1] - pt_left[1]
fill_path = f'  <path d="{path_from_pts(pts_back_arc)} Q 300,{p1_y:.1f} {pt_left[0]:.1f},{pt_left[1]:.1f} Z" fill="url(#bowlGrad)" />'
fill_inner = f'  <path d="{path_from_pts(pts_back_arc)} {path_from_pts(pts_front_arc[::-1])} Z" fill="url(#bowlInner)" />'

svg.append(fill_path)
svg.append(fill_inner)

svg.append('  <!-- Paraboloid ribs -->')
for deg in range(0, 360, 30):
    pts = []
    t = math.radians(deg)
    for z_i in range(0, Z_max+1, 10):
        r_i = math.sqrt(z_i / coeff)
        x = r_i * math.cos(t)
        y = r_i * math.sin(t)
        pts.append((isox(x, y), isoy(x, y, z_i)))
    svg.append(f'  <path d="{path_from_pts(pts)}" class="bowl-stroke" opacity="0.3" />')

svg.append('  <!-- Paraboloid rings -->')
for z_i in range(10, Z_max+1, 10):
    r_i = math.sqrt(z_i / coeff)
    pts = []
    for deg in range(0, 361, 5):
        t = math.radians(deg)
        x = r_i * math.cos(t)
        y = r_i * math.sin(t)
        pts.append((isox(x, y), isoy(x, y, z_i)))
    svg.append(f'  <path d="{path_from_pts(pts)}" class="bowl-stroke" opacity="{0.1 + 0.7*(z_i/Z_max)}" />')

svg.append('</svg>')

with open('/Users/aseemrb/Documents/GitHub/notes/public/assets/images/linear-algebra/energy.svg', 'w') as f:
    f.write('\n'.join(svg))
