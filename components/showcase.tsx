"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useRef, useState } from "react";
import { COUNT, PRODUCTS, SLOTS, mod } from "@/lib/products";

const Scene = dynamic(() => import("./scene"), { ssr: false });

const NAV = ["Flavours", "Story", "Shop"];

function Chevron({ dir }: { dir: "left" | "right" }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {dir === "left" ? <path d="M15 5l-7 7 7 7" /> : <path d="M9 5l7 7-7 7" />}
    </svg>
  );
}

export default function Showcase() {
  const [index, setIndex] = useState(0);
  const [dir, setDir] = useState<1 | -1>(1);
  const [ready, setReady] = useState(false);
  const [cart, setCart] = useState(0);

  const indexRef = useRef(index);
  const lastTrigger = useRef(0);
  const lastWheel = useRef(0);
  const dragStart = useRef<number | null>(null);

  useEffect(() => {
    indexRef.current = index;
  }, [index]);

  const active = mod(index, COUNT);
  const p = PRODUCTS[active];

  /** move the wheel by `d` slots */
  const move = useCallback((d: number) => {
    if (d === 0) return;
    setDir(d > 0 ? 1 : -1);
    setIndex((i) => i + d);
  }, []);

  /** click on a can in the 3D scene */
  const pick = useCallback(
    (slot: number) => {
      const d = mod(slot - indexRef.current + SLOTS / 2, SLOTS) - SLOTS / 2;
      move(d);
    },
    [move],
  );

  /** jump to a product with the shortest path around the wheel */
  const goTo = useCallback(
    (target: number) => {
      const d =
        mod(target - mod(indexRef.current, COUNT) + COUNT / 2, COUNT) -
        COUNT / 2;
      move(d);
    },
    [move],
  );

  /* wheel / keyboard / drag input */
  useEffect(() => {
    if (!ready) return;

    const step = (d: number) => {
      const now = performance.now();
      if (now - lastTrigger.current < 650) return;
      lastTrigger.current = now;
      move(d);
    };

    const onWheel = (e: WheelEvent) => {
      const now = performance.now();
      const gap = now - lastWheel.current;
      lastWheel.current = now;
      // ignore trackpad inertia that keeps streaming after a step
      if (gap < 120 && now - lastTrigger.current < 1200) return;
      const delta =
        Math.abs(e.deltaY) > Math.abs(e.deltaX) ? e.deltaY : e.deltaX;
      if (Math.abs(delta) < 8) return;
      step(delta > 0 ? 1 : -1);
    };

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" || e.key === "ArrowDown") step(1);
      if (e.key === "ArrowLeft" || e.key === "ArrowUp") step(-1);
    };

    const onDown = (e: PointerEvent) => {
      if ((e.target as HTMLElement).closest("button, a")) return;
      dragStart.current = e.clientX;
    };
    const onUp = (e: PointerEvent) => {
      if (dragStart.current === null) return;
      const dx = e.clientX - dragStart.current;
      dragStart.current = null;
      if (Math.abs(dx) > 70) step(dx < 0 ? 1 : -1);
    };

    window.addEventListener("wheel", onWheel, { passive: true });
    window.addEventListener("keydown", onKey);
    window.addEventListener("pointerdown", onDown);
    window.addEventListener("pointerup", onUp);
    return () => {
      window.removeEventListener("wheel", onWheel);
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("pointerdown", onDown);
      window.removeEventListener("pointerup", onUp);
    };
  }, [ready, move]);

  const from = dir > 0 ? "110%" : "-110%";
  const tilt = dir > 0 ? "7deg" : "-7deg";
  const fadeFrom = dir > 0 ? "22px" : "-22px";
  const num = String(active + 1).padStart(2, "0");

  return (
    <main
      className="fixed inset-0 overflow-hidden select-none transition-colors duration-700 touch-none"
      style={{ backgroundColor: p.bg }}
    >
      {/* light, grain & vignette */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_75%_60%_at_50%_30%,rgba(255,255,255,0.95),rgba(255,255,255,0)_70%)]" />
      <div className="grain pointer-events-none absolute inset-0 opacity-[0.07] mix-blend-multiply" />

      {/* giant word behind the hero can */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-[14vh] flex justify-center overflow-hidden px-4 md:top-[17vh] lg:[mask-image:linear-gradient(90deg,transparent_12%,black_30%,black_70%,transparent_88%)]"
      >
        <h2
          key={p.id}
          className="font-display whitespace-nowrap py-[1vw] text-[clamp(4.5rem,15vw,18rem)] leading-[0.9] font-black tracking-tighter uppercase transition-colors duration-700"
          style={
            {
              color: p.accent,
              opacity: 0.55,
              "--from": from,
              "--tilt": tilt,
            } as React.CSSProperties
          }
        >
          {[...p.word].map((ch, i) => (
            <span
              key={i}
              className="anim-rise"
              style={{ animationDelay: `${i * 45}ms` }}
            >
              {ch === " " ? "\u00a0" : ch}
            </span>
          ))}
        </h2>
      </div>

      {/* 3D scene (loads on the client only) */}
      <Scene index={index} onPick={pick} onReady={() => setReady(true)} />

      {/* UI */}
      <div
        className={`pointer-events-none absolute inset-0 z-10 transition-all duration-1000 ease-out ${
          ready ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"
        }`}
      >
        {/* header */}
        <header className="pointer-events-auto absolute inset-x-0 top-0 flex items-center justify-between px-5 py-5 md:px-[4vw] md:py-7">
          <a
            href="#"
            className="font-display text-2xl font-black tracking-tight"
          >
            <span
              style={{ color: p.accent }}
              className="transition-colors duration-700"
            >
              FIZZ
            </span>
            ·LAB
          </a>

          <nav className="hidden items-center gap-10 text-sm font-medium md:flex">
            {NAV.map((item) => (
              <a
                key={item}
                href="#"
                className="relative opacity-70 transition-opacity after:absolute after:-bottom-1 after:left-0 after:h-px after:w-0 after:bg-current after:transition-all hover:opacity-100 hover:after:w-full"
              >
                {item}
              </a>
            ))}
          </nav>

          <button
            type="button"
            className="flex items-center gap-2 rounded-full border border-neutral-900/15 bg-white/60 py-2 pr-2 pl-5 text-sm font-medium backdrop-blur transition hover:bg-white"
          >
            Cart
            <span
              key={cart}
              className={`grid h-7 min-w-7 place-items-center rounded-full px-2 text-xs font-semibold text-white transition-colors duration-700 ${
                cart ? "anim-pop" : ""
              }`}
              style={{ backgroundColor: p.accent }}
            >
              {cart}
            </span>
          </button>
        </header>

        {/* left column – description */}
        <section
          key={`info-${p.id}`}
          className="anim-fade absolute top-[16vh] left-[4vw] hidden w-[min(16vw,220px)] lg:block"
          style={{ "--fy": fadeFrom } as React.CSSProperties}
        >
          <p
            className="mb-2.5 flex items-center gap-2 text-[10px] font-semibold tracking-[0.22em] uppercase"
            style={{ color: p.accent }}
          >
            <span className="font-display text-lg font-black tracking-normal">
              {num}
            </span>
            <span className="h-px w-6 bg-current" />
            {p.eyebrow}
          </p>
          <h3 className="font-display text-2xl leading-tight font-extrabold">
            {p.name}
          </h3>
          <p className="mt-2.5 text-xs leading-relaxed text-neutral-900/65">
            {p.description}
          </p>
          <ul className="mt-4 flex flex-wrap gap-1.5">
            {p.tags.map((tag) => (
              <li
                key={tag}
                className="rounded-full border border-neutral-900/15 bg-white/55 px-2.5 py-1 text-[10px] font-medium backdrop-blur"
              >
                {tag}
              </li>
            ))}
          </ul>
        </section>

        {/* right column – price */}
        <section
          key={`buy-${p.id}`}
          className="anim-fade pointer-events-auto absolute top-[16vh] right-[4vw] hidden w-[min(15vw,200px)] text-right lg:block"
          style={{ "--fy": fadeFrom } as React.CSSProperties}
        >
          <p className="text-[10px] font-semibold tracking-[0.22em] text-neutral-900/50 uppercase">
            Per can
          </p>
          <p className="font-display mt-0.5 flex items-start justify-end gap-0.5 text-4xl font-black tracking-tight">
            <span className="mt-1.5 text-base font-bold">$</span>
            {p.price}
          </p>
          <dl className="mt-4 grid grid-cols-3 gap-1.5 text-left">
            {[
              ["Size", "355 ml"],
              ["Energy", `${p.kcal} kcal`],
              ["Serve", "4 °C"],
            ].map(([k, v]) => (
              <div
                key={k}
                className="rounded-xl border border-neutral-900/10 bg-white/55 px-2 py-1.5 backdrop-blur"
              >
                <dt className="text-[8px] font-medium tracking-widest text-neutral-900/45 uppercase">
                  {k}
                </dt>
                <dd className="mt-0.5 text-[11px] font-semibold">{v}</dd>
              </div>
            ))}
          </dl>
          <button
            type="button"
            onClick={() => setCart((c) => c + 1)}
            className="mt-3 w-full rounded-full py-2 text-xs font-semibold text-white shadow-[0_10px_22px_-12px_rgba(0,0,0,0.5)] transition-[transform,background-color] duration-700 hover:scale-[1.03] active:scale-95"
            style={{ backgroundColor: p.accent }}
          >
            Add to cart
          </button>
        </section>

        {/* bottom – controls (sit on the coloured wheel, so white) */}
        <footer className="pointer-events-auto absolute inset-x-0 bottom-0 flex flex-col items-center gap-4 px-5 pb-5 text-white md:pb-7">
          {/* compact buy bar for small screens */}
          <div className="flex w-full max-w-sm items-center justify-between gap-3 rounded-full bg-black/25 py-2 pr-2 pl-5 backdrop-blur-md lg:hidden">
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">{p.name}</p>
              <p className="text-xs text-white/70">${p.price} · 355 ml</p>
            </div>
            <button
              type="button"
              onClick={() => setCart((c) => c + 1)}
              className="rounded-full bg-white px-4 py-2 text-xs font-semibold text-neutral-900 active:scale-95"
            >
              Add
            </button>
          </div>

          <div className="flex items-center gap-5">
            <button
              type="button"
              aria-label="Previous flavour"
              onClick={() => move(-1)}
              className="grid h-11 w-11 place-items-center rounded-full border border-white/50 transition hover:bg-white hover:text-neutral-900 active:scale-90"
            >
              <Chevron dir="left" />
            </button>

            <div className="flex items-center gap-2.5">
              {PRODUCTS.map((item, i) => (
                <button
                  key={item.id}
                  type="button"
                  aria-label={`Show ${item.name}`}
                  onClick={() => goTo(i)}
                  className={`h-2 rounded-full bg-white transition-all duration-500 ${
                    i === active
                      ? "w-8 opacity-100"
                      : "w-2 opacity-45 hover:opacity-80"
                  }`}
                />
              ))}
            </div>

            <button
              type="button"
              aria-label="Next flavour"
              onClick={() => move(1)}
              className="grid h-11 w-11 place-items-center rounded-full border border-white/50 transition hover:bg-white hover:text-neutral-900 active:scale-90"
            >
              <Chevron dir="right" />
            </button>
          </div>

          <div className="flex flex-col items-center gap-2">
            <span className="relative hidden h-8 w-[3px] overflow-hidden rounded-full bg-white/30 md:block">
              <span className="anim-scroll-hint absolute inset-x-0 h-3 rounded-full bg-white" />
            </span>
            <p className="text-[10px] font-semibold tracking-[0.35em] uppercase">
              Scroll to discover
            </p>
            <p className="hidden text-[9px] tracking-wider text-white/45 md:block">
              3D model “Soda Cans – Classic 355ml” by Mark Peters · CC BY-NC 4.0
            </p>
          </div>
        </footer>
      </div>
    </main>
  );
}
