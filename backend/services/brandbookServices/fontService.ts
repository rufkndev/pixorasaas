export interface Font {
  name: string;
  type: string;
  url: string;
  category: string;
  family: string;
  weights: string[];
  googleFontUrl?: string;
}

// База данных шрифтов по стилям и сферам бизнеса
const FONT_DATABASE = {
  "Современный": {
    variants: [
      // Технологии и стартапы
      {
        main: ["Inter", "Manrope"],
        secondary: ["PT Root UI", "Fira Sans"],
        businessType: ["технологии", "стартап", "IT", "софт"]
      },
      {
        main: ["Rubik", "Ubuntu"],
        secondary: ["IBM Plex Sans", "Montserrat"],
        businessType: ["разработка", "приложения", "цифровые услуги"]
      },
      {
        main: ["Nunito Sans", "Open Sans"],
        secondary: ["Work Sans", "Source Sans Pro"],
        businessType: ["веб", "интернет", "онлайн"]
      },
      // Финансы и консалтинг
      {
        main: ["Poppins", "Lato"],
        secondary: ["DM Sans", "Plus Jakarta Sans"],
        businessType: ["финансы", "консалтинг", "банк", "инвестиции"]
      },
      {
        main: ["Outfit", "Space Grotesk"],
        secondary: ["Epilogue", "Satoshi"],
        businessType: ["бизнес", "услуги", "маркетинг"]
      },
      // Здравоохранение и медицина
      {
        main: ["Lexend", "Public Sans"],
        secondary: ["Inter", "Nunito Sans"],
        businessType: ["медицина", "здравоохранение", "клиника", "больница"]
      }
    ],
  },
  "Классический": {
    variants: [
      // Юридические услуги
      {
        main: ["PT Serif", "Merriweather"],
        secondary: ["Libre Baskerville", "Tinos"],
        businessType: ["юриспруденция", "право", "адвокат", "нотариус"]
      },
      {
        main: ["Cormorant Garamond", "EB Garamond"],
        secondary: ["Old Standard TT", "Yeseva One"],
        businessType: ["консерватория", "музей", "культура", "искусство"]
      },
      // Недвижимость и архитектура
      {
        main: ["Playfair Display", "Crimson Text"],
        secondary: ["Lora", "Bitter"],
        businessType: ["недвижимость", "архитектура", "строительство"]
      },
      {
        main: ["Spectral", "Source Serif Pro"],
        secondary: ["Alegreya", "Vollkorn"],
        businessType: ["премиум", "люкс", "элитные услуги"]
      },
      // Образование
      {
        main: ["Noto Serif", "Roboto Slab"],
        secondary: ["Merriweather", "PT Serif"],
        businessType: ["образование", "университет", "школа", "курсы"]
      }
    ],
  },
  "Креативный": {
    variants: [
      // Дизайн и креатив
      {
        main: ["Oswald", "Archivo Black"],
        secondary: ["Russo One", "Exo 2"],
        businessType: ["дизайн", "реклама", "креатив", "студия"]
      },
      {
        main: ["Comfortaa", "Righteous"],
        secondary: ["Orbitron", "Ubuntu"],
        businessType: ["искусство", "творчество", "галерея"]
      },
      // Мода и стиль
      {
        main: ["Josefin Sans", "Quicksand"],
        secondary: ["Raleway", "Poppins"],
        businessType: ["мода", "стиль", "красота", "салон"]
      },
      {
        main: ["Bebas Neue", "Oswald"],
        secondary: ["Montserrat", "Open Sans"],
        businessType: ["фитнес", "спорт", "активность"]
      },
      // Развлечения
      {
        main: ["Fredoka", "Nunito"],
        secondary: ["Varela Round", "Rubik"],
        businessType: ["развлечения", "игры", "досуг", "кино"]
      }
    ],
  },
  "Профессиональный": {
    variants: [
      // Корпоративные услуги
      {
        main: ["Roboto", "Noto Sans"],
        secondary: ["IBM Plex Sans", "Open Sans"],
        businessType: ["корпорация", "холдинг", "enterprise"]
      },
      {
        main: ["Source Sans Pro", "PT Root UI"],
        secondary: ["Manrope", "Fira Sans"],
        businessType: ["b2b", "промышленность", "производство"]
      },
      // Логистика и транспорт
      {
        main: ["Barlow", "Titillium Web"],
        secondary: ["Oxygen", "Karla"],
        businessType: ["логистика", "транспорт", "доставка", "грузоперевозки"]
      },
      {
        main: ["Mukti", "Hind"],
        secondary: ["Noto Sans", "Open Sans"],
        businessType: ["международный", "глобальный", "экспорт"]
      },
      // Страхование и банки
      {
        main: ["Assistant", "Work Sans"],
        secondary: ["Inter", "Source Sans Pro"],
        businessType: ["страхование", "банк", "кредит", "финансы"]
      }
    ],
  },
  "Игривый": {
    variants: [
      // Детские услуги
      {
        main: ["Baloo 2", "Fredoka"],
        secondary: ["Comic Neue", "Ubuntu"],
        businessType: ["дети", "детский сад", "игрушки", "развитие"]
      },
      {
        main: ["Pacifico", "Lobster"],
        secondary: ["Caveat", "Comfortaa"],
        businessType: ["праздники", "аниматоры", "торжества"]
      },
      // Еда и напитки
      {
        main: ["Kalam", "Architects Daughter"],
        secondary: ["Indie Flower", "Amatic SC"],
        businessType: ["кафе", "ресторан", "еда", "кулинария"]
      },
      {
        main: ["Bungee", "Lilita One"],
        secondary: ["Fredoka", "Nunito"],
        businessType: ["фастфуд", "снеки", "напитки"]
      },
      // Хобби и увлечения
      {
        main: ["Chewy", "Bangers"],
        secondary: ["Modak", "Bungee Shade"],
        businessType: ["хобби", "рукоделие", "творческие мастерские"]
      }
    ],
  },
  "Элегантный": {
    variants: [
      // Свадебные услуги
      {
        main: ["Dancing Script", "Great Vibes"],
        secondary: ["Pinyon Script", "Alex Brush"],
        businessType: ["свадьба", "торжество", "праздник", "событие"]
      },
      {
        main: ["Playfair Display", "Crimson Text"],
        secondary: ["Cormorant Garamond", "EB Garamond"],
        businessType: ["флористика", "декор", "оформление"]
      },
      // Красота и косметика
      {
        main: ["Abril Fatface", "Playfair Display"],
        secondary: ["Lato", "Montserrat"],
        businessType: ["косметика", "парфюмерия", "красота", "спа"]
      },
      {
        main: ["Bodoni Moda", "Didot"],
        secondary: ["Lora", "Source Serif Pro"],
        businessType: ["ювелирные", "часы", "аксессуары"]
      }
    ],
  },
  "Техничный": {
    variants: [
      // Инженерия и технологии
      {
        main: ["JetBrains Mono", "Source Code Pro"],
        secondary: ["IBM Plex Mono", "Fira Code"],
        businessType: ["разработка", "программирование", "IT", "софт"]
      },
      {
        main: ["Rajdhani", "Orbitron"],
        secondary: ["Exo 2", "Saira"],
        businessType: ["технологии", "робототехника", "автоматизация"]
      },
      // Наука и исследования
      {
        main: ["IBM Plex Sans", "Noto Sans"],
        secondary: ["Inter", "Work Sans"],
        businessType: ["наука", "исследования", "лаборатория"]
      },
      {
        main: ["Space Mono", "Overpass Mono"],
        secondary: ["Fira Sans", "Ubuntu"],
        businessType: ["инженерия", "промышленность", "производство"]
      }
    ],
  },
};

