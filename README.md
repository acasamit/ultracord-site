# ultracord.dev

The website of [Ultracord](https://github.com/acasamit/ultracord), served by GitHub Pages from
the `main` branch.

Plain HTML, CSS and JavaScript modules, no build step. The plugin and theme catalogs are read at
runtime from `https://assets.ultracord.dev/plugins/index.json` and `themes/index.json`, which the
main repository publishes.

- `index.html` and `app.js`: the home page, with a few featured themes.
- `themes.html` and `themes.js`: every theme, with a search box and a dark or light filter.
- `theme.html` and `theme-page.js`: one theme's page, as `theme.html?name=<name>`.
- `plugins.html` and `plugins.js`: the plugins, with their install links.
- `create.html` and `create.js`: the theme maker. It runs the same readability checks as the store
  and proposes a theme by opening GitHub's new file page with the file filled in.
  `create.html?from=<name>` starts from a theme of the store.
- `site.js`: the navigation and copy buttons, on every page. `theme-kit.js`: the theme catalog,
  cards, the Discord sketch and the contrast rules, shared by the pages.

The pages repeat the same header and footer, so a change to the menu goes in each of them.

## Preview locally

```sh
python -m http.server 8000
```

Then open `http://localhost:8000/`. To preview the catalogs with your own data, put a JSON file
next to `index.html` and open `http://localhost:8000/plugins.html?catalog=./your-file.json`, or
add `?themes=./your-file.json` to a theme page (only honored on localhost).

## License

Code under GPL-3.0-or-later. The Anton font is under the SIL Open Font License (`fonts/OFL.txt`).
