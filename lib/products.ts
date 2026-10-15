export type Product = {
  id: string;
  /** Normalised node name inside the GLB (lowercase, alphanumerics only). */
  node: string;
  name: string;
  /** Giant background word. */
  word: string;
  eyebrow: string;
  description: string;
  tags: string[];
  price: string;
  kcal: string;
  /** Wheel disc colour. */
  disc: string;
  /** Page background colour. */
  bg: string;
  /** UI accent colour. */
  accent: string;
  /** small yaw (radians) so the logo faces the camera when the can is at rest */
  yaw: number;
};

export const PRODUCTS: Product[] = [
  {
    id: "classic",
    node: "cocacola001",
    name: "Coca-Cola Classic",
    word: "Classic",
    eyebrow: "The original taste",
    description:
      "Crisp caramel, a whisper of vanilla and that unmistakable sparkle. Served ice cold, exactly the way it should be.",
    tags: ["355 ml", "140 kcal", "Ice cold"],
    price: "1.99",
    kcal: "140",
    disc: "#e11d2b",
    bg: "#f6ece4",
    accent: "#e11d2b",
    yaw: 0,
  },
  {
    id: "zero",
    node: "cocacolazerosugar",
    name: "Coca-Cola Zero Sugar",
    word: "Zero",
    eyebrow: "Real taste, zero sugar",
    description:
      "All of the bold flavour, none of the sugar. A sleek, black-can take on the classic that never lets the fizz down.",
    tags: ["355 ml", "0 kcal", "No sugar"],
    price: "1.99",
    kcal: "0",
    disc: "#17171b",
    bg: "#ebe8e6",
    accent: "#e11d2b",
    yaw: 0,
  },
  {
    id: "drpepper",
    node: "drpepper",
    name: "Dr Pepper",
    word: "Dr Pepper",
    eyebrow: "23 flavours, one sip",
    description:
      "A bold blend of 23 flavours — cherry, vanilla, spice and a little mystery. Impossible to describe, easy to love.",
    tags: ["355 ml", "150 kcal", "23 flavours"],
    price: "2.19",
    kcal: "150",
    disc: "#8a1236",
    bg: "#f4e5e8",
    accent: "#9c1240",
    yaw: 0,
  },
  {
    id: "pepsi",
    node: "pepsi001",
    name: "Pepsi",
    word: "Pepsi",
    eyebrow: "Live for now",
    description:
      "A citrus-kissed cola with a sharper, brighter bite. Bubbly, electric and built for the moments that matter.",
    tags: ["355 ml", "150 kcal", "Bold & bright"],
    price: "1.89",
    kcal: "150",
    disc: "#0a50c8",
    bg: "#e5eefb",
    accent: "#0a50c8",
    yaw: 0,
  },
  {
    id: "pepsi-zero",
    node: "pepsizerosugar",
    name: "Pepsi Zero Sugar",
    word: "Max",
    eyebrow: "Maximum taste, zero sugar",
    description:
      "Deep, dark and unapologetically bold. Zero sugar and zero compromise, with a punchy finish that keeps you coming back.",
    tags: ["355 ml", "0 kcal", "No sugar"],
    price: "1.89",
    kcal: "0",
    disc: "#000",
    bg: "#e3e7f0",
    accent: "#000",
    yaw: 0,
  },
  {
    id: "sprite",
    node: "sprite001",
    name: "Sprite",
    word: "Sprite",
    eyebrow: "Lemon-lime, clear as ice",
    description:
      "Sparkling lemon-lime that cuts through the heat. Clean, zesty and unbelievably refreshing from the first pop.",
    tags: ["355 ml", "140 kcal", "Caffeine free"],
    price: "1.79",
    kcal: "140",
    disc: "#0d9a47",
    bg: "#e5f5e3",
    accent: "#0d9a47",
    yaw: -0.15,
  },
];

export const COUNT = PRODUCTS.length;
/** Number of slots around the wheel (cans repeat, so the wheel loops forever). */
export const SLOTS = COUNT * 2;
/** Angle between two neighbouring products on the wheel, in radians. */
export const STEP = (Math.PI * 2) / SLOTS;

export const mod = (n: number, m: number) => ((n % m) + m) % m;