// Расширенная информация о шрифтах для Google Fonts
const FONT_INFO = {
  // Существующие шрифты...
  "Inter": {
    family: "Inter",
    weights: ["300", "400", "500", "600", "700", "800", "900"],
    googleFontUrl: "https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap",
    category: "sans-serif"
  },
  "Manrope": {
    family: "Manrope",
    weights: ["200", "300", "400", "500", "600", "700", "800"],
    googleFontUrl: "https://fonts.googleapis.com/css2?family=Manrope:wght@200;300;400;500;600;700;800&display=swap",
    category: "sans-serif"
  },
  "PT Root UI": {
    family: "PT Root UI",
    weights: ["400", "500", "700"],
    googleFontUrl: "https://fonts.googleapis.com/css2?family=PT+Root+UI:wght@400;500;700&display=swap",
    category: "sans-serif"
  },
  "Fira Sans": {
    family: "Fira Sans",
    weights: ["100", "200", "300", "400", "500", "600", "700", "800", "900"],
    googleFontUrl: "https://fonts.googleapis.com/css2?family=Fira+Sans:wght@100;200;300;400;500;600;700;800;900&display=swap",
    category: "sans-serif"
  },
  "Rubik": {
    family: "Rubik",
    weights: ["300", "400", "500", "600", "700", "800", "900"],
    googleFontUrl: "https://fonts.googleapis.com/css2?family=Rubik:wght@300;400;500;600;700;800;900&display=swap",
    category: "sans-serif"
  },
  "Ubuntu": {
    family: "Ubuntu",
    weights: ["300", "400", "500", "700"],
    googleFontUrl: "https://fonts.googleapis.com/css2?family=Ubuntu:wght@300;400;500;700&display=swap",
    category: "sans-serif"
  },
  "IBM Plex Sans": {
    family: "IBM Plex Sans",
    weights: ["100", "200", "300", "400", "500", "600", "700"],
    googleFontUrl: "https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@100;200;300;400;500;600;700&display=swap",
    category: "sans-serif"
  },
  "Montserrat": {
    family: "Montserrat",
    weights: ["100", "200", "300", "400", "500", "600", "700", "800", "900"],
    googleFontUrl: "https://fonts.googleapis.com/css2?family=Montserrat:wght@100;200;300;400;500;600;700;800;900&display=swap",
    category: "sans-serif"
  },
  "Nunito Sans": {
    family: "Nunito Sans",
    weights: ["200", "300", "400", "600", "700", "800", "900"],
    googleFontUrl: "https://fonts.googleapis.com/css2?family=Nunito+Sans:wght@200;300;400;600;700;800;900&display=swap",
    category: "sans-serif"
  },
  "Open Sans": {
    family: "Open Sans",
    weights: ["300", "400", "500", "600", "700", "800"],
    googleFontUrl: "https://fonts.googleapis.com/css2?family=Open+Sans:wght@300;400;500;600;700;800&display=swap",
    category: "sans-serif"
  },
  "Work Sans": {
    family: "Work Sans",
    weights: ["100", "200", "300", "400", "500", "600", "700", "800", "900"],
    googleFontUrl: "https://fonts.googleapis.com/css2?family=Work+Sans:wght@100;200;300;400;500;600;700;800;900&display=swap",
    category: "sans-serif"
  },
  "Source Sans Pro": {
    family: "Source Sans Pro",
    weights: ["200", "300", "400", "600", "700", "900"],
    googleFontUrl: "https://fonts.googleapis.com/css2?family=Source+Sans+Pro:wght@200;300;400;600;700;900&display=swap",
    category: "sans-serif"
  },
  "PT Serif": {
    family: "PT Serif",
    weights: ["400", "700"],
    googleFontUrl: "https://fonts.googleapis.com/css2?family=PT+Serif:wght@400;700&display=swap",
    category: "serif"
  },
  "Merriweather": {
    family: "Merriweather",
    weights: ["300", "400", "700", "900"],
    googleFontUrl: "https://fonts.googleapis.com/css2?family=Merriweather:wght@300;400;700;900&display=swap",
    category: "serif"
  },
  "Libre Baskerville": {
    family: "Libre Baskerville",
    weights: ["400", "700"],
    googleFontUrl: "https://fonts.googleapis.com/css2?family=Libre+Baskerville:wght@400;700&display=swap",
    category: "serif"
  },
  "Tinos": {
    family: "Tinos",
    weights: ["400", "700"],
    googleFontUrl: "https://fonts.googleapis.com/css2?family=Tinos:wght@400;700&display=swap",
    category: "serif"
  },
  "Cormorant Garamond": {
    family: "Cormorant Garamond",
    weights: ["300", "400", "500", "600", "700"],
    googleFontUrl: "https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@300;400;500;600;700&display=swap",
    category: "serif"
  },
  "EB Garamond": {
    family: "EB Garamond",
    weights: ["400", "500", "600", "700", "800"],
    googleFontUrl: "https://fonts.googleapis.com/css2?family=EB+Garamond:wght@400;500;600;700;800&display=swap",
    category: "serif"
  },
  "Old Standard TT": {
    family: "Old Standard TT",
    weights: ["400", "700"],
    googleFontUrl: "https://fonts.googleapis.com/css2?family=Old+Standard+TT:wght@400;700&display=swap",
    category: "serif"
  },
  "Yeseva One": {
    family: "Yeseva One",
    weights: ["400"],
    googleFontUrl: "https://fonts.googleapis.com/css2?family=Yeseva+One&display=swap",
    category: "serif"
  },
  "Oswald": {
    family: "Oswald",
    weights: ["200", "300", "400", "500", "600", "700"],
    googleFontUrl: "https://fonts.googleapis.com/css2?family=Oswald:wght@200;300;400;500;600;700&display=swap",
    category: "sans-serif"
  },
  "Archivo Black": {
    family: "Archivo Black",
    weights: ["400"],
    googleFontUrl: "https://fonts.googleapis.com/css2?family=Archivo+Black&display=swap",
    category: "sans-serif"
  },
  "Russo One": {
    family: "Russo One",
    weights: ["400"],
    googleFontUrl: "https://fonts.googleapis.com/css2?family=Russo+One&display=swap",
    category: "sans-serif"
  },
  "Exo 2": {
    family: "Exo 2",
    weights: ["100", "200", "300", "400", "500", "600", "700", "800", "900"],
    googleFontUrl: "https://fonts.googleapis.com/css2?family=Exo+2:wght@100;200;300;400;500;600;700;800;900&display=swap",
    category: "sans-serif"
  },
  "Comfortaa": {
    family: "Comfortaa",
    weights: ["300", "400", "500", "600", "700"],
    googleFontUrl: "https://fonts.googleapis.com/css2?family=Comfortaa:wght@300;400;500;600;700&display=swap",
    category: "sans-serif"
  },
  "Righteous": {
    family: "Righteous",
    weights: ["400"],
    googleFontUrl: "https://fonts.googleapis.com/css2?family=Righteous&display=swap",
    category: "sans-serif"
  },
  "Orbitron": {
    family: "Orbitron",
    weights: ["400", "500", "600", "700", "800", "900"],
    googleFontUrl: "https://fonts.googleapis.com/css2?family=Orbitron:wght@400;500;600;700;800;900&display=swap",
    category: "sans-serif"
  },
  "Roboto": {
    family: "Roboto",
    weights: ["100", "300", "400", "500", "700", "900"],
    googleFontUrl: "https://fonts.googleapis.com/css2?family=Roboto:wght@100;300;400;500;700;900&display=swap",
    category: "sans-serif"
  },
  "Noto Sans": {
    family: "Noto Sans",
    weights: ["100", "200", "300", "400", "500", "600", "700", "800", "900"],
    googleFontUrl: "https://fonts.googleapis.com/css2?family=Noto+Sans:wght@100;200;300;400;500;600;700;800;900&display=swap",
    category: "sans-serif"
  },
  "Baloo 2": {
    family: "Baloo 2",
    weights: ["400", "500", "600", "700", "800"],
    googleFontUrl: "https://fonts.googleapis.com/css2?family=Baloo+2:wght@400;500;600;700;800&display=swap",
    category: "sans-serif"
  },
  "Fredoka": {
    family: "Fredoka",
    weights: ["300", "400", "500", "600", "700"],
    googleFontUrl: "https://fonts.googleapis.com/css2?family=Fredoka:wght@300;400;500;600;700&display=swap",
    category: "sans-serif"
  },
  "Comic Neue": {
    family: "Comic Neue",
    weights: ["300", "400", "700"],
    googleFontUrl: "https://fonts.googleapis.com/css2?family=Comic+Neue:wght@300;400;700&display=swap",
    category: "handwriting"
  },
  "Pacifico": {
    family: "Pacifico",
    weights: ["400"],
    googleFontUrl: "https://fonts.googleapis.com/css2?family=Pacifico&display=swap",
    category: "handwriting"
  },
  "Lobster": {
    family: "Lobster",
    weights: ["400"],
    googleFontUrl: "https://fonts.googleapis.com/css2?family=Lobster&display=swap",
    category: "handwriting"
  },
  "Caveat": {
    family: "Caveat",
    weights: ["400", "500", "600", "700"],
    googleFontUrl: "https://fonts.googleapis.com/css2?family=Caveat:wght@400;500;600;700&display=swap",
    category: "handwriting"
  },
  
  // Новые шрифты для расширенной базы
  "Poppins": {
    family: "Poppins",
    weights: ["100", "200", "300", "400", "500", "600", "700", "800", "900"],
    googleFontUrl: "https://fonts.googleapis.com/css2?family=Poppins:wght@100;200;300;400;500;600;700;800;900&display=swap",
    category: "sans-serif"
  },
  "Lato": {
    family: "Lato",
    weights: ["100", "300", "400", "700", "900"],
    googleFontUrl: "https://fonts.googleapis.com/css2?family=Lato:wght@100;300;400;700;900&display=swap",
    category: "sans-serif"
  },
  "DM Sans": {
    family: "DM Sans",
    weights: ["400", "500", "700"],
    googleFontUrl: "https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;700&display=swap",
    category: "sans-serif"
  },
  "Plus Jakarta Sans": {
    family: "Plus Jakarta Sans",
    weights: ["200", "300", "400", "500", "600", "700", "800"],
    googleFontUrl: "https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@200;300;400;500;600;700;800&display=swap",
    category: "sans-serif"
  },
  "Outfit": {
    family: "Outfit",
    weights: ["100", "200", "300", "400", "500", "600", "700", "800", "900"],
    googleFontUrl: "https://fonts.googleapis.com/css2?family=Outfit:wght@100;200;300;400;500;600;700;800;900&display=swap",
    category: "sans-serif"
  },
  "Space Grotesk": {
    family: "Space Grotesk",
    weights: ["300", "400", "500", "600", "700"],
    googleFontUrl: "https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;500;600;700&display=swap",
    category: "sans-serif"
  },
  "Epilogue": {
    family: "Epilogue",
    weights: ["100", "200", "300", "400", "500", "600", "700", "800", "900"],
    googleFontUrl: "https://fonts.googleapis.com/css2?family=Epilogue:wght@100;200;300;400;500;600;700;800;900&display=swap",
    category: "sans-serif"
  },
  "Satoshi": {
    family: "Satoshi",
    weights: ["300", "400", "500", "600", "700", "800", "900"],
    googleFontUrl: "https://fonts.googleapis.com/css2?family=Satoshi:wght@300;400;500;600;700;800;900&display=swap",
    category: "sans-serif"
  },
  "Lexend": {
    family: "Lexend",
    weights: ["100", "200", "300", "400", "500", "600", "700", "800", "900"],
    googleFontUrl: "https://fonts.googleapis.com/css2?family=Lexend:wght@100;200;300;400;500;600;700;800;900&display=swap",
    category: "sans-serif"
  },
  "Public Sans": {
    family: "Public Sans",
    weights: ["100", "200", "300", "400", "500", "600", "700", "800", "900"],
    googleFontUrl: "https://fonts.googleapis.com/css2?family=Public+Sans:wght@100;200;300;400;500;600;700;800;900&display=swap",
    category: "sans-serif"
  },
  "Playfair Display": {
    family: "Playfair Display",
    weights: ["400", "500", "600", "700", "800", "900"],
    googleFontUrl: "https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;500;600;700;800;900&display=swap",
    category: "serif"
  },
  "Crimson Text": {
    family: "Crimson Text",
    weights: ["400", "600", "700"],
    googleFontUrl: "https://fonts.googleapis.com/css2?family=Crimson+Text:wght@400;600;700&display=swap",
    category: "serif"
  },
  "Lora": {
    family: "Lora",
    weights: ["400", "500", "600", "700"],
    googleFontUrl: "https://fonts.googleapis.com/css2?family=Lora:wght@400;500;600;700&display=swap",
    category: "serif"
  },
  "Bitter": {
    family: "Bitter",
    weights: ["100", "200", "300", "400", "500", "600", "700", "800", "900"],
    googleFontUrl: "https://fonts.googleapis.com/css2?family=Bitter:wght@100;200;300;400;500;600;700;800;900&display=swap",
    category: "serif"
  },
  "Spectral": {
    family: "Spectral",
    weights: ["200", "300", "400", "500", "600", "700", "800"],
    googleFontUrl: "https://fonts.googleapis.com/css2?family=Spectral:wght@200;300;400;500;600;700;800&display=swap",
    category: "serif"
  },
  "Source Serif Pro": {
    family: "Source Serif Pro",
    weights: ["200", "300", "400", "600", "700", "900"],
    googleFontUrl: "https://fonts.googleapis.com/css2?family=Source+Serif+Pro:wght@200;300;400;600;700;900&display=swap",
    category: "serif"
  },
  "Alegreya": {
    family: "Alegreya",
    weights: ["400", "500", "600", "700", "800", "900"],
    googleFontUrl: "https://fonts.googleapis.com/css2?family=Alegreya:wght@400;500;600;700;800;900&display=swap",
    category: "serif"
  },
  "Vollkorn": {
    family: "Vollkorn",
    weights: ["400", "500", "600", "700", "800", "900"],
    googleFontUrl: "https://fonts.googleapis.com/css2?family=Vollkorn:wght@400;500;600;700;800;900&display=swap",
    category: "serif"
  },
  "Noto Serif": {
    family: "Noto Serif",
    weights: ["400", "700"],
    googleFontUrl: "https://fonts.googleapis.com/css2?family=Noto+Serif:wght@400;700&display=swap",
    category: "serif"
  },
  "Roboto Slab": {
    family: "Roboto Slab",
    weights: ["100", "200", "300", "400", "500", "600", "700", "800", "900"],
    googleFontUrl: "https://fonts.googleapis.com/css2?family=Roboto+Slab:wght@100;200;300;400;500;600;700;800;900&display=swap",
    category: "serif"
  },
  "Josefin Sans": {
    family: "Josefin Sans",
    weights: ["100", "200", "300", "400", "500", "600", "700"],
    googleFontUrl: "https://fonts.googleapis.com/css2?family=Josefin+Sans:wght@100;200;300;400;500;600;700&display=swap",
    category: "sans-serif"
  },
  "Quicksand": {
    family: "Quicksand",
    weights: ["300", "400", "500", "600", "700"],
    googleFontUrl: "https://fonts.googleapis.com/css2?family=Quicksand:wght@300;400;500;600;700&display=swap",
    category: "sans-serif"
  },
  "Raleway": {
    family: "Raleway",
    weights: ["100", "200", "300", "400", "500", "600", "700", "800", "900"],
    googleFontUrl: "https://fonts.googleapis.com/css2?family=Raleway:wght@100;200;300;400;500;600;700;800;900&display=swap",
    category: "sans-serif"
  },
  "Bebas Neue": {
    family: "Bebas Neue",
    weights: ["400"],
    googleFontUrl: "https://fonts.googleapis.com/css2?family=Bebas+Neue&display=swap",
    category: "sans-serif"
  },
  "Nunito": {
    family: "Nunito",
    weights: ["200", "300", "400", "500", "600", "700", "800", "900"],
    googleFontUrl: "https://fonts.googleapis.com/css2?family=Nunito:wght@200;300;400;500;600;700;800;900&display=swap",
    category: "sans-serif"
  },
  "Varela Round": {
    family: "Varela Round",
    weights: ["400"],
    googleFontUrl: "https://fonts.googleapis.com/css2?family=Varela+Round&display=swap",
    category: "sans-serif"
  },
  "Barlow": {
    family: "Barlow",
    weights: ["100", "200", "300", "400", "500", "600", "700", "800", "900"],
    googleFontUrl: "https://fonts.googleapis.com/css2?family=Barlow:wght@100;200;300;400;500;600;700;800;900&display=swap",
    category: "sans-serif"
  },
  "Titillium Web": {
    family: "Titillium Web",
    weights: ["200", "300", "400", "600", "700", "900"],
    googleFontUrl: "https://fonts.googleapis.com/css2?family=Titillium+Web:wght@200;300;400;600;700;900&display=swap",
    category: "sans-serif"
  },
  "Oxygen": {
    family: "Oxygen",
    weights: ["300", "400", "700"],
    googleFontUrl: "https://fonts.googleapis.com/css2?family=Oxygen:wght@300;400;700&display=swap",
    category: "sans-serif"
  },
  "Karla": {
    family: "Karla",
    weights: ["200", "300", "400", "500", "600", "700", "800"],
    googleFontUrl: "https://fonts.googleapis.com/css2?family=Karla:wght@200;300;400;500;600;700;800&display=swap",
    category: "sans-serif"
  },
  "Mukti": {
    family: "Mukti",
    weights: ["200", "300", "400", "500", "600", "700", "800"],
    googleFontUrl: "https://fonts.googleapis.com/css2?family=Mukti:wght@200;300;400;500;600;700;800&display=swap",
    category: "sans-serif"
  },
  "Hind": {
    family: "Hind",
    weights: ["300", "400", "500", "600", "700"],
    googleFontUrl: "https://fonts.googleapis.com/css2?family=Hind:wght@300;400;500;600;700&display=swap",
    category: "sans-serif"
  },
  "Assistant": {
    family: "Assistant",
    weights: ["200", "300", "400", "500", "600", "700", "800"],
    googleFontUrl: "https://fonts.googleapis.com/css2?family=Assistant:wght@200;300;400;500;600;700;800&display=swap",
    category: "sans-serif"
  },
  "Kalam": {
    family: "Kalam",
    weights: ["300", "400", "700"],
    googleFontUrl: "https://fonts.googleapis.com/css2?family=Kalam:wght@300;400;700&display=swap",
    category: "handwriting"
  },
  "Architects Daughter": {
    family: "Architects Daughter",
    weights: ["400"],
    googleFontUrl: "https://fonts.googleapis.com/css2?family=Architects+Daughter&display=swap",
    category: "handwriting"
  },
  "Indie Flower": {
    family: "Indie Flower",
    weights: ["400"],
    googleFontUrl: "https://fonts.googleapis.com/css2?family=Indie+Flower&display=swap",
    category: "handwriting"
  },
  "Amatic SC": {
    family: "Amatic SC",
    weights: ["400", "700"],
    googleFontUrl: "https://fonts.googleapis.com/css2?family=Amatic+SC:wght@400;700&display=swap",
    category: "handwriting"
  },
  "Bungee": {
    family: "Bungee",
    weights: ["400"],
    googleFontUrl: "https://fonts.googleapis.com/css2?family=Bungee&display=swap",
    category: "display"
  },
  "Lilita One": {
    family: "Lilita One",
    weights: ["400"],
    googleFontUrl: "https://fonts.googleapis.com/css2?family=Lilita+One&display=swap",
    category: "display"
  },
  "Chewy": {
    family: "Chewy",
    weights: ["400"],
    googleFontUrl: "https://fonts.googleapis.com/css2?family=Chewy&display=swap",
    category: "display"
  },
  "Bangers": {
    family: "Bangers",
    weights: ["400"],
    googleFontUrl: "https://fonts.googleapis.com/css2?family=Bangers&display=swap",
    category: "display"
  },
  "Modak": {
    family: "Modak",
    weights: ["400"],
    googleFontUrl: "https://fonts.googleapis.com/css2?family=Modak&display=swap",
    category: "display"
  },
  "Bungee Shade": {
    family: "Bungee Shade",
    weights: ["400"],
    googleFontUrl: "https://fonts.googleapis.com/css2?family=Bungee+Shade&display=swap",
    category: "display"
  },
  "Dancing Script": {
    family: "Dancing Script",
    weights: ["400", "500", "600", "700"],
    googleFontUrl: "https://fonts.googleapis.com/css2?family=Dancing+Script:wght@400;500;600;700&display=swap",
    category: "handwriting"
  },
  "Great Vibes": {
    family: "Great Vibes",
    weights: ["400"],
    googleFontUrl: "https://fonts.googleapis.com/css2?family=Great+Vibes&display=swap",
    category: "handwriting"
  },
  "Pinyon Script": {
    family: "Pinyon Script",
    weights: ["400"],
    googleFontUrl: "https://fonts.googleapis.com/css2?family=Pinyon+Script&display=swap",
    category: "handwriting"
  },
  "Alex Brush": {
    family: "Alex Brush",
    weights: ["400"],
    googleFontUrl: "https://fonts.googleapis.com/css2?family=Alex+Brush&display=swap",
    category: "handwriting"
  },
  "Abril Fatface": {
    family: "Abril Fatface",
    weights: ["400"],
    googleFontUrl: "https://fonts.googleapis.com/css2?family=Abril+Fatface&display=swap",
    category: "display"
  },
  "Bodoni Moda": {
    family: "Bodoni Moda",
    weights: ["400", "500", "600", "700", "800", "900"],
    googleFontUrl: "https://fonts.googleapis.com/css2?family=Bodoni+Moda:wght@400;500;600;700;800;900&display=swap",
    category: "serif"
  },
  "Didot": {
    family: "Didot",
    weights: ["400"],
    googleFontUrl: "https://fonts.googleapis.com/css2?family=Didot&display=swap",
    category: "serif"
  },
  "JetBrains Mono": {
    family: "JetBrains Mono",
    weights: ["100", "200", "300", "400", "500", "600", "700", "800"],
    googleFontUrl: "https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@100;200;300;400;500;600;700;800&display=swap",
    category: "monospace"
  },
  "Source Code Pro": {
    family: "Source Code Pro",
    weights: ["200", "300", "400", "500", "600", "700", "800", "900"],
    googleFontUrl: "https://fonts.googleapis.com/css2?family=Source+Code+Pro:wght@200;300;400;500;600;700;800;900&display=swap",
    category: "monospace"
  },
  "IBM Plex Mono": {
    family: "IBM Plex Mono",
    weights: ["100", "200", "300", "400", "500", "600", "700"],
    googleFontUrl: "https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@100;200;300;400;500;600;700&display=swap",
    category: "monospace"
  },
  "Fira Code": {
    family: "Fira Code",
    weights: ["300", "400", "500", "600", "700"],
    googleFontUrl: "https://fonts.googleapis.com/css2?family=Fira+Code:wght@300;400;500;600;700&display=swap",
    category: "monospace"
  },
  "Rajdhani": {
    family: "Rajdhani",
    weights: ["300", "400", "500", "600", "700"],
    googleFontUrl: "https://fonts.googleapis.com/css2?family=Rajdhani:wght@300;400;500;600;700&display=swap",
    category: "sans-serif"
  },
  "Saira": {
    family: "Saira",
    weights: ["100", "200", "300", "400", "500", "600", "700", "800", "900"],
    googleFontUrl: "https://fonts.googleapis.com/css2?family=Saira:wght@100;200;300;400;500;600;700;800;900&display=swap",
    category: "sans-serif"
  },
  "Space Mono": {
    family: "Space Mono",
    weights: ["400", "700"],
    googleFontUrl: "https://fonts.googleapis.com/css2?family=Space+Mono:wght@400;700&display=swap",
    category: "monospace"
  },
  "Overpass Mono": {
    family: "Overpass Mono",
    weights: ["300", "400", "500", "600", "700"],
    googleFontUrl: "https://fonts.googleapis.com/css2?family=Overpass+Mono:wght@300;400;500;600;700&display=swap",
    category: "monospace"
  },
};

