# Writes the shapes igloo's particles gather into: a distance field per shape, in the form igloo's
# own volumes have (rgb = direction away from the surface, a = signed distance), 'GDV1' + uint32 N + N^3 RGBA.
import numpy as np, struct, sys
from scipy.spatial import cKDTree
from scipy.ndimage import distance_transform_edt, gaussian_filter

OUT = r'C:\Users\georg\Documents\gd\hacken-web\assets\volumes'
N = int(sys.argv[1]) if len(sys.argv) > 1 else 80
M = N * 2      # worked out at twice the size, then averaged down
ax = (np.arange(M) + 0.5) / M - 0.5
Z, Y, X = np.meshgrid(ax, ax, ax, indexing='ij')   # slices of z, rows of y, columns of x, as a 3D texture lies

def smin(a, b, k):
    h = np.clip(0.5 + 0.5 * (b - a) / k, 0, 1)
    return b * (1 - h) + a * h - k * h * (1 - h)
def smax(a, b, k): return -smin(-a, -b, k)
def rbox(x, y, z, bx, by, bz, r):
    qx, qy, qz = np.abs(x) - bx + r, np.abs(y) - by + r, np.abs(z) - bz + r
    return np.sqrt(np.maximum(qx, 0)**2 + np.maximum(qy, 0)**2 + np.maximum(qz, 0)**2) + np.minimum(np.maximum(qx, np.maximum(qy, qz)), 0) - r
def tube(points, radii):
    """distance to a tube along a polyline with a radius at each point"""
    pts = np.array(points); rad = np.array(radii)
    seg = np.linalg.norm(np.diff(pts, axis=0), axis=1)
    n = np.maximum(2, (seg / (0.25 / M)).astype(int))
    dense = np.concatenate([np.linspace(pts[i], pts[i + 1], n[i], endpoint=False) for i in range(len(seg))] + [pts[-1:]])
    drad = np.concatenate([np.linspace(rad[i], rad[i + 1], n[i], endpoint=False) for i in range(len(seg))] + [rad[-1:]])
    d, idx = cKDTree(dense).query(np.stack([X.ravel(), Y.ravel(), Z.ravel()], 1))
    return (d - drad[idx]).reshape(X.shape)
def bezier(p0, p1, p2, p3, n=48):
    t = np.linspace(0, 1, n)[:, None]
    return (1 - t)**3 * p0 + 3 * (1 - t)**2 * t * p1 + 3 * (1 - t) * t**2 * p2 + t**3 * p3

def hat():
    # a fedora: a brim that dips at front and back, a tapered crown with a crease and two pinches, a band
    y0 = -0.115
    rx, rz = 0.405, 0.345
    r = np.sqrt((X / rx)**2 + (Z / rz)**2)
    curl = y0 + 0.032 * (X / rx)**2 - 0.042 * (Z / rz)**2
    brim = np.maximum(np.abs(Y - curl) - 0.0165, (r - 1) * rz)
    h = (Y - y0) / 0.335   # 0 at the brim, 1 at the top of the crown
    taper = 1 - 0.21 * np.clip(h, 0, 1)**1.2
    ex = np.sqrt((X / (0.205 * taper))**2 + (Z / (0.17 * taper))**2)
    band = 0.011 * (np.tanh((0.26 - h) / 0.025) + 1) / 2 * (h > -0.2)
    wall = (ex - 1) * 0.165 - band
    crease = 0.07 * np.exp(-(X / 0.05)**2) * np.clip((Z + 0.17) / 0.06, 0, 1)
    pinch = 0.052 * np.exp(-((np.abs(X) - 0.095) / 0.042)**2 - ((Z - 0.085) / 0.055)**2)
    roof = Y - (y0 + 0.335 - crease - pinch - 0.05 * (X / 0.2)**2 - 0.045 * (Z / 0.16)**2)
    under = (y0 - 0.01) - Y
    crown = smax(smax(wall, roof, 0.028), under, 0.008)
    return smin(brim, crown, 0.014)

