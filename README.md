# FIZZ·LAB — 3D Soda Can Slider

An interactive product showcase of classic 355 ml soda cans. Six flavours sit on a looping 3D wheel: scroll, drag, or use the arrow keys and the wheel springs to the next can, while the page colour, copy, and price follow the active flavour.

**Live demo:** [https://3d-soda-slider.vercel.app/](https://3d-soda-slider.vercel.app/)

## Flavours

| Flavour | Price | Energy |
| --- | --- | --- |
| Coca-Cola Classic | $1.99 | 140 kcal |
| Coca-Cola Zero Sugar | $1.99 | 0 kcal |
| Dr Pepper | $2.19 | 150 kcal |
| Pepsi | $1.89 | 150 kcal |
| Pepsi Zero Sugar | $1.89 | 0 kcal |
| Sprite | $1.79 | 140 kcal |

## How to use it

- Scroll or swipe to step around the wheel
- Drag left or right on the scene
- Arrow keys move one flavour at a time
- Click a can, or a dot under the wheel, to jump to that flavour
- **Add to cart** increments the cart count in the header

## Stack

- [Next.js](https://nextjs.org) (App Router)
- React 19
- [React Three Fiber](https://r3f.docs.pmnd.rs/) and [drei](https://github.com/pmndrs/drei)
- [three.js](https://threejs.org)
- Tailwind CSS 4

The cans come from a single GLB. Each flavour is pulled out of that file, centred, and placed on a shared wheel. Wheel motion is a lightly under-damped spring, so the cans overshoot a little and settle.

## Getting started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

```bash
npm run build   # production build
npm run start   # serve the production build
npm run lint
```

## Project layout

```
app/                Next.js app shell and page
components/
  showcase.tsx      UI: copy, cart, dots, scroll / drag / keyboard
  scene.tsx         React Three Fiber wheel, lighting, and can meshes
lib/products.ts     Flavour data, colours, and wheel maths
public/models/      Soda can GLB
```

## Credits

3D model “Soda Cans – Classic 355ml” by Mark Peters, used under [CC BY-NC 4.0](https://creativecommons.org/licenses/by-nc/4.0/).