// Сервис для работы со шрифтами
export class FontService {
  // Определение стиля бренда на основе ключевых слов
  private determineStyle(keywords: string): string {
    const keywordLower = keywords.toLowerCase();
    
    // Проверяем на техничный стиль
    if (keywordLower.includes('код') || keywordLower.includes('программирование') || 
        keywordLower.includes('разработка') || keywordLower.includes('инженерия') || 
        keywordLower.includes('робототехника') || keywordLower.includes('автоматизация') ||
        keywordLower.includes('наука') || keywordLower.includes('лаборатория')) {
      return 'Техничный';
    }
    
    // Проверяем на элегантный стиль
    if (keywordLower.includes('свадьба') || keywordLower.includes('торжество') || 
        keywordLower.includes('красота') || keywordLower.includes('косметика') || 
        keywordLower.includes('спа') || keywordLower.includes('флористика') ||
        keywordLower.includes('декор') || keywordLower.includes('ювелирные') ||
        keywordLower.includes('парфюмерия') || keywordLower.includes('элегантность')) {
      return 'Элегантный';
    }
    
    // Проверяем на креативный стиль
    if (keywordLower.includes('креатив') || keywordLower.includes('искусство') || 
        keywordLower.includes('дизайн') || keywordLower.includes('творчество') ||
        keywordLower.includes('мода') || keywordLower.includes('стиль') ||
        keywordLower.includes('галерея') || keywordLower.includes('студия') ||
        keywordLower.includes('фитнес') || keywordLower.includes('спорт')) {
      return 'Креативный';
    }
    
    // Проверяем на игривый стиль
    if (keywordLower.includes('игра') || keywordLower.includes('дети') || 
        keywordLower.includes('развлечения') || keywordLower.includes('веселье') ||
        keywordLower.includes('праздник') || keywordLower.includes('кафе') ||
        keywordLower.includes('ресторан') || keywordLower.includes('хобби') ||
        keywordLower.includes('детский') || keywordLower.includes('игрушки')) {
      return 'Игривый';
    }
    
    // Проверяем на классический стиль
    if (keywordLower.includes('традиции') || keywordLower.includes('история') || 
        keywordLower.includes('классика') || keywordLower.includes('премиум') ||
        keywordLower.includes('право') || keywordLower.includes('юрист') ||
        keywordLower.includes('адвокат') || keywordLower.includes('недвижимость') ||
        keywordLower.includes('архитектура') || keywordLower.includes('образование') ||
        keywordLower.includes('университет') || keywordLower.includes('музей')) {
      return 'Классический';
    }
    
    // Проверяем на профессиональный стиль
    if (keywordLower.includes('бизнес') || keywordLower.includes('консалтинг') || 
        keywordLower.includes('услуги') || keywordLower.includes('офис') ||
        keywordLower.includes('корпорация') || keywordLower.includes('логистика') ||
        keywordLower.includes('транспорт') || keywordLower.includes('банк') ||
        keywordLower.includes('страхование') || keywordLower.includes('промышленность') ||
        keywordLower.includes('производство') || keywordLower.includes('b2b')) {
      return 'Профессиональный';
    }
    
    // По умолчанию - современный стиль
    return 'Современный';
  }

