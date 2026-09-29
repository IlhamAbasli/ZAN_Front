"""
ZAN promo videoları üçün səs: sintez edilmiş musiqi fonu + kadrlara sinxron effektlər.
python sound.py a1 out/a1.wav   |   python sound.py m4 out/m4.wav
"""
import sys, wave
import numpy as np
import scipy.signal as sg

SR = 48000
rng = np.random.default_rng(7)


def N(sec):
    return int(round(sec * SR))


def tt(n):
    return np.arange(n) / SR


def note(name):
    names = {"C": -9, "C#": -8, "D": -7, "D#": -6, "E": -5, "F": -4, "F#": -3, "G": -2, "G#": -1, "A": 0, "A#": 1, "B": 2}
    n, o = name[:-1], int(name[-1])
    return 440.0 * 2 ** ((names[n] + (o - 4) * 12) / 12)


def lp(x, fc, order=2):
    return sg.sosfilt(sg.butter(order, min(fc, SR / 2 - 100), "low", fs=SR, output="sos"), x)


def hp(x, fc, order=2):
    return sg.sosfilt(sg.butter(order, fc, "high", fs=SR, output="sos"), x)


def bp(x, lo, hi, order=2):
    return sg.sosfilt(sg.butter(order, [lo, hi], "band", fs=SR, output="sos"), x)


class Mix:
    def __init__(self, dur):
        self.n = N(dur) + SR * 3
        self.dur = dur
        self.dry = np.zeros((2, self.n))
        self.wet = np.zeros((2, self.n))

    def add(self, x, t0, gain=1.0, pan=0.0, rev=0.2):
        if x.ndim == 1:
            a = (pan + 1) * np.pi / 4
            x = np.vstack([x * np.cos(a), x * np.sin(a)]) * np.sqrt(2)
        i = N(t0)
        if i < 0:
            x = x[:, -i:]; i = 0
        m = min(x.shape[1], self.n - i)
        self.dry[:, i:i + m] += x[:, :m] * gain
        self.wet[:, i:i + m] += x[:, :m] * gain * rev

    def render(self):
        # sintetik zal akustikası: sönən küy impulsu
        L = N(2.6)
        e = np.exp(-tt(L) / 0.55)
        ir = np.vstack([lp(rng.standard_normal(L), 5500) * e, lp(rng.standard_normal(L), 5500) * e])
        ir /= np.sqrt((ir ** 2).sum(axis=1, keepdims=True))
        wet = np.vstack([sg.fftconvolve(self.wet[c], ir[c])[: self.n] for c in range(2)])
        out = self.dry + wet * 0.9
        out = hp(out, 28)
        out = out[:, : N(self.dur)]
        # sonda qısa sönmə — klik olmasın
        f = N(0.05)
        out[:, -f:] *= np.linspace(1, 0, f)
        pk = np.abs(out).max()
        out = out / pk * 1.15
        out = np.tanh(out) / np.tanh(1.15) * 0.8
        return out


#region alətlər
def pad(freqs, dur, cutoff=1800, att=1.2, rel=1.6, bright=1.3):
    n = N(dur + rel)
    t = tt(n)
    L = np.zeros(n); R = np.zeros(n)
    for fi, f in enumerate(freqs):
        for vi, det in enumerate((-8, 0, 8)):
            ff = f * 2 ** (det / 1200)
            ph = rng.uniform(0, 2 * np.pi)
            w = np.zeros(n)
            for k in range(1, 9):
                if ff * k > 9000:
                    break
                w += np.sin(2 * np.pi * ff * k * t + ph * k) / k ** bright
            w *= 1 + 0.08 * np.sin(2 * np.pi * (0.13 + 0.05 * vi + 0.03 * fi) * t)
            if vi == 0: L += w; R += w
            elif vi == 1: L += w * 1.2
            else: R += w * 1.2
    env = np.minimum(1, t / att) * np.clip((dur + rel - t) / rel, 0, 1) ** 1.5
    L = lp(L * env, cutoff); R = lp(R * env, cutoff)
    s = np.vstack([L, R])
    return s / (len(freqs) * 3)


def pluck(f, dur=1.4, bright=1.0):
    t = tt(N(dur))
    w = np.zeros_like(t)
    for k in range(1, 7):
        w += np.exp(-t * (2.2 + k * 2.4 / bright)) * np.sin(2 * np.pi * f * k * t) / k ** 1.4
    w *= np.minimum(1, t / 0.004)
    return w * 0.5


