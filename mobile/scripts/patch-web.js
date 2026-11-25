// Après `expo export --platform web` : rend la version web installable sur iPhone
// (icône, plein écran, couleurs) et ajoute le manifeste.
const fs = require("fs");
const path = require("path");

const out = path.join(__dirname, "..", "..", "web");
const indexPath = path.join(out, "index.html");
let html = fs.readFileSync(indexPath, "utf8");

const head = `
    <meta name="apple-mobile-web-app-capable" content="yes" />
    <meta name="mobile-web-app-capable" content="yes" />
    <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
    <meta name="apple-mobile-web-app-title" content="Mes cours" />
    <meta name="theme-color" content="#7A2440" />
    <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
    <link rel="manifest" href="/manifest.json" />`;

html = html
  .replace(/<title>.*?<\/title>/, "<title>Mes cours</title>")
  .replace(/<meta name="viewport"[^>]*>/, '<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, viewport-fit=cover" />')
  .replace("</head>", `${head}\n  </head>`);
fs.writeFileSync(indexPath, html);

fs.writeFileSync(
  path.join(out, "manifest.json"),
  JSON.stringify(
    {
      name: "Mes cours",
      short_name: "Mes cours",
      start_url: "/",
      display: "standalone",
      background_color: "#FBF5F7",
      theme_color: "#7A2440",
      icons: [
        { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
        { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
      ],
    },
    null,
    2
  )
);
console.log("Version web prête dans le dossier web/");