  // Определение сферы бизнеса из ключевых слов
  private determineBusinessSphere(keywords: string): string[] {
    const keywordLower = keywords.toLowerCase();
    const spheres: string[] = [];
    
    // Технологии
    if (keywordLower.includes('технологии') || keywordLower.includes('стартап') || 
        keywordLower.includes('IT') || keywordLower.includes('софт') ||
        keywordLower.includes('разработка') || keywordLower.includes('приложения') ||
        keywordLower.includes('веб') || keywordLower.includes('интернет') ||
        keywordLower.includes('цифровые') || keywordLower.includes('онлайн')) {
      spheres.push('технологии', 'стартап', 'IT', 'софт', 'разработка', 'приложения', 'веб', 'интернет', 'онлайн');
    }
    
    // Финансы
    if (keywordLower.includes('финансы') || keywordLower.includes('банк') || 
        keywordLower.includes('инвестиции') || keywordLower.includes('кредит') ||
        keywordLower.includes('страхование') || keywordLower.includes('консалтинг')) {
      spheres.push('финансы', 'банк', 'инвестиции', 'кредит', 'страхование', 'консалтинг');
    }
    
    // Медицина
    if (keywordLower.includes('медицина') || keywordLower.includes('здравоохранение') || 
        keywordLower.includes('клиника') || keywordLower.includes('больница') ||
        keywordLower.includes('врач') || keywordLower.includes('лечение')) {
      spheres.push('медицина', 'здравоохранение', 'клиника', 'больница');
    }
    
    // Право
    if (keywordLower.includes('право') || keywordLower.includes('юрист') || 
        keywordLower.includes('адвокат') || keywordLower.includes('нотариус') ||
        keywordLower.includes('юриспруденция')) {
      spheres.push('юриспруденция', 'право', 'адвокат', 'нотариус');
    }
    
    // Недвижимость
    if (keywordLower.includes('недвижимость') || keywordLower.includes('строительство') || 
        keywordLower.includes('архитектура') || keywordLower.includes('дом') ||
        keywordLower.includes('квартира') || keywordLower.includes('офис')) {
      spheres.push('недвижимость', 'архитектура', 'строительство');
    }
    
    // Образование
    if (keywordLower.includes('образование') || keywordLower.includes('школа') || 
        keywordLower.includes('университет') || keywordLower.includes('курсы') ||
        keywordLower.includes('обучение') || keywordLower.includes('преподавание')) {
      spheres.push('образование', 'университет', 'школа', 'курсы');
    }
    
    // Дизайн и креатив
    if (keywordLower.includes('дизайн') || keywordLower.includes('креатив') || 
        keywordLower.includes('реклама') || keywordLower.includes('студия') ||
        keywordLower.includes('искусство') || keywordLower.includes('творчество') ||
        keywordLower.includes('галерея')) {
      spheres.push('дизайн', 'реклама', 'креатив', 'студия', 'искусство', 'творчество', 'галерея');
    }
    
    // Мода и красота
    if (keywordLower.includes('мода') || keywordLower.includes('красота') || 
        keywordLower.includes('стиль') || keywordLower.includes('салон') ||
        keywordLower.includes('косметика') || keywordLower.includes('парфюмерия') ||
        keywordLower.includes('спа') || keywordLower.includes('ювелирные')) {
      spheres.push('мода', 'стиль', 'красота', 'салон', 'косметика', 'парфюмерия', 'спа', 'ювелирные');
    }
    
    // Спорт и фитнес
    if (keywordLower.includes('спорт') || keywordLower.includes('фитнес') || 
        keywordLower.includes('тренировка') || keywordLower.includes('активность') ||
        keywordLower.includes('здоровье') || keywordLower.includes('тренер')) {
      spheres.push('фитнес', 'спорт', 'активность');
    }
    
    // Развлечения
    if (keywordLower.includes('развлечения') || keywordLower.includes('игры') || 
        keywordLower.includes('досуг') || keywordLower.includes('кино') ||
        keywordLower.includes('музыка') || keywordLower.includes('театр')) {
      spheres.push('развлечения', 'игры', 'досуг', 'кино');
    }
    
    // Дети
    if (keywordLower.includes('дети') || keywordLower.includes('детский') || 
        keywordLower.includes('игрушки') || keywordLower.includes('развитие') ||
        keywordLower.includes('сад') || keywordLower.includes('аниматор')) {
      spheres.push('дети', 'детский сад', 'игрушки', 'развитие');
    }
    
    // Еда
    if (keywordLower.includes('еда') || keywordLower.includes('кафе') || 
        keywordLower.includes('ресторан') || keywordLower.includes('кулинария') ||
        keywordLower.includes('фастфуд') || keywordLower.includes('напитки') ||
        keywordLower.includes('доставка еды')) {
      spheres.push('кафе', 'ресторан', 'еда', 'кулинария', 'фастфуд', 'напитки');
    }
    
    // Логистика
    if (keywordLower.includes('логистика') || keywordLower.includes('транспорт') || 
        keywordLower.includes('доставка') || keywordLower.includes('грузоперевозки') ||
        keywordLower.includes('международный') || keywordLower.includes('экспорт')) {
      spheres.push('логистика', 'транспорт', 'доставка', 'грузоперевозки', 'международный', 'экспорт');
    }
    
    // Свадьбы
    if (keywordLower.includes('свадьба') || keywordLower.includes('торжество') || 
        keywordLower.includes('праздник') || keywordLower.includes('событие') ||
        keywordLower.includes('флористика') || keywordLower.includes('декор') ||
        keywordLower.includes('оформление')) {
      spheres.push('свадьба', 'торжество', 'праздник', 'событие', 'флористика', 'декор', 'оформление');
    }
    
    // Премиум услуги
    if (keywordLower.includes('премиум') || keywordLower.includes('люкс') || 
        keywordLower.includes('элитные') || keywordLower.includes('vip') ||
        keywordLower.includes('эксклюзив') || keywordLower.includes('класс')) {
      spheres.push('премиум', 'люкс', 'элитные услуги');
    }
    
    return spheres;
  }

