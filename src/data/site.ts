// Facts of the client: only from veon/client.json (ids in comments). Nothing here is invented.

export const TELEGRAM_BOT = "https://t.me/autokladuabot"; // company.contacts.messengers[0]

export interface Phone { display: string; href: string; note?: string }
export const phones: Phone[] = [
  { display: "(063) 377-07-47", href: "tel:+380633770747" }, // B-F010
  { display: "(044) 502-25-09", href: "tel:+380445022509", note: "багатоканальний" }, // B-F010
];
export const mainPhone = phones[0]!;

export const email = "sales@autoklad.ua"; // B-F010

export const hours = [
  { days: "Пн–Пт", time: "10:00–19:00" },
  { days: "Сб", time: "10:00–15:00" },
  { days: "Нд", time: "вихідний" },
]; // B-F011

const mapUrl = (q: string) => `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`;

export interface Store { district: string; street: string; map: string; postal?: string }
export const stores: Store[] = [
  { district: "Голосіїв", street: "вул. Васильківська, 16", map: mapUrl("Київ, вулиця Васильківська, 16") },
  { district: "Харківський", street: "вул. Драгоманова, 1д", map: mapUrl("Київ, вулиця Драгоманова, 1Д") },
]; // company.contacts.addresses

// 24 brands from the homepage block «Запчастини на авто» (B-F018, audit/screens/ua-desktop-s04.png, -s05.png)
export const brands = [
  "Audi", "BMW", "Chevrolet", "Citroen", "Dacia", "Daewoo", "Fiat", "Ford",
  "Honda", "Hyundai", "Kia", "Mazda", "Mercedes", "Mitsubishi", "Nissan", "Opel",
  "Peugeot", "Renault", "Seat", "Skoda", "Subaru", "Toyota", "Volvo", "Volkswagen",
];

// 12 catalogue sections (company.products_services[0]); images: client's own photos from audit/screens
export const categories = [
  { name: "Оливи, мастила", img: "olyvy" },
  { name: "Підвіска", img: "pidviska" },
  { name: "Гальма", img: "halma" },
  { name: "Двигун", img: "dvyhun" },
  { name: "Фільтри", img: "filtry" },
  { name: "Електрика", img: "elektryka" },
  { name: "Рульове", img: "rulove" },
  { name: "Паливна", img: "palyvna" },
  { name: "Трансмісія", img: "transmisiia" },
  { name: "Кузов, оптика", img: "kuzov" },
  { name: "Охолодження", img: "okholodzhennia" },
  { name: "Товари для ТО", img: "to" },
];

export const socials = [
  { name: "Facebook", href: "https://www.facebook.com/autoklad.ua/" }, // socials[0], confirmed
  { name: "Instagram", href: "https://www.instagram.com/autoklad.ua/" }, // socials[1], confirmed
];

export const SOON = "Розділ у розробці";