def boom(dur=2.4, f0=78, f1=36):
    t = tt(N(dur))
    f = f1 + (f0 - f1) * np.exp(-t / 0.18)
    ph = 2 * np.pi * np.cumsum(f) / SR
    body = np.sin(ph) * np.exp(-t / 0.7)
    click = lp(rng.standard_normal(len(t)) * np.exp(-t / 0.012), 2500) * 0.5
    air = lp(rng.standard_normal(len(t)), 900) * np.exp(-t / 0.4) * 0.12
    return body + click + air


def kick(v=1.0):
    t = tt(N(0.5))
    f = 45 + 90 * np.exp(-t / 0.035)
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / 0.16) * v


def hat(v=1.0):
    t = tt(N(0.09))
    return hp(rng.standard_normal(len(t)), 7500) * np.exp(-t / 0.018) * v


def whoosh(dur=0.9, lo=250, hi=4200, peak=0.55):
    n = N(dur)
    x = rng.standard_normal(n)
    out = np.zeros(n)
    zi = None
    B = 480
    for b in range(0, n, B):
        u = b / n
        k = np.exp(-((u - peak) ** 2) / 0.06)
        fc = lo * (hi / lo) ** k
        sos = sg.butter(2, [fc * 0.55, min(fc * 1.8, SR / 2 - 200)], "band", fs=SR, output="sos")
        if zi is None:
            zi = sg.sosfilt_zi(sos) * 0
        seg, zi = sg.sosfilt(sos, x[b:b + B], zi=zi)
        out[b:b + B] = seg
    u = np.arange(n) / n
    env = np.where(u < peak, (u / peak) ** 2.2, np.exp(-(u - peak) / 0.13))
    return out * env


def whoosh_st(dur, direction=1, **kw):
    w = whoosh(dur, **kw)
    u = np.linspace(-1, 1, len(w)) * direction * 0.8
    a = (u + 1) * np.pi / 4
    return np.vstack([w * np.cos(a), w * np.sin(a)]) * np.sqrt(2)


def plop():
    t = tt(N(0.35))
    f = 260 + 1100 * np.exp(-t / 0.03)
    s = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / 0.09)
    return s + bp(rng.standard_normal(len(t)), 800, 3000) * np.exp(-t / 0.02) * 0.3


def shimmer(dur=1.4, n=28, lo=2400, hi=8500, seed=1):
    r = np.random.default_rng(seed)
    L = np.zeros(N(dur) + SR); R = np.zeros_like(L)
    for _ in range(n):
        f = r.uniform(lo, hi); st = r.uniform(0, dur * 0.8); d = r.uniform(0.15, 0.6)
        t = tt(N(d))
        g = np.sin(2 * np.pi * f * t) * np.sin(np.pi * t / d) ** 2 * r.uniform(0.3, 1)
        pn = r.uniform(-1, 1); a = (pn + 1) * np.pi / 4
        i = N(st)
        L[i:i + len(g)] += g * np.cos(a); R[i:i + len(g)] += g * np.sin(a)
    return np.vstack([L, R]) / 6


def tick(f=2600):
    t = tt(N(0.06))
    return (np.sin(2 * np.pi * f * t) + 0.4 * np.sin(2 * np.pi * f * 2.01 * t)) * np.exp(-t / 0.012)


def thud():
    t = tt(N(0.3))
    f = 55 + 70 * np.exp(-t / 0.03)
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / 0.08) + lp(rng.standard_normal(len(t)), 600) * np.exp(-t / 0.02) * 0.4


def noise_bed(dur, lo, hi, att=0.3, rel=0.4, lfo=0.0, lfo_depth=0.0):
    n = N(dur)
    t = tt(n)
    x = bp(rng.standard_normal(n), lo, hi)
    env = np.minimum(1, t / att) * np.clip((dur - t) / rel, 0, 1)
    if lfo:
        env *= 1 - lfo_depth + lfo_depth * (0.5 + 0.5 * np.sin(2 * np.pi * lfo * t))
    return x * env


def riser(dur, lo=200, hi=6000):
    n = N(dur)
    x = rng.standard_normal(n)
    out = np.zeros(n); zi = None
    for b in range(0, n, 480):
        u = b / n
        fc = lo * (hi / lo) ** (u ** 1.6)
        sos = sg.butter(2, [fc * 0.7, min(fc * 1.4, SR / 2 - 200)], "band", fs=SR, output="sos")
        if zi is None: zi = sg.sosfilt_zi(sos) * 0
        seg, zi = sg.sosfilt(sos, x[b:b + 480], zi=zi)
        out[b:b + 480] = seg
    u = np.arange(n) / n
    return out * u ** 2.5