  // Поиск наилучшего соответствия вариантов по сфере бизнеса
  private findBestVariant(variants: any[], businessSpheres: string[]): any {
    if (businessSpheres.length === 0) {
      // Если сфера не определена, возвращаем случайный вариант
      return variants[Math.floor(Math.random() * variants.length)];
    }
    
    let bestMatch = variants[0];
    let bestScore = 0;
    
    for (const variant of variants) {
      if (variant.businessType) {
        const score = variant.businessType.filter((type: string) => 
          businessSpheres.some(sphere => 
            sphere.toLowerCase().includes(type.toLowerCase()) || 
            type.toLowerCase().includes(sphere.toLowerCase())
          )
        ).length;
        
        if (score > bestScore) {
          bestScore = score;
          bestMatch = variant;
        }
      }
    }
    
    return bestMatch;
  }

  // Генерация шрифтов на основе стиля и сферы бизнеса
  async generateFonts(keywords: string, logoUrl?: string): Promise<Font[]> {
    
    const style = this.determineStyle(keywords);
    const businessSpheres = this.determineBusinessSphere(keywords);
    
    const styleData = FONT_DATABASE[style as keyof typeof FONT_DATABASE];
    if (!styleData) {
      throw new Error(`Style ${style} not found in font database`);
    }
    
    // Находим наилучший вариант на основе сферы бизнеса
    const bestVariant = this.findBestVariant(styleData.variants, businessSpheres);
    
    const fonts: Font[] = [];
    
    // Добавляем основные шрифты
    bestVariant.main.forEach((fontName: string, index: number) => {
      const fontInfo = FONT_INFO[fontName as keyof typeof FONT_INFO];
      if (fontInfo) {
        fonts.push({
          name: fontName,
          type: index === 0 ? 'primary' : 'primary_alt',
          url: fontInfo.googleFontUrl || '',
          category: fontInfo.category,
          family: fontInfo.family,
          weights: fontInfo.weights,
          googleFontUrl: fontInfo.googleFontUrl
        });
      }
    });
    
    // Добавляем дополнительные шрифты
    bestVariant.secondary.forEach((fontName: string, index: number) => {
      const fontInfo = FONT_INFO[fontName as keyof typeof FONT_INFO];
      if (fontInfo) {
        fonts.push({
          name: fontName,
          type: index === 0 ? 'secondary' : 'secondary_alt',
          url: fontInfo.googleFontUrl || '',
          category: fontInfo.category,
          family: fontInfo.family,
          weights: fontInfo.weights,
          googleFontUrl: fontInfo.googleFontUrl
        });
      }
    });
    
    return fonts;
  }
}

// Экспорт экземпляра для переиспользования
export const fontService = new FontService(); 