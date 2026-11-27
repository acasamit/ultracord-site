# ultracord.dev

The website of [Ultracord](https://github.com/acasamit/ultracord), served by GitHub Pages from
the `main` branch.

Plain HTML, CSS and JavaScript modules, no build step. The plugin and theme catalogs are read at
runtime from `https://assets.ultracord.dev/plugins/index.json` and `themes/index.json`, which the
main repository publishes.

- `index.html` and `app.js`: the home page, with the themes and plugins.
- `create.html` and `create.js`: the theme maker. It runs the same readability checks as the store
  and proposes a theme by opening GitHub's new file page with the file filled in.
- `site.js`: the navigation and copy buttons, on every page. `theme-kit.js`: the theme catalog,
  the Discord sketch and the contrast rules, shared by both pages.

## Preview locally

```sh
python -m http.server 8000
```

Then open `http://localhost:8000/`. To preview the catalogs with your own data, put a JSON file
next to `index.html` and open `http://localhost:8000/?catalog=./your-file.json`, or
`?themes=./your-file.json` (only honored on localhost).

## License

Code under GPL-3.0-or-later. The Anton font is under the SIL Open Font License (`fonts/OFL.txt`).