#endregion


def chord(names):
    return [note(n) for n in names]


C = {
    "Dmaj9": chord(["D3", "F#3", "A3", "C#4", "E4"]),
    "Bm9": chord(["B2", "D3", "F#3", "A3", "C#4"]),
    "Gmaj7": chord(["G2", "B2", "D3", "F#3", "A3"]),
    "Dmaj7/F#": chord(["F#2", "A2", "D3", "F#3", "C#4"]),
    "A6sus": chord(["A2", "D3", "E3", "F#3", "B3"]),
    "A": chord(["A2", "C#3", "E3", "A3", "E4"]),
    "Em9": chord(["E2", "G2", "B2", "D3", "F#3"]),
}


def arps(m, t0, t1, ch, step=0.375, gain=0.2, pattern=(0, 2, 4, 3, 1, 3, 4, 2), octave=2, pan_spread=0.5, bright=1.0):
    k = 0
    t = t0
    while t < t1 - 0.05:
        f = ch[pattern[k % len(pattern)] % len(ch)] * octave
        m.add(pluck(f, 1.3, bright), t, gain * (0.85 + 0.3 * ((k % 4) == 0)), pan=np.sin(k * 1.7) * pan_spread, rev=0.45)
        k += 1
        t += step


def build_a1():
    D = 29.0
    m = Mix(D)
    # 0–2.7 qaranlıq: dron və qalxan küy
    m.add(pad(chord(["D2", "A2"]), 2.7, cutoff=420, att=1.4, rel=0.8), 0, 0.9, rev=0.3)
    m.add(riser(1.9, 150, 5000), 0.85, 0.16, rev=0.4)
    m.add(plop(), 0.83, 0.55, rev=0.5)
    m.add(boom(2.0, 70, 34), 0.85, 0.5, rev=0.25)
    m.add(shimmer(1.0, 16, seed=2), 1.15, 0.35, rev=0.6)
    # 2.7 loqo
    m.add(whoosh_st(0.85, 1, lo=200, hi=3800, peak=0.45), 2.6, 0.5, rev=0.25)
    m.add(boom(2.6, 85, 36), 3.1, 0.85, rev=0.35)
    m.add(pad(C["Dmaj9"], 3.2, cutoff=2200, att=0.25, rel=1.2), 3.1, 1.1, rev=0.5)
    m.add(shimmer(1.3, 30, seed=3), 3.95, 0.5, rev=0.6)
    arps(m, 3.85, 6.0, C["Dmaj9"], step=0.375, gain=0.13, octave=2)
    m.add(riser(1.1, 300, 7000), 4.9, 0.12, rev=0.3)
    # 6–21 məhsullar: 80 BPM, hər məhsul bir takt
    prog = ["Bm9", "Gmaj7", "Dmaj7/F#", "A6sus", "Bm9"]
    for i, c in enumerate(prog):
        t0 = 6.0 + i * 3.0
        m.add(pad(C[c], 3.0, cutoff=1900 + i * 150, att=0.08, rel=0.9), t0, 1.0, rev=0.45)
        m.add(pluck(C[c][0] / 2, 2.4, 0.6), t0, 0.5, rev=0.2)
        arps(m, t0, t0 + 3.0, C[c], gain=0.16, octave=2)
        for b in range(4):
            m.add(kick(0.55 if b % 2 == 0 else 0.3), t0 + b * 0.75, 0.55, rev=0.05)
        for h in range(8):
            m.add(hat(0.9 if h % 2 else 0.5), t0 + h * 0.375 + 0.02, 0.06, pan=0.3, rev=0.1)
        m.add(whoosh_st(0.9, 1 if i % 2 == 0 else -1, lo=220, hi=4600, peak=0.5), t0 - 0.05, 0.42, rev=0.2)
        m.add(thud(), t0 + 0.55, 0.28, rev=0.15)
        m.add(shimmer(0.9, 12, seed=10 + i), t0 + 1.15, 0.22, rev=0.6)
        for k in range(3):
            m.add(tick(2400 + k * 300), t0 + 1.4 + k * 0.08, 0.06, pan=-0.5, rev=0.2)
    # 21–25 ailə kadrı
    m.add(whoosh_st(0.9, -1, lo=180, hi=4000), 20.95, 0.45, rev=0.2)
    m.add(pad(C["Gmaj7"], 2.0, cutoff=2400, att=0.1, rel=0.8), 21.0, 1.0, rev=0.45)
    m.add(pad(C["A"], 2.0, cutoff=2800, att=0.1, rel=0.9), 23.0, 1.0, rev=0.45)
    arps(m, 21.0, 23.0, C["Gmaj7"], gain=0.16)
    arps(m, 23.0, 25.0, C["A"], gain=0.17, step=0.1875)
    for b in range(5):
        m.add(kick(0.55), 21.0 + b * 0.75, 0.55, rev=0.05)
    for k in range(7):
        m.add(thud(), 21.0 + 0.35 + k * 0.1 + 0.35, 0.18, pan=(k - 3) / 4, rev=0.2)
    for k in range(5):
        m.add(tick(2200 + k * 220), 21.0 + 1.45 + k * 0.08, 0.06, pan=(k - 2) / 3, rev=0.2)
    m.add(riser(1.6, 300, 8000), 23.4, 0.16, rev=0.3)
    # 25–29 son kadr
    m.add(whoosh_st(0.9, 1, lo=200, hi=4200), 24.95, 0.45, rev=0.2)
    m.add(boom(3.0, 90, 34), 25.72, 0.9, rev=0.4)
    m.add(pad(C["Dmaj9"], 2.4, cutoff=2600, att=0.05, rel=1.6), 25.7, 1.15, rev=0.55)
    m.add(pluck(note("D2"), 3.0, 0.5), 25.72, 0.7, rev=0.3)
    m.add(shimmer(1.6, 36, seed=5), 26.55, 0.5, rev=0.7)
    for k, n in enumerate(["D5", "A4", "F#5", "C#5", "E5"]):
        m.add(pluck(note(n), 2.0), 26.3 + k * 0.19, 0.12, pan=(k - 2) / 3, rev=0.7)
    return m.render()