def hook():
    # a fish hook, hanging from its line: eye, shank, bend, point, barb
    shank = [np.array([0.085, 0.27, 0]), np.array([0.085, -0.02, 0])]
    bend = bezier(np.array([0.085, -0.02, 0]), np.array([0.085, -0.34, 0]), np.array([-0.24, -0.34, 0]), np.array([-0.205, -0.02, 0]))
    pts = np.concatenate([shank, bend[1:]])
    # the wire thins towards the point
    rad = np.concatenate([[0.031, 0.031], np.linspace(0.031, 0.026, 30), np.linspace(0.026, 0.006, len(bend) - 31)])
    wire = tube(pts, rad)
    barb = tube([np.array([-0.205, -0.02, 0]), np.array([-0.222, -0.09, 0]), np.array([-0.15, -0.095, 0])], [0.008, 0.024, 0.006])
    # the eye, a ring at the top of the shank
    ce = np.array([0.085, 0.315, 0.0]); ring_r = 0.05
    d_plane = np.sqrt((X - ce[0])**2 + (Y - ce[1])**2) - ring_r
    eye = np.sqrt(d_plane**2 + Z**2) - 0.022
    line = tube([np.array([0.085, 0.36, 0]), np.array([0.085, 0.5, 0])], [0.0095, 0.0095])
    return smin(smin(smin(wire, barb, 0.012), eye, 0.012), line, 0.006)

def server():
    # three units in a stack: vents on the left of each, lights and a bay on the right
    w, h, d = 0.31, 0.088, 0.225
    ys = [0.205, 0.0, -0.205]
    shape = np.full(X.shape, 9.0)
    for cy in ys:
        unit = rbox(X, Y - cy, Z, w, h, d, 0.018)
        y = Y - cy
        front = Z - (d - 0.022)   # >0 in the skin of the front
        # vents: upright slots
        vent = np.full(X.shape, 9.0)
        for vx in np.arange(-0.25, -0.03, 0.054):
            vent = np.minimum(vent, rbox(X - vx, y, Z - d, 0.015, 0.05, 0.03, 0.006))
        # lights: two round dimples
        leds = np.minimum(np.sqrt((X - 0.235)**2 + y**2) - 0.026, np.sqrt((X - 0.148)**2 + y**2) - 0.026)
        leds = np.maximum(leds, -front)
        unit = smax(unit, -np.minimum(vent, leds), 0.004)
        shape = np.minimum(shape, unit)
    return shape

def lock():
    # a padlock: its body, its shackle, a keyhole
    by = -0.145
    body = rbox(X, Y - by, Z, 0.255, 0.205, 0.092, 0.05)
    # the shackle: a half ring and its two legs
    cy = 0.105; R = 0.155; r = 0.041
    dx = np.abs(X) - R
    upper = np.where(Y > cy, np.sqrt(np.maximum(np.sqrt(X**2 + (Y - cy)**2) - R, -1e9)**2 + Z**2) - r, 9.0)
    upper = np.where(Y > cy, np.sqrt((np.sqrt(X**2 + (Y - cy)**2) - R)**2 + Z**2) - r, 9.0)
    legs = np.maximum(np.where(Y <= cy, np.sqrt(dx**2 + Z**2) - r, 9.0), by - Y)
    shackle = np.minimum(upper, legs)
    shape = smin(body, shackle, 0.006)
    # the keyhole: a round head and a slot, cut into the front
    ky = by + 0.03
    head = np.sqrt(X**2 + (Y - ky)**2) - 0.046
    slot = rbox(X, Y - (ky - 0.075), Z * 0, 0.021, 0.07, 1, 0.01)
    hole = np.maximum(np.minimum(head, slot), (0.092 - 0.045) - Z)
    return smax(shape, -hole, 0.006)

def write(name, f, k=4.0):
    inside_mask = f < 0
    d = (distance_transform_edt(~inside_mask) - distance_transform_edt(inside_mask)) / M
    d = d.reshape(N, 2, N, 2, N, 2).mean(axis=(1, 3, 5))     # down to the texture's size
    f = d
    d = gaussian_filter(d, 0.6)
    gz, gy, gx = np.gradient(d, 1.0 / N)
    mag = np.sqrt(gx**2 + gy**2 + gz**2) + 1e-6
    nx, ny, nz = gx / mag, gy / mag, gz / mag
    a = np.clip(d * k / 2 * 0.5 + 0.5, 0, 1)      # igloo reads dist = (a*2-1)*2; four times finer at the surface
    data = np.stack([nx * 0.5 + 0.5, ny * 0.5 + 0.5, nz * 0.5 + 0.5, a], -1)
    data = (np.clip(data, 0, 1) * 255 + 0.5).astype(np.uint8)
    with open(OUT + '\\' + name + '.bin', 'wb') as out:
        out.write(b'GDV1' + struct.pack('<I', N)); out.write(data.tobytes())
    inside = (f < 0).sum() / f.size
    idx = np.argwhere(f < 0)
    span = (idx.min(0) / N - 0.5).round(3).tolist(), (idx.max(0) / N - 0.5).round(3).tolist()
    print(name, 'inside %.3f' % inside, 'z,y,x span', span)

for name, fn in (('hat', hat), ('hook', hook), ('server', server), ('lock', lock)):
    write(name, fn())