def build_m4():
    D = 36.0
    m = Mix(D)
    TT = dict(c1=3.4, c2=8.6, c3=13.8, c4=19.0, c5=24.6, q=30.0)
    # titr
    m.add(pad(chord(["D2", "A2", "E3"]), 3.4, cutoff=700, att=1.2, rel=0.6), 0, 0.9, rev=0.4)
    m.add(boom(2.2, 70, 34), 0.45, 0.45, rev=0.35)
    m.add(whoosh(0.8, 800, 7000, 0.5), 1.15, 0.12, pan=0.2, rev=0.4)
    for k, n in enumerate(["A4", "D5", "E5"]):
        m.add(pluck(note(n), 2.0), 0.5 + k * 0.4, 0.12, pan=(k - 1) / 2, rev=0.7)
    wipes = [(TT["c1"], 1), (TT["c2"], -1), (TT["c3"], 1), (TT["c4"], -1), (TT["c5"], 1), (TT["q"], -1)]
    for t0, d in wipes:
        m.add(whoosh_st(0.9, d, lo=220, hi=4400), t0 - 0.05, 0.42, rev=0.2)
    # musiqi: hər fəsil bir akkord, yumşaq arpecio
    sect = [("c1", "c2", "Bm9"), ("c2", "c3", "Gmaj7"), ("c3", "c4", "Em9"), ("c4", "c5", "A6sus"), ("c5", "q", "Dmaj7/F#")]
    for a, b, c in sect:
        t0, t1 = TT[a], TT[b]
        m.add(pad(C[c], t1 - t0, cutoff=2000, att=0.15, rel=1.0), t0, 1.0, rev=0.5)
        m.add(pluck(C[c][0] / 2, 2.6, 0.6), t0, 0.45, rev=0.2)
        arps(m, t0 + 0.1, t1, C[c], gain=0.13, octave=2)
        tb = t0
        while tb < t1 - 0.1:
            m.add(kick(0.4), tb, 0.45, rev=0.05)
            tb += 1.5
    # 01 xammal — parıltılar
    m.add(shimmer(5.0, 70, 1800, 9000, seed=21), TT["c1"] + 0.2, 0.3, rev=0.6)
    m.add(riser(2.8, 200, 3000), TT["c1"] + 2.4, 0.1, rev=0.4)
    # 02 qarışdırma — burulğan
    m.add(noise_bed(5.2, 150, 900, 0.8, 0.6, lfo=1.6, lfo_depth=0.6), TT["c2"], 0.24, rev=0.2)
    m.add(noise_bed(5.2, 1500, 4000, 1.5, 0.6, lfo=3.3, lfo_depth=0.8), TT["c2"], 0.035, pan=0.3, rev=0.3)
    # 03 keyfiyyət — skaner, işarələr
    t = tt(N(1.7))
    scan = np.sin(2 * np.pi * 180 * t) * 0.5 + np.sin(2 * np.pi * 360.5 * t) * 0.25
    scan *= np.sin(np.pi * t / 1.7) ** 2
    m.add(lp(scan, 1200), TT["c3"] + 0.9, 0.12, rev=0.2)
    for k in range(4):
        m.add(tick(2000), TT["c3"] + 1.0 + k * 0.35, 0.05, pan=0.4, rev=0.2)
        m.add(tick(3100), TT["c3"] + 1.0 + k * 0.35 + 1.15, 0.12, pan=0.45, rev=0.3)
    m.add(thud(), TT["c3"] + 3.4, 0.35, rev=0.3)
    m.add(shimmer(0.8, 14, seed=31), TT["c3"] + 3.45, 0.25, rev=0.6)
    # 04 qablaşdırma — axın və konveyer
    m.add(noise_bed(2.1, 300, 2600, 0.15, 0.35, lfo=11, lfo_depth=0.35), TT["c4"] + 0.15, 0.15, rev=0.3)
    m.add(noise_bed(2.0, 80, 400, 0.15, 0.35, lfo=6, lfo_depth=0.5), TT["c4"] + 0.2, 0.25, rev=0.2)
    t = tt(N(3.3))
    motor = (np.sin(2 * np.pi * 62 * t) + 0.5 * np.sin(2 * np.pi * 124 * t)) * np.minimum(1, t / 0.9) * np.clip((3.3 - t) / 0.4, 0, 1)
    m.add(lp(motor, 500), TT["c4"] + 2.3, 0.12, rev=0.1)
    for k in range(6):
        m.add(tick(1400), TT["c4"] + 2.6 + k * 0.5, 0.05, pan=-0.3, rev=0.2)
    # 05 ev — valik, rəng seçimi
    for k in range(4):
        m.add(noise_bed(0.8, 500, 3500, 0.2, 0.3), TT["c5"] + 0.2 + k * 0.32, 0.18, pan=-0.75 + k * 0.5, rev=0.25)
    m.add(tick(2600), TT["c5"] + 2.55, 0.1, pan=0.6)
    for t0 in (3.2, 4.2):
        m.add(tick(3000), TT["c5"] + t0 - 0.02, 0.12, pan=0.6)
        m.add(whoosh_st(0.75, -1, lo=300, hi=3000, peak=0.4), TT["c5"] + t0, 0.25, rev=0.3)
    # sitat + loqo
    m.add(pad(C["Gmaj7"], 3.2, cutoff=1800, att=0.3, rel=1.0), TT["q"], 1.0, rev=0.55)
    for k, n in enumerate(["B4", "D5", "F#5", "A5"]):
        m.add(pluck(note(n), 2.2), TT["q"] + 0.35 + k * 0.45, 0.11, pan=(k - 1.5) / 2, rev=0.7)
    lt = TT["q"] + 3.55
    m.add(whoosh_st(0.8, 1, lo=250, hi=4000), lt - 0.45, 0.35, rev=0.25)
    m.add(boom(3.0, 90, 34), lt, 0.9, rev=0.4)
    m.add(pad(C["Dmaj9"], 1.8, cutoff=2600, att=0.05, rel=1.4), lt, 1.15, rev=0.55)
    m.add(pluck(note("D2"), 2.6, 0.5), lt, 0.7, rev=0.3)
    m.add(shimmer(1.5, 34, seed=6), lt + 0.85, 0.45, rev=0.7)
    return m.render()


def save(path, x):
    x16 = (np.clip(x, -1, 1) * 32767).astype(np.int16).T.copy()
    with wave.open(path, "wb") as w:
        w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR)
        w.writeframes(x16.tobytes())
    rms = 20 * np.log10(np.sqrt((x ** 2).mean()) + 1e-9)
    print(path, f"{x.shape[1] / SR:.2f}s", f"peak {20 * np.log10(np.abs(x).max()):.1f} dBFS", f"rms {rms:.1f} dBFS")


if __name__ == "__main__":
    which, out = sys.argv[1], sys.argv[2]
    save(out, {"a1": build_a1, "m4": build_m4}[which]())
